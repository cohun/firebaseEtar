import { GoogleGenAI, Content, Part } from "@google/genai";

export const apiKey = process.env.API_KEY || '';
// Initialize the new GoogleGenAI client
export const genAI = new GoogleGenAI({ apiKey });

export const TEXT_MODEL_NAME = 'gemini-3-flash-preview';
export const AUDIO_MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// System instruction to define the persona
const SYSTEM_INSTRUCTION = `
Ön a H-ITB Kft. vezető emelőgép szakértője.
A munkája során az ETAR (Emelőgép és Teherfelvevő eszközök Adminisztrációs Rendszere) rendszert használja a nyilvántartáshoz.

Feladata:
1. Válaszoljon az emelőgép üzemeltetők kérdéseire (pl. vizsgák, karbantartás, jogszabályok).
2. Legyen mindig udvarias, türelmes és segítőkész.
3. Használjon közérthető, de szakmailag pontos nyelvezetet.
4. Ha adminisztrációról van szó, mindig említse meg az ETAR rendszer előnyeit (papírmentesség, átláthatóság).
5. A válaszai legyenek részletesek, szakmailag alaposak és kimerítőek. Bátran fejtse ki a szakmai indoklást.

Ha a felhasználó köszön, köszönjön vissza barátságosan, mutatkozzon be mint H-ITB vezető szakértő.
Ne használjon nevet (pl. Kovács János), csak a titulusát.
`;

import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Helper to fetch and convert PDF to base64
async function fetchPdfAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data URL prefix (e.g. "data:application/pdf;base64,")
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Cache for expert knowledge to prevent redundant Firestore fetches
let cachedExpertKnowledge: { systemText: string, contextParts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> } | null = null;

async function getExpertKnowledge(): Promise<{ systemText: string, contextParts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> }> {
  // Return cached data if available
  if (cachedExpertKnowledge) return cachedExpertKnowledge;

  try {
    const q = query(collection(db, "expert_knowledge"), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    
    let systemText = "";
    const contextParts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> = [];

    if (snapshot.empty) {
        cachedExpertKnowledge = { systemText: "", contextParts: [] };
        return cachedExpertKnowledge;
    }

    systemText += "\n\nKÖTELEZŐ SZAKMAI TUDÁSBÁZIS (Ezeket a szabályokat szigorúan be kell tartani):\n";

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Add Text Content to System Instruction (it's cheaper and stronger there)
      if (data.content) {
         systemText += `\n--- ${data.title || 'Szabály'} ---\n${data.content}\n`;
      }

      // Add PDF Content to Context Parts (History)
      if (data.fileUrl && data.mimeType === 'application/pdf') {
        try {
          const base64Pdf = await fetchPdfAsBase64(data.fileUrl);
          contextParts.push({ text: `\n*** PDF DOKUMENTUM: ${data.title} ***\n` });
          contextParts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf
            }
          });
        } catch (err) {
          console.error(`Failed to load PDF for ${data.title}:`, err);
        }
      }
    }

    // Save to cache
    cachedExpertKnowledge = { systemText, contextParts };
    return cachedExpertKnowledge;
  } catch (error) {
    console.error("Error fetching expert knowledge:", error);
    return { systemText: "", contextParts: [] };
  }
}

export const sendMessageToExpert = async (message: string, history: { role: string; parts: { text: string }[] }[]): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    // 1. Fetch dynamic knowledge (cached)
    const { systemText, contextParts } = await getExpertKnowledge();
    
    // 2. Construct System Instruction (Text Only)
    // Always include system text rules in system instruction
    const fullSystemInstruction = SYSTEM_INSTRUCTION + systemText;

    // 3. Construct History
    // If we have multimodal content (PDFs), we inject them as a "User" message.
    // OPTIMIZATION: Only inject large context (PDFs) if this is the start of a conversation (history is empty)
    // or if the implementation requires it. Since `history` passed here contains previous turns,
    // if `history` has existing items, we assume the context was already established in the session memory of the client/server interaction
    // OR we need to include it if the API is stateless.
    // The Gemini API `chat.sendMessage` is stateful for the `Chat` instance, but here we create a new `Chat` instance every time
    // using the `history` passed from the UI.
    // So, we must ensure the context is inside `history` if it's not already there.
    // However, sending base64 PDFs on *every* request is expensive and high latency.
    // Best practice: The `history` prop from UI should technically accumulate the context we sent back?
    // Reviewing `ChatBox.tsx` (from memory/previous view): it manages `messages` state.
    // If we prepend context here, does `ChatBox` save it? Likely not, `ChatBox` only saves User/Model text.
    // So we DO need to send context every time if we create a new Chat instance, UNLESS we rely on caching (feature of new SDK/Gemini 1.5+).
    // But for `gemini-2.0-flash` / `gemini-3.0`, standard caching isn't manual like this.
    // For now, to solve "slow response", we must avoid re-uploading heavy PDF data if possible.
    // But since we are stateless here, we have to send it.
    // BUT `getExpertKnowledge` was fetching from Firestore every time. Caching THAT will save the Firestore latency (hundreds of ms).
    // Sending the base64 to Gemini is also slow.
    // Compromise: We only send the PDF context if the history is empty (first turn). 
    // WARN: If we don't send it on subsequent turns, does the model "remember" it from previous turns in the `history` array?
    // YES, providing we pass the *full* history including the first turn with the PDF.
    // The `history` arg comes from `ChatBox`. Does `ChatBox` keep the "System/Context" messages we injected?
    // Looking at typical implementations: UI usually only keeps User/AI text.
    // If UI doesn't keep the "PDF injection" message, then `history` won't have it, and we'd lose context on 2nd message.
    // FIX: We will prepend it if it's NOT in the history.
    // Since checking binary data in history is hard, we can assume if `history.length === 0` we add it. 
    // IF `history.length > 0`, we assume the model *context window* might handle it? 
    // NO, if we create a new `genAI.chats.create` with `history` that *lacks* the PDF message, the model won't see it.
    // So we MUST include it in `history`.
    // The performance bottleneck was likely the *Firestore Download* of PDFs every time.
    // In-memory cache solves the download.
    // Uploading base64 to Gemini is unavoidable without true "Context Caching" API usage (which costs money/different structure).
    // So: Caching `getExpertKnowledge` is the big win here.

    let fullHistory = [...history];
    
    // Check if we need to inject context. 
    // Strategy: Only inject if history is empty. 
    // IF the UI doesn't persist our injected messages, multi-turn chat will lose access to PDFs.
    // Let's assume for now we perform the "Injection" every time if the UI doesn't hold it. 
    // Actually, if we send it, the model replies. The UI appends that reply.
    // Next request: UI sends [User, Model]. 
    // If we *don't* prepend PDF again, we send [User, Model, User2]. The PDF is gone.
    // So we MUST prepend PDF every time if the UI doesn't store it.
    // The only way to optimize *bandwidth* to Gemini is if we use the same `Chat` instance, but here we are stateless server-side function (or client-side acting structure).
    // Wait, this file is `geminiService.ts`, running in the Browser (Client Side).
    // So we *could* keep a persistent `ChatSession` instance!
    // But the current code exports `sendMessageToExpert` which takes `history`. This implies statelessness or "re-init every time" pattern.
    // Let's stick to the stateless pattern for reliability, but rely on the RAM cache to avoid re-downloading PDFs from Firestore.
    // That alone is a huge speedup.
    
    // We will inject context if it's present.
    if (contextParts.length > 0) {
        // Optimization: Use a lightweight marker to check if history already has context?
        // Hard to do reliably with simple array.
        // Let's just prepend. The latency from *uploading* cached base64 is consistently high but unavoidable without session persistence.
        // However, the Firestore fetch was likely the variable "very, very slow" part (network round trips).
        
        const contextMessage = {
            role: "user",
            parts: [...contextParts, { text: "Ezek a hivatkozott szakmai dokumentumok (szabványok, ábrák). Vedd figyelembe őket a válaszoknál." }]
        };
        const contextAck = {
            role: "model",
            parts: [{ text: "Értettem, a csatolt szakmai dokumentumokat feldolgoztam és alkalmazni fogom." }]
        };
        
        // We prepend. 
        // Note: usage of `any` cast is preserved from previous fix.
        fullHistory = [contextMessage as any, contextAck as any, ...history];
    }

    // Cast history to Content[]
    const formattedHistory: Content[] = fullHistory.map(entry => ({
      role: entry.role,
      parts: entry.parts.map(part => {
        if ('text' in part && typeof part.text === 'string') {
            return { text: part.text };
        }
        return part as Part;
      })
    }));

    const chat = genAI.chats.create({
      model: TEXT_MODEL_NAME,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7,
        maxOutputTokens: 8000, // Increased from 1000
      },
      history: formattedHistory
    });

    // Send the message
    const result = await chat.sendMessage({
      message: message
    });

    console.log("Gemini Response:", result);
    return result.text || "No response text available."; 
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateExpertImage = async (): Promise<string> => {
    // Return the static image as fallback since image generation might require specific model support not always available on free tier/standard keys easily
    // Also, new SDK image generation is `ai.models.generateImages` usually.
    return "exp.png";
};