// fix_missing_status.js
// Kérlek futtasd a functions mappából: "node fix_missing_status.js" (vagy a teszteléshez az emulátor adataival)

const admin = require('firebase-admin');
const path = require('path');

// ============================================
// 1. BEÁLLÍTÁSOK
// ============================================
const PROJECT_ID = 'etarrendszer';

// Initialize Firebase Admin (Emulator mode fallback vagy service account)
if (process.env.FIREBASE_EMULATOR_HUB) {
  admin.initializeApp({ projectId: PROJECT_ID });
  console.log("🛠️ Csatlakoztam a Firebase Emulátorhoz!");
} else {
  // Próbáljuk elérni a lokális konfigot (csak ha van service account a gépen, különben hiba lesz)
  try {
    const serviceAccount = require(path.join(__dirname, '..', 'firebase-adminsdk.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("☁️ Csatlakoztam az éles (vagy teszt) projekt adatbázisához!");
  } catch (e) {
    console.log("⚠️ Nem találtam serviceAccount json-t, megpróbálok Application Default Credentials(ADC)-vel csatlakozni.");
    try {
      admin.initializeApp({ projectId: PROJECT_ID });
      console.log("☁️ ADC inicializáció sikeres!");
    } catch(e2) {
      console.error("❌ Nem sikerült a Firebase Admin inicializálása!");
      process.exit(1);
    }
  }
}

const db = admin.firestore();

// ============================================
// 2. JAVÍTÓ LOGIKA
// ============================================
async function fixMissingStatuses() {
  console.log('--- Eltűnt státuszok javításának megkezdése ---');
  let fixedCount = 0;
  let missingInspectionCount = 0;

  try {
    // 1. Megkeressük az összes partnert
    const partnersSnapshot = await db.collection('partners').get();
    
    if (partnersSnapshot.empty) {
      console.log('Nem találtam egyetlen partnert sem.');
      return;
    }

    // 2. Végigmegyünk az összes partneren
    for (const partnerDoc of partnersSnapshot.docs) {
      const partnerId = partnerDoc.id;
      // const partnerName = partnerDoc.data().name || partnerId;
      console.log(`\n===========================================`);
      console.log(`>> Partner vizsgálata: ${partnerId}`);
      console.log(`===========================================`);

      // 3. Lekérjük a partnerhez tartozó összes eszközt
      const devicesRef = db.collection('partners').doc(partnerId).collection('devices');
      const devicesSnapshot = await devicesRef.get();

      if (devicesSnapshot.empty) {
        console.log(`  Nincsenek eszközök a partnernél.`);
        continue;
      }

      // 4. Végigmegyünk az eszközökön
      for (const deviceDoc of devicesSnapshot.docs) {
        const deviceData = deviceDoc.data();
        
        // Csak azokat az eszközöket vizsgáljuk, ahol a 'status' üres, vagy egyáltalán nem létezik
        if (!deviceData.status || deviceData.status.trim() === '') {
          const deviceId = deviceDoc.id;
          // console.log(`  [ESZKÖZ] ${deviceId} - ${deviceData.serialNumber} üres státusszal rendelkezik. Keresem a befejezett vizsgálatot...`);

          const inspectionsRef = devicesRef.doc(deviceId).collection('inspections');
          const inspectionsSnapshot = await inspectionsRef.get();

          if (!inspectionsSnapshot.empty) {
            // Szűrjük és rendezzük memóriában, hogy ne kelljen új Firestore kompozit index
            const validInsps = [];
            inspectionsSnapshot.forEach(doc => {
              const d = doc.data();
              if (d.status !== 'draft') {
                validInsps.push(d);
              }
            });

            if (validInsps.length > 0) {
              validInsps.sort((a, b) => {
                const dateA = a.vizsgalatIdopontja || '';
                const dateB = b.vizsgalatIdopontja || '';
                if (dateA > dateB) return -1;
                if (dateA < dateB) return 1;
                return 0;
              });

              const inspData = validInsps[0];
              const resultStatus = inspData.vizsgalatEredmenye;
              const updatedDate = inspData.vizsgalatIdopontja;
              
              if (resultStatus) {
                // 6. Javítás és frissítés a fő eszköz dokumentumon
                console.log(`  🔥 JAVÍTÁS! Eszköz: ${deviceData.serialNumber} (ID: ${deviceId}) -> Új státusz: ${resultStatus} (${updatedDate})`);
                
                await devicesRef.doc(deviceId).update({
                  status: resultStatus,
                  vizsg_idopont: updatedDate || deviceData.vizsg_idopont || null,
                  kov_vizsg: inspData.kovetkezoIdoszakosVizsgalat || deviceData.kov_vizsg || null
                });
                
                fixedCount++;
              } else {
                 missingInspectionCount++;
                 // console.log(`  ⚠️ Van végleges vizsgálat, de nincs kitöltve a 'vizsgalatEredmenye' a ${deviceId}-nél!`);
              }
            } else {
              missingInspectionCount++;
            }
          } else {
            // Nincs vizsgálat, nézzük meg, hátha van 'usage_start' a reports-ban
            const reportsRef = db.collection('partners').doc(partnerId).collection('reports');
            const reportsSnap = await reportsRef.where('deviceSerialNumber', '==', deviceData.serialNumber).where('type', '==', 'usage_start').get();
            
            if (!reportsSnap.empty) {
                // Rendezzük dátum szerint
                const validReports = [];
                reportsSnap.forEach(doc => validReports.push(doc.data()));
                validReports.sort((a, b) => {
                    const dateA = a.date || '';
                    const dateB = b.date || '';
                    if (dateA > dateB) return -1;
                    if (dateA < dateB) return 1;
                    return 0;
                });
                
                const repData = validReports[0];
                const updatedDate = repData.date; // pl. 2026.01.27
                let calcKovVizsg = null;
                if (updatedDate && updatedDate.length >= 4) {
                    const year = parseInt(updatedDate.substring(0, 4));
                    if (!isNaN(year)) {
                        calcKovVizsg = (year + 1) + updatedDate.substring(4);
                    }
                }
                
                console.log(`  🎯 JAVÍTÁS (Használatba Vétel)! Eszköz: ${deviceData.serialNumber} (ID: ${deviceId}) -> Új státusz: Üzembe helyezve (${updatedDate})`);
                await devicesRef.doc(deviceId).update({
                    status: 'Üzembe helyezve',
                    vizsg_idopont: updatedDate || deviceData.vizsg_idopont || null,
                    kov_vizsg: calcKovVizsg || deviceData.kov_vizsg || null
                });
                fixedCount++;
            } else {
                missingInspectionCount++;
            }
          }
        }
      }
    }

    console.log('\n--- JAVÍTÁS BEFEJEZVE ---');
    console.log(`✅ Sikeresen javított eszközök száma: ${fixedCount}`);
    console.log(`ℹ️ Olyan eszközök, amiknek nem volt befejezett vizsgálata, ezért N/A maradt (ez normális is lehet): ${missingInspectionCount}`);

  } catch (error) {
    console.error('Hiba a migráció során:', error);
  }
}

// Futás indítása
fixMissingStatuses().then(() => {
    process.exit(0);
});
