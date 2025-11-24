import { db, storage } from './firebase.js';

let expertCache = {}; // Simple cache for expert data

/**
 * Fetches the certificate number for a given expert, using a cache.
 * @param {string} expertName The name of the expert.
 * @returns {Promise<string>} The certificate number.
 */
async function getExpertCertificateNumber(expertName) {
    if (!expertName) return 'N/A';
    if (expertCache[expertName]) {
        return expertCache[expertName];
    }
    try {
        const querySnapshot = await db.collection('experts').where('name', '==', expertName).limit(1).get();
        if (querySnapshot.empty) {
            console.warn(`Expert not found: ${expertName}`);
            return 'N/A';
        }
        const expertData = querySnapshot.docs[0].data();
        const certNumber = expertData.certificateNumber || 'N/A';
        expertCache[expertName] = certNumber;
        return certNumber;
    } catch (error) {
        console.error(`Error fetching expert data for ${expertName}:`, error);
        return 'Hiba';
    }
}


// Egyszerű helyettesítő függvény a sablon feltöltéséhez
function populateTemplate(template, data) {
    let populated = template;
    // A {kulcs} formátumú helyőrzőket cseréli le a kapott adatokra
    populated = populated.replace(/\{(.+?)\}/g, (match, key) => {
        const value = data[key.trim()];
        // Ha az érték undefined vagy null, üres stringet adunk vissza, hogy ne jelenjen meg "undefined" a dokumentumban.
        return value === undefined || value === null ? '' : value;
    });
    return populated;
}

/**
 * Generates a finalized HTML document from a template and a draft object,
 * uploads it to Firebase Storage, and returns the download URL.
 * @param {string} templateHtml The HTML content of the template.
 * @param {object} draft The draft object to use for populating the template.
 * @returns {Promise<string>} The public download URL of the uploaded HTML file.
 */
export async function generateAndUploadFinalizedHtml(templateHtml, draft) {
    // --- NEW: Image Embedding Logic ---
    // Find all image tags with relative paths (not starting with http, https, or data:)
    const imgRegex = /<img[^>]+src="(?!(?:https|http|data):)([^"]+)"/g;
    const imagePaths = [...templateHtml.matchAll(imgRegex)].map(match => match[1]);
    const uniqueImagePaths = [...new Set(imagePaths)];

    for (const path of uniqueImagePaths) {
        try {
            const response = await fetch(path);
            const blob = await response.blob();
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            templateHtml = templateHtml.replace(new RegExp(`src="${path}"`, 'g'), `src="${dataUrl}"`);
        } catch (error) {
            console.warn(`Could not embed image from path: ${path}. It might be missing.`, error);
        }
    }
    // --- END: Image Embedding Logic ---

    if (!draft || !draft.partnerId || !draft.deviceId || !draft.id) {
        throw new Error("A piszkozat objektum hiányos (partnerId, deviceId, vagy id hiányzik).");
    }

    // 1. Fetch related data (partner, device, expert)
    const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
    const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();

    if (!partnerDoc.exists || !deviceDoc.exists) {
        throw new Error(`Partner vagy eszköz nem található a(z) ${draft.id} piszkozathoz.`);
    }
    const partnerData = partnerDoc.data();
    const device = deviceDoc.data();
    const certNumber = await getExpertCertificateNumber(draft.szakerto);

    // 2. Create the data mapping object for the template
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
        felhasznalt_anyagok: draft.felhasznaltAnyagok || 'Nem volt',
        feltart_hiba: draft.feltartHiba || 'Nem volt',
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

    // 3. Populate the HTML template
    const finalHtml = populateTemplate(templateHtml, templateData);

    // 4. Upload to Firebase Storage with the correct path
    const filePath = `generated-inspections/${draft.partnerId}/${draft.deviceId}/${draft.id}.html`;
    const fileRef = storage.ref(filePath);

    await fileRef.putString(finalHtml, 'raw', { contentType: 'text/html' });

    // 5. Return the download URL
    return fileRef.getDownloadURL();
}

/**
 * Generates a multi-page HTML preview for selected drafts and opens it in a new tab.
 * @param {string} _templateName - The template name (unused, for compatibility).
 * @param {object[]} drafts - The array of selected draft objects.
 */
export async function generateHtmlView(targetWindow, drafts) {
    if (!drafts || drafts.length === 0) {
        alert("Nincsenek kiválasztott piszkozatok a megjelenítéshez.");
        if (targetWindow) targetWindow.close();
        return;
    }

    try {
        // 1. Fetch the HTML template
        const response = await fetch('jkv.html');
        if (!response.ok) {
            throw new Error(`A 'jkv.html' sablon letöltése sikertelen.`);
        }
        const templateHtml = await response.text();

        // 2. Generate HTML for each draft
        let allGeneratedHtml = '';
        const generationTime = new Date();

        for (const draft of drafts) {
            const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
            const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();

            if (!partnerDoc.exists || !deviceDoc.exists) {
                console.warn(`Partner vagy eszköz nem található a(z) ${draft.id} piszkozathoz. Kihagyás.`);
                continue;
            }
            const partnerData = partnerDoc.data();
            const deviceData = deviceDoc.data();
            const certNumber = await getExpertCertificateNumber(draft.szakerto);

            const replacements = {
                '{partner_nev}': partnerData.name || '-',
                '{partner_cim}': partnerData.address || '-',
                '{sorszam}': draft.hash?.substring(0, 6).toUpperCase() || 'N/A',
                '{eszkoz_megnevezes}': deviceData.description || '-',
                '{eszkoz_azonosito}': deviceData.operatorId || '-',
                '{eszkoz_tipus}': deviceData.type || '-',
                '{eszkoz_hossz}': deviceData.effectiveLength || '-',
                '{eszkoz_teherbiras}': deviceData.loadCapacity || '-',
                '{eszkoz_gyarto}': deviceData.manufacturer || '-',
                '{eszkoz_gyari_szam}': deviceData.serialNumber || '-',
                '{eszkoz_gyartasi_ev}': deviceData.yearOfManufacture || '-',
                '{vizsgalat_idopontja}': draft.vizsgalatIdopontja || '-',
                '{vizsgalat_helye}': draft.vizsgalatHelye || '-',
                '{vizsgalat_jellege}': draft.vizsgalatJellege || '-',
                '{vizsgalat_eredmenye}': draft.vizsgalatEredmenye || '-',
                '{feltart_hiba}': draft.feltartHiba || 'Nem volt',
                '{felhasznalt_anyagok}': draft.felhasznaltAnyagok || 'Nem volt',
                '{kovetkezo_idoszakos}': draft.kovetkezoIdoszakosVizsgalat || '-',
                '{kovetkezo_terhelesi}': draft.kovetkezoTerhelesiProba || '-',
                '{kelt_datum}': draft.createdAt?.toDate().toLocaleDateString('hu-HU') || new Date().toLocaleDateString('hu-HU'),
                '{szakerto_nev}': draft.szakerto || '-',
                '{szakerto_bizonyitvanyszam}': certNumber,
                '{generalas_idobelyeg}': generationTime.toLocaleString('hu-HU'),
            };

            let finalHtml = templateHtml;
            for (const placeholder in replacements) {
                finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
            }
            allGeneratedHtml += finalHtml + '<div style="page-break-after: always;"></div>';
        }

        if (targetWindow) {
            targetWindow.document.open();
            targetWindow.document.write(allGeneratedHtml);
            targetWindow.document.close();
        } else {
             // Fallback if no window provided (should not happen with new logic, but good for safety)
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(allGeneratedHtml);
                newWindow.document.close();
            } else {
                 alert("A böngésző letiltotta a felugró ablakot.");
            }
        }

    } catch (error) {
        console.error("Hiba a HTML előnézet generálása közben:", error);
        if (targetWindow) {
             targetWindow.document.body.innerHTML = `<div style="color:red; padding: 20px;">Hiba történt: ${error.message}</div>`;
        }
        alert(`Hiba történt a HTML előnézet generálása közben: ${error.message}`);
    }
}
