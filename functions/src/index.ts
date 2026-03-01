/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onObjectFinalized, onObjectDeleted } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse";
import axios from "axios";
import * as nodemailer from "nodemailer";

// -----------------------------------------------------------------------------------------
// Storage Quota Functions
// -----------------------------------------------------------------------------------------

// Helper to check if file is an attached document and extract partner ID
function getPartnerIdFromPath(filePath: string): string | null {
  // Expected path format: partners/{partnerId}/devices/{deviceId}/attached_documents/{fileName}
  const match = filePath.match(/^partners\/([^\/]+)\/devices\/[^\/]+\/attached_documents\//);
  return match ? match[1] : null;
}

export const onStorageFileUploaded = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  if (!filePath) return;

  const partnerId = getPartnerIdFromPath(filePath);
  if (!partnerId) return;

  const fileSize = Number(event.data.size);
  if (isNaN(fileSize) || fileSize === 0) return;

  console.log(`[Storage Quota] File uploaded: ${filePath} (${fileSize} bytes) for partner ${partnerId}`);
  
  const partnerRef = db.collection('partners').doc(partnerId);
  try {
    await partnerRef.update({
      storageUsedBytes: admin.firestore.FieldValue.increment(fileSize)
    });
    console.log(`[Storage Quota] Successfully incremented storage for partner ${partnerId}`);
  } catch (error) {
    console.error(`[Storage Quota] Error updating storage for partner ${partnerId}:`, error);
  }
});

export const onStorageFileDeleted = onObjectDeleted(async (event) => {
  const filePath = event.data.name;
  if (!filePath) return;

  const partnerId = getPartnerIdFromPath(filePath);
  if (!partnerId) return;

  const fileSize = Number(event.data.size);
  if (isNaN(fileSize) || fileSize === 0) return;

  console.log(`[Storage Quota] File deleted: ${filePath} (${fileSize} bytes) for partner ${partnerId}`);
  
  const partnerRef = db.collection('partners').doc(partnerId);
  try {
    await partnerRef.update({
      storageUsedBytes: admin.firestore.FieldValue.increment(-fileSize)
    });
    console.log(`[Storage Quota] Successfully decremented storage for partner ${partnerId}`);
  } catch (error) {
    console.error(`[Storage Quota] Error updating storage for partner ${partnerId}:`, error);
  }
});

admin.initializeApp();
const db = admin.firestore();

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Chunking helper
function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let index = 0;
  // Simple character-based chunking. For better results, use recursive character splitting (like LangChain)
  while (index < text.length) {
    let end = Math.min(index + chunkSize, text.length);
    chunks.push(text.slice(index, end));
    index += chunkSize - overlap;
  }
  return chunks;
}

export const indexExpertKnowledge = onDocumentWritten({
  document: "expert_knowledge/{docId}",
  memory: "1GiB",
}, async (event) => {
  const docId = event.params.docId;
  const oldData = event.data?.before.data();
  const newData = event.data?.after.data();

  // 1. Check if Deleted
  if (!newData) {
    console.log(`Document ${docId} deleted. Cleaning up chunks...`);
    
    // 1.1 Delete Chunks
    const chunksRef = db.collection(`expert_knowledge/${docId}/chunks`);
    const snapshot = await chunksRef.get();
    
    // Batch delete (limit 500)
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 1.2 Delete File from Storage
    if (oldData && oldData.fileUrl) {
         try {
             const fileUrl = oldData.fileUrl;
             // Try to extract path from URL (assuming standard Firebase Storage URL)
             // Format: .../o/folder%2Ffilename?alt=...
             const matches = fileUrl.match(/\/o\/(.+)\?alt=/);
             if (matches && matches[1]) {
                 const filePath = decodeURIComponent(matches[1]);
                 console.log(`Attempting to delete file at path: ${filePath}`);
                 await admin.storage().bucket().file(filePath).delete();
                 console.log(`Successfully deleted file: ${filePath}`);
             } else {
                 console.warn(`Could not extract file path from URL: ${fileUrl}`);
             }
         } catch (err) {
             console.error(`Failed to delete file for ${docId}:`, err);
             // We don't throw here to avoid retrying the function forever if file is already gone
         }
    }

    return;
  }

  // 2. Check if Relevant Update (New or URL changed)
  const isNew = !oldData;
  const urlChanged = oldData && oldData.fileUrl !== newData.fileUrl;
  
  // Prevent infinite loops if we are just updating the 'indexed' flag
  const isIndexingUpdate = oldData && !oldData.indexed && newData.indexed;
  if (!isNew && !urlChanged && isIndexingUpdate) {
      return;
  }

  // Only index if URL changed or new, OR if specifically requested (re-indexing logic?)
  // For now, simple check.
  if (!isNew && !urlChanged) {
       console.log(`Document ${docId} updated but fileUrl unchanged. Skipping indexing.`);
       return;
  }

  if (!newData.fileUrl || newData.mimeType !== 'application/pdf') {
      console.log(`Document ${docId} is not a PDF or missing fileUrl.`);
      return;
  }

  console.log(`Indexing document ${docId}...`);

  try {
      // 3. Download PDF
      const response = await axios.get(newData.fileUrl, { responseType: 'arraybuffer' });
      const pdfBuffer = Buffer.from(response.data);

      // 4. Extract Text
      const pdfData = await pdf(pdfBuffer);
      const fullText = pdfData.text;

      // 5. Chunk Text
      const chunks = chunkText(fullText);
      console.log(`Extracted ${chunks.length} chunks from ${fullText.length} chars.`);

      // 6. Generate Embeddings & Save
      const chunksCollection = db.collection(`expert_knowledge/${docId}/chunks`);
      
      // Delete old chunks if any (for updates)
      if (!isNew) {
         const oldChunks = await chunksCollection.get();
         const deleteBatch = db.batch();
         oldChunks.docs.forEach(d => deleteBatch.delete(d.ref));
         await deleteBatch.commit();
      }

      // Process in batches of 10 to avoid hitting API limits too hard
      // (Gemini embedding API rate limits apply)
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
          const currentBatch = chunks.slice(i, i + batchSize);
          const writeBatch = db.batch();

          await Promise.all(currentBatch.map(async (chunk, batchIndex) => {
              try {
                const embeddingResult = await model.embedContent({
                  content: { role: 'user', parts: [{ text: chunk }] },
                  outputDimensionality: 768
                } as any);
                const vector = embeddingResult.embedding.values;
                
                const chunkRef = chunksCollection.doc();
                const globalIndex = i + batchIndex;
                
                writeBatch.set(chunkRef, {
                    text: chunk,
                    embedding: admin.firestore.FieldValue.vector(vector), // Store as Vector
                    index: globalIndex,
                    docId: docId,
                    title: newData.title || "Untitled",
                    sourceUrl: newData.fileUrl
                });
              } catch (e) {
                  console.error(`Failed to embed chunk ${i + batchIndex}:`, e);
              }
          }));

          await writeBatch.commit();
          // Small delay to be nice to API
          await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Mark as indexed
      await event.data!.after.ref.update({ 
          indexed: true, 
          lastIndexed: admin.firestore.FieldValue.serverTimestamp() 
      });

      console.log(`Successfully indexed document ${docId}.`);

  } catch (error) {
      console.error(`Error indexing document ${docId}:`, error);
      // Optional: Mark as failed
  }
});

export * from "./chat";

// -----------------------------------------------------------------------------------------
// Email Handling Functions
// -----------------------------------------------------------------------------------------

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export const sendEmailFromQueue = onDocumentCreated("mailQueue/{docId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { to, replyTo, subject, html } = data;

  if (!to || !subject || !html) {
    console.error(`[MailQueue] Missing required fields for document ${event.params.docId}`);
    return event.data?.ref.update({ status: "error", error: "Missing required fields" });
  }

  try {
    const mailOptions = {
      from: `"ETAR Rendszer" <${process.env.GMAIL_EMAIL}>`,
      to: Array.isArray(to) ? to.join(",") : to,
      replyTo: replyTo,
      subject: subject,
      html: html,
    };

    console.log(`[MailQueue] Sending email to ${mailOptions.to} with subject "${subject}"`);
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[MailQueue] Email sent successfully: ${info.messageId}`);

    await event.data?.ref.update({ 
        status: "sent", 
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        messageId: info.messageId
    });
    return;
  } catch (error: any) {
    console.error(`[MailQueue] Error sending email for document ${event.params.docId}:`, error);
    await event.data?.ref.update({ 
        status: "error", 
        error: error.message || "Unknown error" 
    });
    return;
  }
});

export * from "./cron";
