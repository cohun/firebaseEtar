const admin = require('firebase-admin');

try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function check1199() {
  const inspections = await db.collection('partners').doc('rYisYspsmoRDhxuxPoKK')
                              .collection('devices').doc('1199-ID-unknown-need-to-query')
                              // Wait, I don't know the document ID for 1199.
                              .get(); 
                              // I'll query for serialNumber first
}
async function checkDevice() {
  const devicesSnap = await db.collection('partners').doc('rYisYspsmoRDhxuxPoKK').collection('devices').where('serialNumber', '==', '1199').get();
  for (const doc of devicesSnap.docs) {
    const inspSnap = await db.collection('partners').doc('rYisYspsmoRDhxuxPoKK').collection('devices').doc(doc.id).collection('inspections').get();
    console.log(`Eszköz ID: ${doc.id}, Inspections db: ${inspSnap.size}`);
    inspSnap.forEach(i => {
       console.log(`  - statusz a vizsgan: '${i.data().status}', eremény: '${i.data().vizsgalatEredmenye}'`);
    });
  }
}

checkDevice().then(() => process.exit(0));
