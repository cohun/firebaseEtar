const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runMigration() {
  console.log('Starting migration...');
  const targetDateStr = '2026.06.05';
  const targetDateSplit = targetDateStr.split('.');
  const targetDate = new Date(parseInt(targetDateSplit[0]), parseInt(targetDateSplit[1]) - 1, parseInt(targetDateSplit[2]));
  const partnerName = 'JOHNSON CONTROLS International Kft..'; // Note the double dot as specified by user
  
  try {
    // 1. Find the partner ID
    const partnersSnapshot = await db.collection('partners').where('name', '==', partnerName).get();
    
    if (partnersSnapshot.empty) {
      console.error(`Partner not found: ${partnerName}`);
      return;
    }
    
    let partnerId = null;
    partnersSnapshot.forEach(doc => {
      partnerId = doc.id;
      console.log(`Found partner: ${partnerName} with ID: ${partnerId}`);
    });
    
    // 2. Fetch all devices for this partner
    const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
    const devicesSnapshot = await devicesRef.get();
    
    console.log(`Found ${devicesSnapshot.size} devices for partner ${partnerName}`);
    
    const modifications = [];
    const backupData = [];
    
    // 3. Analyze devices
    for (const doc of devicesSnapshot.docs) {
      const deviceData = doc.data();
      const deviceId = doc.id;
      
      let lastInspectionDateStr = deviceData.vizsg_idopont;
      let nextInspectionDateStr = deviceData.kov_vizsg;
      let needsUpdate = false;
      let newLastInspectionDateStr = null;
      
      if (lastInspectionDateStr) {
         // Try to parse the date. the format is usually YYYY.MM.DD
         const parts = lastInspectionDateStr.split('.');
         if (parts.length === 3) {
             const year = parseInt(parts[0], 10);
             const month = parseInt(parts[1], 10) - 1; // 0-indexed
             const day = parseInt(parts[2], 10);
             
             const lastInspectionDate = new Date(year, month, day);
             
             // Check if it's <= 2026.06.05
             if (lastInspectionDate.getTime() <= targetDate.getTime()) {
                 needsUpdate = true;
             }
         } else {
             console.warn(`Device ${deviceId} has invalid vizsg_idopont format: ${lastInspectionDateStr}`);
         }
      }
      
      // If we identified it needs an update, calculate the new date based on next_inspection
      if (needsUpdate && nextInspectionDateStr) {
          const nextParts = nextInspectionDateStr.split('.');
          if (nextParts.length === 3) {
              const nYear = parseInt(nextParts[0], 10);
              const nMonth = nextParts[1];
              const nDay = nextParts[2];
              
              const newYear = nYear - 1;
              newLastInspectionDateStr = `${newYear}.${nMonth}.${nDay}`;
              
              // Find the corresponding inspection document (the latest one)
              const inspectionsRef = devicesRef.doc(deviceId).collection('inspections');
              const inspectionsSnapshot = await inspectionsRef.orderBy('createdAt', 'desc').limit(1).get();
              
              let inspectionId = null;
              let inspectionData = null;
              
              if (!inspectionsSnapshot.empty) {
                  const inspDoc = inspectionsSnapshot.docs[0];
                  inspectionId = inspDoc.id;
                  inspectionData = inspDoc.data();
              }
              
              modifications.push({
                  deviceId: deviceId,
                  serialNumber: deviceData.serialNumber,
                  oldDeviceLastInspection: lastInspectionDateStr,
                  newDeviceLastInspection: newLastInspectionDateStr,
                  nextInspection: nextInspectionDateStr,
                  inspectionId: inspectionId,
                  oldInspectionDate: inspectionData ? inspectionData.vizsgalatIdopontja : null
              });
              
              backupData.push({
                  deviceId: deviceId,
                  inspectionId: inspectionId,
                  deviceData: { vizsg_idopont: lastInspectionDateStr },
                  inspectionData: inspectionData ? { vizsgalatIdopontja: inspectionData.vizsgalatIdopontja } : null
              });
          }
      }
    }
    
    console.log(`Found ${modifications.length} items to modify.`);
    
    // Save backup and preview
    fs.writeFileSync('jc_migration_backup.json', JSON.stringify(backupData, null, 2));
    fs.writeFileSync('jc_migration_preview.json', JSON.stringify(modifications, null, 2));
    
    console.log(`Saved backup and preview files. Please review jc_migration_preview.json`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();
