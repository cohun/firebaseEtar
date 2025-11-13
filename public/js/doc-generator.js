import { db, storage } from './firebase.js';

let expertCache = {}; // Simple cache for expert data

/**
 * Displays or updates a loading modal.
 * @param {string} message The message to display.
 */
export function showLoadingModal(message) {
    let modal = document.getElementById('loading-modal');
    if (!modal) {
        const modalHtml = `
            <div id="loading-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div class="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <div class="loader mx-auto"></div>
                    <p id="loading-modal-message" class="mt-4 text-blue-300">${message}</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        const messageEl = document.getElementById('loading-modal-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
}

/**
 * Hides the loading modal.
 */
export function hideLoadingModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Fetches the certificate number for a given expert, using a cache.
 * @param {string} expertName The name of the expert.
 * @returns {Promise<string>} The certificate number.
 */
async function getExpertCertificateNumber(expertName) {
    if (expertCache[expertName]) {
        return expertCache[expertName];
    }
    try {
        const querySnapshot = await db.collection('experts').where('name', '==', expertName).limit(1).get();
        if (querySnapshot.empty) {
            return 'N/A';
        }
        const expertData = querySnapshot.docs[0].data();
        expertCache[expertName] = expertData.certificateNumber || 'N/A';
        return expertCache[expertName];
    } catch (error) {
        console.error(`Error fetching expert data for ${expertName}:`, error);
        return 'Hiba';
    }
}

/**
 * Generates a zip file with docx protocols from DRAFT inspections.
 * @param {string} templateName The name of the docx template file.
 * @param {object[]} drafts The array of selected draft objects.
 */
export async function generateZipFromDrafts(templateName, drafts) {
    showLoadingModal('Jegyzőkönyv piszkozatok generálása... Kérjük, várjon.');

    try {
        const templateRef = storage.ref(`templates/${templateName}`);
        const url = await templateRef.getDownloadURL();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Hiba a sablon letöltésekor: ${response.statusText}`);
        }
        const templateArrayBuffer = await response.arrayBuffer();

        const zip = new window.PizZip();

        for (let i = 0; i < drafts.length; i++) {
            const inspectionData = drafts[i]; // The draft is the inspection data
            showLoadingModal(`Feldolgozás: ${i + 1} / ${drafts.length} (${inspectionData.serialNumber || 'N/A'})...`);

            // Get partner and device data for the template
            const partnerDoc = await db.collection('partners').doc(inspectionData.partnerId).get();
            const deviceDoc = await db.collection('partners').doc(inspectionData.partnerId).collection('devices').doc(inspectionData.deviceId).get();

            if (!partnerDoc.exists || !deviceDoc.exists) {
                console.warn(`Partner vagy eszköz nem található a(z) ${inspectionData.id} piszkozathoz. Kihagyás.`);
                continue;
            }
            const partnerData = partnerDoc.data();
            const device = deviceDoc.data();

            const certNumber = await getExpertCertificateNumber(inspectionData.szakerto);

            const templateData = {
                partner_nev: partnerData.name || '',
                partner_cim: partnerData.address || '',
                eszkoz_megnevezes: device.description || '',
                sorszam: inspectionData.hash?.substring(0, 6).toUpperCase() || '',
                eszkoz_hossz: device.effectiveLength || '',
                eszkoz_teherbiras: device.loadCapacity || '',
                eszkoz_gyarto: device.manufacturer || '',
                eszkoz_azonosito: device.operatorId || '',
                eszkoz_gyari_szam: device.serialNumber || '',
                eszkoz_tipus: device.type || '',
                eszkoz_gyartasi_ev: device.yearOfManufacture || '',
                kelt_datum: inspectionData.createdAt?.toDate().toLocaleDateString('hu-HU') || '',
                felhasznalt_anyagok: inspectionData.felhasznaltAnyagok || '',
                feltart_hiba: inspectionData.feltartHiba || '',
                kovetkezo_idoszakos: inspectionData.kovetkezoIdoszakosVizsgalat || '',
                kovetkezo_terhelesi: inspectionData.kovetkezoTerhelesiProba || '',
                szakerto_nev: inspectionData.szakerto || '',
                vizsgalat_eredmenye: inspectionData.vizsgalatEredmenye || '',
                vizsgalat_helye: inspectionData.vizsgalatHelye || '',
                vizsgalat_idopontja: inspectionData.vizsgalatIdopontja || '',
                vizsgalat_jellege: inspectionData.vizsgalatJellege || '',
                szakerto_bizonyitvanyszam: certNumber,
                generalas_idobelyeg: new Date().toLocaleString('hu-HU'),
            };

            const doc = new window.docxtemplater(new window.PizZip(templateArrayBuffer), {
                paragraphLoop: true,
                linebreaks: true,
            });
            doc.setData(templateData);
            doc.render();

            const generatedDocBuffer = doc.getZip().generate({ type: 'arraybuffer' });
            const fileName = `piszkozat_${templateData.eszkoz_gyari_szam || inspectionData.deviceId}.docx`;
            zip.file(fileName, generatedDocBuffer);
        }

        const zipContent = zip.generate({ type: 'blob' });
        window.saveAs(zipContent, 'jegyzokonyv_piszkozatok.zip');

    } catch (error) {
        console.error("Hiba a piszkozatok generálása során:", error);
        alert(`Hiba történt a generálás közben: ${error.message}`);
    } finally {
        hideLoadingModal();
        expertCache = {};
    }
}


/**
 * Generates a zip file with docx protocols for the selected devices from the main list.
 * @param {string} templateName The name of the docx template file.
 * @param {object[]} devices The array of selected device objects.
 * @param {string} partnerId The ID of the current partner.
 */
export async function generateAndDownloadZip(templateName, devices, partnerId) {
    showLoadingModal('Jegyzőkönyvek generálása... Kérjük, várjon.');

    try {
        const partnerRef = db.collection('partners').doc(partnerId);
        const partnerDoc = await partnerRef.get();
        if (!partnerDoc.exists) {
            throw new Error('Partner nem található!');
        }
        const partnerData = partnerDoc.data();

        const templateRef = storage.ref(`templates/${templateName}`);
        const url = await templateRef.getDownloadURL();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Hiba a sablon letöltésekor: ${response.statusText}`);
        }
        const templateArrayBuffer = await response.arrayBuffer();

        const zip = new window.PizZip();

        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            showLoadingModal(`Feldolgozás: ${i + 1} / ${devices.length} (${device.serialNumber || 'N/A'})...`);

            const inspectionSnapshot = await db.collection('partners').doc(partnerId)
                .collection('devices').doc(device.id)
                .collection('inspections')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (inspectionSnapshot.empty) {
                console.warn(`Nincs vizsgálat a(z) ${device.id} eszközhöz. Kihagyás.`);
                continue;
            }
            const inspectionData = inspectionSnapshot.docs[0].data();

            const certNumber = await getExpertCertificateNumber(inspectionData.szakerto);

            const templateData = {
                partner_nev: partnerData.name || '',
                partner_cim: partnerData.address || '',
                eszkoz_megnevezes: device.description || '',
                sorszam: inspectionData.hash?.substring(0, 6).toUpperCase() || '',
                eszkoz_hossz: device.effectiveLength || '',
                eszkoz_teherbiras: device.loadCapacity || '',
                eszkoz_gyarto: device.manufacturer || '',
                eszkoz_azonosito: device.operatorId || '',
                eszkoz_gyari_szam: device.serialNumber || '',
                eszkoz_tipus: device.type || '',
                eszkoz_gyartasi_ev: device.yearOfManufacture || '',
                kelt_datum: inspectionData.createdAt?.toDate().toLocaleDateString('hu-HU') || '',
                felhasznalt_anyagok: inspectionData.felhasznaltAnyagok || '',
                feltart_hiba: inspectionData.feltartHiba || '',
                kovetkezo_idoszakos: inspectionData.kovetkezoIdoszakosVizsgalat || '',
                kovetkezo_terhelesi: inspectionData.kovetkezoTerhelesiProba || '',
                szakerto_nev: inspectionData.szakerto || '',
                vizsgalat_eredmenye: inspectionData.vizsgalatEredmenye || '',
                vizsgalat_helye: inspectionData.vizsgalatHelye || '',
                vizsgalat_idopontja: inspectionData.vizsgalatIdopontja || '',
                vizsgalat_jellege: inspectionData.vizsgalatJellege || '',
                szakerto_bizonyitvanyszam: certNumber,
                generalas_idobelyeg: new Date().toLocaleString('hu-HU'),
            };

            const doc = new window.docxtemplater(new window.PizZip(templateArrayBuffer), {
                paragraphLoop: true,
                linebreaks: true,
            });
            doc.setData(templateData);
            doc.render();

            const generatedDocBuffer = doc.getZip().generate({ type: 'arraybuffer' });
            const fileName = `jegyzokonyv_${templateData.eszkoz_gyari_szam || device.id}.docx`;
            zip.file(fileName, generatedDocBuffer);
        }

        const zipContent = zip.generate({ type: 'blob' });
        window.saveAs(zipContent, 'jegyzokonyvek.zip');

    } catch (error) {
        console.error("Hiba a jegyzőkönyvek generálása során:", error);
        alert(`Hiba történt a generálás közben: ${error.message}`);
    } finally {
        hideLoadingModal();
        expertCache = {};
    }
}


/**
 * Generates a single DOCX blob for a given draft and template.
 * This function is intended to be used by the finalization process.
 * @param {string} templateName The name of the docx template file.
 * @param {object} draft The draft object.
 * @param {ArrayBuffer} templateArrayBuffer The pre-loaded template content.
 * @returns {Promise<Blob>} A promise that resolves with the generated DOCX blob.
 */
async function generateSingleDocxBlob(templateName, draft, templateArrayBuffer) {
    // Get partner and device data for the template
    const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
    const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();

    if (!partnerDoc.exists || !deviceDoc.exists) {
        throw new Error(`Partner vagy eszköz nem található a(z) ${draft.id} piszkozathoz.`);
    }
    const partnerData = partnerDoc.data();
    const device = deviceDoc.data();

    const certNumber = await getExpertCertificateNumber(draft.szakerto);

    const templateData = {
        partner_nev: partnerData.name || '',
        partner_cim: partnerData.address || '',
        eszkoz_megnevezes: device.description || '',
        sorszam: draft.hash?.substring(0, 6).toUpperCase() || '',
        eszkoz_hossz: device.effectiveLength || '',
        eszkoz_teherbiras: device.loadCapacity || '',
        eszkoz_gyarto: device.manufacturer || '',
        eszkoz_azonosito: device.operatorId || '',
        eszkoz_gyari_szam: device.serialNumber || '',
        eszkoz_tipus: device.type || '',
        eszkoz_gyartasi_ev: device.yearOfManufacture || '',
        kelt_datum: draft.createdAt?.toDate().toLocaleDateString('hu-HU') || '',
        felhasznalt_anyagok: draft.felhasznaltAnyagok || '',
        feltart_hiba: draft.feltartHiba || '',
        kovetkezo_idoszakos: draft.kovetkezoIdoszakosVizsgalat || '',
        kovetkezo_terhelesi: draft.kovetkezoTerhelesiProba || '',
        szakerto_nev: draft.szakerto || '',
        vizsgalat_eredmenye: draft.vizsgalatEredmenye || '',
        vizsgalat_helye: draft.vizsgalatHelye || '',
        vizsgalat_idopontja: draft.vizsgalatIdopontja || '',
        vizsgalat_jellege: draft.vizsgalatJellege || '',
        szakerto_bizonyitvanyszam: certNumber,
        generalas_idobelyeg: new Date().toLocaleString('hu-HU'),
    };

    const doc = new window.docxtemplater(new window.PizZip(templateArrayBuffer), {
        paragraphLoop: true,
        linebreaks: true,
    });
    doc.setData(templateData);
    doc.render();

    return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}


/**
 * Generates a DOCX from a draft, uploads it to Firebase Storage, and returns the download URL.
 * @param {string} templateName The name of the template file.
 * @param {object} draft The draft object to be finalized.
 * @param {ArrayBuffer} templateArrayBuffer Pre-loaded template content.
 * @returns {Promise<string>} The download URL of the uploaded document.
 */
export async function generateAndUploadFinalizedDoc(templateName, draft, templateArrayBuffer) {
    // 1. Generate the DOCX blob
    const docxBlob = await generateSingleDocxBlob(templateName, draft, templateArrayBuffer);

    // 2. Define storage path and upload
    const storagePath = `generated-inspections/${draft.partnerId}/${draft.deviceId}/${draft.id}/jegyzokonyv_${draft.serialNumber || draft.id}.docx`;
    const storageRef = storage.ref(storagePath);
    const uploadTask = await storageRef.put(docxBlob);

    // 3. Get and return the download URL
    const downloadURL = await uploadTask.ref.getDownloadURL();
    return downloadURL;
}


/**
 * Fetches template names from Firebase Storage.
 * @returns {Promise<string[]>} A list of template names.
 */
export async function getTemplates() {
    const templatesRef = storage.ref('templates');
    const result = await templatesRef.listAll();
    const templates = result.items
        .map(itemRef => itemRef.name)
        .filter(name => name.toLowerCase().endsWith('.html') && name !== 'placeholder.html');
    return templates;
}

/**
 * Displays a modal for template selection.
 * @param {string[]} templates - Array of template names.
 * @param {Array} items - Array of device or draft objects to generate protocols for.
 * @param {string | null} partnerId - The ID of the current partner (can be null for drafts page).
 * @param {function} generationFunction - The function to call upon confirmation.
 */
export function showTemplateSelector(templates, items, partnerId, generationFunction) {
    const existingModal = document.getElementById('template-selection-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div id="template-selection-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
                <h2 class="text-2xl font-bold text-white mb-6">Jegyzőkönyv sablon kiválasztása</h2>
                <p class="text-gray-300 mb-4">
                    A kiválasztott ${items.length} db elemhez a következő sablonok érhetők el. Válasszon egyet a generáláshoz.
                </p>
                <div class="mb-6">
                    <label for="template-select" class="block text-sm font-medium text-gray-300 mb-2">Sablonok</label>
                    <select id="template-select" class="input-field w-full">
                        ${templates.length > 0 ? templates.map(template => `<option value="${template}">${template.replace('.html', '')}</option>`).join('') : '<option value="" disabled>Nincsenek elérhető sablonok.</option>'}
                    </select>
                </div>
                <div class="flex justify-end space-x-4">
                    <button id="cancel-template-selection" class="btn btn-secondary">Mégse</button>
                    <button id="confirm-template-selection" class="btn btn-primary" ${templates.length === 0 ? 'disabled' : ''}>Generálás</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('template-selection-modal');
    const cancelButton = document.getElementById('cancel-template-selection');
    const confirmButton = document.getElementById('confirm-template-selection');
    const templateSelect = document.getElementById('template-select');

    cancelButton.addEventListener('click', () => {
        modal.remove();
    });

    confirmButton.addEventListener('click', () => {
        const selectedTemplate = templateSelect.value;
        if (!selectedTemplate) {
            alert('Kérjük, válasszon egy sablont!');
            return;
        }
        modal.remove();
        // Call the provided generation function, passing the items array and partnerId if available
        generationFunction(selectedTemplate, items, partnerId);
    });
}