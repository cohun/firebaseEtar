import { db, storage } from './firebase.js';

let expertCache = {}; // Simple cache for expert data

/**
 * Fetches the certificate number for a given expert, using a cache.
 * @param {string} expertName The name of the expert.
 *returns {Promise<string>} The certificate number.
 */
async function getExpertCertificateNumber(expertName) {
    if (!expertName) return 'N/A';
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
 * Generates a single HTML file from a draft, uploads it to Firebase Storage, and returns the download URL.
 * @param {string} htmlTemplate The raw HTML template string.
 * @param {object} draft The draft object to be finalized.
 * @returns {Promise<string>} The download URL of the uploaded HTML document.
 */
export async function generateAndUploadFinalizedHtml(htmlTemplate, draft) {
    // 1. Fetch related data
    const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
    const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();

    if (!partnerDoc.exists || !deviceDoc.exists) {
        throw new Error(`Partner or device not found for draft ID ${draft.id}.`);
    }
    const partnerData = partnerDoc.data();
    const deviceData = deviceDoc.data();
    const certNumber = await getExpertCertificateNumber(draft.szakerto);

    // 2. Create a map of placeholders to data
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
        '{feltart_hiba}': draft.feltartHiba || '-',
        '{felhasznalt_anyagok}': draft.felhasznaltAnyagok || '-',
        '{kovetkezo_idoszakos}': draft.kovetkezoIdoszakosVizsgalat || '-',
        '{kovetkezo_terhelesi}': draft.kovetkezoTerhelesiProba || '-',
        '{kelt_datum}': draft.createdAt?.toDate().toLocaleDateString('hu-HU') || new Date().toLocaleDateString('hu-HU'),
        '{szakerto_nev}': draft.szakerto || '-',
        '{szakerto_bizonyitvanyszam}': certNumber,
        '{generalas_idobelyeg}': new Date().toLocaleString('hu-HU'),
    };

    // 3. Replace all placeholders in the template
    let finalHtml = htmlTemplate;
    for (const placeholder in replacements) {
        finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
    }

    // 4. Create a blob and upload to storage
    const htmlBlob = new Blob([finalHtml], { type: 'text/html' });
    const storagePath = `generated-inspections/${draft.partnerId}/${draft.deviceId}/${draft.id}/jegyzokonyv.html`;
    const storageRef = storage.ref(storagePath);
    const uploadTask = await storageRef.put(htmlBlob);

    // 5. Get and return the download URL
    return await uploadTask.ref.getDownloadURL();
}