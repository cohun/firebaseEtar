import { db, storage } from './firebase.js';

let expertCache = {}; // Simple cache for expert data

/**
 * Fetches the certificate number for a given expert, using a cache.
 * @param {string} expertName The name of the expert.
 * @returns {Promise<string>} The certificate number.
 */
/**
 * Fetches the expert details (certificate number, company name, address) for a given expert.
 * @param {string} expertName The name of the expert.
 * @param {string} optUid Optional UID for fallback lookup (e.g. for EKV users).
 * @returns {Promise<object>} The expert details object { certificateNumber, companyName, companyAddress }.
 */
async function getExpertDetails(expertName, optUid) {
    if (!expertName) return { certificateNumber: 'N/A', companyName: '', companyAddress: '' };
    
    // Check cache
    if (expertCache[expertName]) {
        return expertCache[expertName];
    }

    let details = { certificateNumber: 'N/A', companyName: '', companyAddress: '', kamaraiSzam: '', szakertoiCim: '' };

    try {
        // 1. Try 'experts' collection first
        const querySnapshot = await db.collection('experts').where('name', '==', expertName).limit(1).get();
        
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            details.certificateNumber = data.certificateNumber || 'N/A';
            details.companyName = data.companyName || '';
            details.companyAddress = data.companyAddress || '';
            details.kamaraiSzam = data.kamaraiSzam || '';
        } else {
            console.warn(`Expert not found in 'experts' collection: ${expertName}. Trying users fallback...`);
            
            // 2. Fallback: Try 'users' collection if UID is provided
            if (optUid) {
                 const userDoc = await db.collection('users').doc(optUid).get();
                 if (userDoc.exists) {
                     const userData = userDoc.data();
                     // Corrected field names based on user feedback
                     details.certificateNumber = userData.certificateNumber || 'N/A';
                     details.companyName = userData.vizsgaloCegNeve || '';
                     details.companyAddress = userData.vizsgaloCegCime || '';
                     details.szakertoiCim = userData.szakertoiCim || userData.vizsgaloCegCime || ''; // Fallback to company address if specific expert address missing
                     details.kamaraiSzam = userData.kamaraiSzam || '';
                 }
            }
        }

        expertCache[expertName] = details;
        return details;

    } catch (error) {
        console.error(`Error fetching expert data for ${expertName}:`, error);
        return details;
    }
}

/**
 * Retrieves the appropriate HTML template for a given draft.
 * Checks for 'inspectionProtocol' field. If present, fetches from Firebase Storage.
 * Otherwise, returns the default 'jkv.html'.
 * @param {object} draft The draft document object.
 * @returns {Promise<string>} The HTML template string.
 */
export async function getTemplateForDraft(draft) {
    if (draft.inspectionProtocol && draft.inspectionProtocol.endsWith('.html')) {
        try {
            console.log(`Fetching custom protocol: ${draft.inspectionProtocol}`);
            // Note: We need to use valid Firebase Storage reference path.
            // Assuming 'templates/foreign-doc' is the path.
            const url = await storage.ref('templates/foreign-doc/' + draft.inspectionProtocol).getDownloadURL();
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch custom template: ${response.statusText}`);
            return await response.text();
        } catch (error) {
            console.error("Error fetching custom protocol, falling back to default:", error);
            // Fallback to default if custom fails? Or let it fail?
            // Let's fallback to ensure user sees something, but log error.
        }
    }

    // NEW: Handle 'Rögzítőeszköz vizsgálat' specific template
    if (draft.vizsgalatJellege === 'Rögzítőeszköz vizsgálat') {
        try {
            console.log("Loading specialized template: jkv_RLSK.html");
            const response = await fetch('jkv_RLSK.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`Template 'jkv_RLSK.html' could not be loaded.`);
            return await response.text();
        } catch (error) {
            console.error("Error loading jkv_RLSK.html:", error);
            // Fallback to default?
        }
    }

    // NEW: Handle 'Prüfung von Ladungssicherungsmitteln' specific template
    if (draft.vizsgalatJellege === 'Prüfung von Ladungssicherungsmitteln') {
        try {
            console.log("Loading specialized template: jkv_RLSK_Deutsch.html");
            const response = await fetch('jkv_RLSK_Deutsch.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`Template 'jkv_RLSK_Deutsch.html' could not be loaded.`);
            return await response.text();
        } catch (error) {
            console.error("Error loading jkv_RLSK_Deutsch.html:", error);
        }
    }

    // NEW: Handle 'Prüfung von Lastaufnahmemitteln' specific template
    if (draft.vizsgalatJellege === 'Prüfung von Lastaufnahmemitteln') {
        try {
            console.log("Loading specialized template: jkv_Deutsch.html");
            const response = await fetch('jkv_Deutsch.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`Template 'jkv_Deutsch.html' could not be loaded.`);
            return await response.text();
        } catch (error) {
            console.error("Error loading jkv_Deutsch.html:", error);
        }
    }


    
    // Default template
    const response = await fetch('jkv.html?v=' + new Date().getTime());
    if (!response.ok) throw new Error(`Default template 'jkv.html' could not be loaded.`);
    return await response.text();
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

// Prepares data for UEVM template by merging specific UEVM fields with general report data
function prepareUevmData(uevmData, generalData) {
    // 1. Flatten uevmData (it's already mostly flat but let's be sure)
    const flat = { ...uevmData };

    // 2. Add derived/general fields that are needed in the header
    // Use keys that match the UEVM Template {{ }} placeholders
    // Mappings based on uevm_template.html:
    // jegyzokonyvSorszam -> sorszam
    // szakertoNev -> szakerto_nev
    // jogosultsagSzam -> szakerto_bizonyitvanyszam
    // kovDatum -> kovetkezo_idoszakos (or calculated from inputs?)
    // kovJelleg -> (SzV/Fv/IBF based on checkboxes?)
    
    // Fallback/Defaults
    flat.jegyzokonyvSorszam = generalData.sorszam || generalData['{sorszam}'] || '';
    flat.szakertoNev = generalData.szakerto_nev || generalData['{szakerto_nev}'] || '';
    // Map additional expert details for footer - corrected to use szakertoiCim
    flat.szakertoiCim = generalData.szakertoiCim || generalData.VizsgalaoCegCime || ''; 
    flat.kamaraiSzam = generalData.kamaraiSzam || '';
    // Use kamaraiSzam if available for jogosultsagSzam placeholder, or keep original fallback
    flat.jogosultsagSzam = generalData.kamaraiSzam || generalData.szakerto_bizonyitvanyszam || '';

    // Next Exam Date from the UEVM data itself or main draft?
    // In partner.js uevmModal save, we capture what?
    // The uevm_template uses {{kovDatum}} and {{kovJelleg}}.
    // We should probably rely on main draft data for dates to ensure consistency, 
    // unless the UEVM form has specific overrides. 
    // The UEVM modal has checkboxes for type (SzV, Fv, IBF), but NOT next date.
    // The main form has 'kovetkezo_idoszakos'.
    
    flat.kovDatum = generalData.kovetkezo_idoszakos || generalData['{kovetkezo_idoszakos}'] || '';
    
    // Logic for next exam type? 
    // If current is Fv -> next is usually SzV.
    // Let's leave it empty or take from typical logic if available.
    // For now, mapping main draft values.
    flat.kovJelleg = 'Időszakos'; // Placeholder default
    


    // Map other fields that might have prefix 'uevm_' in JS but simple names in Template?
    // In uevm.js inputs are named name="uevm_emelogepTipusa". 
    // In template {{emelogepTipusa}}.
    // So we need to strip 'uevm_' prefix from keys for the template.
    Object.keys(flat).forEach(key => {
        if (key.startsWith('uevm_')) {
            const cleanKey = key.replace('uevm_', '');
            // Only copy if not already set (to preserve our custom logic above if any) -> actually we want to overwrite EXCEPT for checks
            if (!flat[cleanKey] || !cleanKey.startsWith('check')) {
                 flat[cleanKey] = flat[key];
            }
        }
    });

    // Handle Checkboxes correctly - MOVED AFTER FLATTENING to avoid overwrite
    // Checkboxes for current exam type
    // Ensure we clear any existing boolean values that might just print "true"
    // and replace with checkmark for the template.
    const checkmark = '✓'; 

    if (flat.uevm_checkSzv === true || flat.uevm_checkSzv === 'true' || flat.checkSzv === true || flat.checkSzv === 'true') {
        flat.checkSzv = checkmark;
    } else {
        flat.checkSzv = '';
    }

    if (flat.uevm_checkFv === true || flat.uevm_checkFv === 'true' || flat.checkFv === true || flat.checkFv === 'true') {
        flat.checkFv = checkmark;
    } else {
        flat.checkFv = '';
    }

    if (flat.uevm_checkIbf === true || flat.uevm_checkIbf === 'true' || flat.checkIbf === true || flat.checkIbf === 'true') {
        flat.checkIbf = checkmark;
    } else {
        flat.checkIbf = '';
    }

    // Handle Radio Result Logic for Detailed Rows
    // Template expects {{uevm_dok_val_3}}, etc.
    // Data has uevm_dok_val = "3".
    // We need to generate the boolean flags.
    // Iterate keys again
    Object.keys(flat).forEach(key => {
        if (key.endsWith('_val')) {
            const val = flat[key]; // e.g. "3"
            // Create boolean key: key + "_" + val -> uevm_dok_val_3 = true
            flat[`${key}_${val}`] = true;
        }
    });

    // Handle Load Test booleans
    // Data: uevm_resUj = "ok"
    // Template: {{resUjOk}}, {{resUjNok}}
    if (flat.resUj === 'ok') flat.resUjOk = 'X';
    if (flat.resUj === 'nok') flat.resUjNok = 'X';

    if (flat.resUt === 'ok') flat.resUtOk = 'X';
    if (flat.resUt === 'nok') flat.resUtNok = 'X';

    if (flat.resTt === 'ok') flat.resTtOk = 'X';
    if (flat.resTt === 'nok') flat.resTtNok = 'X';
    if (flat.resTt === 'na') flat.resTtNa = 'X';
    
    // Summary
    if (flat.minosites) {
        flat[`${flat.minosites}Box`] = 'X'; // w4Box, w3Box etc.
    }

    return flat;
}

// Helper to populate UEVM specific template with {{key}} and {{#if key}} logic
function populateUevmTemplate(template, data) {
    let populated = template;

    // 1. Handle {{#if key}}...{{/if}} blocks (simplistic approach for this specific template)
    // Matches {{#if key}}content{{/if}}
    const ifRegex = /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    populated = populated.replace(ifRegex, (match, key, content) => {
        const val = data[key.trim()];
        // If value is truthy (true, non-empty string, non-zero number), show content.
        // Special case: check for specific strings 'true' if data came from attributes
        const isTruthy = val === true || val === 'true' || (val && val !== 'false' && val !== 0 && val !== '0');
        return isTruthy ? content : '';
    });

    // 2. Handle simple {{key}} replacements
    const varRegex = /\{\{(.+?)\}\}/g;
    populated = populated.replace(varRegex, (match, key) => {
        const val = data[key.trim()];
        return (val !== undefined && val !== null) ? val : '';
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
    
    // Fetch expert details (Cert, Company Name, Address)
    const expertDetails = await getExpertDetails(draft.szakerto, draft.createdByUid);

    // 2. Create the data mapping object for the template
    
    // START: Bilingual Result Logic
    let vizsgalatEredmenye = draft.vizsgalatEredmenye || '';
    if (draft.vizsgalatJellege === 'Prüfung von Ladungssicherungsmitteln' || draft.vizsgalatJellege === 'Prüfung von Lastaufnahmemitteln') {
        if (vizsgalatEredmenye === 'Megfelelt') {
            vizsgalatEredmenye = 'Zugelassen/Megfelelt';
        } else if (vizsgalatEredmenye === 'Nem felelt meg') {
            vizsgalatEredmenye = 'Nicht zugelassen/Nem felelt meg';
        }
    }
    // END: Bilingual Result Logic

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
        vizsgalat_eredmenye: vizsgalatEredmenye,
        vizsgalat_helye: draft.vizsgalatHelye || '',
        vizsgalat_idopontja: draft.vizsgalatIdopontja || '',
        vizsgalat_jellege: draft.vizsgalatJellege || '',
        szakerto_bizonyitvanyszam: expertDetails.certificateNumber,
        VizsgaloCegNeve: expertDetails.companyName,
        VizsgalaoCegCime: expertDetails.companyAddress,
        szakertoiCim: expertDetails.szakertoiCim,
        kamaraiSzam: expertDetails.kamaraiSzam,
        generalas_idobelyeg: new Date().toLocaleString('hu-HU'),
    };

    // 3. Populate the HTML template
    let finalHtml = populateTemplate(templateHtml, templateData);

    // 3b. Append UEVM if exists
    if (draft.uevmData) {
        try {
            // Fetch template specifically for this generation
            // Try formatting data first
            const uevmDataMap = prepareUevmData(draft.uevmData, templateData);
            
            // Note: In a pure client-side function that might be called where relative paths differ, 
            // relying on fetch('templates/...') might be risky if current page isn't root. 
            // But usually this app structure is flat.
            const resp = await fetch('templates/uevm_template.html?v=' + new Date().getTime());
            if (resp.ok) {
                const uevmTemplate = await resp.text();
                const uevmPopulated = populateUevmTemplate(uevmTemplate, uevmDataMap);
                finalHtml += '<div style="page-break-before: always;"></div>' + uevmPopulated;
            } else {
                 console.warn("UEVM Template fetch failed during finalization.");
            }
        } catch (e) {
            console.error("Error attaching UEVM during finalization:", e);
        }
    }

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
        // 1. We don't fetch a single global template anymore. We fetch per draft.
        // const response = await fetch('jkv.html');
        // ...
        // const templateHtml = await response.text();

        // 2. Fetch UEVM template (optimistically)
        let uevmTemplateHtml = '';
        try {
            console.log("Fetching UEVM template from: templates/uevm_template.html");
            const resp = await fetch('templates/uevm_template.html?v=' + new Date().getTime());
            if (resp.ok) {
                uevmTemplateHtml = await resp.text();
                console.log("UEVM template fetched successfully, length:", uevmTemplateHtml.length);
            } else {
                console.warn("UEVM template fetch failed status:", resp.status);
            }
        } catch (e) {
            console.warn("UEVM sablon nem tölthető be:", e);
        }

        // 3. Generate HTML for each draft
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
            const expertDetails = await getExpertDetails(draft.szakerto, draft.createdByUid);

            // START: Bilingual Result Logic due to preview
            let vizsgalatEredmenye = draft.vizsgalatEredmenye || '-';
            if (draft.vizsgalatJellege === 'Prüfung von Ladungssicherungsmitteln' || draft.vizsgalatJellege === 'Prüfung von Lastaufnahmemitteln') {
                if (vizsgalatEredmenye === 'Megfelelt') {
                    vizsgalatEredmenye = 'Zugelassen/Megfelelt';
                } else if (vizsgalatEredmenye === 'Nem felelt meg') {
                    vizsgalatEredmenye = 'Nicht zugelassen/Nem felelt meg';
                }
            }
            // END: Bilingual Result Logic

            const templateData = {
                'partner_nev': partnerData.name || '-',
                'partner_cim': partnerData.address || '-',
                'sorszam': draft.hash?.substring(0, 6).toUpperCase() || 'N/A',
                'eszkoz_megnevezes': deviceData.description || '-',
                'eszkoz_azonosito': deviceData.operatorId || '-',
                'eszkoz_tipus': deviceData.type || '-',
                'eszkoz_hossz': deviceData.effectiveLength || '-',
                'eszkoz_teherbiras': deviceData.loadCapacity || '-',
                'eszkoz_gyarto': deviceData.manufacturer || '-',
                'eszkoz_gyari_szam': deviceData.serialNumber || '-',
                'eszkoz_gyartasi_ev': deviceData.yearOfManufacture || '-',
                'vizsgalat_idopontja': draft.vizsgalatIdopontja || '-',
                'vizsgalat_helye': draft.vizsgalatHelye || '-',
                'vizsgalat_jellege': draft.vizsgalatJellege || '-',
                'vizsgalat_eredmenye': vizsgalatEredmenye,
                'feltart_hiba': draft.feltartHiba || 'Nem volt',
                'felhasznalt_anyagok': draft.felhasznaltAnyagok || 'Nem volt',
                'kovetkezo_idoszakos': draft.kovetkezoIdoszakosVizsgalat || '-',
                'kovetkezo_terhelesi': draft.kovetkezoTerhelesiProba || '-',
                'kelt_datum': draft.createdAt?.toDate().toLocaleDateString('hu-HU') || new Date().toLocaleDateString('hu-HU'),
                'szakerto_nev': draft.szakerto || '-',
                'szakerto_nev': draft.szakerto || '-',
                'szakerto_bizonyitvanyszam': expertDetails.certificateNumber,
                'VizsgaloCegNeve': expertDetails.companyName,
                'VizsgalaoCegCime': expertDetails.companyAddress,
                'szakertoiCim': expertDetails.szakertoiCim,
                'kamaraiSzam': expertDetails.kamaraiSzam || '',
                'generalas_idobelyeg': generationTime.toLocaleString('hu-HU'),
            };


            let finalHtml = '';
            try {
                finalHtml = await getTemplateForDraft(draft);
            } catch (err) {
                 console.error("Template load error for draft:", draft.id, err);
                 finalHtml = "<h3>Hiba a sablon betöltésekor.</h3>";
            }

            finalHtml = populateTemplate(finalHtml, templateData);

            // Append UEVM if exists
            console.log("Checking for UEVM data in draft:", draft.id, "Has Data:", !!draft.uevmData, "Template Loaded:", !!uevmTemplateHtml);
            if (draft.uevmData && uevmTemplateHtml) {
                try {
                    console.log("Appending UEVM content...");
                    const uevmData = prepareUevmData(draft.uevmData, templateData); // Helper needed? Or just flatten
                    const uevmContent = populateUevmTemplate(uevmTemplateHtml, uevmData);
                    finalHtml += '<div style="page-break-before: always;"></div>' + uevmContent;
                } catch (err) {
                    console.error("Error generating UEVM content:", err);
                }
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
