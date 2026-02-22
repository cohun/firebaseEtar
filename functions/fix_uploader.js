const admin = require('firebase-admin');

// We are assuming the emulator is running on localhost:8080 as per the firebase.json
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'etarrendszer' // Automatically using emulator via env var
});

async function run() {
    const db = admin.firestore();
    let defaultName = 'Attila (Javított)'; 
    let emailToName = {};

    try {
        const usersSnap = await db.collection('users').get();
        usersSnap.forEach(doc => {
            const u = doc.data();
            if (u.email && u.name) {
                emailToName[u.email.toLowerCase()] = u.name;
                defaultName = u.name; // Use the last found user's name as a generic fallback for 'Ismeretlen'
            }
        });
        console.log("Found user mappings map:", emailToName);
    } catch (e) {
        console.error("Warning: Couldn't fetch users. Continuing with default name.", e.message);
    }
    
    const partnersSnap = await db.collection('partners').get();
    let count = 0;

    for (const pDoc of partnersSnap.docs) {
        const devicesSnap = await pDoc.ref.collection('devices').get();
        for (const dDoc of devicesSnap.docs) {
            const docsSnap = await dDoc.ref.collection('attached_documents').get();
            for (const doc of docsSnap.docs) {
                const data = doc.data();
                
                if (data.uploadedBy === 'Ismeretlen' || (data.uploadedBy && data.uploadedBy.includes('@'))) {
                    let newName = defaultName;
                    
                    if (data.uploadedBy && data.uploadedBy.includes('@')) {
                        // If it's an email, map it or fallback
                        newName = emailToName[data.uploadedBy.toLowerCase()] || defaultName;
                    }
                    
                    console.log(`Updating document ${doc.id} uploadedBy from '${data.uploadedBy}' to '${newName}'`);
                    await doc.ref.update({ uploadedBy: newName });
                    count++;
                }
            }
        }
    }
    console.log(`Finished updating ${count} documents.`);
}

run().catch(console.error);
