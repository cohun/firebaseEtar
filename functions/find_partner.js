const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function checkDoc() {
  const partnersRef = db.collection('partners');
  const snap = await partnersRef.where('etarCode', '==', 'WHR108').get();
  
  if (!snap.empty) {
      console.log(`PARTNER ID: ${snap.docs[0].id}`);
      
      const partnerId = snap.docs[0].id;
      const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
      const devSnap = await devicesRef.get();
      devSnap.docs.forEach(doc => {
          const sn = doc.data().serialNumber;
          if (sn === '55') {
             console.log(`DEVICE: ${doc.id}`);
             console.log(JSON.stringify(doc.data(), null, 2));
          }
      });
  } else {
      console.log('Partner WHR108 not found');
  }
}
checkDoc().then(() => process.exit(0));
