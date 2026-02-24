const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function checkDoc() {
  const partnersRef = db.collection('partners');
  const partnersSnap = await partnersRef.get();
  
  for (const p of partnersSnap.docs) {
     const devicesRef = db.collection('partners').doc(p.id).collection('devices');
     const snap = await devicesRef.where('operatorId', '==', 'www').get();
     
     if (!snap.empty) {
         for (const doc of snap.docs) {
             console.log(`PARTNER: ${p.id} - DEVICE: ${doc.id}`);
             console.log(JSON.stringify(doc.data(), null, 2));
             
             // Check reports
             const reports = await db.collection('partners').doc(p.id).collection('reports').where('deviceSerialNumber', '==', doc.data().serialNumber).get();
             console.log(`Reports found: ${reports.size}`);
             reports.forEach(r => console.log('Report type:', r.data().type, 'date:', r.data().date));
         }
     }
  }
}
checkDoc().then(() => process.exit(0));
