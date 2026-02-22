const admin = require('firebase-admin');

// Ensure we don't connect to the emulator by accident
delete process.env.FIRESTORE_EMULATOR_HOST;

admin.initializeApp({
  projectId: 'etarrendszer'
});

async function run() {
    try {
        const db = admin.firestore();
        const snap = await db.collection('users').get();
        console.log(`Found ${snap.size} users`);
        snap.forEach(doc => {
            const data = doc.data();
            if (data.email === 'attila.hitb@gmail.com') {
                 console.log("MATCH:", doc.id, "=>", data);
            }
        });
    } catch(e) {
        console.error("Error connecting to DB:", e.message);
    }
}

run();
