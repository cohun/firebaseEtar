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

    // NEW: Handle 'Terhelési próba' specific template
    if (draft.vizsgalatJellege === 'Terhelési próba') {
        try {
            console.log("Loading specialized template: templates/load_test.html");
            const response = await fetch('templates/load_test.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`Template 'load_test.html' could not be loaded.`);
            return await response.text();
        } catch (error) {
            console.error("Error loading load_test.html:", error);
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

    // NEW: Handle 'Inspection of Lifting Accessories' (Bilingual HU/EN) specific template
    if (draft.vizsgalatJellege === 'Inspection of Lifting Accessories') {
        try {
            console.log("Loading specialized template: jkv_Bilingual.html");
            const response = await fetch('jkv_Bilingual.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`Template 'jkv_Bilingual.html' could not be loaded.`);
            return await response.text();
        } catch (error) {
            console.error("Error loading jkv_Bilingual.html:", error);
        }
    }


    
    // Default template logic
    // Check if expert name has EKV format "Name (Number)"
    // If so, use the specific EKV template
    const signatureName = draft.szakerto || '';
    if (signatureName.match(/^(.*)\s+\((.*)\)$/)) {
         try {
            console.log("Loading EKV specific template: jkv_ekv.html");
            const response = await fetch('jkv_ekv.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`Template 'jkv_ekv.html' could not be loaded.`);
            return await response.text();
         } catch (error) {
             console.error("Error loading jkv_ekv.html, falling back to default:", error);
         }
    }

    // Default H-ITB template
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
    // 1. Start with General Data (Partner, Device, Expert, etc.)
    const flat = { ...generalData };
    
    // 2. Merge UEVM Data
    // Note: uevm.js inputs often have 'uevm_' prefix, but template might use them directly.
    // However, our new uevm_template.html uses keys that MATCH the input names?
    // Let's check uevm_template.html vs uevm.js
    // uevm.js input: name="uevm_emelogepTipusa"
    // uevm_template.html: {{emelogepTipusa}}
    // So we DO need to strip 'uevm_' prefix for those specific fields.
    // BUT uevm_template.html ALSO uses {{uevm_dok_megjegyzes}} which matches input name.
    
    Object.keys(uevmData).forEach(key => {
        flat[key] = uevmData[key]; // Copy original key/value (e.g. uevm_dok_megjegyzes)
        
        // Strip uevm_ prefix for fields where template uses short name
        if (key.startsWith('uevm_')) {
            const cleanKey = key.replace('uevm_', '');
            // Only set if not already colliding with something important, or just overwrite?
            // Overwriting is usually safe for these specific fields.
            flat[cleanKey] = uevmData[key];
        }
    });

    // 3. Specific Field Mappings
    
    // Header mappings
    flat.jegyzokonyvSorszam = flat.sorszam; // alias
    flat.szakertoiCim = flat.szakertoiCim || flat.VizsgalaoCegCime || '';
    flat.specifikusSzabvany = flat.specifikusSzabvany || 'MSZ 9721-1:2020'; // Default if empty
    // Convert newlines to <br> for HTML rendering, bold the sub-headers, add spacing after semicolons
    if (flat.specifikusSzabvany) {
        flat.specifikusSzabvany = flat.specifikusSzabvany
            .replace(/\r\n/g, '\n')           // Normalize line endings
            .replace(/;\s*\n/g, ';<br>')       // Semicolon + newline → semicolon + <br>
            .replace(/\n\n/g, '<br><br>')      // Double newline (blank line) → double <br>
            .replace(/\n/g, '<br>')            // Remaining single newlines → <br>
            .replace(/(Jogszabályok:)/g, '<div style="margin-top: 2px; margin-bottom: 2px;"><strong>$1</strong></div>')
            .replace(/(Szabványok:)/g, '<div style="margin-top: 6px; margin-bottom: 2px;"><strong>$1</strong></div>');
    }

    // Inspector Override & Mapping
    // Template uses {{szakertoNev}} but general data has {{szakerto_nev}}
    flat.szakertoNev = flat.uevm_inspector_name || flat.szakerto_nev || '';
    flat.szakerto_nev = flat.szakertoNev; // Ensure both variable styles are updated
    // Template uses {{kamaraiSzam}} which matches general data, but we allow override
    if (flat.uevm_inspector_id) {
        flat.kamaraiSzam = flat.uevm_inspector_id;
    }

    // Next Exam Logic
    // uevm.js now has uevm_kovetkezo_vizsgalat (date) and uevm_kovetkezo_vizsgalat_jellege (text)
    // Map them to template's {{kovDatum}} and {{kovJelleg}}
    flat.kovDatum = flat.uevm_kovetkezo_vizsgalat || flat.kovetkezo_idoszakos || '';
    flat.kovJelleg = flat.uevm_kovetkezo_vizsgalat_jellege || 'Időszakos';

    // Checkboxes for current exam type (SzV, Fv, IBF)
    // uevm.js inputs: uevm_checkSzv, etc.
    const checkmark = 'X'; // Using X for simplicity in boxes, or checkmark char

    const isTrue = (val) => val === true || val === 'true' || val === 'on';

    flat.checkSzv = isTrue(flat.uevm_checkSzv) ? checkmark : '';
    flat.checkFv = isTrue(flat.uevm_checkFv) ? checkmark : '';
    flat.checkIbf = isTrue(flat.uevm_checkIbf) ? checkmark : '';

    // Handle Radio Result Logic for Detailed Rows (0, 1, 2, 3)
    // Data: uevm_dok_val = "3"
    // Template: {{#if uevm_dok_val_3}}X{{/if}}
    // We generate boolean keys like uevm_dok_val_3 = true
    Object.keys(uevmData).forEach(key => {
        if (key.endsWith('_val')) {
            const val = uevmData[key]; // e.g. "3"
            if (val) {
                flat[`${key}_${val}`] = true;
            }
        }
    });

    // Handle Load Test Results (ok, nok, na)
    // Data: uevm_resUj = "ok"
    // Template: {{resUjOk}}
    // Mapped via uevm_ stripping: resUj is available in flat now.
    
    if (flat.resUj === 'ok') flat.resUjOk = checkmark;
    if (flat.resUj === 'nok') flat.resUjNok = checkmark;

    if (flat.resUt === 'ok') flat.resUtOk = checkmark;
    if (flat.resUt === 'nok') flat.resUtNok = checkmark;

    if (flat.resTt === 'ok') flat.resTtOk = checkmark;
    if (flat.resTt === 'nok') flat.resTtNok = checkmark;
    if (flat.resTt === 'na') flat.resTtNa = checkmark;
    
    // Summary Qualification (Minősítés)
    // uevm_minosites = "w4"
    if (flat.uevm_minosites) {
        flat[`${flat.uevm_minosites}Box`] = checkmark; // e.g. w4Box
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
/**
 * Helper function to embed images as Base64 data URIs
 */
async function embedImagesInTemplate(templateHtml) {
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
    return templateHtml;
}

export async function generateAndUploadFinalizedHtml(templateHtml, draft) {
    // --- NEW: Image Embedding Logic (Standard Template) ---
    templateHtml = await embedImagesInTemplate(templateHtml);
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
    } else if (draft.vizsgalatJellege === 'Inspection of Lifting Accessories') {
        if (vizsgalatEredmenye === 'Megfelelt') {
            vizsgalatEredmenye = 'Megfelelt / Suitable';
        } else if (vizsgalatEredmenye === 'Nem felelt meg') {
            vizsgalatEredmenye = 'Nem felelt meg / Not suitable';
        }
    }
    // END: Bilingual Result Logic

    // --- Signature Logic ---
    let signatureName = draft.szakerto || '';
    let certNumber = expertDetails.certificateNumber;

    // Check if expert name has format "Name (Number)" - typical for EKV/Internal Inspector
    const nameMatch = signatureName.match(/^(.*)\s+\((.*)\)$/);
    if (nameMatch) {
         signatureName = nameMatch[1];
         // For EKV template, we pass the number directly without parens
         certNumber = nameMatch[2]; 
    }

    let nyilatkozat_szovege = '';
    if (draft.vizsgalatJellege === 'Terhelési próba') {
        const probaterheles = draft.probaterhelesMerteke || '-';
        if (draft.szemrevetelezesEredmenye === 'Sérült' || draft.mukodesiProbaEredmenye === 'Üzemképtelen') {
            nyilatkozat_szovege = `A meghatározott <strong>${probaterheles} kg</strong> próbaterhelést követően elvégzett szemrevételezéses vizsgálat alapján az eszközön maradandó károsodás tapasztalható. Az eszköz a próba során az alkalmazott terhelésnek nem állt ellen, szerkezeti integritása sérült.`;
        } else {
            nyilatkozat_szovege = `A meghatározott <strong>${probaterheles} kg</strong> próbaterhelést követően elvégzett szemrevételezéses vizsgálat alapján az eszközön maradandó alakváltozás, deformáció, repedés vagy egyéb károsodás nem tapasztalható. Az eszköz a próba során az alkalmazott terhelésnek ellenállt, szerkezeti integritása nem sérült.`;
        }
    }

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
        kelt_datum: new Date().toLocaleDateString('hu-HU'),
        felhasznalt_anyagok: draft.felhasznaltAnyagok || 'Nem volt',
        feltart_hiba: draft.feltartHiba || 'Nem volt',
        kovetkezo_idoszakos: draft.kovetkezoIdoszakosVizsgalat || '',
        kovetkezo_terhelesi: draft.kovetkezoTerhelesiProba || '',
        vizsgalat_eredmenye: vizsgalatEredmenye,
        vizsgalat_helye: draft.vizsgalatHelye || '',
        vizsgalat_helyszine: draft.vizsgalatHelye || '', // For load_test.html
        vizsgalat_idopontja: draft.vizsgalatIdopontja || '',
        vizsgalat_jellege: draft.vizsgalatJellege || '',
        szakerto_bizonyitvanyszam: certNumber, // Used for both templates (parens added in jkv.html, not in jkv_ekv.html)
        VizsgaloCegNeve: expertDetails.companyName,
        VizsgalaoCegCime: expertDetails.companyAddress,
        szakertoiCim: expertDetails.szakertoiCim,
        kamaraiSzam: expertDetails.kamaraiSzam,
        szakerto_nev: signatureName,
        vizsgalatot_vegezte: signatureName, // For load_test.html
        generalas_idobelyeg: new Date().toLocaleString('hu-HU'),
        alkalmazott_probaterheles: draft.probaterhelesMerteke || '-',
        terheles_időtartama: draft.terhelesIdotartama || '-',
        szemrevetelezes_eredmenye: draft.szemrevetelezesEredmenye || '-',
        mukodesi_proba_eredmenye: draft.mukodesiProbaEredmenye || '-',
        eszkoz_nevleges_teherbiras: device.loadCapacity || '-', // For load_test.html
        nyilatkozat_szovege: nyilatkozat_szovege, // For load_test.html
        jegyzokonyv_id: draft.hash?.substring(0, 6).toUpperCase() || '', // For load_test.html
    };

    // 3. Populate the HTML template
    let finalHtml = '';

    // NEW LOGIC: If UEVM data exists, use UEVM template as the PRIMARY template
    // This allows creating standalone UEVM reports without the wrapper.
    if (draft.uevmData && Object.keys(draft.uevmData).length > 0) {
        try {
            console.log("Generating standalone UEVM report...");
            // Fetch UEVM template
            const resp = await fetch('templates/uevm_template.html?v=' + new Date().getTime());
            if (resp.ok) {
                let uevmTemplate = await resp.text();
                // --- Embed images in UEVM template ---
                uevmTemplate = await embedImagesInTemplate(uevmTemplate);

                // Merge data: general templateData + UEVM specific data
                const mergedData = prepareUevmData(draft.uevmData, templateData);
                // Populate using the UEVM specific populator which handles {{#if}} blocks
                finalHtml = populateUevmTemplate(uevmTemplate, mergedData);
            } else {
                throw new Error("Could not fetch uevm_template.html");
            }
        } catch (e) {
            console.error("Error generating standalone UEVM report:", e);
            throw e; // Stop generation if critical template fails
        }
    } else {
        // Standard logic for other reports
        finalHtml = populateTemplate(templateHtml, templateData);
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
            } else if (draft.vizsgalatJellege === 'Inspection of Lifting Accessories') {
                if (vizsgalatEredmenye === 'Megfelelt') {
                    vizsgalatEredmenye = 'Megfelelt / Suitable';
                } else if (vizsgalatEredmenye === 'Nem felelt meg') {
                    vizsgalatEredmenye = 'Nem felelt meg / Not suitable';
                }
            }
            // END: Bilingual Result Logic

            // --- Signature Logic ---
            let signatureName = draft.szakerto || '-';
            let certNumber = expertDetails.certificateNumber;
        
            // Check if expert name has format "Name (Number)"
            const nameMatch = signatureName.match(/^(.*)\s+\((.*)\)$/);
            if (nameMatch) {
                 signatureName = nameMatch[1];
                 certNumber = nameMatch[2]; 
            }

            let nyilatkozat_szovege = '';
            if (draft.vizsgalatJellege === 'Terhelési próba') {
                const probaterheles = draft.probaterhelesMerteke || '-';
                if (draft.szemrevetelezesEredmenye === 'Sérült' || draft.mukodesiProbaEredmenye === 'Üzemképtelen') {
                    nyilatkozat_szovege = `A meghatározott <strong>${probaterheles} kg</strong> próbaterhelést követően elvégzett szemrevételezéses vizsgálat alapján az eszközön maradandó károsodás tapasztalható. Az eszköz a próba során az alkalmazott terhelésnek nem állt ellen, szerkezeti integritása sérült.`;
                } else {
                    nyilatkozat_szovege = `A meghatározott <strong>${probaterheles} kg</strong> próbaterhelést követően elvégzett szemrevételezéses vizsgálat alapján az eszközön maradandó alakváltozás, deformáció, repedés vagy egyéb károsodás nem tapasztalható. Az eszköz a próba során az alkalmazott terhelésnek ellenállt, szerkezeti integritása nem sérült.`;
                }
            }

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
                'vizsgalat_helyszine': draft.vizsgalatHelye || '-', // For load_test.html
                'vizsgalat_jellege': draft.vizsgalatJellege || '-',
                'vizsgalat_eredmenye': vizsgalatEredmenye,
                'feltart_hiba': draft.feltartHiba || 'Nem volt',
                'felhasznalt_anyagok': draft.felhasznaltAnyagok || 'Nem volt',
                'kovetkezo_idoszakos': draft.kovetkezoIdoszakosVizsgalat || '-',
                'kovetkezo_terhelesi': draft.kovetkezoTerhelesiProba || '-',
                'kelt_datum': draft.createdAt?.toDate().toLocaleDateString('hu-HU') || new Date().toLocaleDateString('hu-HU'),
                'szakerto_bizonyitvanyszam': certNumber,
                'VizsgaloCegNeve': expertDetails.companyName,
                'VizsgalaoCegCime': expertDetails.companyAddress,
                'szakertoiCim': expertDetails.szakertoiCim,
                'kamaraiSzam': expertDetails.kamaraiSzam || '',
                'szakerto_nev': signatureName,
                'vizsgalatot_vegezte': signatureName, // For load_test.html
                'generalas_idobelyeg': generationTime.toLocaleString('hu-HU'),
                'alkalmazott_probaterheles': draft.probaterhelesMerteke || '-',
                'terheles_időtartama': draft.terhelesIdotartama || '-',
                'szemrevetelezes_eredmenye': draft.szemrevetelezesEredmenye || '-',
                'mukodesi_proba_eredmenye': draft.mukodesiProbaEredmenye || '-',
                'eszkoz_nevleges_teherbiras': deviceData.loadCapacity || '-', // For load_test.html
                'nyilatkozat_szovege': nyilatkozat_szovege, // For load_test.html
                'jegyzokonyv_id': draft.hash?.substring(0, 6).toUpperCase() || 'N/A', // For load_test.html
            };


            let finalHtml = '';

            // NEW LOGIC: Standalone UEVM View
            if (draft.uevmData && Object.keys(draft.uevmData).length > 0 && uevmTemplateHtml) {
                 try {
                    console.log("Rendering standalone UEVM view for draft:", draft.id);
                    const mergedData = prepareUevmData(draft.uevmData, templateData);
                    finalHtml = populateUevmTemplate(uevmTemplateHtml, mergedData);
                 } catch (err) {
                     console.error("Error rendering standalone UEVM:", err);
                     finalHtml = "<h3>Hiba az UEVM megjelenítésekor.</h3>";
                 }
            } else {
                // Standard Logic
                try {
                    finalHtml = await getTemplateForDraft(draft);
                } catch (err) {
                    console.error("Template load error for draft:", draft.id, err);
                    finalHtml = "<h3>Hiba a sablon betöltésekor.</h3>";
                }
                finalHtml = populateTemplate(finalHtml, templateData);
            }

            // Append to all HTML (no appending UEVM here as it's either standalone or standard)
            // (If we wanted to support 'Standard + UEVM attached' mixed mode, we'd need checks, but current requirement is standalone)


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
