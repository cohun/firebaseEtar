const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "etarrendszer"
});

const db = admin.firestore();

async function checkDrafts() {
    try {
        const drafts = await db.collectionGroup('inspections').where('status', '==', 'draft').where('partnerId', '==', 'rYisYspsmoRDhxuxPoKK').get();
        console.log(`Found ${drafts.size} drafts for partner rYisYspsmoRDhxuxPoKK.`);
        drafts.forEach(doc => {
            console.log(doc.id, doc.data());
        });
        
    } catch (e) {
        console.error(e);
    }
}

checkDrafts();
