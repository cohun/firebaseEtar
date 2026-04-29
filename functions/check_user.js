const admin = require('firebase-admin');

// process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: "etarrendszer"
});

const db = admin.firestore();

async function checkUser() {
    try {
        const users = await db.collection('users').get();
        let found = false;
        users.forEach(doc => {
            const data = doc.data();
            if (data.email === 'v@v.hu' || (data.name && data.name.includes('Vilmos'))) {
                console.log('User ID:', doc.id);
                console.log('UserData:', data);
                found = true;
            }
        });
        if (!found) {
            console.log('User v@v.hu not found in production.');
        }
        
    } catch (e) {
        console.error(e);
    }
}

checkUser();
