const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'etarrendszer' });
async function run() {
    const db = admin.firestore();
    const cols = await db.listCollections();
    console.log("Collections:", cols.map(c => c.id));
}
run().catch(console.error);
