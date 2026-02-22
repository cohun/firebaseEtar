const admin = require('firebase-admin');

// Initialize Firebase Admin (make sure to set exactly the path to your service account if needed,
// or run this using firebase-admin in the emulator environment)
admin.initializeApp({
  projectId: "firebaseetar" // Replace with your production project id if running against prod
});

const db = admin.firestore();

async function migratePartners() {
  const partnersRef = db.collection('partners');
  const snapshot = await partnersRef.get();

  let count = 0;
  const renewalDate = new Date();
  renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  const renewalStr = renewalDate.toISOString();

  // We are using a simple loop for ease. For thousands of docs use db.batch()
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Only update if not already set
    if (data.storageTier === undefined) {
      await doc.ref.update({
        storageUsedBytes: 0,
        storageLimitBytes: 52428800, // 50 MB
        storageTier: 'Free',
        storageRenewalDate: renewalStr
      });
      count++;
      console.log(`Updated partner ${doc.id}`);
    }
  }

  console.log(`\nMigration complete. Updated ${count} partners.`);
}

migratePartners().catch(console.error);
