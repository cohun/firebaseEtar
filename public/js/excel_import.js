console.log("--- DEBUG: excel_import.js LOADED ---");
import { auth, db } from './firebase.js';


    const uploadButton = document.getElementById('uploadButton');
    const saveButton = document.getElementById('saveButton');
    let jsonData = []; // To store the parsed excel data

    const deviceMapping = {
        description: ['Megnevezés'],
        loadCapacity: ['Teherbírás', 'Teherbírás (WLL)'],
        serialNumber: ['Gyári szám'],
        type: ['Típus'],
        chip: ['NFC kód', 'ETAR kód'],
        effectiveLength: ['Méret', 'Hasznos hossz', 'Hossz'],
        manufacturer: ['Gyártó'],
        operatorId: ['Üzemeltetői azonosító', 'Helyszín', 'Felhasználó', 'Operátor ID'],
        yearOfManufacture: ['Gyártás éve'],
        comment: ['Állapot']
    };

    const inspectionMapping = {
        kovetkezoIdoszakosVizsgalat: ['Következő időszakos vizsgálat', 'Érvényes', 'Utolsó vizsgálat - Köv. Időszakos'],
        vizsgalatEredmenye: ['Eredmény', 'Megállapítások', 'Utolsó vizsgálat - Eredmény'],
        felhasznaltAnyagok: ['Felhasznált anyagok', 'Utolsó vizsgálat - Felhasznált anyagok'],
        feltartHiba: ['Feltárt hiba', 'Utolsó vizsgálat - Feltárt hiba'],
        kovetkezoTerhelesiProba: ['Következő terhelési próba', 'Utolsó vizsgálat - Köv. Terhelési'],
        vizsgalatHelye: ['Vizsgálat helye'],
        vizsgalatIdopontja: ['Vizsgálat időpontja', 'vizsgalatIdopontja', 'Utolsó vizsgálat - Dátum'],
        vizsgalatJellege: ['Vizsgálat jellege', 'vizsgalatJellege', 'Utolsó vizsgálat - Típus'],
        szakerto: ['Utolsó vizsgálat - Szakértő']   
    };

    if (uploadButton) {
        uploadButton.addEventListener('click', function() {
            console.log("Upload button clicked");
            const fileInput = document.getElementById('excelFile');
            const file = fileInput.files[0];
            const excelDataContainer = document.getElementById('excelData');

            if (!file) {
                alert("Kérjük, válasszon ki egy Excel fájlt!");
                return;
            }

            const reader = new FileReader();

            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array', cellDates:true});

                let foundData = false;
                
                // Iterate through all sheets to find the first one with data
                for (let i = 0; i < workbook.SheetNames.length; i++) {
                    const sheetName = workbook.SheetNames[i];
                    const worksheet = workbook.Sheets[sheetName];
                    const tempJsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (tempJsonData.length > 0) {
                        // Found data!
                        const header = XLSX.utils.sheet_to_json(worksheet, {header: 1})[0];
                        jsonData = tempJsonData;
                        displayTable(header, jsonData);
                        
                        saveButton.style.display = 'block'; 
                        if (updateButton) updateButton.style.display = 'block';
                        
                        foundData = true;
                        break; // Stop after finding first valid sheet
                    }
                }

                if (!foundData) {
                    excelDataContainer.innerHTML = '<p class="text-center text-red-500">Az Excel fájl üres vagy nem sikerült feldolgozni (egyik munkalapon sem találtunk adatot).</p>';
                    // Ensure buttons are hidden on error
                    saveButton.style.display = 'none';
                    if (updateButton) updateButton.style.display = 'none';
                }
            };

            reader.onerror = function(ex) {
                console.log(ex);
                alert("Hiba történt a fájl olvasása közben.");
            };

            reader.readAsArrayBuffer(file);
        });
    } else {
        console.error("Upload button not found!");
    }

    function displayTable(headers, data) {
        const excelDataContainer = document.getElementById('excelData');
        let table = '<table id="excelDataTable" class="w-full text-sm text-left text-gray-400">';
        
        table += '<thead class="text-xs text-gray-300 uppercase bg-gray-700">';
        table += '<tr>';
        headers.forEach(header => {
            table += `<th scope="col" class="px-6 py-3">${header}</th>`;
        });
        table += '</tr></thead>';
        
        table += '<tbody>';
        data.forEach(row => {
            table += '<tr class="border-b bg-gray-800 border-gray-700">';
            headers.forEach(header => {
                table += `<td class="px-6 py-4">${row[header] || ''}</td>`;
            });
            table += '</tr>';
        });
        table += '</tbody></table>';

        excelDataContainer.innerHTML = table;
    }

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            if (jsonData.length === 0) {
                alert("Nincs adat a mentéshez. Kérjük, először töltsön be egy Excel fájlt.");
                return;
            }

            const partnerId = sessionStorage.getItem('lastPartnerId');
            if (!partnerId) {
                alert('Nincs kiválasztott partner. Kérjük, válasszon partnert az főoldalon!');
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                alert('Nincs bejelentkezett felhasználó. Kérjük, jelentkezzen be!');
                return;
            }
            
            let createdByName = user.displayName || user.email;

            const batch = db.batch();
            let successfulImports = 0;
            let errors = [];

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                try {
                    const deviceData = mapRowToSchema(row, deviceMapping);
                    const inspectionData = mapRowToSchema(row, inspectionMapping);

                    // Validation
                    const missingDeviceFields = [];
                    if (!deviceData.description) missingDeviceFields.push('Megnevezés');
                    if (!deviceData.loadCapacity) missingDeviceFields.push('Teherbírás');
                    if (!deviceData.serialNumber) missingDeviceFields.push('Gyári szám');
                    if (!deviceData.type) missingDeviceFields.push('Típus');

                    const missingInspectionFields = [];
                    if (!inspectionData.kovetkezoIdoszakosVizsgalat) missingInspectionFields.push('Következő időszakos vizsgálat / Érvényes');
                    if (!inspectionData.vizsgalatEredmenye) missingInspectionFields.push('Eredmény / Megállapítások');

                    if (missingDeviceFields.length > 0 || missingInspectionFields.length > 0) {
                        errors.push(`Sor ${i + 1}: Hiányzó adatok - ${[...missingDeviceFields, ...missingInspectionFields].join(', ')}`);
                        continue; 
                    }

                    // Add metadata
                    deviceData.createdAt = firebase.firestore.Timestamp.now();
                    deviceData.createdBy = createdByName;
                    deviceData.partnerId = partnerId;
                    deviceData.comment = 'active';
                    deviceData.status = '';

                    const deviceRef = db.collection('partners').doc(partnerId).collection('devices').doc();
                    batch.set(deviceRef, deviceData);

                    // Helper to format date as YYYY.MM.DD
                    const formatDate = (date) => {
                        if (!date) return '';
                        const d = new Date(date);
                        if (isNaN(d.getTime())) return ''; // Invalid date
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}.${month}.${day}`;
                    };

                    inspectionData.vizsgalatIdopontja = inspectionData.vizsgalatIdopontja ? formatDate(inspectionData.vizsgalatIdopontja) : formatDate(new Date());
                    inspectionData.kovetkezoIdoszakosVizsgalat = inspectionData.kovetkezoIdoszakosVizsgalat ? formatDate(inspectionData.kovetkezoIdoszakosVizsgalat) : '';
                    inspectionData.deviceId = deviceRef.id;
                    inspectionData.createdAt = firebase.firestore.Timestamp.now();
                    inspectionData.createdBy = createdByName;


                    const inspectionRef = deviceRef.collection('inspections').doc();
                    batch.set(inspectionRef, inspectionData);
                    
                    successfulImports++;
                } catch (error) {
                    console.error("Hiba egy sor feldolgozása közben: ", error, "Sor adat:", row);
                    errors.push(`Sor ${i + 1}: Feldolgozási hiba`);
                }
            }

            if (errors.length > 0) {
                alert(`Hiba történt ${errors.length} sor feldolgozása közben:\n` + errors.slice(0, 10).join('\n') + (errors.length > 10 ? '\n...' : ''));
                if (successfulImports === 0) {
                    return; // Don't commit if nothing was successful
                }
                 if (!confirm(`${successfulImports} eszköz sikeresen feldolgozva, de ${errors.length} hiba történt. Szeretné menteni a helyes adatokat?`)) {
                    return;
                }
            }

            try {
                await batch.commit();
                alert(`${successfulImports} eszköz sikeresen importálva.`);
                jsonData = []; // Clear data after import
                document.getElementById('excelData').innerHTML = ''; // Clear table
                saveButton.style.display = 'none'; // Hide save button
                if (updateButton) updateButton.style.display = 'none'; // Hide update button
            } catch (error) {
                console.error("Hiba a Firestore mentés során: ", error);
                alert("Hiba történt a kötegelt mentés során. Lásd a konzolt a részletekért.");
            }
        });
    }

    function mapRowToSchema(row, schema) {
        const result = {};
        for (const key in schema) {
            for (const alias of schema[key]) {
                if (row[alias] !== undefined) {
                    result[key] = row[alias];
                    break; // Megtaláltuk az értéket, nem keresünk tovább
                }
            }
        }
        return result;
    }

    // --- BULK UPDATE LOGIC ---
    const updateButton = document.getElementById('updateButton');
    const bulkUpdateModal = document.getElementById('bulk-update-modal');
    const closeBulkModalBtn = document.getElementById('close-bulk-modal-btn');
    const cancelBulkBtn = document.getElementById('cancel-bulk-btn');
    const confirmBulkBtn = document.getElementById('confirm-bulk-btn');
    
    // Checkboxes
    const chkOverwriteModified = document.getElementById('chk-overwrite-modified');
    const chkUploadNew = document.getElementById('chk-upload-new');
    
    // Counts
    const countModifiedSpan = document.getElementById('count-modified');
    const countNewSpan = document.getElementById('count-new');
    const countDuplicatesSpan = document.getElementById('count-duplicates');
    const countUnchangedSpan = document.getElementById('count-unchanged');

    // Tables
    const tableModifiedBody = document.querySelector('#table-modified tbody');
    const tableNewBody = document.querySelector('#table-new tbody');
    const tableDuplicatesBody = document.querySelector('#table-duplicates tbody');
    const duplicatesSection = document.getElementById('section-duplicates');

    let bulkAnalysisResult = null; // Store analysis result for execution

    if (updateButton) {
        updateButton.addEventListener('click', async () => {
            if (jsonData.length === 0) {
                alert("Nincs adat az elemzéshez. Kérjük, először töltsön be egy Excel fájlt.");
                return;
            }

            const partnerId = sessionStorage.getItem('lastPartnerId');
            if (!partnerId) {
                alert('Nincs kiválasztott partner.');
                return;
            }

            // Show loading state?
            updateButton.textContent = "Elemzés...";
            updateButton.disabled = true;

            try {
                // 1. Fetch all existing devices for partner
                const snapshot = await db.collection('partners').doc(partnerId).collection('devices').get();
                const existingDevices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 2. Build Lookup Map: Serial Number -> Array of Devices (to detect DB duplicates)
                const deviceMap = new Map();
                existingDevices.forEach(dev => {
                    const sn = dev.serialNumber ? String(dev.serialNumber).trim() : 'UNKNOWN';
                    if (!deviceMap.has(sn)) {
                        deviceMap.set(sn, []);
                    }
                    deviceMap.get(sn).push(dev);
                });

                // 3. Analyze Excel Data
                const modified = [];
                const newDevices = [];
                const duplicates = []; // Conflicts in DB
                const unchanged = [];

                // Valid schema keys for comparison
                const validKeys = Object.keys(deviceMapping);

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const importData = mapRowToSchema(row, deviceMapping);
                    const importInspection = mapRowToSchema(row, inspectionMapping); 
                    // Note: Bulk update currently focuses on DEVICE data properties, not creating new inspections,
                    // BUT user might expect next inspection date to update. 
                    // Let's assume we update device fields + inspection fields IF they exist on the device doc directly,
                    // or handled as special fields. 
                    // Based on previous code, inspection info is stored in subcollection 'inspections' usually, 
                    // BUT 'excel_import' legacy logic puts some fields on device too or creates new inspection.
                    // For THIS bulk update, we will stick to updating fields that map to the Device document + 'kovetkezoIdoszakosVizsgalat' which is often on device for searching.
                    
                    // Simplify: We merge all mapped fields into one object to check against device document
                    // (Assuming device doc stores 'kovetkezoIdoszakosVizsgalat' etc. as per older logic or we update it there too)
                    const fullImportData = { ...importData, ...importInspection };

                    if (!fullImportData.serialNumber) continue; // Skip if no serial number
                    const rawSn = String(fullImportData.serialNumber).trim();

                    if (deviceMap.has(rawSn)) {
                        const matches = deviceMap.get(rawSn);
                        if (matches.length > 1) {
                            // DB DUPLICATE FOUND
                            if (!duplicates.some(d => d.sn === rawSn)) {
                                duplicates.push({ sn: rawSn, count: matches.length, name: matches[0].description });
                            }
                        } else {
                            // SINGLE MATCH - CHECK FOR CHANGES
                            const existingDev = matches[0];
                            const changes = [];

                            // ONLY check fields that belong to the DEVICE document (from deviceMapping)
                            // We do NOT check inspection fields as they are in subcollections and always missing on the device doc.
                            for (const key in deviceMapping) { 
                                // Skip internal/special keys if any. 
                                // Note: deviceMapping keys are the target field names.
                                
                                let newVal = importData[key]; // Use importData (only matches deviceMapping)
                                let oldVal = existingDev[key];

                                // SKIP EMPTY CSV VALUES
                                if (newVal === undefined || newVal === null || String(newVal).trim() === '') {
                                    continue;
                                }

                                // Format helpers if needed (dates) or loose comparison
                                const strNew = String(newVal).trim();
                                const strOld = oldVal !== undefined ? String(oldVal).trim() : '';

                                if (strNew !== strOld) {
                                    // Field Changed
                                    changes.push({ field: key, old: strOld, new: strNew });
                                }
                            }

                            if (changes.length > 0) {
                                modified.push({ docId: existingDev.id, sn: rawSn, changes, fullData: fullImportData });
                            } else {
                                unchanged.push({ sn: rawSn });
                            }
                        }
                    } else {
                        // NEW DEVICE
                        newDevices.push({ sn: rawSn, data: fullImportData });
                    }
                }

                bulkAnalysisResult = { modified, newDevices, duplicates, unchanged, partnerId };
                renderBulkPreview(bulkAnalysisResult);

            } catch (error) {
                console.error("Hiba az elemzés során:", error);
                alert("Hiba történt az elemzés során: " + error.message);
            } finally {
                updateButton.textContent = "Adatok Frissítése";
                updateButton.disabled = false;
            }
        });
    }

    function renderBulkPreview(result) {
        // Clear tables
        tableModifiedBody.innerHTML = '';
        tableNewBody.innerHTML = '';
        tableDuplicatesBody.innerHTML = '';

        // 1. Modified
        countModifiedSpan.textContent = result.modified.length;
        result.modified.forEach(item => {
            item.changes.forEach((change, idx) => {
                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-700 bg-gray-800/50 hover:bg-gray-700";
                // Show Serial only on first row of changes for this device
                const snCell = idx === 0 ? `<td class="px-4 py-2 font-medium text-white" rowspan="${item.changes.length}">${item.sn}</td>` : '';
                tr.innerHTML = `
                    ${snCell}
                    <td class="px-4 py-2 text-yellow-200">${change.field}</td>
                    <td class="px-4 py-2 text-red-300 line-through text-xs">${change.old}</td>
                    <td class="px-4 py-2 text-green-300 font-bold">${change.new}</td>
                `;
                tableModifiedBody.appendChild(tr);
            });
        });

        // 2. New
        countNewSpan.textContent = result.newDevices.length;
        result.newDevices.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-700 bg-gray-800/50 hover:bg-gray-700";
            tr.innerHTML = `
                <td class="px-4 py-2 font-medium text-white">${item.sn}</td>
                <td class="px-4 py-2">${item.data.description || '-'}</td>
                <td class="px-4 py-2">${item.data.type || '-'}</td>
            `;
            tableNewBody.appendChild(tr);
        });

        // 3. Duplicates
        countDuplicatesSpan.textContent = result.duplicates.length;
        if (result.duplicates.length > 0) {
            duplicatesSection.classList.remove('hidden');
            result.duplicates.forEach(item => {
                const tr = document.createElement('tr');
                tr.classList.add("border-b", "border-red-800", "bg-red-900/20");
                tr.innerHTML = `
                    <td class="px-4 py-2 font-bold text-red-200">${item.sn}</td>
                    <td class="px-4 py-2 text-red-200">${item.name || '-'}</td>
                    <td class="px-4 py-2 text-center font-bold text-white bg-red-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto">${item.count}</td>
                `;
                tableDuplicatesBody.appendChild(tr);
            });
        } else {
             duplicatesSection.classList.add('hidden');
        }

        // 4. Unchanged
        countUnchangedSpan.textContent = result.unchanged.length;

        // Open Modal
        bulkUpdateModal.classList.remove('hidden');
        bulkUpdateModal.classList.add('flex');
    }

    // Modal Actions
    const closeBulkModal = () => {
        bulkUpdateModal.classList.add('hidden');
        bulkUpdateModal.classList.remove('flex');
    };
    
    if(closeBulkModalBtn) closeBulkModalBtn.addEventListener('click', closeBulkModal);
    if(cancelBulkBtn) cancelBulkBtn.addEventListener('click', closeBulkModal);

    if (confirmBulkBtn) {
        confirmBulkBtn.addEventListener('click', async () => {
            if (!bulkAnalysisResult) return;

            const doOverwrite = chkOverwriteModified.checked;
            const doUploadNew = chkUploadNew.checked;

            if (!doOverwrite && !doUploadNew) {
                alert("Nincs kiválasztva művelet (se módosítás, se új feltöltés).");
                return;
            }

            confirmBulkBtn.disabled = true;
            confirmBulkBtn.textContent = "Végrehajtás...";

            const batch = db.batch();
            let opCount = 0;
            const BATCH_LIMIT = 450; // Firestore limit 500

            // Helper to commit and reset batch
            const checkBatch = async () => {
                if (opCount >= BATCH_LIMIT) {
                    await batch.commit();
                    opCount = 0;
                    // Note: batch object cannot be reused easily, ideally we'd re-instantiate, 
                    // but simple logic is just commit often (or use multiple batches, but JS SDK single batch is easier)
                    // Re-creating batch for next chunks:
                    return db.batch(); // This doesn't work directly inside this closure as 'batch' variable needs reassignment.
                    // Correct approach for big bulk: separate chunks. 
                    // FOR SIMPLICITY: We assume < 500 ops for now or just single commit. 
                    // If likely > 500, we need chunking array logic.
                }
                return batch; // Return current
            };
            
            // To properly handle >500, let's just collect all operations first, then chunk them.
            const operations = [];

            if (doOverwrite) {
                bulkAnalysisResult.modified.forEach(mod => {
                    const updateData = {};
                    mod.changes.forEach(c => {
                        updateData[c.field] = mod.fullData[c.field]; // Use the RAW new value (not stringified check)
                    });
                    
                    // Add metadata
                    if (!updateData.updatedAt) updateData.updatedAt = firebase.firestore.Timestamp.now();
                    
                    operations.push({ type: 'update', ref: db.collection('partners').doc(bulkAnalysisResult.partnerId).collection('devices').doc(mod.docId), data: updateData });
                });
            }

            if (doUploadNew) {
                bulkAnalysisResult.newDevices.forEach(newItem => {
                    const newData = newItem.data;
                    newData.createdAt = firebase.firestore.Timestamp.now();
                    newData.partnerId = bulkAnalysisResult.partnerId;
                    newData.comment = 'active'; // Default
                    
                    // Simple date format fix if needed, similar to saveButton logic
                    if (newData.vizsgalatIdopontja) newData.vizsgalatIdopontja = formatDate(newData.vizsgalatIdopontja);
                     if (newData.kovetkezoIdoszakosVizsgalat) newData.kovetkezoIdoszakosVizsgalat = formatDate(newData.kovetkezoIdoszakosVizsgalat);

                    const newRef = db.collection('partners').doc(bulkAnalysisResult.partnerId).collection('devices').doc();
                    operations.push({ type: 'set', ref: newRef, data: newData });
                });
            }

            // Execute in chunks
            try {
                const chunks = [];
                for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
                    chunks.push(operations.slice(i, i + BATCH_LIMIT));
                }

                for (const chunk of chunks) {
                    const currentBatch = db.batch();
                    chunk.forEach(op => {
                        if (op.type === 'update') currentBatch.update(op.ref, op.data);
                        if (op.type === 'set') currentBatch.set(op.ref, op.data);
                    });
                    await currentBatch.commit();
                }

                alert("Sikeres művelet!");
                closeBulkModal();
                // Optionally clear main table or reload
                jsonData = [];
                document.getElementById('excelData').innerHTML = '';
                updateButton.style.display = 'none';
                saveButton.style.display = 'none';

            } catch (err) {
                console.error("Batch commit error:", err);
                alert("Hiba történt a mentés során: " + err.message);
            } finally {
                confirmBulkBtn.disabled = false;
                confirmBulkBtn.textContent = "Végrehajtás";
            }
        });
    }
    
    // Helper needed for new data formatting
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return typeof date === 'string' ? date : ''; 
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    };
