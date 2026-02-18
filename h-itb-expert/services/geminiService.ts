import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../services/firebase"; // Ensure this exports the initialized firebase app

// We not longer need direct Gemini SDK or API Key here!
// import { GoogleGenAI } from "@google/genai"; 
// export const apiKey = ... (Removed)

export const TEXT_MODEL_NAME = 'gemini-2.0-flash'; // Kept for reference or if used elsewhere? 
// Actually, the model is now decided by backend.

interface ChatResponse {
    text: string;
}

export const sendMessageToExpert = async (
    message: string, 
    history: { role: string; parts: { text: string }[] }[],
    onChunk?: (text: string) => void
): Promise<string> => {
    
  console.log("--- Calling Expert Chat Cloud Function ---");
  console.time("Cloud Function Call");

  try {
    const functions = getFunctions(app, "us-central1"); // Ensure region matches
    const chatFunction = httpsCallable(functions, 'chatWithExpert');

    // We only send the message and history. RAG and System Instructions are handled on backend.
    // We filter history to be simple { role, parts: [{text}] } objects
    const cleanHistory = history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p.text }))
    }));

    const result = await chatFunction({
        message,
        history: cleanHistory
    });

    const data = result.data as ChatResponse;
    const fullText = data.text;

    console.timeEnd("Cloud Function Call");
    
    // Simulate streaming for UI compatibility (since backend is not streaming yet)
    if (onChunk) {
        onChunk(fullText);
    }

    return fullText;

  } catch (error) {
    console.error("Expert Chat Error:", error);
    console.timeEnd("Cloud Function Call");
    throw error;
  }
};

export const generateExpertImage = async (): Promise<string> => {
    return "exp.png";
};