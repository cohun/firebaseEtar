import { GoogleGenAI, Content, Part } from "@google/genai";

export const apiKey = process.env.API_KEY || '';
// Initialize the new GoogleGenAI client
export const genAI = new GoogleGenAI({ apiKey });

export const TEXT_MODEL_NAME = 'gemini-3-flash-preview';
export const AUDIO_MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// System instruction to define the persona
// System instruction to define the persona
const SYSTEM_INSTRUCTION = `
Ön a H-ITB Kft. vezető emelőgép szakértője.
A munkája során az ETAR (Emelőgép és Teherfelvevő eszközök Adminisztrációs Rendszere) rendszert használja a nyilvántartáshoz.

Feladata:
1. Válaszoljon az emelőgép üzemeltetők kérdéseire (pl. vizsgák, karbantartás, jogszabályok).
2. Legyen mindig udvarias, türelmes és segítőkész.
3. Használjon közérthető, de szakmailag pontos nyelvezetet.
4. Ha adminisztrációról van szó, mindig említse meg az ETAR rendszer előnyeit (papírmentesség, átláthatóság).
5. A válaszai legyenek RÖVIDEK, TÖMÖREK és LÉNYEGRETÖRŐEK.
6. Használjon felsorolásokat (bullet points), ahol csak lehetséges, a jobb átláthatóság érdekében.

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

// Persistent chat session
let chatSession: any = null;

export const sendMessageToExpert = async (
    message: string, 
    history: { role: string; parts: { text: string }[] }[],
    onChunk?: (text: string) => void
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  
  console.log("--- Gemini Service Operation Started ---");
  console.time("Total Service Duration");

  try {
    // Initialize session if it doesn't exist
    if (!chatSession) {
        console.log("Initializing new Chat Session...");
        // 1. Fetch dynamic knowledge (cached)
        console.time("Fetch Expert Knowledge (Firestore/Cache)");
        const { systemText, contextParts } = await getExpertKnowledge();
        console.timeEnd("Fetch Expert Knowledge (Firestore/Cache)");
        
        console.time("Context Preparation");
        // 2. Construct System Instruction (Text Only)
        const fullSystemInstruction = SYSTEM_INSTRUCTION + systemText;

        // 3. Construct Initial History (Context Injection)
        // We only do this ONCE per session now.
        let initialHistory: Content[] = [];
        
        if (contextParts.length > 0) {
            const contextMessage = {
                role: "user",
                parts: [...contextParts, { text: "Ezek a hivatkozott szakmai dokumentumok (szabványok, ábrák). Vedd figyelembe őket a válaszoknál." }]
            };
            const contextAck = {
                role: "model",
                parts: [{ text: "Értettem, a csatolt szakmai dokumentumokat feldolgoztam és alkalmazni fogom." }]
            };
            
             initialHistory = [contextMessage as any, contextAck as any].map(entry => ({
                role: entry.role,
                parts: entry.parts.map(part => {
                    if ('text' in part && typeof part.text === 'string') {
                        return { text: part.text };
                    }
                    return part as Part;
                })
            }));
        }

        // We ignore the 'history' passed from UI for the *session initialization* 
        // because we want to start fresh or the UI history is already in sync if we match it.
        // Ideally, if the user reloads the page, 'history' has previous items, but 'chatSession' is null.
        // So we should append 'history' to 'initialHistory' if we want to restore context.
        // However, 'history' contains the raw text messages.
        
        // Let's filter out the "Context" messages if they were somehow preserved (unlikely in this UI).
        const uiHistory = history.map(entry => ({
            role: entry.role,
            parts: entry.parts.map(part => ({ text: part.text }))
        }));

        chatSession = genAI.chats.create({
            model: TEXT_MODEL_NAME,
            config: {
                systemInstruction: fullSystemInstruction,
                temperature: 0.7,
                maxOutputTokens: 8000, 
            },
            history: [...initialHistory, ...uiHistory]
        });
        console.timeEnd("Context Preparation");
    }

    // Send the message with STREAMING using the persistent session
    console.time("Gemini API Network Call (Stream Start)");
    const result = await chatSession.sendMessageStream({
      message: message
    });
    console.timeEnd("Gemini API Network Call (Stream Start)");

    let fullText = "";
    for await (const chunk of result) {
        const chunkText = chunk.text;
        fullText += chunkText;
        if (onChunk) {
            onChunk(fullText);
        }
    }

    console.timeEnd("Total Service Duration");
    return fullText || "No response text available."; 
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    console.timeEnd("Total Service Duration");
    // If session is borked, reset it
    chatSession = null;
    throw error;
  }
};

export const generateExpertImage = async (): Promise<string> => {
    // Return the static image as fallback since image generation might require specific model support not always available on free tier/standard keys easily
    // Also, new SDK image generation is `ai.models.generateImages` usually.
    return "exp.png";
};