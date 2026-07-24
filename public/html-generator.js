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

export function getDeviceCategory(deviceData) {
    if (!deviceData) return 'Teherfelvevő Eszköz';

    const name = deviceData.description || deviceData.eszkoz_megnevezes || deviceData.deviceName || '';
    const type = deviceData.type || deviceData.eszkoz_tipus || '';
    const manufacturer = deviceData.manufacturer || deviceData.eszkoz_gyarto || '';

    const normalize = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const combined = normalize(`${name} ${type} ${manufacturer}`);
    if (!combined.trim()) return 'Teherfelvevő Eszköz';

    // 1. Anyagmozgató Szerkezet (C.1 & C.2)
    const anyagmozgatoKws = [
        'targonca', 'raklapemelo', 'beka',
        'emeloasztal', 'szallitokocsi',
        'villahosszabbito', 'szerelokosar', 'szkt', 'szktd',
        'hordokezelo', 'hordobillento', 'flex hk',
        'billenokanal', 'ladakocsi', 'hulladektarolo',
        'daruvilla', 'rakatemelo',
        'mt 2005', 'koe 1008', 'sp 300', 'sp 500', 'sp 800', 'spt 500', 'sps 350', 'spf 680',
        'kt 2,5', 'kt 2.5', 'kt2,5', 'kt2.5', 'veh 2', 'veh2'
    ];

    for (const kw of anyagmozgatoKws) {
        if (combined.includes(kw)) {
            return 'Anyagmozgató Szerkezet';
        }
    }

    // 2. Emelőszerkezet (A.31 - A.35 & manual cranes/trolleys)
    const emeloszerkezetKws = [
        'lancos emelo', 'kezi lancos', 'chain hoist',
        'karos emelo', 'karos lancos', 'lever hoist',
        'fogasleces', 'olajemelo', 'palackemelo', 'steeljack',
        'vonszolo', 'kotelvonszolo', 'seilzug',
        'forditocsiga', 'kotelfordito',
        'csorlo', 'kotelcsorlo',
        'retraktor', 'balanszer', 'balancer', 'sulykiegyenlito',
        'futomacska', 'haladomu',
        'kito cb', 'kito cx', 'gutman gle', 'gle 2000', 'gle3000', 'gutman kml', 'kmlc', 'kmn', 'kito ts',
        'kito lb', 'kito lx', 'gutman gbe', 'kfe', 'gutman kkv', 'tecna'
    ];

    for (const kw of emeloszerkezetKws) {
        if (combined.includes(kw)) {
            return 'Emelőszerkezet';
        }
    }

    // 3. Teherfelvevő Eszköz (A.41 - A.47 & accessories)
    const teherfelvevoKws = [
        'heveder', 'korkotel', 'roundsling', 'irs',
        'lancfuggesztek', 'lanc-fuggesztek', 'kettengehange', 'lrg', 'lrgs',
        'drotfuggesztek', 'sodronykotel', 'drotkotel',
        'megfogo', 'lemezcsipesz', 'sinmegfogo', 'hordofogo', 'gerendamegfogo',
        'emelomagnes', 'magnes', 'neo', 'pml-c', 'maxx', 'fx-v',
        'emelogerenda', 'tehereloszto', 'beam lifting',
        'emeloszem', 'din 580', 'plgw',
        'horog', 'sekli', 'schakel', 'shackle', 'gyuru', 'szemescsavar', 'gyuruscsavar', 'forgoszem'
    ];

    for (const kw of teherfelvevoKws) {
        if (combined.includes(kw)) {
            return 'Teherfelvevő Eszköz';
        }
    }

    // 4. Default / Fallback
    return 'Teherfelvevő Eszköz';
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

    const categoryName = getDeviceCategory({ ...deviceData, ...draft });
    const categoryNameLower = categoryName.toLowerCase();

    // 2. Create a map of placeholders to data
    const replacements = {
        '{jkv_kategoria_nev}': categoryName,
        '{jkv_kategoria_nev_kisbetus}': categoryNameLower,
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