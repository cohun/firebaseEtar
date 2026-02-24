const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function checkDoc() {
  const partnerId = '2c3SOgzRN2I0tgy14Y3v'; // Teszt Ceg
  const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
  const snap = await devicesRef.get();
  
  snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.operatorId === 'GCA536' || data.operatorId === 'www') {
         console.log(`DEVICE: ${doc.id}`);
         console.log(JSON.stringify(data, null, 2));
      }
  });
}
checkDoc().then(() => process.exit(0));
