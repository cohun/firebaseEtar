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
        effectiveLength: ['Méret', 'Hasznos hossz'],
        manufacturer: ['Gyártó'],
        operatorId: ['Üzemeltetői azonosító', 'Helyszín', 'Felhasználó'],
        yearOfManufacture: ['Gyártás éve']
    };

    const inspectionMapping = {
        kovetkezoIdoszakosVizsgalat: ['Következő időszakos vizsgálat', 'Érvényes'],
        vizsgalatEredmenye: ['Eredmény', 'Megállapítások'],
        felhasznaltAnyagok: ['Felhasznált anyagok'],
        feltartHiba: ['Feltárt hiba'],
        kovetkezoTerhelesiProba: ['Következő terhelési próba'],
        vizsgalatHelye: ['Vizsgálat helye'],
        vizsgalatIdopontja: ['Vizsgálat időpontja'],
        vizsgalatJellege: ['Vizsgálat jellege']
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

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const header = XLSX.utils.sheet_to_json(worksheet, {header: 1})[0];
                jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length > 0) {
                    displayTable(header, jsonData);
                    saveButton.style.display = 'block'; // Show the save button
                } else {
                    excelDataContainer.innerHTML = '<p class="text-center text-red-500">Az Excel fájl üres vagy nem sikerült feldolgozni.</p>';
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
                    break; 
                }
            }
        }
        return result;
    }
