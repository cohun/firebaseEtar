const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function checkDoc() {
  const partnerId = '2c3SOgzRN2I0tgy14Y3v';
  const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
  const snap = await devicesRef.where('serialNumber', '==', '2024006').get();
  
  if (!snap.empty) {
     const doc = snap.docs[0];
     const data = doc.data();
     console.log('DEVICE DATA:');
     console.log(JSON.stringify(data, null, 2));
  } else {
     console.log('Not found');
  }
}
checkDoc().then(() => process.exit(0));
