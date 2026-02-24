const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function checkDoc() {
  const partnerId = '2c3SOgzRN2I0tgy14Y3v'; // Teszt Ceg
  const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
  const snap = await devicesRef.where('serialNumber', '==', '55').get();
  
  if (!snap.empty) {
     for (const doc of snap.docs) {
         console.log(`DEVICE: ${doc.id}`);
         console.table({
            serial: doc.data().serialNumber,
            vizsg_idopont: doc.data().vizsg_idopont,
            status: doc.data().status,
            kov_vizsg: doc.data().kov_vizsg,
            inspectionType: doc.data().inspectionType
         });
         
         // Check reports subcollection
         const reportsReq = await db.collection('partners').doc(partnerId).collection('reports').where('deviceSerialNumber', '==', '55').get();
         console.log(`Reports found: ${reportsReq.size}`);
         
         // Check inspections subcollection
         const inspReq = await devicesRef.doc(doc.id).collection('inspections').get();
         console.log(`Inspections found: ${inspReq.size}`);
     }
  } else {
     console.log('Not found');
  }
}
checkDoc().then(() => process.exit(0));
