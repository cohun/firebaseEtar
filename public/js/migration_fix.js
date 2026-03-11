
import { db } from './firebase.js';

/**
 * Migration Script: Backfill Device Data from Latest Inspection
 * 
 * Iterates through ALL partners and their devices.
 * For each device, finds the latest FINALIZED inspection.
 * Updates the parent device document with:
 *  - status (vizsgalatEredmenye): e.g., "Megfelelt"
 *  - vizsg_idopont (vizsgalatIdopontja): e.g., "2024.02.05"
 *  - kov_vizsg (kovetkezoIdoszakosVizsgalat): e.g., "2025.02.05"
 *  - finalizedFileUrl (fileUrl): e.g., "https://..."
 */
export async function runMigration() {
    console.log("Starting Migration...");
    
    // Create a status div if it doesn't exist
    let statusDiv = document.getElementById('migration-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'migration-status';
        statusDiv.style.position = 'fixed';
        statusDiv.style.bottom = '10px';
        statusDiv.style.right = '10px';
        statusDiv.style.backgroundColor = 'black';
        statusDiv.style.color = 'lime';
        statusDiv.style.padding = '10px';
        statusDiv.style.zIndex = '9999';
        statusDiv.style.maxHeight = '300px';
        statusDiv.style.overflowY = 'scroll';
        document.body.appendChild(statusDiv);
    }

    const log = (msg) => {
        console.log(msg);
        const p = document.createElement('div');
        p.textContent = msg;
        statusDiv.appendChild(p);
        statusDiv.scrollTop = statusDiv.scrollHeight;
    };

    try {
        log("Fetching partners...");
        const partnersSnapshot = await db.collection('partners').get();
        const totalPartners = partnersSnapshot.size;
        let pIndex = 0;

        for (const partnerDoc of partnersSnapshot.docs) {
            pIndex++;
            const partnerId = partnerDoc.id;
            const partnerName = partnerDoc.data().name || partnerId;
            log(`Partner ${pIndex}/${totalPartners}: ${partnerName}`);

            const devicesSnapshot = await db.collection('partners').doc(partnerId).collection('devices').get();
            const totalDevices = devicesSnapshot.size;
            log(`  Found ${totalDevices} devices.`);
            
            let updatedCount = 0;
            let batch = db.batch();
            let batchCount = 0;
            const batchLimit = 400; // Firestore limit 500

            for (const deviceDoc of devicesSnapshot.docs) {
                const deviceId = deviceDoc.id;
                // Fetch ALL inspections, we will sort them in memory correctly
                const inspectionsSnapshot = await db.collection('partners').doc(partnerId)
                    .collection('devices').doc(deviceId)
                    .collection('inspections')
                    .get();

                let latestInspection = null;

                if (!inspectionsSnapshot.empty) {
                    // Filter out drafts
                    const validInspections = [];
                    for (const doc of inspectionsSnapshot.docs) {
                        const data = doc.data();
                        if (data.status !== 'draft') {
                            validInspections.push(data);
                        }
                    }

                    // Sort valid inspections by date properly (ignoring spaces)
                    validInspections.sort((a, b) => {
                        const parseDate = (dStr) => {
                            if (!dStr) return 0;
                            // Clean spaces and keep numbers only (e.g. "2024. 05. 01." -> "20240501")
                            const clean = dStr.replace(/[^\d]/g, '');
                            return parseInt(clean) || 0;
                        };
                        return parseDate(b.vizsgalatIdopontja) - parseDate(a.vizsgalatIdopontja);
                    });

                    if (validInspections.length > 0) {
                        latestInspection = validInspections[0];
                    }
                }

                if (latestInspection) {
                    const updateData = {
                        status: latestInspection.vizsgalatEredmenye || '',
                        vizsg_idopont: latestInspection.vizsgalatIdopontja || '',
                        kov_vizsg: latestInspection.kovetkezoIdoszakosVizsgalat || '',
                        finalizedFileUrl: latestInspection.fileUrl || null
                    };

                    const deviceRef = db.collection('partners').doc(partnerId).collection('devices').doc(deviceId);
                    batch.update(deviceRef, updateData);
                    batchCount++;
                    updatedCount++;
                }

                if (batchCount >= batchLimit) {
                    await batch.commit();
                    log(`  Saved batch of ${batchCount}...`);
                    batch = db.batch();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
                log(`  Saved final batch of ${batchCount}.`);
            }
            
            log(`  -> Updated ${updatedCount}/${totalDevices} devices.`);
        }

        log("MIGRATION COMPLETE!");
        alert("Migration Complete! Please refresh the page.");

    } catch (error) {
        console.error("Migration Failed:", error);
        log(`ERROR: ${error.message}`);
    }
}

// Expose globally
window.runMigration = runMigration;
