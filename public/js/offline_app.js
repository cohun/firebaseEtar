// offline_app.js - A PWA Offline működésének lelke

const db = new Dexie("ETAROfflineDB");
db.version(2).stores({
    meta: 'id',          // Általános adatok, beállítások, letöltés ideje, partner adatok
    devices: 'id, serialNumber, operatorId', // Eszközök listája
    drafts: 'id, gép_id', // Helyben létrehozott, szinkronizálásra váró piszkozatok
    logs: '++id, type'   // Módosítási napló (eszköz módosítások szinkronizáláshoz)
});

// Állapotváltozók
let currentUserRole = null;
let currentPartnerId = null;
let currentInspectionDevice = null;
let currentEditDevice = null; // null means adding a new device, otherwise holds the device object being edited
let offlineHeaderData = null; // Session-level cache for inspection header
let lastSavedDraftData = null; // Session-level cache for the copy previous data button
let activeTab = 'devices'; // 'devices' or 'drafts'

// Inicializálás az oldal betöltésekor
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Offline App indítása...");
    await loadInitialData();
    setupEventListeners();
});

// Biztonságos Adatbetöltés
async function loadInitialData() {
    try {
        const meta = await db.meta.get('current_session');
        if (!meta) {
            renderErrorState("Nincsenek elérhető offline adatok. Kérjük térjen vissza online módba és indítsa el a letöltést.");
            return;
        }

        currentUserRole = meta.userRole;
        currentPartnerId = meta.partnerId;

        // UI Frissítése
        document.getElementById('partnerNameDisplay').textContent = meta.partnerName || "Ismeretlen Partner";
        
        // Szerepkör alapú UI módosítás
        if (currentUserRole === 'ejk_admin' || currentUserRole === 'admin' || currentUserRole === 'writer') {
            document.getElementById('ejkTabs').classList.remove('hidden');
            updateDraftCounter();
        }

        // Eszközök betöltése
        await renderDeviceList();

    } catch (error) {
        console.error("Hiba az offline adatok betöltésekor:", error);
        renderErrorState("Adatbázis hiba: " + error.message);
    }
}

// Eszközök renderelése
async function renderDeviceList(searchTerm = '') {
    const container = document.getElementById('deviceListContainer');
    container.innerHTML = ''; // Clear loading

    let devices = await db.devices.toArray();
    console.log("[Offline] Raw devices total:", devices.length, devices);
    
    // Kereső logikája (egyszerű)
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        devices = devices.filter(d => 
            (d.serialNumber && d.serialNumber.toLowerCase().includes(lowerTerm)) || 
            (d.id && d.id.toLowerCase().includes(lowerTerm)) ||
            (d.description && d.description.toLowerCase().includes(lowerTerm)) ||
            (d.operatorId && String(d.operatorId).toLowerCase().includes(lowerTerm))
        );
    }

    if (devices.length === 0) {
        const totalRaw = await db.devices.count();
        container.innerHTML = `<div class="text-center p-6 text-slate-400">
            Nincs a keresésnek megfelelő eszköz. Kereső: "${searchTerm}". <br/>
            Adatbázisban lévő összes eszköz száma: <b>${totalRaw}</b>.
            Ha az összes 0, akkor a letöltés során nem érkezett meg az adat, vagy törlődött!
        </div>`;
        return;
    }

    // Get all draft device IDs for visual indicators
    const drafts = await db.drafts.toArray();
    const draftDeviceIds = new Set(drafts.map(d => d.deviceId));

    // Listázás UI (egyszerűsített dobozok)
    devices.forEach(device => {
        const isEjk = currentUserRole === 'ejk_admin' || currentUserRole === 'admin' || currentUserRole === 'writer';
        
        const nextVizsgDate = device.kov_vizsg || device.kov_vizsg_datum || 'N/A';
        let isExpired = false;
        
        if (nextVizsgDate !== 'N/A') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const vizsgDate = new Date(nextVizsgDate.replace(/\./g, '-')); // handle YYYY.MM.DD
            if (vizsgDate < today) {
                isExpired = true;
            }
        }

        let statusBadge = '';
        if (device.status === 'Megfelelt') {
            if (isExpired) {
                // Enyhe piros háttér, ha Megfelelt de lejárt
                statusBadge = '<span class="px-2 py-0.5 border rounded text-xs border-green-500 text-green-500 bg-red-900/40">Megfelelt</span>';
            } else {
                statusBadge = '<span class="px-2 py-0.5 border rounded text-xs border-green-500 text-green-500 bg-green-900/20">Megfelelt</span>';
            }
        } else if (device.status === 'Nem megfelelt') {
            statusBadge = '<span class="px-2 py-0.5 border rounded text-xs border-red-500 text-red-500 bg-red-900/20">Nem megfelelt</span>';
        } else {
            statusBadge = '<span class="px-2 py-0.5 border rounded text-xs border-gray-500 text-gray-500 bg-gray-900/20">Szerelés alatt</span>';
        }

        const dateTextColor = isExpired ? 'text-red-400 font-bold' : 'text-white';
        const nextVizsgHtml = `<div class="text-xs text-slate-400 mt-1 whitespace-nowrap text-right"><i class="far fa-calendar-alt mr-1"></i>Köv. vizsg: <span class="${dateTextColor}">${nextVizsgDate}</span></div>`;

        const hasDraft = draftDeviceIds.has(device.id);

        const card = document.createElement('div');
        card.className = 'card cursor-pointer border-slate-600 hover:border-blue-500 transition-colors duration-200';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="pr-2">
                    <h3 class="font-bold text-white text-base">${device.description || 'Névetlen eszköz'}</h3>
                    <p class="text-sm text-slate-400 mt-1">Op. ID: <span class="text-gray-200">${device.operatorId || 'N/A'}</span> | Gy.sz.: <span class="text-gray-200">${device.serialNumber || 'N/A'}</span></p>
                </div>
                <div class="flex flex-col items-end">
                    ${statusBadge}
                    ${nextVizsgHtml}
                </div>
            </div>
            <div class="flex gap-2 mt-4 border-t border-slate-700 pt-3">
                ${isEjk ? 
                    (hasDraft ? 
                        `<button class="btn-inspect text-green-400 hover:text-green-300 text-sm font-medium px-2 py-1"><i class="fa-solid fa-check-circle mr-1"></i> Vizsgálat kész</button>`
                        : `<button class="btn-inspect text-blue-400 hover:text-blue-300 text-sm font-medium px-2 py-1"><i class="fa-solid fa-clipboard-check mr-1"></i> Vizsgálat</button>`
                    ) : ''}
                ${isEjk ? `<button class="btn-edit-device text-yellow-400 hover:text-yellow-300 text-sm font-medium px-2 py-1 ml-auto"><i class="fa-solid fa-pen mr-1"></i> Szerkesztés</button>` : `<button class="text-slate-300 hover:text-white text-sm px-2 py-1 ml-auto"><i class="fa-solid fa-circle-info mr-1"></i> Részletek</button>`}
            </div>
        `;

        const inspBtn = card.querySelector('.btn-inspect');
        if (inspBtn) {
            inspBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openInspectionFlow(device);
            });
        }

        const editBtn = card.querySelector('.btn-edit-device');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeviceModal(device);
            });
        }

        // Kártya kattintás
        card.addEventListener('click', () => {
            if(!isEjk) alert("Eszköz részletek fejlesztés alatt: " + device.description);
        });

        container.appendChild(card);
    });
}

// Piszkozatok renderelése
async function renderDraftList() {
    const container = document.getElementById('deviceListContainer');
    container.innerHTML = ''; // Clear container

    let drafts = await db.drafts.toArray();
    
    if (drafts.length === 0) {
        container.innerHTML = `<div class="text-center p-6 text-slate-400">
            Nincs még elmentett piszkozat vizsgálat. A "Géplista" fülön indíthat újat.
        </div>`;
        return;
    }

    // Get device details for mapping descriptions
    let devices = await db.devices.toArray();
    const deviceMap = {};
    devices.forEach(d => { deviceMap[d.id] = d; });

    drafts.forEach(draft => {
        const dInfo = deviceMap[draft.deviceId] || { description: 'Ismeretlen Eszköz', serialNumber: 'N/A' };
        
        let resultColor = draft.vizsgalatEredmenye === 'Megfelelt' ? 'text-green-400' : 'text-red-400';
        
        let createdStr = "";
        if (draft.createdAt) {
            const d = new Date(draft.createdAt);
            createdStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }

        const card = document.createElement('div');
        card.className = 'card border-slate-600';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="pr-2">
                    <h3 class="font-bold text-white text-base">${dInfo.description}</h3>
                    <p class="text-sm text-slate-400 mt-1">Gy.sz.: <span class="text-gray-200">${dInfo.serialNumber}</span></p>
                </div>
                <div class="flex flex-col items-end">
                    <span class="px-2 py-0.5 rounded text-xs bg-indigo-900/40 text-indigo-400 border border-indigo-500/50 mb-1">Piszkozat</span>
                    <span class="text-xs text-slate-500">${createdStr}</span>
                </div>
            </div>
            
            <div class="mt-3 bg-slate-900/50 p-3 rounded text-sm text-slate-300">
                <div class="grid grid-cols-2 gap-2">
                    <div><span class="text-slate-500">Jelleg:</span> ${draft.vizsgalatJellege}</div>
                    <div><span class="text-slate-500">Szakértő:</span> ${draft.szakerto}</div>
                    <div><span class="text-slate-500">Dátum:</span> ${draft.vizsgalatIdopontja}</div>
                    <div><span class="text-slate-500">Eredmény:</span> <span class="${resultColor} font-semibold">${draft.vizsgalatEredmenye}</span></div>
                </div>
            </div>

            <div class="flex gap-2 mt-4 border-t border-slate-700 pt-3">
                <button class="btn-delete-draft text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1 ml-auto"><i class="fa-solid fa-trash mr-1"></i> Törlés</button>
            </div>
        `;

        const delBtn = card.querySelector('.btn-delete-draft');
        delBtn.addEventListener('click', async () => {
            if(confirm("Biztosan törli ezt a piszkozatot? Az offline rögzített adatok elvesznek.")) {
                await db.drafts.delete(draft.id);
                updateDraftCounter();
                renderDraftList(); // Re-render the list immediately
            }
        });

        container.appendChild(card);
    });
}

function renderErrorState(message) {
    const container = document.getElementById('deviceListContainer');
    container.innerHTML = `
        <div class="card border-red-800 bg-red-900/20 text-center py-8">
            <i class="fa-solid fa-triangle-exclamation text-red-500 text-4xl mb-3"></i>
            <h3 class="text-red-400 font-bold mb-2">Hiba a betöltéskor</h3>
            <p class="text-red-300 text-sm">${message}</p>
        </div>
    `;
}

async function updateDraftCounter() {
    const count = await db.drafts.count();
    const badge = document.getElementById('draftCounter');
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function openInspectionFlow(device) {
    currentInspectionDevice = device;
    if (!offlineHeaderData) {
        // Open Header Modal first
        document.getElementById('offHeaderDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('offlineHeaderModal').classList.remove('hidden');
    } else {
        // Skip straight to Inspection
        openInspectionResultModal();
    }
}

function openInspectionResultModal() {
    document.getElementById('modalDeviceName').textContent = `${currentInspectionDevice.description || 'Ismeretlen'} | Gy.sz.: ${currentInspectionDevice.serialNumber || 'N/A'}`;
    
    // Alapértelmezett értékek
    document.getElementById('offInspNextDate').value = '';
    document.getElementById('offInspNextTerhelesDate').value = '';
    document.getElementById('offInspDefects').value = '';
    document.getElementById('offInspMaterials').value = '';
    document.getElementById('offInspResult').value = 'Megfelelt';
    
    document.getElementById('offlineInspectionModal').classList.remove('hidden');
}

function closeAllModals() {
    currentInspectionDevice = null;
    currentEditDevice = null;
    document.getElementById('offlineHeaderModal').classList.add('hidden');
    document.getElementById('offlineInspectionModal').classList.add('hidden');
    document.getElementById('offlineDeviceModal').classList.add('hidden');
}

function openDeviceModal(device = null) {
    currentEditDevice = device;
    
    if (device) {
        document.getElementById('modalDeviceTitle').textContent = 'Eszköz Szerkesztése (Offline)';
        document.getElementById('offDeviceName').value = device.description || '';
        document.getElementById('offDeviceSerial').value = device.serialNumber || '';
        document.getElementById('offDeviceOperatorId').value = device.operatorId || '';
        document.getElementById('offDeviceType').value = device.type || '';
        document.getElementById('offDeviceManufacturer').value = device.manufacturer || '';
        document.getElementById('offDeviceLength').value = device.effectiveLength || '';
        document.getElementById('offDeviceYear').value = device.yearOfManufacture || '';
        document.getElementById('offDeviceWLL').value = device.loadCapacity || '';
    } else {
        document.getElementById('modalDeviceTitle').textContent = 'Új Eszköz Felvitele (Offline)';
        document.getElementById('offDeviceName').value = '';
        document.getElementById('offDeviceSerial').value = '';
        document.getElementById('offDeviceOperatorId').value = '';
        document.getElementById('offDeviceType').value = '';
        document.getElementById('offDeviceManufacturer').value = '';
        document.getElementById('offDeviceLength').value = '';
        document.getElementById('offDeviceYear').value = '';
        document.getElementById('offDeviceWLL').value = '';
    }
    
    document.getElementById('offlineDeviceModal').classList.remove('hidden');
}

function setupEventListeners() {
    // Header Modal events
    document.getElementById('closeHeaderModalBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelHeaderBtn').addEventListener('click', closeAllModals);

    document.getElementById('saveHeaderBtn').addEventListener('click', () => {
        const expert = document.getElementById('offHeaderExpert').value;
        const datum = document.getElementById('offHeaderDate').value;
        
        if (!expert || !datum) {
            alert("Szakértő és Vizsgálat időpontja megadása kötelező!");
            return;
        }

        offlineHeaderData = {
            vizsgalatJellege: document.getElementById('offHeaderType').value,
            szakerto: expert,
            vizsgalatHelye: document.getElementById('offHeaderLocation').value,
            vizsgalatIdopontja: datum
        };

        document.getElementById('offlineHeaderModal').classList.add('hidden');
        openInspectionResultModal();
    });

    // Device Modal events
    document.getElementById('closeDeviceModalBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelDeviceBtn').addEventListener('click', closeAllModals);
    
    const btnAddNewDevice = document.getElementById('btnAddNewDevice');
    if(btnAddNewDevice) btnAddNewDevice.addEventListener('click', () => openDeviceModal(null));

    document.getElementById('saveDeviceBtn').addEventListener('click', async () => {
        const name = document.getElementById('offDeviceName').value;
        const serial = document.getElementById('offDeviceSerial').value;
        const opId = document.getElementById('offDeviceOperatorId').value;
        const type = document.getElementById('offDeviceType').value;
        const manufacturer = document.getElementById('offDeviceManufacturer').value;
        const length = document.getElementById('offDeviceLength').value;
        const year = document.getElementById('offDeviceYear').value;
        const wll = document.getElementById('offDeviceWLL').value;

        if (!name) {
            alert("Eszköz megnevezése kötelező!");
            return;
        }

        try {
            if (currentEditDevice) {
                // Editing existing
                await db.devices.update(currentEditDevice.id, {
                    description: name,
                    serialNumber: serial,
                    operatorId: opId,
                    type: type,
                    manufacturer: manufacturer,
                    effectiveLength: length,
                    yearOfManufacture: year ? parseInt(year) : null,
                    loadCapacity: wll,
                    isEditedOffline: true
                });
            } else {
                // Adding new
                const pseudoId = 'offline_new_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                await db.devices.add({
                    id: pseudoId,
                    partnerId: currentPartnerId,
                    description: name,
                    serialNumber: serial,
                    operatorId: opId,
                    type: type,
                    manufacturer: manufacturer,
                    effectiveLength: length,
                    yearOfManufacture: year ? parseInt(year) : null,
                    loadCapacity: wll,
                    status: 'Szerelés alatt', // Default status for new devices
                    isNewOffline: true,
                    createdAt: new Date().getTime()
                });
            }
            
            closeAllModals();
            renderDeviceList(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '');
        } catch (err) {
            console.error("Hiba az eszköz mentésekor:", err);
            alert("Hiba történt az eszköz mentésekor: " + err.message);
        }
    });

    // Result Modal events
    document.getElementById('closeInspectionModalBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelInspectionBtn').addEventListener('click', closeAllModals);

    // Copy Previous Session Data (from lastSavedDraftData)
    document.getElementById('copyPreviousSessionDataBtn').addEventListener('click', () => {
        if (!lastSavedDraftData) {
            alert("Nincs korábban rögzített adat ebben a munkamenetben!");
            return;
        }
        document.getElementById('offInspResult').value = lastSavedDraftData.eredmeny || 'Megfelelt';
        document.getElementById('offInspNextDate').value = lastSavedDraftData.kovVizsg || '';
        document.getElementById('offInspNextTerhelesDate').value = lastSavedDraftData.kovTerheles || '';
        document.getElementById('offInspDefects').value = lastSavedDraftData.hiba || '';
        document.getElementById('offInspMaterials').value = lastSavedDraftData.anyag || '';
    });

    // Period buttons logic
    document.querySelectorAll('.off-period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const months = parseInt(e.target.dataset.months, 10);
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            
            const baseDateStr = offlineHeaderData ? offlineHeaderData.vizsgalatIdopontja : new Date().toISOString().split('T')[0];
            const baseDate = new Date(baseDateStr);
            baseDate.setMonth(baseDate.getMonth() + months);
            
            targetInput.value = baseDate.toISOString().split('T')[0];
        });
    });

    document.getElementById('saveInspectionBtn').addEventListener('click', async () => {
        if (!currentInspectionDevice || !offlineHeaderData) return;

        const eredmeny = document.getElementById('offInspResult').value;
        const kovVizsg = document.getElementById('offInspNextDate').value;
        const kovTerheles = document.getElementById('offInspNextTerhelesDate').value;
        const hiba = document.getElementById('offInspDefects').value;
        const anyag = document.getElementById('offInspMaterials').value;

        const draftId = 'draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        
        lastSavedDraftData = {
            eredmeny: eredmeny,
            kovVizsg: kovVizsg,
            kovTerheles: kovTerheles,
            hiba: hiba,
            anyag: anyag
        };

        const draftData = {
            id: draftId,
            deviceId: currentInspectionDevice.id,
            partnerId: currentInspectionDevice.partnerId || currentPartnerId,
            vizsgalatJellege: offlineHeaderData.vizsgalatJellege,
            szakerto: offlineHeaderData.szakerto,
            vizsgalatHelye: offlineHeaderData.vizsgalatHelye,
            vizsgalatIdopontja: offlineHeaderData.vizsgalatIdopontja,
            vizsgalatEredmenye: eredmeny,
            kovetkezoIdoszakosVizsgalat: kovVizsg,
            kovetkezoTerhelesiProba: kovTerheles,
            feltartHiba: hiba,
            felhasznaltAnyagok: anyag,
            createdAt: new Date().getTime(),
            status: 'draft',
            isOfflineDraft: true
        };

        try {
            await db.drafts.add(draftData);
            // alert('Piszkozat sikeresen mentve offline!'); // Optional to comment out if it's too annoying or keep it
            closeAllModals();
            updateDraftCounter();
            renderDeviceList(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '');
        } catch (err) {
            console.error("Hiba a mentéskor:", err);
            alert("Hiba történt a piszkozat mentésekor: " + err.message);
        }
    });

    // Kereső event
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        if(activeTab === 'drafts') {
            // Switch to devices tab if typing in search
            document.getElementById('tabDevices').click();
        }
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderDeviceList(e.target.value);
        }, 300);
    });

    // Tab Switching
    document.getElementById('tabDevices').addEventListener('click', (e) => {
        activeTab = 'devices';
        e.target.classList.add('border-blue-500', 'text-blue-400');
        e.target.classList.remove('border-transparent', 'text-slate-400');
        document.getElementById('tabDrafts').classList.remove('border-blue-500', 'text-blue-400');
        document.getElementById('tabDrafts').classList.add('border-transparent', 'text-slate-400');
        
        renderDeviceList(searchInput.value);
    });

    document.getElementById('tabDrafts').addEventListener('click', (e) => {
        activeTab = 'drafts';
        e.target.classList.add('border-blue-500', 'text-blue-400');
        e.target.classList.remove('border-transparent', 'text-slate-400');
        document.getElementById('tabDevices').classList.remove('border-blue-500', 'text-blue-400');
        document.getElementById('tabDevices').classList.add('border-transparent', 'text-slate-400');
        
        renderDraftList();
    });

    // Visszatérés online módba
    document.getElementById('btnReturnOnline').addEventListener('click', () => {
        if (!navigator.onLine) {
            alert("Visszatéréshez hálózati kapcsolat szükséges! Ellenőrizze a Wifit vagy Mobilnetet.");
            return;
        }
        
        // Ellenőrizzük van-e szinkronizálatlan adat
        db.drafts.count().then(count => {
            if (count > 0) {
                if(confirm(`Figyelem! Ön ${count} db új vizsgálatot rögzített offline.\n\nSzeretné ezeket felszinkronizálni a szerverre és visszatérni az online felületre?`)) {
                    alert("A szinkronizálás folyamata itt fog lefutni a 4. fázisban...");
                    // Később: syncDataThenRedirect()
                    window.location.href = 'app.html';
                }
            } else {
                window.location.href = 'app.html';
            }
        });
    });
}
