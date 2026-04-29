const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "etarrendszer"
});

const db = admin.firestore();

async function testQuery() {
    try {
        const query = db.collectionGroup('inspections')
            .where('status', '==', 'draft')
            .where('partnerId', 'in', ['rYisYspsmoRDhxuxPoKK'])
            .orderBy('createdAt', 'desc');
            
        const snapshot = await query.get();
        console.log(`Query returned ${snapshot.size} documents.`);
        snapshot.forEach(doc => {
            console.log(doc.id, doc.data());
        });
        
    } catch (e) {
        console.error(e);
    }
}

testQuery();
