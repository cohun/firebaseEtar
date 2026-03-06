const admin = require('firebase-admin');

// Note: Ensure emulator host is NOT set if we want production data, 
// unless we only have local data. I will check without emulator first.
delete process.env.FIRESTORE_EMULATOR_HOST;

admin.initializeApp({ projectId: 'etarrendszer' });
const db = admin.firestore();

async function run() {
  try {
    const snapshot = await db.collection('expert_knowledge').get();
    if (snapshot.empty) {
      console.log("No documents found in 'expert_knowledge'.");
      return;
    }
    const docs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const str = JSON.stringify(data).toLowerCase();
      // Filtering for keywords
      if (str.includes('ebsz') || str.includes('szabvány') || str.includes('gépdirektíva') || str.includes('gepdirektiva') || str.includes('szabvany')) {
        docs.push({ id: doc.id, data: data });
      }
    });
    console.log(JSON.stringify(docs, null, 2));
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

run().finally(() => process.exit(0));
