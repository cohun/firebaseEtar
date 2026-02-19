import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Admin if not already initialized (it might be in index.ts, but good to ensure)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const TEXT_MODEL_NAME = 'gemini-2.0-flash'; // Updated to a newer stable model if available, or stick to flash
const SYSTEM_INSTRUCTION = `
Ön a H-ITB Kft. vezető emelőgép szakértője.
A munkája során az ETAR (Emelőgép és Teherfelvevő eszközök Adminisztrációs Rendszere) rendszert használja a nyilvántartáshoz.

LEGFONTOSABB SZABÁLY:
A válaszait ELSŐSORBAN az alább megadott "KIKERESETT TUDÁSBÁZIS DOKUMENTUMOK" (RELEVANT CONTEXT FROM KNOWLEDGE BASE) alapján kell megadnia.
Ha a kapott kontextusban megtalálható a válasz, szó szerint alkalmazza vagy idézze az abban található szabályokat, szabványpontokat.
Ha a felhasználó kérdésére a válasz NEM található meg a kapott kontextusban, akkor és csak akkor hagyatkozzon az általános szakmai tudására, de jelezze, hogy az adott dokumentumokban (szabványokban/rendeletekben) erre nincs közvetlen utalás.

Kiegészítő viselkedési szabályok:
1. Legyen mindig udvarias, türelmes és segítőkész.
2. Használjon közérthető, de szakmailag pontos nyelvezetet.
3. Ha adminisztrációról van szó, mindig említse meg az ETAR rendszer előnyeit (papírmentesség, átláthatóság).
4. A válaszai legyenek RÖVIDEK, TÖMÖREK és LÉNYEGRETÖRŐEK.
5. Használjon felsorolásokat (bullet points), ahol csak lehetséges, a jobb átláthatóság érdekében.
6. NE mutatkozzon be minden válaszában! Az üdvözlés már megtörtént.
7. Csak akkor köszönjön, ha a felhasználó is köszön.
8. Térjen egyből a tárgyra, ne húzza az időt felesleges körökkel.
`;

// Helper to get RAG context
async function getRelevantContext(queryText: string): Promise<string> {
    if (!queryText.trim()) return "";
    
    try {
        // 1. Generate Embedding
        // Use the SAME model configuration as the indexer!
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const embeddingResult = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text: queryText }] },
            outputDimensionality: 768
        } as any);
        const vector = embeddingResult.embedding.values;

        // 2. Search Firestore
        // Note: vectorQuery requires a slightly different syntax/version potentially.
        // But let's try the standard way with admin SDK.
        
        const coll = db.collectionGroup('chunks');
        
        // Find nearest neighbors
        const vectorQuery = coll.findNearest('embedding', vector, {
            limit: 15, // Megnövelve 15-re a jobb találati esélyért
            distanceMeasure: 'COSINE'
        });

        const snapshot = await vectorQuery.get();
        
        const relevantText = snapshot.docs.map(d => {
            const data = d.data();
            return `--- Context from ${data.title} ---\n${data.text}`;
        }).join("\n\n");
        
        return relevantText;
    } catch (error) {
        console.error("RAG Retrieval failed:", error);
        return "";
    }
}

async function getSystemRules(): Promise<string> {
    // For now, simpler caching or just fetch. Cloud Functions instance memory can act as cache.
    // Fetching enabled rules
    try {
        const q = db.collection("expert_knowledge").where("isActive", "==", true);
        const snapshot = await q.get();
        let rules = "\n\nSPECIÁLIS ÜGYMENETI ÉS MÓDSZERTANI UTASÍTÁSOK (System directives):\nVegye figyelembe az alábbi kiegészítő utasításokat a munkája során:\n";
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.content) {
                rules += `\n--- ${data.title || 'Szabály'} ---\n${data.content}\n`;
            }
        });
        return rules;
    } catch (e) {
        console.error("Error fetching rules:", e);
        return "";
    }
}

interface ChatRequest {
    message: string;
    history: { role: string; parts: { text: string }[] }[];
}

export const chatWithExpert = onCall(async (request) => {
    // Verify auth if needed? For now open public or requires auth.
    // request.auth contains user info.
    
    // Check API Key existence
    if (!API_KEY) {
        throw new HttpsError('failed-precondition', 'Server misconfigured: API Key missing.');
    }

    const { message, history } = request.data as ChatRequest;

    if (!message) {
        throw new HttpsError('invalid-argument', 'Message is required.');
    }

    try {
        // 1. Get Context
        const ragContext = await getRelevantContext(message);
        const systemRules = await getSystemRules();
        
        let contextInjection = "";
        if (ragContext) {
            contextInjection = `\n\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n${ragContext}\n\n`;
        }

        // 2. Build Prompt
        const fullSystemInstruction = SYSTEM_INSTRUCTION + systemRules + contextInjection;

        // 3. Call Gemini
        const model = genAI.getGenerativeModel({ 
            model: TEXT_MODEL_NAME,
            systemInstruction: fullSystemInstruction
        });

        // Convert history to Gemini format
        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === 'client' ? 'user' : h.role, // Just in case
                parts: h.parts
            })),
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7
            }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        return { text: responseText };

    } catch (error: any) {
        console.error("Chat error:", error);
        throw new HttpsError('internal', error.message || 'Error occurred during chat.');
    }
});
