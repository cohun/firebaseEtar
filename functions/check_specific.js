const admin = require('firebase-admin');
try { admin.initializeApp({ projectId: 'etarrendszer' }); } catch(e) { admin.initializeApp(); }
const db = admin.firestore();

async function run() {
  const partnerId = '2c3SOgzRN2I0tgy14Y3v';
  const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
  
  const snToFind = ['11122', '2024006', '2024006/1', 'VX7778'];
  
  for (let sn of snToFind) {
     const snap = await devicesRef.where('serialNumber', '==', sn).get();
     if (snap.empty) {
        console.log(`Nem talaltam: ${sn}`);
        continue;
     }
     for (let doc of snap.docs) {
         console.log(`[ESZKOZ] ${sn} (ID: ${doc.id}) -> Státusz: '${doc.data().status}'`);
         // Check inspections
         const inspSnap = await devicesRef.doc(doc.id).collection('inspections').get();
         console.log(`     Vizsgálatok száma: ${inspSnap.size}`);
         inspSnap.forEach(iDoc => {
             console.log(`       - vizsga: status='${iDoc.data().status}' erdmenye='${iDoc.data().vizsgalatEredmenye}'`);
         });
     }
  }
}
run().then(() => process.exit(0));
