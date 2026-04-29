const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "etarrendszer"
});

const db = admin.firestore();

async function checkExperts() {
    try {
        const experts = await db.collection('experts').get();
        experts.forEach(doc => {
            console.log(doc.id, doc.data());
        });
        
    } catch (e) {
        console.error(e);
    }
}

checkExperts();
