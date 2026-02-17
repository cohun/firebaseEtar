import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const apiKey = process.env.API_KEY || '';
export const ai = new GoogleGenAI({ apiKey });

// System instruction to define the persona
const SYSTEM_INSTRUCTION = `
Ön a H-ITB Kft. vezető emelőgép szakértője.
A munkája során az ETAR (Emelőgép és Teherfelvevő eszközök Adminisztrációs Rendszere) rendszert használja a nyilvántartáshoz.

Feladata:
1. Válaszoljon az emelőgép üzemeltetők kérdéseire (pl. vizsgák, karbantartás, jogszabályok).
2. Legyen mindig udvarias, türelmes és segítőkész.
3. Használjon közérthető, de szakmailag pontos nyelvezetet.
4. Ha adminisztrációról van szó, mindig említse meg az ETAR rendszer előnyeit (papírmentesség, átláthatóság).
5. A válaszai legyenek rövidek, tömörek, de informatívak.

Ha a felhasználó köszön, köszönjön vissza barátságosan, mutatkozzon be mint H-ITB vezető szakértő.
Ne használjon nevet (pl. Kovács János), csak a titulusát.
`;

export const sendMessageToExpert = async (message: string, history: { role: string; parts: { text: string }[] }[]): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: history,
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "Elnézést, most nem tudok válaszolni.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateExpertImage = async (): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    const prompt = "A photorealistic, very friendly and sympathetic middle-aged male engineering expert sitting behind a modern office desk. He is looking directly at the camera with a warm smile. On the desk, there are technical books, a yellow safety helmet, and a small model of a crane or lifting machine. The background is a tidy expert office with shelves containing binders. The lighting is warm and inviting. High quality, professional portrait.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "4:3", 
        }
      }
    });

    // Extract base64 image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};