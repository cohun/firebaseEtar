import { GoogleGenerativeAI } from "@google/generative-ai";

export const apiKey = process.env.API_KEY || '';
export const genAI = new GoogleGenerativeAI(apiKey);

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

// ... (SYSTEM_INSTRUCTION constant remains)

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

async function getExpertKnowledge(): Promise<{ systemText: string, contextParts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> }> {
  try {
    const q = query(collection(db, "expert_knowledge"), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    
    let systemText = "";
    const contextParts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> = [];

    if (snapshot.empty) return { systemText: "", contextParts: [] };

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

    return { systemText, contextParts };
  } catch (error) {
    console.error("Error fetching expert knowledge:", error);
    return { systemText: "", contextParts: [] };
  }
}

export const sendMessageToExpert = async (message: string, history: { role: string; parts: { text: string }[] }[]): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    // 1. Fetch dynamic knowledge
    const { systemText, contextParts } = await getExpertKnowledge();
    
    // 2. Construct System Instruction (Text Only)
    const fullSystemInstruction = SYSTEM_INSTRUCTION + systemText;

    // 3. Construct History
    // If we have multimodal content (PDFs), we inject them as a "User" message at the start of history
    // followed by a "Model" acknowledgement.
    let fullHistory = [...history];
    
    if (contextParts.length > 0) {
        const contextMessage = {
            role: "user",
            parts: [...contextParts, { text: "Ezek a hivatkozott szakmai dokumentumok (szabványok, ábrák). Vedd figyelembe őket a válaszoknál." }]
        };
        const contextAck = {
            role: "model",
            parts: [{ text: "Értettem, a csatolt szakmai dokumentumokat feldolgoztam és alkalmazni fogom." }]
        };
        // Prepend to history
        fullHistory = [contextMessage, contextAck, ...history];
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: fullSystemInstruction 
    });

    const chat = model.startChat({
      history: fullHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    console.log("Gemini Response:", response);
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateExpertImage = async (): Promise<string> => {
    // Return the static image as fallback since image generation might require specific model support not always available on free tier/standard keys easily
    return "exp.png";
};