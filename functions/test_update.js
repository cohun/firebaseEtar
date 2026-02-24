const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function runTest() {
  const partnerId = '2c3SOgzRN2I0tgy14Y3v'; // Some valid partner
  const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
  const snap = await devicesRef.limit(1).get();
  if (snap.empty) {
    console.log("No devices found here");
    return;
  }
  const doc = snap.docs[0];
  const deviceId = doc.id;
  
  // Update it directly like adatbevitel does
  const deviceData = {
    description: "Teszt update",
    operatorId: "T-001",
    status: ''
  };
  
  console.log(`Eredeti eszköz (${doc.data().serialNumber}) status: ${doc.data().status}`);

  delete deviceData.status;

  await devicesRef.doc(deviceId).update(deviceData);
  
  const updatedDoc = await devicesRef.doc(deviceId).get();
  console.log(`Update utan: ${updatedDoc.data().status}`);

}

runTest().then(() => process.exit(0));
