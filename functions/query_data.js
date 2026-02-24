const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // or any other config if we are in functions folder!
// Actually, since emulator is running, we can just point to it.
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'demo-project' }); // or whatever project ID is

async function run() {
    const db = admin.firestore();
    // Search for device with serialNumber = VX7777
    const snapshot = await db.collectionGroup('devices').where('serialNumber', '==', 'VX7777').get();
    if (snapshot.empty) {
        console.log("VX7777 not found.");
        return;
    }
    const deviceDoc = snapshot.docs[0];
    console.log("Device:", deviceDoc.data());

    const inspectionsSnap = await deviceDoc.ref.collection('inspections').get();
    console.log("Inspections count:", inspectionsSnap.size);
    inspectionsSnap.forEach(doc => {
        const data = doc.data();
        console.log("Inspection ID:", doc.id);
        console.log(" createdAt:", data.createdAt);
        console.log(" vizsgalatEredmenye:", data.vizsgalatEredmenye);
        console.log(" status:", data.status);
    });
}

run().catch(console.error);
