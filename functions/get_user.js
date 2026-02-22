const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'etarrendszer' });
async function run() {
    const db = admin.firestore();
    const snap = await db.collection('users').where('email', '==', 'attila.hitb@gmail.com').get();
    if (snap.empty) {
        console.log("No user found with that email.");
    } else {
        snap.forEach(doc => console.log(doc.id, "=>", doc.data()));
    }
}
run();
