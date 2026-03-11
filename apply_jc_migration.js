const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function applyMigration() {
  console.log('Starting migration apply...');
  const partnerName = 'JOHNSON CONTROLS International Kft..';
  
  try {
    const previewData = JSON.parse(fs.readFileSync('./jc_migration_preview.json', 'utf8'));
    console.log(`Loaded ${previewData.length} operations. Executing...`);
    
    const partnersSnapshot = await db.collection('partners').where('name', '==', partnerName).get();
    let partnerId = null;
    partnersSnapshot.forEach(doc => { partnerId = doc.id; });
    
    if (!partnerId) throw new Error("Partner not found");

    const batch = db.batch();
    let count = 0;
    
    for (const mod of previewData) {
       // Update device
       const deviceRef = db.collection('partners').doc(partnerId).collection('devices').doc(mod.deviceId);
       batch.update(deviceRef, { vizsg_idopont: mod.newDeviceLastInspection });
       
       // Update inspection if we found one
       if (mod.inspectionId) {
           const inspectionRef = deviceRef.collection('inspections').doc(mod.inspectionId);
           batch.update(inspectionRef, { vizsgalatIdopontja: mod.newDeviceLastInspection });
       }
       
       count++;
       if (count % 400 === 0) {
           await batch.commit();
           console.log(`Committed ${count} records...`);
       }
    }
    
    if (count % 400 !== 0) {
        await batch.commit();
    }
    
    console.log(`Finished migrating ${count} devices securely.`);
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
