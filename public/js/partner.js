import { getUevmModalHtml, initUevmModal } from './uevm.js';
import { auth, db, storage, updateDeviceChipId } from './firebase.js';


// ===================================================================================
// ESZKÖZLISTA NÉZET
// ===================================================================================

/**
 * Generates the HTML structure for the device list view (filters, table, pagination).
 * @returns {string} HTML string.
 */
function getEszkozListaHtml() {
    return `
        <div class="px-4 sm:px-6 lg:px-8">
            <div class="sm:flex sm:items-center">
                <div class="sm:flex-auto">
                    <h1 class="text-2xl font-semibold text-white">Eszközök</h1>
                    <p class="mt-2 text-sm text-gray-300">A partnerhez rendelt eszközök listája. A fejlécen kattintva rendezhet.</p>
                </div>
            </div>
            <!-- Szűrő és Kereső Vezérlők -->
            <div class="card mb-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-white">Szűrés és Keresés</h2>
                    
                    <!-- QR Print Button (Shown for all) -->
                    <button id="print-qr-btn" class="mr-4 px-3 py-1 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-500 transition-colors">
                        <i class="fas fa-print mr-2"></i>QR-kód nyomtatás
                    </button>

                    <!-- Validity Filter Switch -->
                    <div id="validity-filter-container" class="hidden xl:flex bg-gray-700 rounded-lg p-1 mx-4">
                        <button data-value="all" class="validity-filter-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">Összes</button>
                        <button data-value="valid" title="Eszközök érvényes minősítéssel és a jövőben esedékes vizsgálattal." class="validity-filter-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">Érvényes</button>
                        <button data-value="invalid" title="Eszközök érvénytelen minősítéssel vagy lejárt vizsgálattal." class="validity-filter-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">Érvénytelen</button>
                        <button data-value="due_soon" title="Hamarosan lejáró (45 napon belül), vagy lejárt de érvényes minősítésű eszközök." class="validity-filter-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">Vizsgálandók</button>
                    </div>

                    <!-- 3-Way Filter Switch -->
                    <div id="source-filter-container" class="hidden xl:flex bg-gray-700 rounded-lg p-1 mx-4">
                        <button data-value="all" class="filter-switch-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">Összes</button>
                        <button data-value="h-itb" class="filter-switch-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">H-ITB</button>
                        <button data-value="external" class="filter-switch-btn px-3 py-1 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">I-vizsgáló</button>
                    </div>

                    <button id="filter-hamburger-btn" class="text-white focus:outline-none xl:hidden">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                </div>
                <div id="filter-menu" class="hidden xl:flex xl:flex-nowrap xl:items-end xl:gap-2 space-y-4 xl:space-y-0">
                    <!-- Mobile Filters (Validity & Source) -->
                    <div class="flex flex-col space-y-2 xl:hidden p-2 bg-gray-800 rounded">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-gray-300">Érvényesség:</span>
                            <div class="flex bg-gray-700 rounded-lg p-1 flex-wrap">
                                <button data-value="all" class="validity-filter-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">Összes</button>
                                <button data-value="valid" title="Eszközök érvényes minősítéssel és a jövőben esedékes vizsgálattal." class="validity-filter-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">Érvényes</button>
                                <button data-value="invalid" title="Eszközök érvénytelen minősítéssel vagy lejárt vizsgálattal." class="validity-filter-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">Érvénytelen</button>
                                <button data-value="due_soon" title="Hamarosan lejáró (45 napon belül), vagy lejárt de érvényes minősítésű eszközök." class="validity-filter-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">Vizsgálandók</button>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-gray-300">Forrás:</span>
                            <div class="flex bg-gray-700 rounded-lg p-1">
                                <button data-value="all" class="filter-switch-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">Összes</button>
                                <button data-value="h-itb" class="filter-switch-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">H-ITB</button>
                                <button data-value="external" class="filter-switch-btn px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:text-white transition-colors">I-vizsgáló</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <label for="main-search-input" class="block text-xs font-medium text-gray-300 truncate">Gyári szám</label>
                        <input type="search" id="main-search-input" class="input-field w-full mt-1 text-sm" placeholder="Keresés...">
                    </div>
                    <div class="flex-1 min-w-0">
                        <label id="filter-operator-id-label" for="filter-operator-id" class="block text-xs font-medium text-gray-300 truncate">Operátor ID</label>
                        <input type="search" id="filter-operator-id" class="input-field w-full mt-1 text-sm" placeholder="Keresés...">
                    </div>
                    <div class="flex-1 min-w-0">
                        <label for="filter-vizsg-idopont" class="block text-xs font-medium text-gray-300 truncate">Vizsgálat dátuma</label>
                        <input type="text" id="filter-vizsg-idopont" class="input-field w-full mt-1 text-sm" placeholder="ÉÉÉÉ.HH.NN" maxlength="10">
                    </div>
                    <div class="flex-1 min-w-0">
                        <label for="filter-kov-vizsg" class="block text-xs font-medium text-gray-300 truncate">Következő vizsga</label>
                        <input type="text" id="filter-kov-vizsg" class="input-field w-full mt-1 text-sm" placeholder="ÉÉÉÉ.HH.NN" maxlength="10">
                    </div>
                    <div class="flex-none">
                        <button id="reset-filters-btn" class="menu-btn menu-btn-clear-filters w-full text-sm whitespace-nowrap px-3"><i class="fas fa-trash-alt fa-fw"></i> Szűrők</button>
                    </div>
                    <div class="flex-none flex items-center justify-center pb-2 px-2">
                        <input id="inactive-toggle" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600">
                        <label for="inactive-toggle" class="font-medium text-gray-300 ml-2 text-sm whitespace-nowrap">Inaktívak</label>
                    </div>
                    <div class="flex-none">
                        <button id="refresh-list-btn" class="menu-btn menu-btn-primary w-full text-sm whitespace-nowrap px-3"><i class="fas fa-sync-alt fa-fw"></i> Frissítés</button>
                    </div>
                    <div class="flex-none">
                        <button id="scan-chip-modal-btn" class="menu-btn text-glow w-full text-sm whitespace-nowrap px-3" style="background-color: #1f2937; border: 1px solid #3b82f6;"><i class="fas fa-expand fa-fw"></i> Beolvasás</button>
                    </div>
                </div>
            </div>

            <!-- Eszközök Táblázata -->
            <div class="mt-4 flex flex-col">
                <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table class="min-w-full divide-y divide-gray-700">
                                <thead class="bg-gray-800" style="display: none;">
                                    <tr>
                                        <th scope="col" class="relative px-6 py-3.5"></th>
                                        <th scope="col" data-sort="vizsg_idopont" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Vizsg. Időp. <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="description" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable active-sort">Megnevezés <i class="fas fa-sort-down"></i></th>
                                        <th scope="col" data-sort="type" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Típus <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="effectiveLength" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Hossz <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="serialNumber" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Gyári szám <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="operatorId" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Operátor ID <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="status" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Megállapítások <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="kov_vizsg" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Köv. Vizsg. <i class="fas fa-sort"></i></th>
                                        <th scope="col" class="whitespace-nowrap py-3.5 px-3 text-left text-sm font-semibold text-white">I<br><span class="text-xs font-normal">vizsgáló</span></th>
                                        <th scope="col" class="py-3.5 px-1 text-center"><span class="sr-only">Státusz</span></th>
                                        <th scope="col" class="whitespace-nowrap py-3.5 px-1 text-center text-sm font-semibold text-white">CHIP</th>
                                        <th scope="col" class="relative py-3.5 px-3"><span class="sr-only">QR</span></th>
                                    </tr>
                                </thead>
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th rowspan="2" class="p-3 relative"><input type="checkbox" id="select-all-checkbox" class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"></th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">Vizsg. Időp.</th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap relative">
                                            <div id="header-description-title" class="cursor-pointer text-blue-300 hover:text-blue-200 inline-flex items-center group">
                                                Megnevezés <i class="fas fa-filter ml-1 text-xs opacity-50 group-hover:opacity-100"></i>
                                            </div>
                                            <!-- Dropdown Menu -->
                                            <div id="description-filter-dropdown" class="hidden absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 text-left max-h-60 overflow-y-auto">
                                                <!-- Populated by JS -->
                                            </div>
                                        </th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">Típus</th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap group relative">
                                            Hossz 
                                            <i class="fas fa-weight-hanging text-gray-500 ml-1 group-hover:text-yellow-400 transition-colors duration-200" title="Teherbírás (WLL) megtekintéséhez húzza az egeret az érték fölé"></i>
                                        </th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">Gyári szám</th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">
                                            <div class="flex flex-col items-center relative group">
                                                <div class="flex items-center space-x-1 mb-1">
                                                    <div id="header-operator-id-title" class="cursor-pointer text-white hover:text-blue-200 inline-flex items-center group-filter">
                                                        <span>Op. ID</span> <i class="fas fa-filter ml-1 text-xs opacity-50 group-filter-hover:opacity-100"></i>
                                                    </div>
                                                    <button id="add-operator-category-btn" class="text-xs bg-gray-700 hover:bg-gray-600 text-green-400 font-bold rounded px-1.5 py-0.5" title="Új kategória">+</button>
                                                    <button id="delete-operator-category-btn" class="text-xs bg-gray-700 hover:bg-gray-600 text-red-400 font-bold rounded px-1.5 py-0.5 ml-1 hidden" title="Kategória törlése"><i class="fas fa-trash-alt"></i></button>
                                                </div>
                                                <select id="operator-category-select" class="block w-full text-xs bg-gray-700 border-gray-600 text-white rounded p-1 focus:ring-indigo-500 focus:border-indigo-500">
                                                    <option value="Default">Alap.</option>
                                                </select>
                                                
                                                <!-- Dropdown Menu for Operator ID Filter -->
                                                <div id="operator-id-filter-dropdown" class="hidden absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 text-left max-h-60 overflow-y-auto">
                                                    <!-- Populated by JS -->
                                                </div>
                                            </div>
                                        </th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">Megállapítások</th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap relative">
                                            <div id="header-kov-vizsg-title" class="cursor-pointer text-blue-300 hover:text-blue-200 inline-flex items-center group">
                                                Köv. Vizsg. <i class="fas fa-filter ml-1 text-xs opacity-50 group-hover:opacity-100"></i>
                                            </div>
                                            <!-- Dropdown Menu for Next Inspection -->
                                            <div id="kov-vizsg-filter-dropdown" class="hidden absolute top-full right-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 text-left max-h-60 overflow-y-auto">
                                                <!-- Populated by JS -->
                                            </div>
                                        </th>
                                        <th rowspan="2" class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">I<br><span class="text-xs font-normal">vizsgáló</span></th>
                                        <th rowspan="2" class="p-3"></th>
                                        <th class="p-3 text-center text-sm font-semibold text-white whitespace-nowrap">CHIP</th>
                                        <th rowspan="2" class="p-3"></th>
                                    </tr>
                                    <tr>
                                        <th data-sort="vizsg_idopont" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th data-sort="description" class="py-1 px-3 text-center text-sm font-semibold text-white sortable active-sort cursor-pointer"><i class="fas fa-sort-down"></i></th>
                                        <th data-sort="type" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th data-sort="effectiveLength" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th data-sort="serialNumber" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th data-sort="operatorId" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th data-sort="status" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th data-sort="kov_vizsg" class="py-1 px-3 text-center text-sm font-semibold text-white sortable cursor-pointer"><i class="fas fa-sort"></i></th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody id="eszköz-lista-body" class="divide-y divide-gray-800 bg-gray-900/50">
                                    <!-- Tartalom JS-ből -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Lapozó Vezérlők -->
            <nav id="pagination-controls" class="flex items-center justify-between border-t border-gray-700 px-4 py-3 sm:px-6" aria-label="Pagination">
                <div class="hidden sm:block">
                    <p id="pagination-info" class="text-sm text-gray-400"></p>
                </div>
                <div class="flex flex-1 justify-between sm:justify-end">
                    <button id="prev-page-btn" class="btn btn-secondary disabled:opacity-50" disabled>Előző</button>
                    <button id="next-page-btn" class="btn btn-secondary ml-3 disabled:opacity-50" disabled>Következő</button>
                </div>
            </nav>
        </div>
    `;
}

/**
 * Generates a SHA-256 hash of the input string.
 * @param {string} data The string to hash.
 * @returns {Promise<string>} The hexadecimal representation of the hash.
 */
async function generateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Robust date parser for Safari/Mobile compatibility.
 * Parses strings like "2025.12.01", "2025-12-01", "2025/12/01".
 * @param {string} dateStr 
 * @returns {Date|null}
 */
function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    // Split by any non-digit character (., -, /)
    const parts = dateStr.split(/[^0-9]/).filter(p => p.length > 0);
    if (parts.length >= 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        // Check if valid date
        if (!isNaN(d.getTime())) {
            d.setHours(0, 0, 0, 0);
            return d;
        }
    }
    return null;
}

/**
 * Initializes the device list logic (state, event listeners, initial fetch).
 * @param {string} partnerId The ID of the partner whose devices to display.
 */
export function initPartnerWorkScreen(partner, userData) {
    const partnerId = partner.id;
    console.log("initPartnerWorkScreen called", { partnerId, userData });
    
    // --- RESTORE INSPECTION STATE LOGIC ---
    // Check if we are returning from "New Device" creation to "New Inspection"
    const shouldReturnToInspection = sessionStorage.getItem('returnToNewInspection') === 'true';
    if (shouldReturnToInspection) {
        // We will handle the UI switch after screen definitions (moved down) or we can set a flag to trigger it later.
        // Let's set a timeout/callback to run after DOM is fully ready or just run it at the end of this init function?
        // Since this function initializes everything, running it at the end is better.
        // But we need to ensure the elements exist (they should be static in HTML).
        
        console.log("Restoring Inspection State...");
    }

    
    // Robust handling for missing userData
    const partnerRoles = (userData && userData.partnerRoles) ? userData.partnerRoles : {};
    const role = partnerRoles[partnerId] || null;
    const isEjkUser = (userData && userData.isEjkUser) || false;
    const isEkvUser = (userData && userData.isEkvUser) || false; // Define here for wider scope

    
    // Only restrict if explicitly read-only. Default to allowing edit to prevent locking out admins.
    const isReadOnly = (role === 'read' && !isEjkUser);
    
    console.log("Permissions:", { role, isEjkUser, isReadOnly, userDataPresent: !!userData });
    window.editDevice = function(deviceId) {
        if (isReadOnly) {
            alert('Olvasási jogosultság esetén nem lehetséges adatot módosítani. Kérjük, forduljon a jogosultság osztójához.');
            return;
        }
        console.log(`Redirecting to edit device: ${deviceId} for partner: ${partnerId}`);
        sessionStorage.setItem('editDeviceId', deviceId);
        sessionStorage.setItem('partnerIdForEdit', partnerId);
        sessionStorage.setItem('currentOperatorCategory', currentOperatorCategory);
        window.location.href = 'adatbevitel.html';
    };

    // --- SCREEN MANAGEMENT ---
    const deviceListScreen = document.getElementById('deviceListScreen');
    const newInspectionScreen = document.getElementById('newInspectionScreen');
    const finalizedDocsScreen = document.getElementById('finalizedDocsScreen');
    
    const showNewInspectionBtn = document.getElementById('showNewInspectionBtn');
    const showNewInspectionBtnMobile = document.getElementById('showNewInspectionBtnMobile');
    const backToDeviceListBtn = document.getElementById('backToDeviceListBtn');
    const partnerWorkScreenHeader = document.getElementById('partner-work-screen-header');

    const newUsageScreen = document.getElementById('newUsageScreen');
    const showNewUsageBtn = document.getElementById('showNewUsageBtn');
    const showNewUsageBtnMobile = document.getElementById('showNewUsageBtnMobile');
    const cancelUsageBtn = document.getElementById('cancelUsageBtn');
    const createUsageDocsBtn = document.getElementById('createUsageDocsBtn');

    function showScreen(screenToShow) {
        deviceListScreen.classList.remove('active');
        newInspectionScreen.classList.remove('active');
        if (newUsageScreen) newUsageScreen.classList.remove('active');

        screenToShow.classList.add('active');

        if (screenToShow === newInspectionScreen || screenToShow === newUsageScreen) {
            partnerWorkScreenHeader.classList.add('hidden');
            finalizedDocsScreen.classList.add('hidden');
        } else {
            partnerWorkScreenHeader.classList.remove('hidden');
            finalizedDocsScreen.classList.remove('hidden');
        }
    }

    if (showNewInspectionBtn) {
        showNewInspectionBtn.addEventListener('click', () => showScreen(newInspectionScreen));
    }
    if (showNewInspectionBtnMobile) {
        showNewInspectionBtnMobile.addEventListener('click', () => showScreen(newInspectionScreen));
    }
    
    // New Usage Listeners
    if (showNewUsageBtn) {
        showNewUsageBtn.addEventListener('click', handleNewUsageClick);
    }
    if (showNewUsageBtnMobile) {
        showNewUsageBtnMobile.addEventListener('click', handleNewUsageClick);
    }
    if (cancelUsageBtn) {
        cancelUsageBtn.addEventListener('click', () => showScreen(deviceListScreen));
    }
    if (createUsageDocsBtn) {
        createUsageDocsBtn.addEventListener('click', handleCreateUsageDocuments);
    }

    backToDeviceListBtn.addEventListener('click', () => showScreen(deviceListScreen));

    function handleNewUsageClick() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy eszközt!');
            return;
        }

        const selectedSystemIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
        const selectedDevs = currentDevices.filter(d => selectedSystemIds.includes(d.id));

        // Validation: Cannot have ANY next inspection date (must be N/A)
        const invalidDevices = selectedDevs.filter(d => d.kov_vizsg && d.kov_vizsg.trim() !== '');

        if (invalidDevices.length > 0) {
            const names = invalidDevices.map(d => d.serialNumber).join(', ');
            alert(`A használatba vétel csak új (vizsgálat nélküli) eszközökre indítható!\n\nA következő eszközök már rendelkeznek lejárati dátummal:\n${names}`);
            return;
        }
        
        // Populate table in New Usage Screen
        const tbody = document.getElementById('selectedUsageDevicesBody');
        if (tbody) {
            tbody.innerHTML = selectedDevs.map(d => `
                <tr>
                    <td class="px-4 py-2 text-sm text-white">${d.serialNumber || '-'}</td>
                    <td class="px-4 py-2 text-sm text-gray-300">${d.description || '-'}</td>
                    <td class="px-4 py-2 text-sm text-gray-300">${d.type || '-'}</td>
                    <td class="px-4 py-2 text-sm text-gray-300">${d.effectiveLength || '-'}</td>
                    <td class="px-4 py-2 text-sm text-gray-300">${d.loadCapacity || '-'}</td>
                </tr>
            `).join('');
        }

        showScreen(newUsageScreen);
    }

    // --- Usage Start Period Selection Logic ---
    const periodBtns = document.querySelectorAll('.period-select-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const months = parseInt(e.target.dataset.months);
            const usageDateInput = document.getElementById('usageDateInput');
            const nextDateInput = document.getElementById('nextInspectionDateInput');

            if (!usageDateInput.value) {
                alert('Kérjük, először adja meg a Használatba vétel dátumát!');
                return;
            }

            const baseDate = new Date(usageDateInput.value);
            // Add months
            baseDate.setMonth(baseDate.getMonth() + months);
            
            // Format to YYYY-MM-DD
            const nextDate = baseDate.toISOString().slice(0, 10);
            nextDateInput.value = nextDate;
        });
    });

    async function handleCreateUsageDocuments() {
        const usageDate = document.getElementById('usageDateInput').value;
        const nextDate = document.getElementById('nextInspectionDateInput').value;
        const approverName = document.getElementById('approverNameInput').value;
        const approverPosition = document.getElementById('approverPositionInput').value;
        
        const ceRadio = document.querySelector('input[name="ce_radio"]:checked');
        const certRadio = document.querySelector('input[name="mubizonylat_radio"]:checked');
        const manualRadio = document.querySelector('input[name="kezelesi_radio"]:checked');

        // Validation
        if (!usageDate || !nextDate || !approverName || !approverPosition) {
            alert('Kérjük, töltsön ki minden kötelező mezőt (Dátumok, Engedélyező, Beosztás)!');
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const selectedSystemIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
        const selectedDevs = currentDevices.filter(d => selectedSystemIds.includes(d.id));

        if (selectedDevs.length === 0) return;

        if (!confirm(`${selectedDevs.length} db eszköz használatba vétele és dokumentumok generálása. Biztosan folytatja?`)) {
            return;
        }
        
        const originalBtnText = createUsageDocsBtn.innerHTML;
        createUsageDocsBtn.disabled = true;
        createUsageDocsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Feldolgozás...';

        try {
            // Fetch template
            const templateResponse = await fetch('op-start.html');
            if (!templateResponse.ok) throw new Error("Sablon betöltése sikertelen");
            let templateText = await templateResponse.text();

            for (const device of selectedDevs) {
                // 1. Prepare Content
                let content = templateText;
                
                // Header Data
                content = content.replace(/{partner_nev}/g, partner.name || '-');
                content = content.replace(/{partner_cim}/g, partner.address || '-');
                
                // Device Data
                content = content.replace(/{eszkoz_megnevezes}/g, device.description || '-');
                content = content.replace(/{eszkoz_tipus}/g, device.type || '-');
                content = content.replace(/{eszkoz_hossz}/g, device.effectiveLength || '-');
                content = content.replace(/{eszkoz_gyarto}/g, device.manufacturer || '-');
                content = content.replace(/{eszkoz_gyari_szam}/g, device.serialNumber || '-');
                
                // Operator ID Logic (Respects current category)
                const operatorIdVal = currentOperatorCategory === 'Default' 
                        ? (device.operatorId || '- (Nincs azonosító)') 
                        : (device.customIds?.[currentOperatorCategory] || '- (Nincs azonosító)');
                content = content.replace(/{eszkoz_azonosito}/g, operatorIdVal);
                
                // Teherbírás logic (might store as loadCapacity or wll)
                // Checking currentDevices structure or just try both
                const teherbiras = device.loadCapacity || device.wll || '-';
                content = content.replace(/{eszkoz_teherbiras}/g, teherbiras);

                // Checkbox Data
                content = content.replace(/{ce_megvan}/g, ceRadio ? (ceRadio.value === 'Megvan' ? 'igen' : 'nem') : '-');
                content = content.replace(/{mubizonylat_megvan}/g, certRadio ? (certRadio.value === 'Megvan' ? 'igen' : 'nem') : '-');
                content = content.replace(/{kezelesi_megvan}/g, manualRadio ? (manualRadio.value === 'Megvan' ? 'igen' : 'nem') : '-');

                // Usage Data
                content = content.replace(/{hasznalatbavetel_datum}/g, usageDate.replace(/-/g, '.'));
                content = content.replace(/{kovetkezo_vizsgalat_datum}/g, nextDate.replace(/-/g, '.'));
                content = content.replace(/{jovahagyo_szemely}/g, `${approverName} / ${approverPosition}`);
                // content = content.replace(/{beosztas}/g, approverPosition); // Template doesn't have {beosztas}
                
                // Meta
                const now = new Date();
                const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
                const docId = `USE-${device.serialNumber}-${now.getTime()}`;
                
                content = content.replace(/{generalas_idobelyeg}/g, timestamp);
                content = content.replace(/{dokumentum_id}/g, docId);

                // 2. Upload to Storage
                const blob = new Blob([content], { type: 'text/html' });
                const storagePath = `partners/${partnerId}/usage_docs/${docId}.html`;
                const storageRef = storage.ref(storagePath);
                await storageRef.put(blob);
                const downloadUrl = await storageRef.getDownloadURL();

                // 3. Update Device Data
                // vizsg_idopont = usageDate, kov_vizsg_datum = nextDate
                await db.collection('partners').doc(partnerId).collection('devices').doc(device.id).update({
                    vizsg_idopont: usageDate.replace(/-/g, '.'),
                    kov_vizsg_datum: nextDate.replace(/-/g, '.'),
                    inspectionType: 'usage_start', // Special Flag
                    lastModificationDate: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 4. Create Report Record (so it appears in "Véglegesített Jegyzőkönyvek")
                await db.collection('partners').doc(partnerId).collection('reports').add({
                    date: usageDate.replace(/-/g, '.'),
                    deviceSerialNumber: device.serialNumber,
                    deviceName: device.description,
                    expertName: approverName, // Using approver as expert
                    storagePath: storagePath,
                    downloadUrl: downloadUrl,
                    type: 'usage_start',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            alert('Sikeres használatba vétel és dokumentum generálás!');
            showScreen(deviceListScreen);
            fetchDevices(); // Refresh list to show new dates

        } catch (error) {
            console.error("Hiba a használatba vétel során:", error);
            alert("Hiba történt a folyamat során: " + error.message);
        } finally {
            createUsageDocsBtn.disabled = false;
            createUsageDocsBtn.innerHTML = 'Dokumentumok létrehozása';
        }
    }


    // --- EXPERT LOADING LOGIC ---
    async function loadExperts() {
        const selectEl = document.getElementById('expertSelectNewInspection');
        if (!selectEl) return;

        try {
            const snapshot = await db.collection('experts').orderBy('name').get();
            const experts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            selectEl.innerHTML = '<option value="" disabled selected>Válassz egy szakértőt...</option>'; // Reset

            experts.forEach(expert => {
                const option = document.createElement('option');
                option.value = expert.name;
                option.textContent = expert.name;
                option.dataset.certificateNumber = expert.certificateNumber;
                selectEl.appendChild(option);
            });

        } catch (error) {
            console.error("Hiba a szakértők betöltésekor:", error);
            selectEl.innerHTML = '<option value="" disabled selected>Hiba a betöltés során</option>';
        }
    }

    // --- PROTOCOL LOADING LOGIC (EKV Users) ---
    async function loadProtocols() {
        const selectEl = document.getElementById('expertSelectNewInspection');
        if (!selectEl) return;

        try {
            // List files from Firebase Storage 'templates/foreign-doc'
            const listRef = storage.ref('templates/foreign-doc');
            const res = await listRef.listAll();

            selectEl.innerHTML = '<option value="" disabled selected>Válassz egy jegyzőkönyvet...</option>'; // Reset

            if (res.items.length === 0) {
                 const option = document.createElement('option');
                 option.disabled = true;
                 option.textContent = "Nincsenek elérhető jegyzőkönyvek";
                 selectEl.appendChild(option);
                 return;
            }

            res.items.forEach(itemRef => {
                const option = document.createElement('option');
                option.value = itemRef.name; // Use filename as value
                option.textContent = itemRef.name;
                selectEl.appendChild(option);
            });

        } catch (error) {
            console.error("Hiba a jegyzőkönyvek betöltésekor:", error);
            selectEl.innerHTML = '<option value="" disabled selected>Hiba a betöltés során</option>';
        }
    }


    // --- DEVICE LIST LOGIC ---
    let currentDevices = [];
    let itemsPerPage = 50;
    let currentSortField = 'description';
    let currentSortDirection = 'asc';
    let searchTerm = '';
    let searchTermOperatorId = ''; // New variable for Operator ID filtering
    
    // Operator ID Category State
    let currentOperatorCategory = 'Default';
    let availableOperatorCategories = ['Default'];

    let filters = {
        vizsg_idopont: '',
        kov_vizsg: '',
        kov_vizsg: '',
        description: '', // New filter
        operatorId: ''   // New filter
    };
    
    // --- SOURCE FILTER LOGIC ---
    let sourceFilter = 'all'; // 'all', 'h-itb', 'external'
    
    // --- VALIDITY FILTER LOGIC ---
    let validityFilter = sessionStorage.getItem('validityFilter') || 'all'; // 'all', 'valid', 'invalid', 'expired'
    if (sessionStorage.getItem('validityFilter')) {
        sessionStorage.removeItem('validityFilter');
    }
    
    // Determine default filter based on user type
    
    if (isEkvUser) {
        sourceFilter = 'external';
    } else if (isEjkUser) {
        sourceFilter = 'h-itb';
    } else {
        sourceFilter = 'all';
    }

    // --- QR Print Logic ---
    const printQrBtn = document.getElementById('print-qr-btn');

    if (printQrBtn) {
        printQrBtn.addEventListener('click', printSelectedQRCodes);
    }

    async function printSelectedQRCodes() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy eszközt a QR-kód nyomtatáshoz!');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('A felugró ablakok tiltva vannak. Kérjük, engedélyezze őket a nyomtatáshoz!');
            return;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>QR-kód Nyomtatás</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: flex-start;
                        padding: 20px;
                    }
                    .qr-item {
                        margin: 10px;
                        padding: 10px;
                        text-align: center;
                        width: 150px;
                        page-break-inside: avoid;
                    }
                    .qr-image {
                        width: 60px;
                        height: 60px;
                    }
                    .serial-number {
                        margin-top: 2px;
                        font-weight: bold;
                        font-size: 10px;
                        word-break: break-all;
                    }
                    @media print {
                        @page { margin: 10mm; }
                    }
                </style>
            </head>
            <body>
        `);

        // Use currentDevices to ensure we get the latest data matching visual state
        // Or fetch from DOM if currentDevices is not reliable for "checked" state (it is reliable for data)
        const deviceIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
        
        // Iterate and generate QR codes
        for (const checkbox of selectedCheckboxes) {
            const deviceId = checkbox.dataset.id;
            const device = currentDevices.find(d => d.id === deviceId);
            if (!device) continue;

            try {
                // Find existing canvas in the row
                const row = checkbox.closest('tr');
                const canvas = row ? row.querySelector('.qr-code-canvas') : null;
                
                let dataUrl;
                if (canvas) {
                    dataUrl = canvas.toDataURL('image/png');
                } else {
                    throw new Error("Canvas element not found in row");
                }

                printWindow.document.write(`
                    <div class="qr-item">
                        <img src="${dataUrl}" class="qr-image" />
                        <div class="serial-number">${device.serialNumber || 'N/A'}</div>
                    </div>
                `);
            } catch (err) {
                console.error(`Error retrieving QR for ${device.serialNumber}:`, err);
                 printWindow.document.write(`
                    <div class="qr-item">
                        <div>QR Error</div>
                        <div class="serial-number">${device.serialNumber || 'N/A'}</div>
                    </div>
                `);
            }
        }

        printWindow.document.write(`
            </body>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                }
            </script>
            </html>
        `);
        printWindow.document.close();
    }

    const sourceFilterContainer = document.getElementById('source-filter-container');
    const filterButtons = document.querySelectorAll('.filter-switch-btn');

    if (sourceFilterContainer) {
        if (isEkvUser) {
            sourceFilterContainer.style.display = 'none';
        } else {
            // Initialize UI
            updateFilterButtonsUI();

            filterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    sourceFilter = e.target.dataset.value;
                    updateFilterButtonsUI();
                    resetAndFetch();
                });
            });
        }
    }

    const validityFilterContainer = document.getElementById('validity-filter-container');
    const validityFilterButtons = document.querySelectorAll('.validity-filter-btn');

    if (validityFilterContainer) {
        // Initialize UI
        updateValidityFilterButtonsUI();

        validityFilterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                validityFilter = e.target.dataset.value;
                updateValidityFilterButtonsUI();
                resetAndFetch();
            });
        });
    }

    function updateValidityFilterButtonsUI() {
        validityFilterButtons.forEach(btn => {
            if (btn.dataset.value === validityFilter) {
                btn.classList.remove('text-gray-300', 'hover:text-white');
                if (validityFilter === 'valid') {
                    btn.classList.add('bg-green-600', 'text-white');
                } else if (validityFilter === 'invalid') {
                    btn.classList.add('bg-red-600', 'text-white');
                } else if (validityFilter === 'due_soon') {
                    btn.classList.add('bg-orange-600', 'text-white');
                } else {
                    btn.classList.add('bg-blue-600', 'text-white'); // Fallback/All color
                }
            } else {
                btn.classList.add('text-gray-300', 'hover:text-white');
                btn.classList.remove('bg-blue-600', 'bg-green-600', 'bg-red-600', 'bg-orange-600', 'text-white');
            }
        });
    }

    function updateFilterButtonsUI() {
        filterButtons.forEach(btn => {
            if (btn.dataset.value === sourceFilter) {
                btn.classList.remove('text-gray-300', 'hover:text-white');
                btn.classList.add('bg-blue-600', 'text-white');
            } else {
                btn.classList.add('text-gray-300', 'hover:text-white');
                btn.classList.remove('bg-blue-600', 'text-white');
            }
        });
    }
    
    let firstVisibleDoc = null;
    let lastVisibleDoc = null;
    let currentPage = 1;
    let currentView = 'active'; // Nézet váltó: 'active' vagy 'inactive'

    const tableBody = document.getElementById('eszköz-lista-body');
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const searchInput = document.getElementById('main-search-input');
    const operatorIdInput = document.getElementById('filter-operator-id'); // New input
    const vizsgIdopontInput = document.getElementById('filter-vizsg-idopont');
    const kovVizsgInput = document.getElementById('filter-kov-vizsg');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const refreshListBtn = document.getElementById('refresh-list-btn');
    const tableHeaders = document.querySelectorAll('th.sortable');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const inactiveToggle = document.getElementById('inactive-toggle');
    const deleteBtn = document.getElementById('delete-device-btn');
    const deleteBtnMobile = document.getElementById('delete-device-btn-mobile');
    const decommissionBtn = document.getElementById('decommission-reactivate-btn');
    const decommissionBtnMobile = document.getElementById('decommission-reactivate-btn-mobile');
    const scanChipModalBtn = document.getElementById('scan-chip-modal-btn');
    const filterHamburgerBtn = document.getElementById('filter-hamburger-btn');
    const filterMenu = document.getElementById('filter-menu');

    if(scanChipModalBtn) {
        scanChipModalBtn.addEventListener('click', showDigitalScanSelectionModal);
    }

    if (filterHamburgerBtn && filterMenu) {
        filterHamburgerBtn.addEventListener('click', () => {
            filterMenu.classList.toggle('hidden');
        });
    }

    // --- OPERATOR CATEGORY LOGIC ---
    const operatorCategorySelect = document.getElementById('operator-category-select');
    const addOperatorCategoryBtn = document.getElementById('add-operator-category-btn');
    const deleteOperatorCategoryBtn = document.getElementById('delete-operator-category-btn');

    async function loadOperatorCategories() {
        try {
            const partnerDoc = await db.collection('partners').doc(partnerId).get();
            if (partnerDoc.exists) {
                const data = partnerDoc.data();
                const categories = data.definedIdCategories || [];
                availableOperatorCategories = ['Default', ...categories];
                renderOperatorCategoryOptions();
            }
        } catch (error) {
            console.error("Error loading operator categories:", error);
        }
    }

    function renderOperatorCategoryOptions() {
        if (!operatorCategorySelect) return;
        operatorCategorySelect.innerHTML = availableOperatorCategories.map(cat => 
            `<option value="${cat}" ${cat === currentOperatorCategory ? 'selected' : ''}>${cat === 'Default' ? 'Alap.' : cat}</option>`
        ).join('');
        
        // Update styling immediately after rendering options (in case it's page load)
        updateOperatorIdLabelStyle();
    }

    if (addOperatorCategoryBtn) {
        addOperatorCategoryBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent sorting trigger if bubble up
            const newCategory = prompt("Adja meg az új kategória nevét (pl. Rendszám):");
            if (newCategory && newCategory.trim() !== "") {
                const sanitizedCat = newCategory.trim();
                if (availableOperatorCategories.includes(sanitizedCat)) {
                    alert("Ez a kategória már létezik!");
                    return;
                }

                try {
                    await db.collection('partners').doc(partnerId).update({
                        definedIdCategories: firebase.firestore.FieldValue.arrayUnion(sanitizedCat)
                    });
                    availableOperatorCategories.push(sanitizedCat);
                    renderOperatorCategoryOptions();
                    
                    // Auto-select the new category
                    operatorCategorySelect.value = sanitizedCat;
                    currentOperatorCategory = sanitizedCat;
                    sessionStorage.setItem('currentOperatorCategory', currentOperatorCategory); // Save to session
                    updateOperatorIdLabelStyle(); // Update style
                    fetchDevices();
                    
                    alert(`"${sanitizedCat}" kategória sikeresen hozzáadva!`);
                } catch (error) {
                    console.error("Error adding category:", error);
                    alert("Hiba történt a kategória hozzáadása közben.");
                }
            }
        });
    }

    if (deleteOperatorCategoryBtn) {
        deleteOperatorCategoryBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent sorting
            
            if (currentOperatorCategory === 'Default') return;

            const confirmMessage = `Biztosan törölni szeretné a(z) "${currentOperatorCategory}" kategóriát?\n\nFIGYELEM:\n1. A kategória eltűnik a listából.\n2. A hozzá tartozó adatok NEM törlődnek az eszközökről, csak elrejtésre kerülnek.\n3. Ha később újra létrehozza ugyanezt a kategóriát, az adatok újra láthatóvá válnak.`;

            if (confirm(confirmMessage)) {
                try {
                    await db.collection('partners').doc(partnerId).update({
                        definedIdCategories: firebase.firestore.FieldValue.arrayRemove(currentOperatorCategory)
                    });

                    // Update local state
                    availableOperatorCategories = availableOperatorCategories.filter(c => c !== currentOperatorCategory);
                    
                    // Reset to Default
                    currentOperatorCategory = 'Default';
                    sessionStorage.setItem('currentOperatorCategory', currentOperatorCategory);
                    
                    renderOperatorCategoryOptions();
                    operatorCategorySelect.value = 'Default'; // Ensure stored value matches prompt
                    updateOperatorIdLabelStyle();
                    fetchDevices();

                    alert("Kategória sikeresen törölve/elrejtve.");

                } catch (error) {
                    console.error("Error deleting category:", error);
                    alert("Hiba történt a kategória törlése közben.");
                }
            }
        });
    }

    function updateOperatorIdLabelStyle() {
        const label = document.getElementById('filter-operator-id-label');
        if (label) {
            label.textContent = currentOperatorCategory === 'Default' ? 'Operátor ID' : currentOperatorCategory;
            if (currentOperatorCategory !== 'Default') {
                label.classList.add('text-yellow-400');
                label.classList.remove('text-gray-300');
            } else {
                label.classList.remove('text-yellow-400');
                label.classList.add('text-gray-300');
            }
        }

        const dropdown = document.getElementById('operator-category-select');
        const deleteBtn = document.getElementById('delete-operator-category-btn');

        if (dropdown) {
            if (currentOperatorCategory !== 'Default') {
                dropdown.classList.add('text-yellow-400');
                dropdown.classList.remove('text-white');
                if (deleteBtn) deleteBtn.classList.remove('hidden'); // Show delete button
            } else {
                dropdown.classList.remove('text-yellow-400');
                dropdown.classList.add('text-white');
                if (deleteBtn) deleteBtn.classList.add('hidden'); // Hide delete button
            }
        }
    }

    if (operatorCategorySelect) {
        operatorCategorySelect.addEventListener('change', (e) => {
            currentOperatorCategory = e.target.value;
            sessionStorage.setItem('currentOperatorCategory', currentOperatorCategory); // Save to session
            
            // Reset Operator ID Filter when category changes
            filters.operatorId = '';
            updateOperatorIdHeaderStyle();

            updateOperatorIdLabelStyle();
            fetchDevices();
        });
        
        // Load initial categories
        // Restore from session if available
        const savedCategory = sessionStorage.getItem('currentOperatorCategory');
        if (savedCategory) {
            currentOperatorCategory = savedCategory;
        }
        
        loadOperatorCategories();
    }
    
    // --- OPERATOR ID FILTER PERSISTENCE ---
    // Restore saved filter value if exists
    const savedOperatorIdFilter = sessionStorage.getItem('operatorIdFilterValue');
    if (savedOperatorIdFilter) {
        searchTermOperatorId = savedOperatorIdFilter;
        if (operatorIdInput) {
            operatorIdInput.value = savedOperatorIdFilter;
        }
    }

    if (operatorIdInput) {
        operatorIdInput.addEventListener('input', (e) => {
            searchTermOperatorId = e.target.value.trim();
            sessionStorage.setItem('operatorIdFilterValue', searchTermOperatorId); // Save on input
            currentPage = 1;
            updateFilterButtonVisuals();
            fetchDevices();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
             // 1. Reset Internal State
            filters.vizsg_idopont = '';
            filters.kov_vizsg = '';
            filters.description = ''; 
            filters.operatorId = ''; 
            searchTerm = '';
            searchTermOperatorId = '';
            validityFilter = 'all'; // Reset validity filter

            // 2. Reset UI Inputs
            if (searchInput) searchInput.value = '';
            if (vizsgIdopontInput) vizsgIdopontInput.value = '';
            if (kovVizsgInput) kovVizsgInput.value = '';
            if (operatorIdInput) operatorIdInput.value = '';
            
            // 3. Reset Toggles & Switches
            if (inactiveToggle) {
                inactiveToggle.checked = false;
                currentView = 'active';
                updateUiForView();
            }
            
            // 4. Reset Header Styles
            updateDescriptionHeaderStyle(); 
            updateOperatorIdHeaderStyle(); 
            updateKovVizsgHeaderStyle(); 

            // 5. Clear Session Storage
            sessionStorage.removeItem('operatorIdFilterValue');
            sessionStorage.removeItem('validityFilter');

            // 6. Close Dropdowns
            if (descriptionDropdown) descriptionDropdown.classList.add('hidden');
            if (kovVizsgDropdown) kovVizsgDropdown.classList.add('hidden');
            if (operatorIdDropdown) operatorIdDropdown.classList.add('hidden'); // Assuming this exists or will exist

            // 7. Update Filter UI Buttons
            updateValidityFilterButtonsUI();
            if (sourceFilterContainer) {
                 // Reset source filter if needed? User didn't explicitly say, but usually yes. 
                 // Keeping source filter as is might be better if it's a "mode" (EKV vs HITB).
                 // Let's keep source filter as is for now, unless requested.
            }
            
            // 8. Update Button Visuals
            updateFilterButtonVisuals();

            // 9. Fetch Data
            fetchDevices();
        });
    }

    // New Function: Update Filter Button Color based on active state
    function updateFilterButtonVisuals() {
        if (!resetFiltersBtn) return;
        
        const hasActiveFilters = 
            (searchInput && searchInput.value.trim() !== '') ||
            (operatorIdInput && operatorIdInput.value.trim() !== '') ||
            (vizsgIdopontInput && vizsgIdopontInput.value.trim() !== '') ||
            (kovVizsgInput && kovVizsgInput.value.trim() !== '') ||
            validityFilter !== 'all' ||
            filters.description !== '' ||
            filters.operatorId !== '' ||
            (inactiveToggle && inactiveToggle.checked);

        // Remove old classes first to be safe
        resetFiltersBtn.classList.remove('menu-btn-primary', 'bg-green-600', 'hover:bg-green-700', 'bg-yellow-500', 'hover:bg-yellow-600', 'text-gray-900');
        
        // Base classes (keeping text-white usually, or black for yellow)
        resetFiltersBtn.classList.add('text-white'); 
        
        if (hasActiveFilters) {
            // Yellow Warning Style
            resetFiltersBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-gray-900'); // Dark text on yellow for contrast
             resetFiltersBtn.classList.remove('text-white'); // Remove white text for yellow bg
             resetFiltersBtn.innerHTML = '<i class="fas fa-filter fa-fw"></i> Szűrők (Aktív)';
        } else {
             // Default Green Style (matches other menu buttons roughly or specific style)
             // Original was just 'menu-btn' class which likely has some default. 
             // Let's check original HTML or adjacent buttons. 
             // Usually menu-btn might be blue/gray? User said "zöldről".
             // If user sees green, let's try to match that or just use standard secondary/primary.
             // Actually, the user PROBABLY meant the button looks "normal" (maybe green if they added custom css).
             // I see 'menu-btn-clear-filters' class in original code. 
             // Let's stick to a safe default (gray/blue) or explicitly green if requested "zöldről".
             // I will use a defined style or just standard class.
             // Let's assume 'menu-btn' gives it the default look.
             
             // Wait, the user said "zöldről". So it WAS green? 
             // I don't see explicit green class in previous code (menu-btn menu-btn-clear-filters).
             // Maybe custom CSS. I will apply a neutral style or 'bg-gray-600' as base, and yellow for active.
             
             resetFiltersBtn.style.backgroundColor = ''; // Reset inline styles if any
             resetFiltersBtn.classList.add('bg-gray-600', 'hover:bg-gray-500'); // Standard toolbar look
             resetFiltersBtn.innerHTML = '<i class="fas fa-trash-alt fa-fw"></i> Szűrők';
        }
    }

    // --- DESCRIPTION FILTER LOGIC ---
    const descriptionHeader = document.getElementById('header-description-title');
    const descriptionDropdown = document.getElementById('description-filter-dropdown');
    
    if (descriptionHeader && descriptionDropdown) {
        descriptionHeader.addEventListener('click', async (e) => {
            hideProminentTooltip();
            e.stopPropagation();
            
            // Toggle visibility
            const isHidden = descriptionDropdown.classList.contains('hidden');
            if (!isHidden) {
                descriptionDropdown.classList.add('hidden');
                return;
            }

            // Close other dropdowns if any (not implemented generic here, but good practice)
            
            // Show loading or cached
            descriptionDropdown.innerHTML = '<div class="p-2 text-gray-400 text-xs text-center">Megnevezések betöltése...</div>';
            descriptionDropdown.classList.remove('hidden');

            try {
                // Fetch ALL active devices to get unique descriptions
                // Optimization: We could cache this or use a separate stats collection. 
                // For now, fetching all (lightweight) is the most robust way to get accurate current list.
                
                // Use a simplified query just for descriptions? Firestore doesn't support "distinct" easily without reading docs.
                // We'll trust that fetching all for the partner isn't too massive (few thousands is ok).
                const snapshot = await db.collection('partners').doc(partnerId).collection('devices')
                    .where('comment', '==', currentView) // active or inactive
                    .orderBy('description') 
                    .get();

                const uniqueDescriptions = new Set();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.description) uniqueDescriptions.add(d.description.trim());
                });

                const sortedDescriptions = Array.from(uniqueDescriptions).sort();
                
                // Render List
                let html = `
                    <div class="description-filter-item px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 ${filters.description === '' ? 'bg-blue-900/50 font-bold' : ''}" data-value="">
                        Összes megjelenítése
                    </div>
                `;
                
                sortedDescriptions.forEach(desc => {
                    const isSelected = filters.description === desc;
                    html += `
                        <div class="description-filter-item px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 ${isSelected ? 'bg-blue-900/50 font-bold' : ''}" data-value="${desc.replace(/"/g, '&quot;')}">
                            ${desc}
                        </div>
                    `;
                });
                
                descriptionDropdown.innerHTML = html;
                
                // Add listeners to items
                const items = descriptionDropdown.querySelectorAll('.description-filter-item');
                items.forEach(item => {
                    item.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        filters.description = item.dataset.value;
                        updateDescriptionHeaderStyle();
                        descriptionDropdown.classList.add('hidden');
                        
                        // Reset pagination
                        currentPage = 1;
                        fetchDevices();
                    });
                });

            } catch (error) {
                console.error("Error fetching descriptions:", error);
                descriptionDropdown.innerHTML = '<div class="p-2 text-red-400 text-xs text-center">Hiba a betöltéskor</div>';
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!descriptionHeader.contains(e.target) && !descriptionDropdown.contains(e.target)) {
                 descriptionDropdown.classList.add('hidden');
            }
        });
    }

    // --- OPERATOR ID FILTER LOGIC ---
    const operatorIdHeader = document.getElementById('header-operator-id-title');
    const operatorIdDropdown = document.getElementById('operator-id-filter-dropdown');
    
    if (operatorIdHeader && operatorIdDropdown) {
        operatorIdHeader.addEventListener('click', async (e) => {
            hideProminentTooltip();
            e.stopPropagation();
            
            // Toggle visibility
            const isHidden = operatorIdDropdown.classList.contains('hidden');
            if (!isHidden) {
                operatorIdDropdown.classList.add('hidden');
                return;
            }

            // Close other dropdowns
            if (descriptionDropdown) descriptionDropdown.classList.add('hidden');
            if (kovVizsgDropdown) kovVizsgDropdown.classList.add('hidden');

            // Show loading
            operatorIdDropdown.innerHTML = '<div class="p-2 text-gray-400 text-xs text-center">ID-k betöltése...</div>';
            operatorIdDropdown.classList.remove('hidden');

            try {
                const snapshot = await db.collection('partners').doc(partnerId).collection('devices')
                    .where('comment', '==', currentView)
                    .get();

                const uniqueIds = new Set();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    let val = currentOperatorCategory === 'Default' 
                            ? (d.operatorId || '') 
                            : (d.customIds?.[currentOperatorCategory] || '');
                    
                    if (val !== null && val !== undefined) {
                         val = String(val).trim();
                         if (val) uniqueIds.add(val);
                    }
                });

                const sortedIds = Array.from(uniqueIds).sort();
                
                // Render List
                let html = `
                    <div class="operator-id-filter-item px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 ${filters.operatorId === '' ? 'bg-blue-900/50 font-bold' : ''}" data-value="">
                        Összes megjelenítése
                    </div>
                `;
                
                sortedIds.forEach(idVal => {
                    const isSelected = filters.operatorId === idVal;
                    html += `
                        <div class="operator-id-filter-item px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 ${isSelected ? 'bg-blue-900/50 font-bold' : ''}" data-value="${idVal.replace(/"/g, '&quot;')}">
                            ${idVal}
                        </div>
                    `;
                });
                
                operatorIdDropdown.innerHTML = html;
                
                // Add listeners
                const items = operatorIdDropdown.querySelectorAll('.operator-id-filter-item');
                items.forEach(item => {
                    item.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        filters.operatorId = item.dataset.value;
                        updateOperatorIdHeaderStyle();
                        operatorIdDropdown.classList.add('hidden');
                        
                        // Reset pagination
                        currentPage = 1;
                        fetchDevices();
                    });
                });

            } catch (error) {
                console.error("Error fetching operator IDs:", error);
                operatorIdDropdown.innerHTML = '<div class="p-2 text-red-400 text-xs text-center">Hiba a betöltéskor</div>';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            // Because the header is inside a flex container that might be clicked, we need careful targeting
            // But standard check usually works.
            if (!operatorIdHeader.contains(e.target) && !operatorIdDropdown.contains(e.target)) {
                 operatorIdDropdown.classList.add('hidden');
            }
        });
    }

    // --- NEXT INSPECTION FILTER LOGIC ---
    const kovVizsgHeader = document.getElementById('header-kov-vizsg-title');
    const kovVizsgDropdown = document.getElementById('kov-vizsg-filter-dropdown');

    if (kovVizsgHeader && kovVizsgDropdown) {
        kovVizsgHeader.addEventListener('click', async (e) => {
            hideProminentTooltip();
            e.stopPropagation();

            // Toggle visibility
            const isHidden = kovVizsgDropdown.classList.contains('hidden');
            if (!isHidden) {
                kovVizsgDropdown.classList.add('hidden');
                return;
            }

            // Close other dropdowns
            if (descriptionDropdown) descriptionDropdown.classList.add('hidden');

            // Show loading
            kovVizsgDropdown.innerHTML = '<div class="p-2 text-gray-400 text-xs text-center">Dátumok betöltése...</div>';
            kovVizsgDropdown.classList.remove('hidden');

            try {
                // Fetch ALL devices with inspections to get unique dates
                const devices = await getAllDevicesWithInspections();

                const uniqueDates = new Set();
                devices.forEach(d => {
                    const date = d.kov_vizsg; // Ensure this property is populated in getAllDevicesWithInspections
                    if (date) uniqueDates.add(date.trim());
                });

                // Sort dates
                const sortedDates = Array.from(uniqueDates).sort((a, b) => {
                    // Simple string sort works for YYYY.MM.DD, but let's be safe
                    return a.localeCompare(b);
                });

                // Render List
                let html = `
                    <div class="kov-vizsg-filter-item px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 ${filters.kov_vizsg === '' ? 'bg-blue-900/50 font-bold' : ''}" data-value="">
                        Összes megjelenítése
                    </div>
                `;

                sortedDates.forEach(dateStr => {
                    const isSelected = filters.kov_vizsg === dateStr;
                    html += `
                        <div class="kov-vizsg-filter-item px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 ${isSelected ? 'bg-blue-900/50 font-bold' : ''}" data-value="${dateStr}">
                            ${dateStr}
                        </div>
                    `;
                });

                kovVizsgDropdown.innerHTML = html;

                // Add listeners
                const items = kovVizsgDropdown.querySelectorAll('.kov-vizsg-filter-item');
                items.forEach(item => {
                    item.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const val = item.dataset.value;
                        filters.kov_vizsg = val;
                        
                        // Update text input
                        if (kovVizsgInput) kovVizsgInput.value = val;
                        
                        updateKovVizsgHeaderStyle();
                        kovVizsgDropdown.classList.add('hidden');

                        currentPage = 1;
                        fetchDevices();
                    });
                });

            } catch (error) {
                console.error("Error fetching dates:", error);
                kovVizsgDropdown.innerHTML = '<div class="p-2 text-red-400 text-xs text-center">Hiba a betöltéskor</div>';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!kovVizsgHeader.contains(e.target) && !kovVizsgDropdown.contains(e.target)) {
                 kovVizsgDropdown.classList.add('hidden');
            }
        });
    }

    // --- PROMINENT TOOLTIP INITIALIZATION ---
    if (kovVizsgHeader) {
        kovVizsgHeader.addEventListener('mouseenter', (e) => {
            showProminentTooltip(e, "Köv. Vizsg.", "Szűrés lejárati dátum alapján.<br>A listában szereplő időpontok közül választhat.");
        });
        kovVizsgHeader.addEventListener('mouseleave', () => {
            hideProminentTooltip();
        });
    }

    if (descriptionHeader) {
        descriptionHeader.addEventListener('mouseenter', (e) => {
            showProminentTooltip(e, "Megnevezés", "Szűrés megnevezés alapján.<br>Kattintson a listából való választáshoz.");
        });
        descriptionHeader.addEventListener('mouseleave', () => {
            hideProminentTooltip();
        });
    }

    if (operatorIdHeader) {
        operatorIdHeader.addEventListener('mouseenter', (e) => {
            showProminentTooltip(e, "Op. ID", "Szűrés Operátor ID alapján.<br>Válasszon a rendszerben lévő azonosítók közül.");
        });
        operatorIdHeader.addEventListener('mouseleave', () => {
            hideProminentTooltip();
        });
    }

    function updateKovVizsgHeaderStyle() {
        if (!kovVizsgHeader) return;
        const icon = kovVizsgHeader.querySelector('i');
        


        if (filters.kov_vizsg) {
            kovVizsgHeader.classList.add('text-yellow-400');
            kovVizsgHeader.classList.remove('text-blue-300', 'hover:text-blue-200');
            if (icon) {
                 icon.classList.remove('opacity-50');
                 icon.classList.add('opacity-100', 'text-yellow-400');
            }
        } else {
            kovVizsgHeader.classList.remove('text-yellow-400');
            kovVizsgHeader.classList.add('text-blue-300', 'hover:text-blue-200');
             if (icon) {
                 icon.classList.add('opacity-50');
                 icon.classList.remove('opacity-100', 'text-yellow-400');
            }
        }
    }
    function updateDescriptionHeaderStyle() {
        if (!descriptionHeader) return;
        const icon = descriptionHeader.querySelector('i');
        
        if (filters.description) {
            descriptionHeader.classList.add('text-yellow-400');
            descriptionHeader.classList.remove('text-blue-300', 'hover:text-blue-200');
            if (icon) {
                 icon.classList.remove('opacity-50');
                 icon.classList.add('opacity-100', 'text-yellow-400');
            }
        } else {
            descriptionHeader.classList.remove('text-yellow-400');
            descriptionHeader.classList.add('text-blue-300', 'hover:text-blue-200');
             if (icon) {
                 icon.classList.add('opacity-50');
                 icon.classList.remove('opacity-100', 'text-yellow-400');
            }
        }
    }

    function updateOperatorIdHeaderStyle() {
        if (!operatorIdHeader) return;
        const icon = operatorIdHeader.querySelector('i');
        
        if (filters.operatorId) {
            operatorIdHeader.classList.add('text-yellow-400');
            operatorIdHeader.classList.remove('text-white', 'hover:text-blue-200');
            if (icon) {
                 icon.classList.remove('opacity-50');
                 icon.classList.add('opacity-100', 'text-yellow-400');
            }
        } else {
            operatorIdHeader.classList.remove('text-yellow-400');
            operatorIdHeader.classList.add('text-white', 'hover:text-blue-200'); // Original was text-white
             if (icon) {
                 icon.classList.add('opacity-50');
                 icon.classList.remove('opacity-100', 'text-yellow-400');
            }
        }
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function updateUiForView() {
        if (currentView === 'inactive') {
            if (decommissionBtn) decommissionBtn.textContent = 'Újraaktiválás';
            if (decommissionBtnMobile) decommissionBtnMobile.textContent = 'Újraaktiválás';
            if (deleteBtn) deleteBtn.style.display = 'none';
            if (deleteBtnMobile) deleteBtnMobile.style.display = 'none';
        } else {
            if (decommissionBtn) decommissionBtn.textContent = 'Leselejtezés';
            if (decommissionBtnMobile) decommissionBtnMobile.textContent = 'Leselejtezés';
            if (deleteBtn) deleteBtn.style.display = '';
            if (deleteBtnMobile) deleteBtnMobile.style.display = '';
        }
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });
    }

    async function fetchDevices(direction = 'next') {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-4 text-gray-400">Adatok betöltése...</td></tr>`;

        try {
            let query = db.collection('partners').doc(partnerId).collection('devices')
                .where('comment', '==', currentView);

            // Removed server-side searchTerm query to allow client-side partial matching
            // if (searchTerm) {
            //     query = query.where('serialNumber', '==', searchTerm);
            // }
            
            // NOTE: Date filters are handled client-side below because the data is in a subcollection

            // Determine if we need client-side handling (filtering OR sorting by date OR complex source filtering OR search)
            // Added searchTerm to client-side logic triggers to allow for partial/case-insensitive matching
            const isDateFiltering = filters.vizsg_idopont || filters.kov_vizsg;
            const isDateSorting = ['vizsg_idopont', 'kov_vizsg'].includes(currentSortField);
            const useClientSideLogic = isDateFiltering || isDateSorting || sourceFilter === 'h-itb' || !!searchTerm || validityFilter !== 'all' || !!filters.description || !!filters.operatorId;

            if (!useClientSideLogic) {
                // Server-side filtering for 'external' (isI == true)
                if (sourceFilter === 'external') {
                    query = query.where('isI', '==', true);
                }
                
                query = query.orderBy(currentSortField, currentSortDirection);
            }

            let snapshot;
            let devices = [];

            if (useClientSideLogic) {
                // FETCH ALL for client-side filtering/sorting
                snapshot = await query.get();
            } else {
                // Standard Server-Side Pagination
                if (direction === 'next' && lastVisibleDoc) {
                    query = query.startAfter(lastVisibleDoc);
                } else if (direction === 'prev' && firstVisibleDoc) {
                    query = query.endBefore(firstVisibleDoc).limitToLast(itemsPerPage);
                } else {
                    query = query.limit(itemsPerPage);
                }
                snapshot = await query.get();
            }

            let rawDevices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch inspection data for ALL fetched devices
            const deviceDataPromises = rawDevices.map(async (device) => {
                // Latest inspection
                let latestInspectionQuery = db.collection('partners').doc(partnerId)
                    .collection('devices').doc(device.id)
                    .collection('inspections')
                    .orderBy('createdAt', 'desc')
                    .limit(1);

                if (isEkvUser) {
                    // EKV users only see works they created/finalized (assuming 'finalizedByUid' tracks finalizer)
                    // Note: 'createdByUid' is more appropriate for 'createdAt' sort, but finalizedByUid is better for 'finalized' reports.
                    // However, orderBy('createdAt') requires a composite index if filters are applied.
                    // For simplicity and avoiding index explosion, we might fetch and filter in memory if the list is small per device,
                    // OR rely on 'finalizedByUid' for finalized ones.
                    
                    // Since specific index creation might be needed, we'll try filtering by query.
                    // IMPORTANT: Firestore requires index for 'createdByUid' + 'createdAt'.
                    // If index is missing, this will fail. For now we assume logic correctness and user will create index.
                    latestInspectionQuery = latestInspectionQuery.where('createdByUid', '==', userData.uid || firebase.auth().currentUser.uid);
                }

                const latestInspectionSnapshot = await latestInspectionQuery.get().catch(e => {
                     console.warn("Error fetching latest inspection (likely missing index or permission):", e);
                     return { empty: true };
                });

                // Default device values (from checking db update of usage_start)
                // If usage_start happened, device.vizsg_idopont and device.kov_vizsg_datum might have been updated on the device doc itself.
                // But let's check prioritization.

                let hasLatestInspection = false;
                let latestInspectionData = null;

                if (!latestInspectionSnapshot.empty) {
                    latestInspectionData = latestInspectionSnapshot.docs[0].data();
                    hasLatestInspection = true;
                }

                // Check if 'usage_start' is strictly newer than the latest inspection or if there is no inspection
                // Usage Start updates the DEVICE document fields: 'vizsg_idopont', 'kov_vizsg_datum', 'inspectionType'
                // Real inspections create a document in 'inspections' subcollection.
                
                // Helper to parse date string YYYY.MM.DD to timestamp for comparison
                const parseTime = (dStr) => {
                    const d = parseDateSafe(dStr);
                    return d ? d.getTime() : 0;
                };

                const usageStartTime = (device.inspectionType === 'usage_start' && device.vizsg_idopont) ? parseTime(device.vizsg_idopont) : 0;
                const inspectionTime = (hasLatestInspection && latestInspectionData.vizsgalatIdopontja) ? parseTime(latestInspectionData.vizsgalatIdopontja) : 0;

                // LOGIC: If Usage Start exists AND is strictly newer than latest inspection, use Usage Start data
                // If dates are equal, we verify if it is really just usage start. 
                // But generally, if an inspection exists on the same day, we prefer the inspection status (e.g. Megfelelt).
                if (device.inspectionType === 'usage_start' && usageStartTime > inspectionTime) {
                    // Show Usage Start Data
                    device.vizsg_idopont = device.vizsg_idopont; // Already on device
                    device.status = "Üzembe helyezve";
                    device.kov_vizsg = device.kov_vizsg_datum; // Explicitly map from kov_vizsg_datum
                } else if (hasLatestInspection) {
                    // Show Inspection Data
                    device.vizsg_idopont = latestInspectionData.vizsgalatIdopontja;
                    device.status = latestInspectionData.vizsgalatEredmenye;
                    device.kov_vizsg = latestInspectionData.kovetkezoIdoszakosVizsgalat;
                    // Restore ajanlatKeres mapping
                    device.ajanlatKeres = latestInspectionData.ajanlatKeres || false;
                } else {
                    // No usage start active (or overridden/cleared) AND no inspection
                    // device properties might be empty or defaults
                }

                // Finalized inspection URL
                let finalizedInspectionQuery = db.collection('partners').doc(partnerId)
                    .collection('devices').doc(device.id)
                    .collection('inspections')
                    .where('status', '==', 'finalized')
                    .orderBy('finalizedAt', 'desc')
                    .limit(1);

                if (isEkvUser) {
                     finalizedInspectionQuery = finalizedInspectionQuery.where('finalizedByUid', '==', userData.uid || firebase.auth().currentUser.uid);
                }

                const finalizedInspectionSnapshot = await finalizedInspectionQuery.get().catch(e => {
                    console.warn("Error fetching finalized inspection (likely missing index or permission):", e);
                    return { empty: true };
                });

                if (!finalizedInspectionSnapshot.empty) {
                    device.finalizedFileUrl = finalizedInspectionSnapshot.docs[0].data().fileUrl;
                } 
                // Fallback: Check if device has a usage_start report in 'reports' collection? 
                // The prompt says "Jegyzkönyvek (Reports) button correctly displays documents... even if they haven't had a finalized inspection".
                // But specifically for the *list*, we might want to link the usage start doc?
                // The current code links `dev.finalizedFileUrl` to the QR icon.
                // If usage_start, maybe we should check for a report in 'reports' collection?
                // The 'handleCreateUsageDocuments' created a report in 'reports' collection.
                // We could query that here if needed, but for now let's stick to the visual column requirements.
                // The user asked about "Megállapítások" and "Köv. Vizsg.".

                return device;
            });

            devices = await Promise.all(deviceDataPromises);

            // Client-Side Logic (Filtering & Sorting)
            if (useClientSideLogic) {
                // Helper function to normalize dates (replace / and - with .)
                const normalizeDate = (dateStr) => {
                    if (!dateStr) return '';
                    return dateStr.replace(/[\/\-]/g, '.');
                };

                // 1. Filtering
                if (filters.vizsg_idopont) {
                    const filterDate = normalizeDate(filters.vizsg_idopont);
                    devices = devices.filter(d => normalizeDate(d.vizsg_idopont).includes(filterDate));
                }
                if (filters.kov_vizsg) {
                    const filterDate = normalizeDate(filters.kov_vizsg);
                    devices = devices.filter(d => normalizeDate(d.kov_vizsg).includes(filterDate));
                }

                // Description Filtering (New)
                if (filters.description) {
                    devices = devices.filter(d => (d.description || '').trim() === filters.description);
                }

                // Operator ID Filtering (New - Dropdown)
                if (filters.operatorId) {
                    devices = devices.filter(d => {
                        let val = currentOperatorCategory === 'Default' 
                            ? (d.operatorId || '') 
                            : (d.customIds?.[currentOperatorCategory] || '');
                        return String(val).trim() === filters.operatorId;
                    });
                }

                // Sorszám keresés (Client-Side, Case-Insensitive, Partial)
                if (searchTerm) {
                    const lowerTerm = searchTerm.toLowerCase();
                    devices = devices.filter(d => String(d.serialNumber || '').toLowerCase().includes(lowerTerm));
                }

                // Operátor ID Search (Existing - Input)
                if (searchTermOperatorId) {
                    const lowerOpTerm = searchTermOperatorId.toLowerCase();
                    devices = devices.filter(d => {
                        const val = currentOperatorCategory === 'Default' 
                            ? (d.operatorId || '') 
                            : (d.customIds?.[currentOperatorCategory] || '');
                        return String(val).toLowerCase().includes(lowerOpTerm);
                    });
                }

                // Source Filtering (Client-Side)
                if (sourceFilter === 'h-itb') {
                    // isI is false OR undefined/null
                    devices = devices.filter(d => !d.isI);
                } else if (sourceFilter === 'external') {
                    // isI is true
                    devices = devices.filter(d => d.isI === true);
                }

                // Validity Filtering (Client-Side)
                if (validityFilter !== 'all') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const isValid = (d) => {
                         const statusOk = d.status === 'Megfelelt' || d.status === 'Zugelassen/Megfelelt' || d.status === 'Megfelelt / Suitable' || d.status === 'Üzembe helyezve';
                         let futureDate = false;
                         if (d.kov_vizsg) {
                             const kovVizsgDate = parseDateSafe(d.kov_vizsg);
                             if (kovVizsgDate) {
                                 futureDate = kovVizsgDate > today;
                             }
                         }
                         return statusOk && futureDate;
                    };

                    const isDueSoon = (d) => {
                        if (!d.kov_vizsg) return false;
                        const kovVizsgDate = parseDateSafe(d.kov_vizsg);
                        if (!kovVizsgDate) return false;
                        
                        const fortyFiveDaysFromNow = new Date(today);
                        fortyFiveDaysFromNow.setDate(today.getDate() + 45);

                        const isUpcoming = kovVizsgDate >= today && kovVizsgDate <= fortyFiveDaysFromNow;
                        const isMegfelelt = d.status === 'Megfelelt' || 
                                           d.status === 'Megfelelt / Suitable' || 
                                           d.status === 'Zugelassen/Megfelelt' || 
                                           d.status === 'Üzembe helyezve';
                        const isExpired = kovVizsgDate < today;

                        return isUpcoming || (isMegfelelt && isExpired);
                    };

                    const isExpiredStrict = (d) => {
                        if (!d.kov_vizsg) return false;
                        const kovVizsgDate = parseDateSafe(d.kov_vizsg);
                        if (!kovVizsgDate) return false; // No date -> No inspection, not expired
                        return kovVizsgDate < today;
                    };

                    if (validityFilter === 'valid') {
                        devices = devices.filter(d => isValid(d));
                    } else if (validityFilter === 'invalid') {
                        devices = devices.filter(d => !isValid(d));
                    } else if (validityFilter === 'due_soon') {
                        devices = devices.filter(d => isDueSoon(d));
                    } else if (validityFilter === 'expired') {
                        devices = devices.filter(d => isExpiredStrict(d));
                    }
                }

                // 2. Sorting
                devices.sort((a, b) => {
                    let valA = a[currentSortField] || '';
                    let valB = b[currentSortField] || '';
                    
                    // Specific handling for Date fields to be robust against format differences (dots, dashes etc)
                    if (['vizsg_idopont', 'kov_vizsg'].includes(currentSortField)) {
                        const parseDateForSort = (dateStr) => {
                            if (!dateStr) return -Infinity; // Push empty/invalid to bottom (or top depending on asc/desc, handled by return comparison)
                            // Remove non-digit chars to standardize YYYY.MM.DD, YYYY-MM-DD, YYYY/MM/DD -> YYYYMMDD
                            // This comparison works for standard ISO-like ordering (Year-Month-Day)
                            const simplified = dateStr.replace(/[^0-9]/g, ''); 
                            // Check if it's 8 digits (YYYYMMDD) - if so, parse as number
                            if (simplified.length === 8) {
                                return parseInt(simplified, 10);
                            }
                            // Fallback to string comparison if format is weird
                            return dateStr;
                        };

                        const parsedA = parseDateForSort(valA);
                        const parsedB = parseDateForSort(valB);

                        if (parsedA < parsedB) return currentSortDirection === 'asc' ? -1 : 1;
                        if (parsedA > parsedB) return currentSortDirection === 'asc' ? 1 : -1;
                        return 0;
                    }

                    // Default string sort
                    if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
                    return 0;
                });

                // 3. Pagination
                const totalFiltered = devices.length;
                
                const maxPage = Math.ceil(totalFiltered / itemsPerPage) || 1;
                if (currentPage > maxPage) currentPage = 1;

                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                
                const pagedDevices = devices.slice(startIndex, endIndex);
                
                renderTable(pagedDevices);
                
                paginationInfo.textContent = `Eredmények: ${totalFiltered > 0 ? startIndex + 1 : 0} - ${Math.min(endIndex, totalFiltered)} (Összesen: ${totalFiltered})`;
                prevPageBtn.disabled = currentPage === 1;
                nextPageBtn.disabled = endIndex >= totalFiltered;
                
            } else {
                // Standard Server-Side Handling
                if (direction === 'prev') devices.reverse();

                if (snapshot.docs.length > 0) {
                    firstVisibleDoc = snapshot.docs[0];
                    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
                } else {
                    if (direction === 'next') lastVisibleDoc = null;
                    if (direction === 'prev') firstVisibleDoc = null;
                }

                renderTable(devices);
                updatePagination(snapshot.size);
            }

        } catch (error) {
            console.error("Hiba az eszközök lekérésekor:", error);
            tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-4 text-red-400">Hiba történt az adatok betöltése közben.</td></tr>`;
            if (error.code === 'failed-precondition') {
                tableBody.innerHTML += `<tr><td colspan="10" class="text-center p-2 text-yellow-400 text-sm">Tipp: Hiányzó Firestore index. Kérjük, ellenőrizze a böngésző konzolját a létrehozási linkért.</td></tr>`;
            }
        }
    }

    function getKovVizsgColorClass(kovVizsgDate) {
        if (!kovVizsgDate) {
            return 'text-gray-300';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

        const vizsgDate = parseDateSafe(kovVizsgDate);
        if (!vizsgDate) return 'text-gray-300'; // Fallback if parse fails

        // vizsgDate is already normalized to 00:00:00 by parseDateSafe

        const diffTime = vizsgDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'text-red-400 font-bold'; // Lejárt
        } else if (diffDays <= 45) {
            return 'text-orange-400 font-semibold'; // 45 napon belül lejár
        } else {
            return 'text-green-400'; // Több mint 45 nap
        }
    }

    function getStatusColorClass(status) {
        if (!status) {
            return 'text-gray-300';
        }
        if (status === 'Megfelelt' || status === 'Zugelassen/Megfelelt' || status === 'Megfelelt / Suitable' || status === 'Üzembe helyezve') {
            return 'text-green-400 font-semibold';
        } else if (status === 'Nem felelt meg' || status === 'Nicht zugelassen/Nem felelt meg' || status === 'Nem felelt meg / Not suitable') {
            return 'text-red-400 font-bold';
        }
        return 'text-gray-300';
    }


    // --- Custom Tooltip Logic ---
    window.createTooltipElement = function() {
        if (document.getElementById('custom-tooltip')) return;
        const tooltip = document.createElement('div');
        tooltip.id = 'custom-tooltip';
        tooltip.className = 'custom-tooltip';
        document.body.appendChild(tooltip);
    };

    window.getTooltipData = function(status, kovVizsgDate) {
        // Alapértelmezett: Érvénytelen
        let text = "Érvénytelen";
        let colorClass = "text-red-400";

        // "Megfelelt" vagy "Zugelassen/Megfelelt" vagy "Üzembe helyezve" ellenőrzése
        const isMegfelelt = status === 'Megfelelt' || status === 'Zugelassen/Megfelelt' || status === 'Megfelelt / Suitable' || status === 'Üzembe helyezve';
        
        if (isMegfelelt) {
            if (kovVizsgDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const vizsgDate = parseDateSafe(kovVizsgDate);
                if (vizsgDate) {
                    const diffTime = vizsgDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        // Piros: Lejárt (> Érvénytelen)
                        text = "Érvénytelen";
                        colorClass = "text-red-400";
                    } else if (diffDays <= 45) {
                        // Narancs: Hamarosan lejár
                        text = "Hamarosan lejár";
                        colorClass = "text-orange-400";
                    } else {
                        // Zöld: Érvényes
                        text = "Érvényes";
                        colorClass = "text-green-400";
                    }
                }
            }
        }
        
        return { text, colorClass };
    };


    window.showCustomTooltip = function(event, status, kovVizsgDate) {
        window.createTooltipElement();
        const tooltip = document.getElementById('custom-tooltip');
        const data = window.getTooltipData(status, kovVizsgDate);
        
        tooltip.textContent = data.text;
        tooltip.className = `custom-tooltip visible ${data.colorClass}`; // Reset class and add dynamic color
        
        // Positioning Logic
        // Find the "status-cell" in the current row
        let targetCell = null;
        
        // event.target could be the TD or an element inside it.
        // We find the parent TR first.
        const row = event.target.closest('tr');
        if (row) {
            targetCell = row.querySelector('.status-cell'); // For status tooltip
             // If not found (e.g. simple tooltip called from non-status cell), try to target the event target itself if it's a cell?
             // But existing logic specific to status cell for positioning?
             // let's stick to event target if status-cell is not what we want?
             // Actually, createTooltipElement/showCustomTooltip logic seems to want a reference.
        }

        if (!targetCell) {
             // Fallback for simple tooltip or if status cell not found (though simple tooltip might want to center on its own cell)
             // Let's try to use the event target as the cell if it is a TD
             if (event.target.tagName === 'TD') {
                 targetCell = event.target;
             } else {
                 targetCell = event.target.closest('td');
             }
        }


        if (targetCell) {
            const rect = targetCell.getBoundingClientRect();
            
            // Center horizontally on the cell
            const x = rect.left + (rect.width / 2);
            
            // Center vertically on the cell (overlaying the text)
            // This ensures it stays "in the row" visually
            const y = rect.top + (rect.height / 2);
            
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            
            // Center the tooltip on x,y
            tooltip.style.transform = "translate(-50%, -50%)";
            
        } else {
             // Fallback to mouse
             const x = event.clientX;
             const y = event.clientY - 20;
             tooltip.style.left = `${x}px`;
             tooltip.style.top = `${y}px`;
             tooltip.style.transform = "translate(-50%, -100%)";
        }
    };

    window.hideCustomTooltip = function() {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    };

    window.showSimpleTooltip = function(event, text) {
        window.createTooltipElement();
        const tooltip = document.getElementById('custom-tooltip');
        
        tooltip.textContent = text;
        tooltip.className = `custom-tooltip visible text-gray-200`; // Neutral color
        
        // Positioning Logic (Reused primarily)
        let targetCell = event.target.tagName === 'TD' ? event.target : event.target.closest('td');

        if (targetCell) {
            const rect = targetCell.getBoundingClientRect();
            // Center horizontally on the cell
            const x = rect.left + (rect.width / 2);
            // Center vertically on the cell
            const y = rect.top + (rect.height / 2);
            
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            tooltip.style.transform = "translate(-50%, -50%)"; // Center over cell content
            
        } else {
             // Fallback to mouse
             const x = event.clientX;
             const y = event.clientY - 20;
             tooltip.style.left = `${x}px`;
             tooltip.style.top = `${y}px`;
             tooltip.style.transform = "translate(-50%, -100%)";
        }
    };

    // --- PROMINENT TOOLTIP FUNCTIONS ---
    function createProminentTooltipElement() {
        if (document.getElementById('prominent-tooltip')) return;
        const tooltip = document.createElement('div');
        tooltip.id = 'prominent-tooltip';
        tooltip.className = 'prominent-tooltip'; // Uses the CSS class added earlier
        document.body.appendChild(tooltip);
    }

    function showProminentTooltip(event, title, description) {
        createProminentTooltipElement(); // Ensure element exists
        const tooltip = document.getElementById('prominent-tooltip');
        
        tooltip.innerHTML = `<h3>${title}</h3><p>${description}</p>`;
        tooltip.classList.add('visible');

        // Position Logic - Fixed near mouse but slightly offset
        const x = event.clientX;
        const y = event.clientY + 20; // Position below cursor
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.transform = "translate(-50%, 0)"; // Center horizontally
    }

    function hideProminentTooltip() {
        const tooltip = document.getElementById('prominent-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    function renderTable(devices) {
        currentDevices = devices; // Store the currently rendered devices
        if (!devices || devices.length === 0) {
            if (currentPage === 1) {
                tableBody.innerHTML = `<tr><td colspan="11" class="text-center p-4 text-gray-400">Nincsenek a szűrési feltételeknek megfelelő eszközök.</td></tr>`;
            }
            return;
        }

        tableBody.innerHTML = devices.map(dev => {
            const kovVizsgColorClass = getKovVizsgColorClass(dev.kov_vizsg);
            const statusColorClass = getStatusColorClass(dev.status);
            const qrCanvas = `<canvas class="qr-code-canvas" data-serial-number="${dev.serialNumber}"></canvas>`;
            
            // Highlight row if 'Ajánlat menjen' was requested
            const rowClass = dev.ajanlatKeres ? 'bg-yellow-900/40' : 'hover:bg-gray-700/50';
            // The 'qr-link-active' class is removed from here
            const qrCodeHtml = dev.finalizedFileUrl
                ? `<a href="${dev.finalizedFileUrl}" target="_blank" rel="noopener noreferrer" title="Véglegesített jegyzőkönyv megtekintése">${qrCanvas}</a>`
                : qrCanvas;
            
            let chipClass = '';
            let confirmMessage = '';
            
            const hasChip = !!dev.chip;
            const hasReport = !!dev.finalizedFileUrl;

            if (!hasChip && !hasReport) {
                // 1. Fehér átlátszó: nincs chip és jegyzőkönyv sincs
                chipClass = 'text-hollow';
                confirmMessage = 'Nincs se Chip, se jegyzőkönyv, új betanítás?';
            } else if (!hasChip && hasReport) {
                // 2. Fehér kitöltött: nincs chip, jegyzőkönyv van
                chipClass = 'text-white-filled';
                confirmMessage = 'Nincs Chip, van jegyzőkönyv, új betanítás?';
            } else if (hasChip && !hasReport) {
                // 3. Sárga: van chip, nincs jegyzőkönyv
                chipClass = 'text-yellow';
                confirmMessage = 'Már van hozzárendelt Chip, nincs jegyzőkönyv, új betanítás?';
            } else {
                // 4. Lila (Glow): van chip, van jegyzőkönyv
                chipClass = 'text-glow';
                confirmMessage = 'Már van hozzárendelt Chip és jegyzőkönyv, új betanítás?';
            }
            
            const chipButton = `<div class="${chipClass}" style="font-size: 1.0rem;" onclick="toggleChip(this, '${dev.id}', '${confirmMessage}')">CHIP</div>`;

            const operatorIdVal = currentOperatorCategory === 'Default' 
                    ? (dev.operatorId || '') 
                    : (dev.customIds?.[currentOperatorCategory] || '');

            const checkboxDisabled = isEkvUser ? 'disabled' : '';
            const checkboxOpacity = isEkvUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

            // Conditional styling for Vizsg. Időp.
            const isUsageStart = dev.status === 'Üzembe helyezve';
            const vizsgIdopontClass = isUsageStart ? 'text-blue-300 font-medium' : 'text-gray-300';

            return `
            <tr class="${rowClass}">
                <td class="relative px-6 py-4"><input type="checkbox" class="row-checkbox absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" data-id="${dev.id}" data-serial="${dev.serialNumber || ''}"></td>
                <td class="whitespace-nowrap py-4 px-3 text-sm ${vizsgIdopontClass} text-center align-middle">${dev.vizsg_idopont || 'N/A'}</td>
                <td onclick="window.editDevice('${dev.id}')" class="whitespace-nowrap py-4 px-3 text-sm font-medium text-white text-center align-middle cursor-pointer editable-cell" title="Eszköz adatok módosítása" onmouseover="this.classList.remove('text-white'); this.classList.add('text-blue-300');" onmouseout="this.classList.add('text-white'); this.classList.remove('text-blue-300');">${dev.description || ''}</td>
                <td onclick="window.editDevice('${dev.id}')" class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle cursor-pointer editable-cell" title="Eszköz adatok módosítása" onmouseover="this.classList.remove('text-gray-300'); this.classList.add('text-blue-300');" onmouseout="this.classList.add('text-gray-300'); this.classList.remove('text-blue-300');">${dev.type || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle" onmouseenter="window.showSimpleTooltip(event, 'Teherbírás: ' + (('${dev.loadCapacity || ''}') || '-'))" onmouseleave="window.hideCustomTooltip()">${dev.effectiveLength || ''}</td>
                <td onclick="window.editDevice('${dev.id}')" class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle cursor-pointer editable-cell" title="Eszköz adatok módosítása" onmouseover="this.classList.remove('text-gray-300'); this.classList.add('text-blue-300');" onmouseout="this.classList.add('text-gray-300'); this.classList.remove('text-blue-300');">${dev.serialNumber || ''}</td>
                <td onclick="window.editDevice('${dev.id}')" class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle cursor-pointer editable-cell" title="Eszköz adatok módosítása" onmouseover="this.classList.remove('text-gray-300'); this.classList.add('text-blue-300');" onmouseout="this.classList.add('text-gray-300'); this.classList.remove('text-blue-300');">
                    <span title="${currentOperatorCategory === 'Default' ? 'Alapértelmezett' : currentOperatorCategory}">${operatorIdVal}</span>
                </td>
                <td class="whitespace-nowrap py-4 px-3 text-sm ${statusColorClass} text-center align-middle status-cell" onmouseenter="window.showCustomTooltip(event, '${dev.status || ''}', '${dev.kov_vizsg || ''}')" onmouseleave="window.hideCustomTooltip()">${dev.status || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm ${kovVizsgColorClass} text-center align-middle" onmouseenter="window.showCustomTooltip(event, '${dev.status || ''}', '${dev.kov_vizsg || ''}')" onmouseleave="window.hideCustomTooltip()">${dev.kov_vizsg || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-center align-middle">
                    <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${checkboxOpacity}" ${dev.isI ? 'checked' : ''} ${checkboxDisabled} onchange="window.toggleIsI(this, '${dev.id}')">
                </td>
                <td class="whitespace-nowrap py-4 px-1 text-center align-middle"></td>
                <td class="whitespace-nowrap py-4 px-1 text-center align-middle">${chipButton}</td>
                <td class="relative whitespace-nowrap py-2 px-3 text-center align-middle">
                    ${qrCodeHtml}
                </td>
            </tr>
        `}).join('');

        generateQRCodes();
    }

    window.toggleChip = async function(element, deviceId, confirmMessage) {
        if (confirm(confirmMessage)) {
            await startNFCReader(element, deviceId); // Átadjuk az elemet a vizuális frissítéshez
        }
    }

    window.toggleIsI = async function(checkbox, deviceId) {
        const newValue = checkbox.checked;
        const confirmMessage = "Valóban ennek az eszköznek a vizsgálatát ezentúl más végzi?";
        
        if (!confirm(confirmMessage)) {
            checkbox.checked = !newValue; // Revert change
            return;
        }

        try {
            await db.collection('partners').doc(partnerId).collection('devices').doc(deviceId).update({
                isI: newValue
            });
            console.log(`Device ${deviceId} isI updated to ${newValue}`);
        } catch (error) {
            console.error("Error updating isI:", error);
            alert("Hiba történt a mentés során. Kérjük, próbálja újra.");
            checkbox.checked = !newValue; // Revert change on error
        }
    }

    async function startNFCReader(element, deviceId) {
        const modal = document.getElementById('nfc-modal');
        const modalTitle = document.getElementById('nfc-modal-title');
        const modalBody = document.getElementById('nfc-modal-body');
        const modalCloseBtn = document.getElementById('nfc-modal-close-btn');

        const showModal = (title, bodyHtml, buttonText = 'Mégse') => {
            modalTitle.textContent = title;
            modalBody.innerHTML = bodyHtml;
            modalCloseBtn.textContent = buttonText;
            modal.style.display = 'flex';
        };
        const hideModal = () => {
            modal.style.display = 'none';
        };

        modalCloseBtn.onclick = hideModal;

        // --- HYBRID NFC LOGIC (Web NFC + Keyboard/USB Reader) ---
        
        // 1. Setup UI with hidden input for USB Reader
        const modalContent = `
            <p>Kérem, érintse a chipet a készülékhez (Android) vagy az USB olvasóhoz.</p>
            <div class="loader-small my-4"></div>
            <input type="text" id="nfc-usb-input" style="opacity: 0; position: absolute; pointer-events: none;" autocomplete="off">
            <p class="text-xs text-gray-400 mt-2">USB olvasó esetén kattintson ide, ha nem aktív a beolvasás.</p>
        `;
        
        showModal('Chip Betanítás...', modalContent, 'Mégse');

        const usbInput = document.getElementById('nfc-usb-input');
        if (usbInput) {
            usbInput.focus();
            // Keep focus on the input
            usbInput.addEventListener('blur', () => {
                setTimeout(() => usbInput.focus(), 100);
            });
            
            // Listen for Enter key (standard for USB readers)
            usbInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const chipId = usbInput.value.trim();
                    if (chipId) {
                        console.log(`> USB Reader Input: ${chipId}`);
                        await processChipId(chipId);
                    }
                    usbInput.value = ''; // Clear for next scan if needed
                }
            });
        }

        // Common function to process the ID (from either source)
        const processChipId = async (serialNumber) => {
             if (serialNumber && deviceId && partnerId) {
                // Show saving state in modal
                showModal('Mentés...', '<div class="loader-small"></div>', '');

                updateDeviceChipId(partnerId, deviceId, serialNumber)
                    .then(() => {
                        console.log('Chip ID successfully saved to Firestore.');
                        const successHtml = `
                            <p class="text-green-400 font-semibold">Sikeres beolvasás és mentés!</p>
                            <p class="mt-1 text-sm">Chip ID: ${serialNumber || 'N/A'}</p>
                        `;
                        showModal('Sikeres Mentés', successHtml, 'OK');
                        modalCloseBtn.onclick = () => {
                            hideModal();
                            if (element) {
                                element.classList.remove('text-hollow', 'text-yellow');
                                element.classList.add('text-glow');
                                // Update the onclick handler to reflect the new state
                                element.setAttribute('onclick', `toggleChip(this, '${deviceId}', 'Már van hozzárendelt Chip, új betanítás?')`);
                            }
                        };
                    })
                    .catch(err => {
                        console.error('Failed to save Chip ID to Firestore.', err);
                        const errorHtml = `
                            <p class="text-red-400 font-semibold">Hiba a mentés során!</p>
                            <p class="mt-1 text-sm">A chip beolvasása sikeres volt, de a mentés a szerverre nem sikerült. Kérjük, ellenőrizze a kapcsolatot és próbálja újra.</p>
                            <p class="mt-2 text-xs text-gray-400">Hiba: ${err.message}</p>
                        `;
                        showModal('Mentési Hiba', errorHtml, 'Bezárás');
                    });
            } else {
                // Handle case where serialNumber, deviceId, or partnerId is missing
                const errorHtml = `<p class="text-red-400">Hiba: Hiányzó adatok a mentéshez (eszköz vagy partnerazonosító).</p>`;
                showModal('Hiba', errorHtml, 'Bezárás');
            }
        };

        // 2. Try Web NFC (Android)
        if ('NDEFReader' in window) {
            try {
                const ndef = new NDEFReader();
                let readingHandled = false;

                const onReading = ({ serialNumber }) => {
                    if (readingHandled) return;
                    readingHandled = true;
                    console.log(`> Web NFC Tag read: ${serialNumber}`);
                    processChipId(serialNumber);
                };

                const onReadingError = (event) => {
                    if (readingHandled) return;
                    console.error("Hiba az NFC tag olvasása közben:", event);
                    // Don't block the UI, just log it, as USB might still work
                };

                ndef.addEventListener("reading", onReading);
                ndef.addEventListener("readingerror", onReadingError);

                await ndef.scan();
                console.log("> Web NFC scan started");

            } catch (error) {
                console.warn(`Web NFC init failed (falling back to USB only): ${error.name}`, error);
                // We don't show an error modal here because we want to allow USB reading
            }
        } else {
             console.log("Web NFC API not supported. Waiting for USB Reader input...");
        }
    }

    function showDigitalScanSelectionModal() {
        const modal = document.getElementById('nfc-modal');
        const modalTitle = document.getElementById('nfc-modal-title');
        const modalBody = document.getElementById('nfc-modal-body');
        const modalCloseBtn = document.getElementById('nfc-modal-close-btn');

        const showModal = (title, bodyHtml, buttonText = 'Mégse') => {
            modalTitle.textContent = title;
            modalBody.innerHTML = bodyHtml;
            modalCloseBtn.textContent = buttonText;
            modal.style.display = 'flex';
        };
        const hideModal = () => {
            modal.style.display = 'none';
            // Stop QR scanner if running
            if (window.html5QrCode) {
                window.html5QrCode.stop().then(() => {
                    window.html5QrCode.clear();
                    delete window.html5QrCode;
                }).catch(err => console.error("Failed to stop QR scanner", err));
            }
        };

        modalCloseBtn.onclick = hideModal;

        const selectionHtml = `
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button id="start-nfc-scan-btn" class="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors">
                    <i class="fas fa-rss text-4xl text-blue-400 mb-3"></i>
                    <span class="text-lg font-semibold text-white">Chip beolvasás</span>
                    <span class="text-sm text-gray-400 text-center mt-1">NFC chip olvasása</span>
                </button>
                <button id="start-qr-scan-btn" class="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors">
                    <i class="fas fa-qrcode text-4xl text-green-400 mb-3"></i>
                    <span class="text-lg font-semibold text-white">QR-kód beolvasás</span>
                    <span class="text-sm text-gray-400 text-center mt-1">Kamera használata</span>
                </button>
            </div>
        `;

        showModal('Válasszon beolvasási módot', selectionHtml, 'Mégse');

        // Attach listeners to the new buttons
        setTimeout(() => {
            const nfcBtn = document.getElementById('start-nfc-scan-btn');
            const qrBtn = document.getElementById('start-qr-scan-btn');

            if (nfcBtn) nfcBtn.onclick = scanChipAndSearchDevice;
            if (qrBtn) qrBtn.onclick = startQRScanner;
        }, 0);
    }

    async function handleScanResult(serialNumber, source = 'NFC') {
        const modal = document.getElementById('nfc-modal');
        const modalTitle = document.getElementById('nfc-modal-title');
        const modalBody = document.getElementById('nfc-modal-body');
        const modalCloseBtn = document.getElementById('nfc-modal-close-btn');

        const showModal = (title, bodyHtml, buttonText = 'Mégse') => {
            modalTitle.textContent = title;
            modalBody.innerHTML = bodyHtml;
            modalCloseBtn.textContent = buttonText;
            modal.style.display = 'flex';
        };
        const hideModal = () => {
            modal.style.display = 'none';
        };

        console.log(`> ${source} találat, sorozatszám: ${serialNumber}`);
        
        // If coming from QR, we might need to show the modal again as it might have been closed or repurposed
        if (source === 'QR') {
             showModal('Keresés...', '<div class="loader-small"></div><p class="mt-2">Eszköz keresése...</p>', '');
        } else {
             // Update existing modal content
             modalTitle.textContent = 'Keresés...';
             modalBody.innerHTML = '<div class="loader-small"></div><p class="mt-2">Eszköz keresése...</p>';
        }

        try {
            let query = db.collection('partners').doc(partnerId).collection('devices');
            
            if (source === 'NFC') {
                query = query.where('chip', '==', serialNumber);
            } else {
                query = query.where('serialNumber', '==', serialNumber);
            }

            const querySnapshot = await query.limit(1).get();

            if (querySnapshot.empty) {
                showModal('Nincs találat', `<p>Nem található eszköz a beolvasott adat (${serialNumber}) alapján.</p>`, 'OK');
            } else {
                const device = querySnapshot.docs[0].data();
                const deviceSerialNumber = device.serialNumber;
                
                if (deviceSerialNumber) {
                    const newInspectionScreen = document.getElementById('newInspectionScreen');
                    const isNewInspectionActive = newInspectionScreen && newInspectionScreen.classList.contains('active');

                    if (isNewInspectionActive) {
                        showModal('Siker', `<p>Eszköz megtalálva. Gyári szám: ${deviceSerialNumber}. Adatok betöltése...</p>`, 'OK');
                        
                        const serialInput = document.getElementById('serialNumberInput');
                        if (serialInput) {
                            serialInput.value = deviceSerialNumber;
                        }

                        const triggerSearch = () => {
                            const searchBtn = document.getElementById('searchDeviceBySerialBtn');
                            if (searchBtn) searchBtn.click();
                        };

                        modalCloseBtn.onclick = () => {
                            hideModal();
                            triggerSearch();
                        };

                        setTimeout(() => {
                            hideModal();
                            triggerSearch();
                        }, 1500);

                    } else {
                        showModal('Siker', `<p>Eszköz megtalálva. Gyári szám: ${deviceSerialNumber}. A lista szűrése folyamatban...</p>`, 'OK');
                        searchInput.value = deviceSerialNumber;
                        searchTerm = deviceSerialNumber;
                        
                        modalCloseBtn.onclick = () => {
                            hideModal();
                            resetAndFetch();
                        };
                        
                        setTimeout(() => {
                            hideModal();
                            resetAndFetch();
                        }, 2000);
                    }
                } else {
                    showModal('Hiba', '<p>Az eszközhöz tartozó gyári szám nem található az adatbázisban.</p>', 'OK');
                }
            }
        } catch (error) {
            console.error("Hiba az eszköz keresésekor:", error);
            showModal('Keresési Hiba', `<p>Hiba történt az eszköz keresése közben. ${error.message}</p>`, 'Bezárás');
        }
    }

    async function startQRScanner() {
        const modal = document.getElementById('nfc-modal');
        const modalBody = document.getElementById('nfc-modal-body');
        const modalTitle = document.getElementById('nfc-modal-title');
        const modalCloseBtn = document.getElementById('nfc-modal-close-btn');
        
        // Ensure modal is visible
        modal.style.display = 'flex';
        
        // Setup close button to stop scanner and hide modal
        modalCloseBtn.onclick = () => {
            if (window.html5QrCode) {
                window.html5QrCode.stop().then(() => {
                    window.html5QrCode.clear();
                    delete window.html5QrCode;
                    modal.style.display = 'none';
                }).catch(err => {
                    console.error("Failed to stop QR scanner", err);
                    modal.style.display = 'none';
                });
            } else {
                modal.style.display = 'none';
            }
        };

        modalTitle.textContent = 'QR-kód beolvasás';
        modalBody.innerHTML = `
            <div id="qr-reader" style="width: 100%;"></div>
            <p class="text-sm text-gray-400 mt-2 text-center">Mutassa a QR-kódot a kamerának.</p>
        `;

        try {
            const html5QrCode = new Html5Qrcode("qr-reader");
            window.html5QrCode = html5QrCode; // Store globally to stop it later

            const config = { 
                fps: 15, 
                qrbox: { width: 250, height: 250 },
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };
            
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    // Handle on success condition with the decoded message.
                    console.log(`QR Code scanned: ${decodedText}`, decodedResult);
                    
                    // Stop scanning
                    html5QrCode.stop().then(() => {
                        window.html5QrCode.clear();
                        delete window.html5QrCode;
                        handleScanResult(decodedText, 'QR');
                    }).catch(err => {
                        console.error("Failed to stop QR scanner", err);
                        handleScanResult(decodedText, 'QR');
                    });
                },
                (errorMessage) => {
                    // parse error, ignore it.
                }
            );
        } catch (err) {
            console.error("Error starting QR scanner", err);
            modalBody.innerHTML = `<p class="text-red-400">Nem sikerült elindítani a kamerát. ${err}</p>`;
        }
    }

    async function scanChipAndSearchDevice() {
        const modal = document.getElementById('nfc-modal');
        const modalTitle = document.getElementById('nfc-modal-title');
        const modalBody = document.getElementById('nfc-modal-body');
        const modalCloseBtn = document.getElementById('nfc-modal-close-btn');

        const showModal = (title, bodyHtml, buttonText = 'Mégse') => {
            modalTitle.textContent = title;
            modalBody.innerHTML = bodyHtml;
            modalCloseBtn.textContent = buttonText;
            modal.style.display = 'flex';
        };
        const hideModal = () => {
            modal.style.display = 'none';
        };

        modalCloseBtn.onclick = hideModal;

        // --- HYBRID NFC SEARCH LOGIC (Web NFC + Keyboard/USB Reader) ---

        // 1. Setup UI with hidden input for USB Reader
        const modalContent = `
            <p>Kérem, érintse a chipet a készülékhez (Android) vagy az USB olvasóhoz.</p>
            <div class="loader-small my-4"></div>
            <input type="text" id="nfc-search-input" style="opacity: 0; position: absolute; pointer-events: none;" autocomplete="off">
            <p class="text-xs text-gray-400 mt-2">USB olvasó esetén kattintson ide, ha nem aktív a beolvasás.</p>
        `;

        showModal('Chip Keresés...', modalContent, 'Mégse');

        const searchInput = document.getElementById('nfc-search-input');
        if (searchInput) {
            searchInput.focus();
            // Keep focus
            searchInput.addEventListener('blur', () => {
                setTimeout(() => searchInput.focus(), 100);
            });

            // Listen for Enter key
            searchInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const chipId = searchInput.value.trim();
                    if (chipId) {
                        console.log(`> USB Reader Search Input: ${chipId}`);
                        handleScanResult(chipId, 'NFC');
                    }
                    searchInput.value = '';
                }
            });
        }

        // 2. Try Web NFC (Android)
        if ('NDEFReader' in window) {
            try {
                const ndef = new NDEFReader();
                let readingHandled = false;

                const onReading = async ({ serialNumber: chipSerialNumber }) => {
                    if (readingHandled) return;
                    readingHandled = true;
                    console.log(`> Web NFC Search Tag: ${chipSerialNumber}`);
                    handleScanResult(chipSerialNumber, 'NFC');
                };

                const onReadingError = (event) => {
                    if (readingHandled) return;
                    console.error("Hiba az NFC tag olvasása közben:", event);
                };

                ndef.addEventListener("reading", onReading);
                ndef.addEventListener("readingerror", onReadingError);

                await ndef.scan();
                console.log("> Web NFC search scan started");

            } catch (error) {
                console.warn(`Web NFC init failed (falling back to USB only): ${error.name}`, error);
            }
        } else {
            console.log("Web NFC API not supported. Waiting for USB Reader input...");
        }
    }

    function generateQRCodes() {
        const canvases = tableBody.querySelectorAll('.qr-code-canvas');
        canvases.forEach(canvas => {
            const serialNumber = canvas.dataset.serialNumber;
            if (serialNumber) {
                QRCode.toCanvas(canvas, serialNumber, { 
                    width: 64, 
                    margin: 1,
                    errorCorrectionLevel: 'L',
                    color: {
                        dark: '#000000', // Black
                        light: '#ffffff' // White
                    }
                }, function (error) {
                    if (error) console.error('QR kód generálási hiba:', error);
                });
            }
        });
    }

    function updatePagination(fetchedCount) {
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = startItem + fetchedCount - 1;

        if (fetchedCount > 0) {
            paginationInfo.textContent = `Eredmények: ${startItem} - ${endItem}`;
        } else {
            paginationInfo.textContent = currentPage > 1 ? "Nincs több eredmény" : "";
        }

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = fetchedCount < itemsPerPage;
    }

    function resetAndFetch() {
        currentPage = 1;
        firstVisibleDoc = null;
        lastVisibleDoc = null;
        updateFilterButtonVisuals(); // Update button visuals on reset/fetch
        fetchDevices();
    }

    async function updateSelectedDevicesComment(newComment) {
        const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy eszközt a művelethez!');
            return;
        }

        const deviceIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
        const actionText = newComment === 'inactive' ? 'leselejtezni' : (newComment === 'active' ? 'újraaktiválni' : 'törölni');
        const actionTextPast = newComment === 'inactive' ? 'leselejtezve' : (newComment === 'active' ? 'újraaktiválva' : 'törölve');
        
        if (!confirm(`Biztosan szeretné ${actionText} a kiválasztott ${deviceIds.length} eszközt?`)) {
            return;
        }

        try {
            const batch = db.batch();
            deviceIds.forEach(id => {
                const deviceRef = db.collection('partners').doc(partnerId).collection('devices').doc(id);
                batch.update(deviceRef, { comment: newComment });
            });
            await batch.commit();
            
            alert(`A kiválasztott eszközök sikeresen ${actionTextPast} lettek.`);
            resetAndFetch(); // Refresh the list
        } catch (error) {
            console.error(`Hiba az eszközök ${actionText} során:`, error);
            alert(`Hiba történt az eszközök ${actionText} során. Kérjük, próbálja újra.`);
        }
    }

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortField = header.dataset.sort;
            if (!sortField) return;

            if (currentSortField === sortField) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = sortField;
                currentSortDirection = 'asc';
            }
            
            resetAndFetch();

            tableHeaders.forEach(th => th.classList.remove('active-sort'));
            header.classList.add('active-sort');
            const icon = header.querySelector('i');
            if (icon) {
                icon.className = `fas fa-sort-${currentSortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    });

    const handleDecommissionReactivate = () => {
        const newComment = currentView === 'active' ? 'inactive' : 'active';
        updateSelectedDevicesComment(newComment);
    };

    if (decommissionBtn) {
        decommissionBtn.addEventListener('click', handleDecommissionReactivate);
    }
    if (decommissionBtnMobile) {
        decommissionBtnMobile.addEventListener('click', handleDecommissionReactivate);
    }

    const handleDelete = async () => {
        const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy eszközt a törléshez!');
            return;
        }

        const deviceIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

        try {
            // Determine user type for delete logic
            // ENY users are those who are NEITHER EJK NOR EKV (assuming EKV is passed in validly, otherwise check role)
            // 'isEjkUser' and 'isEkvUser' are available in the closure from initPartnerWorkScreen
            // Note: isEkvUser was defined as: const isEkvUser = (userData && userData.isEkvUser) || false;
            
            const isEnyUser = !isEjkUser && !isEkvUser;

            if (isEnyUser) {
                // --- ENY USER LOGIC: STRICT BLOCK ON ANY INSPECTION ---
                const checkPromises = deviceIds.map(id => 
                    db.collection('partners').doc(partnerId)
                      .collection('devices').doc(id)
                      .collection('inspections')
                      .limit(1).get().then(snap => !snap.empty)
                );

                const results = await Promise.all(checkPromises);
                const hasInspection = results.some(res => res === true);

                if (hasInspection) {
                    alert('A kiválasztott eszköz(ök) nem törölhető(k), mert tartozik hozzá(juk) vizsgálat (akár piszkozat, akár végleges).\n\nPartnerként csak olyan eszközt törölhet, amelyhez még nem készült semmilyen vizsgálat.\nKérjük, forduljon az üzemeltetőhöz/adminisztrátorhoz.');
                    return;
                }

            } else {
                // --- PRIVILEGED USER LOGIC (EJK/EKV): GRANULAR CHECKS ---
                
                // 1. Check for FINALIZED inspections
                const finalizedPromises = deviceIds.map(id => 
                    db.collection('partners').doc(partnerId)
                      .collection('devices').doc(id)
                      .collection('inspections').where('status', '!=', 'draft')
                      .limit(1).get().then(snap => !snap.empty)
                );

                const finalizedResults = await Promise.all(finalizedPromises);
                const hasFinalized = finalizedResults.some(res => res === true);

                if (hasFinalized) {
                    alert('A kiválasztott eszköz nem törölhető, mert már rendelkezik véglegesített vizsgálattal. Ilyen eszköz csak leselejtezhető.');
                    return;
                }

                // 2. Check for ANY inspections (implies Drafts)
                const anyPromises = deviceIds.map(id => 
                    db.collection('partners').doc(partnerId)
                      .collection('devices').doc(id)
                      .collection('inspections')
                      .limit(1).get().then(snap => !snap.empty)
                );

                const anyResults = await Promise.all(anyPromises);
                const hasDrafts = anyResults.some(res => res === true);

                if (hasDrafts) {
                    alert('A kiválasztott eszközhöz piszkozat (draft) vizsgálat tartozik.\n\nKérjük, először törölje a piszkozatot a "Vizsgálatok" menüpontban, és csak utána törölje az eszközt.');
                    return;
                }
            }

            // --- COMMON HARD DELETE EXECUTION (For Clean Devices) ---

            // Double confirmation check
            if (!confirm(`Biztosan VÉGLEGESEN törölni szeretné a kiválasztott ${deviceIds.length} eszközt?`)) {
                return;
            }

            if (!confirm(`FIGYELEM! Ez a művelet NEM VISSZAVONHATÓ!\n\nAz adatok véglegesen törlődnek az adatbázisból.\n\nBiztosan folytatja?`)) {
                return;
            }

            const batch = db.batch();
            deviceIds.forEach(id => {
                const deviceRef = db.collection('partners').doc(partnerId).collection('devices').doc(id);
                batch.delete(deviceRef);
            });

            await batch.commit();

            alert(`A kiválasztott eszközök sikeresen és véglegesen törölve lettek.`);
            
            // Remove from local list
            const checks = Array.from(selectedCheckboxes);
            checks.forEach(cb => {
                const row = cb.closest('tr');
                if (row) row.remove();
            });

            // Refresh list to be sure
            fetchDevices(); 

        } catch (error) {
            console.error("Hiba a törlés során:", error);
            alert("Hiba történt a törlés közben.");
        }
    };

    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDelete);
    }
    if (deleteBtnMobile) {
        deleteBtnMobile.addEventListener('click', handleDelete);
    }

    nextPageBtn.addEventListener('click', () => {
        if (!nextPageBtn.disabled) {
            currentPage++;
            fetchDevices('next');
        }
    });

    prevPageBtn.addEventListener('click', () => {
        if (!prevPageBtn.disabled) {
            currentPage--;
            fetchDevices('prev');
        }
    });

    const debouncedSearch = debounce((value) => {
        searchTerm = value;
        resetAndFetch();
    }, 300);

    // New debounced search for Operator ID
    const debouncedSearchOperatorId = debounce((value) => {
        searchTermOperatorId = value;
        resetAndFetch();
    }, 300);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value.trim());
    });

    if (operatorIdInput) {
        operatorIdInput.addEventListener('input', (e) => {
            debouncedSearchOperatorId(e.target.value.trim());
        });
    }

    // Date formatting helper
    const handleDateInput = (e, filterKey) => {
        let input = e.target.value.replace(/\D/g, '').substring(0, 8); // Only numbers, max 8 digits
        let formatted = '';
        
        if (input.length > 4) {
            formatted += input.substring(0, 4) + '.';
            if (input.length > 6) {
                formatted += input.substring(4, 6) + '.' + input.substring(6);
            } else {
                formatted += input.substring(4);
            }
        } else {
            formatted = input;
        }
        
        e.target.value = formatted;

        // Direct filtering with the formatted value (YYYY.MM.DD)
        if (formatted.length === 10) {
            filters[filterKey] = formatted;
            resetAndFetch();
        } else if (formatted.length === 0) {
            filters[filterKey] = '';
            resetAndFetch();
        }
    };

    vizsgIdopontInput.addEventListener('input', (e) => handleDateInput(e, 'vizsg_idopont'));
    kovVizsgInput.addEventListener('input', (e) => handleDateInput(e, 'kov_vizsg'));



    refreshListBtn.addEventListener('click', () => {
        resetAndFetch();
    });

    inactiveToggle.addEventListener('change', () => {
        currentView = inactiveToggle.checked ? 'inactive' : 'active';
        updateUiForView(); // UI frissítése a nézetnek megfelelően
        resetAndFetch();
    });

    updateUiForView(); // Kezdeti UI beállítása
    fetchDevices();
    if (isEkvUser) {
        loadProtocols();
    } else {
        loadExperts();
    }
    loadFinalizedInspections(partnerId); 
    
    // Initialize filter button visuals
    setTimeout(updateFilterButtonVisuals, 100);

    // --- FINALIZED REPORTS SEARCH LOGIC ---
    const finalizedSearchInput = document.getElementById('finalized-reports-search-input');
    if (finalizedSearchInput) {
        finalizedSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const finalizedBody = document.getElementById('finalized-docs-body');
            if (!finalizedBody) return;

            const rows = finalizedBody.querySelectorAll('tr');
            rows.forEach(row => {
                // Skip "No results" or "Loading" rows if they have colspan
                if (row.querySelector('td[colspan]')) return;

                const serialCell = row.querySelectorAll('td')[1]; // 2nd column is Serial Number
                if (serialCell) {
                    const serialText = serialCell.textContent.toLowerCase().trim();
                    if (serialText.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    }

    // --- VÉGLEGESÍTETT JEGYZŐKÖNYVEK BETÖLTÉSE ---
    async function loadFinalizedInspections(partnerId) {
        const finalizedBody = document.getElementById('finalized-docs-body');
        if (!finalizedBody) return;

        try {

            // 1. Existing Inspections Query
            let inspectionsQuery = db.collectionGroup('inspections')
                .where('partnerId', '==', partnerId)
                .where('status', '==', 'finalized');
            
            // EKV users only see inspections they finalized
            if (isEkvUser) {
                // IMPORTANT: This requires composite index: partnerId + status + finalizedByUid
                inspectionsQuery = inspectionsQuery.where('finalizedByUid', '==', userData.uid || firebase.auth().currentUser.uid);
            }

            // 2. New Usage Reports Query (Only fetch if not EKV user, or if EKV users are allowed to see these? Assuming yes for now, or maybe only if they created them?)
            // For now, let's assume usage reports are visible to all focused on the partner (except maybe restricted by roles, but the UI hides the section if not accessible? No, UI shows it).
            // Let's implicitely assume EKV users assume the same restriction if consistent, but 'reports' collection doesn't have finalizedByUid yet. 
            // However, "Usage Start" is done by Admin/Write users (ENY), not EKV usually.
            // So we just fetch them.
            let reportsQuery = db.collection('partners').doc(partnerId).collection('reports')
                 .orderBy('createdAt', 'desc');

            // Run in parallel
            const [inspectionsSn, reportsSn] = await Promise.all([
                inspectionsQuery.get(),
                reportsQuery.get()
            ]);

            let mergedItems = [];

            // Process Inspections
            inspectionsSn.forEach(doc => {
                const data = doc.data();
                mergedItems.push({
                    date: data.vizsgalatIdopontja || 'N/A',
                    serialNumber: data.deviceDetails?.serialNumber || 'N/A',
                    description: data.deviceDetails?.description || 'N/A',
                    expert: data.szakerto || 'N/A',
                    url: data.fileUrl,
                    timestamp: data.finalizedAt ? data.finalizedAt.toMillis() : 0,
                    type: 'inspection'
                });
            });

            // Process Reports (Usage Start)
            reportsSn.forEach(doc => {
                const data = doc.data();
                mergedItems.push({
                    date: data.date || 'N/A',
                    serialNumber: data.deviceSerialNumber || 'N/A',
                    description: data.deviceName || 'N/A',
                    expert: data.expertName || 'N/A',
                    url: data.downloadUrl,
                    timestamp: data.createdAt ? data.createdAt.toMillis() : 0,
                    type: 'usage_start'
                });
            });

            // Sort by timestamp desc
            mergedItems.sort((a, b) => b.timestamp - a.timestamp);

            if (mergedItems.length === 0) {
                finalizedBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-400">Nincsenek véglegesített jegyzőkönyvek.</td></tr>`;
                return;
            }

            const docsHtml = mergedItems.map(item => {
                let rowClass = "hover:bg-gray-700/50";
                let typeLabel = "";
                if (item.type === 'usage_start') {
                    rowClass = "hover:bg-blue-900/30 bg-blue-900/10"; // Highlight usage start
                    typeLabel = `<span class="text-xs text-blue-400 block">(Használatbavétel)</span>`;
                }

                return `
                    <tr class="${rowClass}">
                        <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle">
                            ${item.date}
                            ${typeLabel}
                        </td>
                        <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle">${item.serialNumber}</td>
                        <td class="whitespace-nowrap py-4 px-3 text-sm font-medium text-white text-center align-middle">${item.description}</td>
                        <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300 text-center align-middle">${item.expert}</td>
                        <td class="whitespace-nowrap py-4 px-3 text-sm text-center">
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm ${!item.url ? 'disabled' : ''}">
                                Megtekintés
                            </a>
                        </td>
                    </tr>
                `;
            }).join('');

            finalizedBody.innerHTML = docsHtml;

        } catch (error) {
            console.error("Hiba a véglegesített jegyzőkönyvek lekérésekor:", error);
            finalizedBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-400">Hiba történt a jegyzőkönyvek betöltése közben.</td></tr>`;
        }
    }



    // --- DEVICE SEARCH AUTOCOMPLETE LOGIC ---
    let selectedAutocompleteDeviceId = null;

    function initDeviceSearchAutocomplete(partnerId) {
        // console.log("Device Search Autocomplete Initializing for Partner:", partnerId);
        const serialInput = document.getElementById('serialNumberInput');
        const suggestionsList = document.getElementById('serialNumberSuggestions');
        
        if (!serialInput || !suggestionsList) return;

        // Local debounce to ensure availability
        function localDebounce(func, delay) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), delay);
            };
        }

        let cachedDevices = null;

        const handleInput = localDebounce(async (e) => {
            selectedAutocompleteDeviceId = null;
            const query = e.target.value.trim().toLowerCase();
            
            if (query.length === 0) {
                suggestionsList.classList.add('hidden');
                return;
            }

            // Lazy load devices on first input
            if (!cachedDevices) {
                try {
                    const snapshot = await db.collection('partners').doc(partnerId).collection('devices').get();
                    
                    // Deduplication REMOVED to show all devices with same serial number
                    // We map all docs directly, filtering out 'deleted' ones
                    cachedDevices = snapshot.docs
                        .filter(doc => doc.data().comment !== 'deleted')
                        .map(doc => ({
                            id: doc.id,
                            serialNumber: doc.data().serialNumber || '',
                            description: doc.data().description || '',
                            name: doc.data().name || '',
                            operatorId: doc.data().operatorId || ''
                        }));
                } catch (error) {
                    console.error("Error fetching devices for autocomplete:", error);
                    return; 
                }
            }

            const matches = cachedDevices.filter(d => {
                const serial = String(d.serialNumber || "").toLowerCase();
                return serial.includes(query);
            });

            // Smart Sorting: Exact match > Starts with > Contains > Alphanumeric
            matches.sort((a, b) => {
                const serialA = String(a.serialNumber || "").toLowerCase();
                const serialB = String(b.serialNumber || "").toLowerCase();

                // 1. Exact match
                if (serialA === query && serialB !== query) return -1;
                if (serialB === query && serialA !== query) return 1;

                // 2. Starts with
                const aStarts = serialA.startsWith(query);
                const bStarts = serialB.startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                // 3. Alphanumeric sort
                return serialA.localeCompare(serialB);
            });

            // Slice top 10 AFTER sorting
            const topMatches = matches.slice(0, 10);

            renderSuggestions(topMatches);
        }, 300);

        function renderSuggestions(matches) {
            suggestionsList.innerHTML = '';
            
            if (matches.length === 0) {
                suggestionsList.classList.add('hidden');
                return;
            }

            matches.forEach(device => {
                const li = document.createElement('li');
                li.className = 'px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 border-b border-gray-700 last:border-0';
                const operatorIdDisplay = device.operatorId ? ` (${device.operatorId})` : '';
                const descDisplay = device.description || device.name || 'Nincs név';
                li.textContent = `${device.serialNumber} (${descDisplay})${operatorIdDisplay}`;
                
                li.addEventListener('click', () => {
                    serialInput.value = device.serialNumber;
                    selectedAutocompleteDeviceId = device.id;
                    suggestionsList.classList.add('hidden');
                    // Trigger search event logic 
                    const searchBtn = document.getElementById('searchDeviceBySerialBtn');
                    if (searchBtn) searchBtn.click();
                });
                
                suggestionsList.appendChild(li);
            });

            suggestionsList.classList.remove('hidden');
        }

        // Event Listeners
        serialInput.addEventListener('input', handleInput);
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!serialInput.contains(e.target) && !suggestionsList.contains(e.target)) {
                suggestionsList.classList.add('hidden');
            }
        });
    }

    // Initialize the autocomplete
    initDeviceSearchAutocomplete(partnerId);


    // --- DATABASE DOWNLOAD LOGIC ---
    const downloadDbBtn = document.getElementById('download-db-btn');
    const downloadDbBtnMobile = document.getElementById('download-db-btn-mobile');

    async function getAllDevicesWithInspections() {
        try {
            let query = db.collection('partners').doc(partnerId).collection('devices')
                .where('comment', '==', currentView); // Respect Active/Inactive view
            
            // Filter for EKV users (Base restriction)
            if (userData && userData.isEkvUser) {
                query = query.where('isI', '==', true);
            }

            const snapshot = await query.get();
            let devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Apply Source Filter (in-memory, matching fetchDevices logic)
            // This ensures we don't show dates for devices hidden by the source switch (H-ITB / I-vizsgáló)
            if (sourceFilter === 'h-itb') {
                 devices = devices.filter(d => !d.isI);
            } else if (sourceFilter === 'external') {
                 devices = devices.filter(d => d.isI === true);
            }

            const inspectionPromises = devices.map(device => {
                let inspQuery = db.collection('partners').doc(partnerId)
                         .collection('devices').doc(device.id)
                         .collection('inspections')
                         .orderBy('createdAt', 'desc')
                         .limit(1);

                // Consistency with fetchDevices for EKV users: only show their own inspections
                if (userData && userData.isEkvUser) {
                     inspQuery = inspQuery.where('createdByUid', '==', userData.uid || firebase.auth().currentUser.uid);
                }

                return inspQuery.get()
                         .then(inspectionSnapshot => {
                             if (!inspectionSnapshot.empty) {
                                 const latestInspection = inspectionSnapshot.docs[0].data();
                                 // Add inspection data to the device object
                                 device.latestInspection = latestInspection;
                                 device.kov_vizsg = latestInspection.kovetkezoIdoszakosVizsgalat; // Enrich direct property for filter reuse
                             }
                         });
            });

            await Promise.all(inspectionPromises);
            return devices;

        } catch (error) {
            console.error("Hiba az összes eszköz lekérésekor:", error);
            alert("Hiba történt az adatok lekérése közben.");
            return [];
        }
    }

    async function generateExcel() {
        const button = this;
        const originalText = button.innerHTML;
        button.innerHTML = '<span>Generálás...</span><div class="loader-small"></div>';
        button.disabled = true;

        const devices = await getAllDevicesWithInspections();

        if (devices.length === 0) {
            alert('Nincsenek adatok az exportáláshoz.');
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        const dataForSheet = devices.map(dev => ({
            'Azonosító': dev.id,
            'Megnevezés': dev.description,
            'Típus': dev.type,
            'Gyári szám': dev.serialNumber,
            'Operátor ID': dev.operatorId,
            'Gyártó': dev.manufacturer,
            'Gyártás éve': dev.yearOfManufacture,
            'Teherbírás (WLL)': dev.loadCapacity,
            'Hasznos hossz': dev.effectiveLength,
            'Állapot': dev.comment,
            'H-ITB vizsgálta': dev.isI ? 'nem' : 'igen',
            'Utolsó vizsgálat - Típus': dev.latestInspection?.vizsgalatJellege,
            'Utolsó vizsgálat - Dátum': dev.latestInspection?.vizsgalatIdopontja,
            'Utolsó vizsgálat - Eredmény': dev.latestInspection?.vizsgalatEredmenye,
            'Utolsó vizsgálat - Köv. időszakos': dev.latestInspection?.kovetkezoIdoszakosVizsgalat,
            'Utolsó vizsgálat - Köv. terhelési': dev.latestInspection?.kovetkezoTerhelesiProba,
            'Utolsó vizsgálat - Szakértő': dev.latestInspection?.szakerto,
            'Utolsó vizsgálat - Feltárt hiba': dev.latestInspection?.feltartHiba,
            'Utolsó vizsgálat - Felhasznált anyagok': dev.latestInspection?.felhasznaltAnyagok,
        }));

        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Eszközök');

        // Generate a file name
        const partnerName = document.querySelector('#partner-work-screen-header h1').textContent.replace(/\s/g, '_');
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `ETAR_DB_${partnerName}_${today}.xlsx`;

        XLSX.writeFile(wb, fileName);

        button.innerHTML = originalText;
        button.disabled = false;
    }

    downloadDbBtn.addEventListener('click', generateExcel);
    downloadDbBtnMobile.addEventListener('click', generateExcel);


    // --- PROTOCOL PREVIEW LOGIC (NEW TAB) ---
    const generateProtocolBtn = document.getElementById('generate-protocol-btn');
    const generateProtocolBtnMobile = document.getElementById('generate-protocol-btn-mobile');

    const handleProtocolGeneration = async () => {
        const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy eszközt a jegyzőkönyvek megtekintéséhez!');
            return;
        }

        // 1. Open new tab immediately to avoid popup blockers (iPad fix)
        const newTab = window.open('', '_blank');
        if (!newTab) {
            alert('A böngésző letiltotta a felugró ablakot. Kérjük, engedélyezze a felugró ablakokat az oldal számára.');
            return;
        }

        // Initial loading state in the new tab
        newTab.document.write(`
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Jegyzőkönyvek betöltése...</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f3f4f6; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .message { margin-left: 15px; color: #374151; font-size: 1.1rem; }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <div class="message">Jegyzőkönyvek előkészítése...</div>
            </body>
            </html>
        `);
        newTab.document.close();

        const selectedDevices = Array.from(selectedCheckboxes).map(cb => ({
            id: cb.dataset.id,
            serialNumber: cb.dataset.serial || '' // Get serial from data attribute
        }));
        
        const originalButtonText = generateProtocolBtn.textContent;
        generateProtocolBtn.innerHTML = '<span>Keresés...</span><div class="loader-small"></div>';
        generateProtocolBtn.disabled = true;
        generateProtocolBtnMobile.disabled = true;

        try {
            // 2. Get protocol URLs
            const protocolUrls = [];
            const urlPromises = selectedDevices.map(async (device) => {
                let foundUrl = null;

                // A. Try to find Finalized Inspection
                const snapshot = await db.collection('partners').doc(partnerId)
                    .collection('devices').doc(device.id)
                    .collection('inspections')
                    .where('status', '==', 'finalized')
                    .orderBy('finalizedAt', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    if (data.fileUrl) {
                        foundUrl = data.fileUrl;
                    }
                }

                // B. If no inspection, try to find Usage Start Document
                if (!foundUrl && device.serialNumber) {
                     // Note: Requires Composite Index (partnerId + type + deviceSerialNumber + createdAt)
                     // or simpler query if possible. 
                     // Let's use the 'reports' collection query.
                     const reportSnapshot = await db.collection('partners').doc(partnerId)
                        .collection('reports')
                        .where('deviceSerialNumber', '==', device.serialNumber)
                        .where('type', '==', 'usage_start')
                        .orderBy('createdAt', 'desc')
                        .limit(1)
                        .get();
                    
                    if (!reportSnapshot.empty) {
                        const data = reportSnapshot.docs[0].data();
                        if (data.downloadUrl) {
                            foundUrl = data.downloadUrl;
                        }
                    }
                }

                if (foundUrl) {
                    protocolUrls.push(foundUrl);
                }
            });
            await Promise.all(urlPromises);

            if (protocolUrls.length === 0) {
                alert('A kiválasztott eszközök közül egyiknek sincs véglegesített jegyzőkönyve.');
                newTab.close(); // Close the empty tab
                return; 
            }

            // 3. Fetch HTML content from each URL
            const fetchPromises = protocolUrls.map(url => fetch(url).then(res => {
                if (!res.ok) {
                    throw new Error(`Sikertelen letöltés: ${url} (${res.statusText})`);
                }
                return res.text();
            }));
            const htmlContents = await Promise.all(fetchPromises);

            // 4. Process content: Extract styles and body
            let collectedStyles = '';
            const cleanedContents = htmlContents.map(html => {
                // Extract style tags
                const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
                if (styleMatches) {
                    collectedStyles += styleMatches.join('\n');
                }

                // Extract link tags (stylesheets) - though mostly we rely on Tailwind CDN now
                const linkMatches = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi);
                if (linkMatches) {
                    // We might want to include these if they are not the main tailwind one, 
                    // but for now let's rely on the injected Tailwind and collected inline styles.
                    // collectedStyles += linkMatches.join('\n'); 
                }

                // Extract body content
                const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                return bodyMatch ? bodyMatch[1] : html;
            });

            const combinedHtml = cleanedContents.join('<div style="page-break-after: always; height: 20px;"></div>');

            // 5. Write final content to the tab
            newTab.document.open();
            newTab.document.write(`
                <!DOCTYPE html>
                <html lang="hu">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Jegyzőkönyvek</title>
                    
                    <!-- Tailwind CSS (Injected) -->
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script>
                        tailwind.config = {
                            // Optional config if needed
                        }
                    </script>

                    <!-- Collected Styles from Reports -->
                    <style>
                        ${collectedStyles}
                    </style>

                    <style>
                        /* Basic reset and print styles */
                        body { margin: 0; padding: 0; background: white; }
                        @media print {
                            @page { margin: 0; }
                            body { margin: 1.6cm; }
                        }
                        /* Ensure images and content fit within viewport on mobile */
                        img { max-width: 100%; height: auto; }
                        table { max-width: 100%; }
                        .page-content { 
                            padding: 10px; 
                            max-width: 900px; 
                            margin: 0 auto; 
                        }
                    </style>
                </head>
                <body>
                    <div class="page-content">
                        ${combinedHtml}
                    </div>
                </body>
                </html>
            `);
            newTab.document.close();

        } catch (error) {
            console.error("Hiba a jegyzőkönyvek lekérésekor vagy megjelenítésekor:", error);
            alert("Hiba történt a jegyzőkönyvek feldolgozása közben: " + error.message);
            newTab.close(); // Close the tab on error
        } finally {
            generateProtocolBtn.innerHTML = originalButtonText;
            generateProtocolBtn.disabled = false;
            generateProtocolBtnMobile.disabled = false;
        }
    };

    generateProtocolBtn.addEventListener('click', handleProtocolGeneration);
    generateProtocolBtnMobile.addEventListener('click', handleProtocolGeneration);

    // --- NEW/EDIT DEVICE NAVIGATION LOGIC ---
    const handleUploadDeviceClick = () => {
        const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked');
        
        if (selectedCheckboxes.length === 1) {
            // Edit mode
            const deviceId = selectedCheckboxes[0].dataset.id;
            window.editDevice(deviceId);
        } else if (selectedCheckboxes.length > 1) {
            // Multiple selected
            alert('Kérjük, csak egy eszközt válasszon ki a módosításhoz, vagy egyet se az új eszköz felviteléhez!');
        } else {
            // New device mode
            sessionStorage.removeItem('editDeviceId');
            sessionStorage.removeItem('partnerIdForEdit');
            window.location.href = 'adatbevitel.html';
        }
    };

    const uploadDeviceBtn = document.getElementById('uploadDeviceBtn');
    const uploadDeviceBtnMobile = document.getElementById('uploadDeviceBtnMobile');

    if (uploadDeviceBtn) {
        uploadDeviceBtn.addEventListener('click', handleUploadDeviceClick);
    }
    if (uploadDeviceBtnMobile) {
        uploadDeviceBtnMobile.addEventListener('click', handleUploadDeviceClick);
    }

    // --- NEW INSPECTION LOGIC ---

    // --- SEARCH LOGIC FOR NEW INSPECTION (Autocomplete) ---
    const searchDeviceForm = document.getElementById('searchDeviceForm');
    const serialNumberInput = document.getElementById('serialNumberInput');
    const deviceSearchResult = document.getElementById('deviceSearchResult');
    const suggestionsList = document.getElementById('serialNumberSuggestions');
    let currentInspectedDevice = null;

    window.saveSerialAndRedirect = function() {
        try {
            console.log("saveSerialAndRedirect called");
            const serialInput = document.getElementById('serialNumberInput');
            const serialNumber = serialInput ? serialInput.value.trim() : '';
            console.log("Saving serial:", serialNumber);
            
            if (serialNumber) {
                sessionStorage.setItem('newDeviceSerialNumber', serialNumber);
            }
            
            // --- Save Inspection Header Data persistence ---
            const templateSelect = document.getElementById('templateSelectNewInspection');
            const expertSelect = document.getElementById('expertSelectNewInspection');
            const placeInput = document.getElementById('inspectionLocationInput');
            const dateInput = document.getElementById('inspectionDateInput');

            if (templateSelect) sessionStorage.setItem('persist_return_template', templateSelect.value);
            if (expertSelect) sessionStorage.setItem('persist_return_expert', expertSelect.value);
            if (placeInput) sessionStorage.setItem('persist_return_place', placeInput.value);
            if (dateInput) sessionStorage.setItem('persist_return_date', dateInput.value);
            
            // Set flag to indicate we want to return here
            console.log("Setting returnToNewInspection flag to true");
            sessionStorage.setItem('returnToNewInspection', 'true');
            // -----------------------------------------------

            sessionStorage.removeItem('editDeviceId');
            window.location.href = 'adatbevitel.html';
        } catch (e) {
            console.error("Error in saveSerialAndRedirect:", e);
            alert("Hiba történt az átirányítás során: " + e.message);
        }
    }

    // --- AUTOCOMPLETE LOGIC ---
    let allPartnerDevices = [];

    const fetchAllPartnerDevices = async () => {
        try {
            const snapshot = await db.collection('partners').doc(partnerId).collection('devices').get();
            allPartnerDevices = snapshot.docs.map(doc => ({
                id: doc.id,
                serialNumber: doc.data().serialNumber || '',
                name: doc.data().name || doc.data().description || '',
                operatorId: doc.data().operatorId || ''
            }));
            console.log("Devices loaded for autocomplete:", allPartnerDevices.length);
        } catch (error) {
            console.error("Error loading devices for autocomplete:", error);
        }
    };

    if (searchDeviceForm) {
        if (serialNumberInput) {
            fetchAllPartnerDevices();

            serialNumberInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (!suggestionsList) return;

                suggestionsList.innerHTML = '';
                if (query.length === 0) {
                    suggestionsList.classList.add('hidden');
                    return;
                }

                const matches = allPartnerDevices.filter(device => 
                    (device.serialNumber || '').toLowerCase().includes(query)
                );

                if (matches.length > 0) {
                    suggestionsList.classList.remove('hidden');
                    matches.slice(0, 10).forEach(device => {
                        const li = document.createElement('li');
                        li.className = 'px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 flex justify-between';
                        const operatorIdDisplay = device.operatorId ? ` (${device.operatorId})` : '';
                        li.innerHTML = `
                            <span class="font-bold text-white">${device.serialNumber}</span>
                            <span class="text-sm text-gray-400 truncate ml-2">${device.name}${operatorIdDisplay}</span>
                        `;
                        li.addEventListener('click', () => {
                            serialNumberInput.value = device.serialNumber;
                            suggestionsList.classList.add('hidden');
                            searchDeviceForm.dispatchEvent(new Event('submit'));
                        });
                        suggestionsList.appendChild(li);
                    });
                } else {
                    suggestionsList.classList.add('hidden');
                }
            });

            document.addEventListener('click', (e) => {
                if (suggestionsList && !serialNumberInput.contains(e.target) && !suggestionsList.contains(e.target)) {
                    suggestionsList.classList.add('hidden');
                }
            });
        }

    const btnQrSearchNew = document.getElementById('btn-qr-search-start-new');
    if (btnQrSearchNew) {
        btnQrSearchNew.addEventListener('click', startQRScanner);
    }

    const btnNfcSearchNew = document.getElementById('btn-nfc-search-start-new');
    if (btnNfcSearchNew) {
        btnNfcSearchNew.addEventListener('click', scanChipAndSearchDevice);
    }

    searchDeviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serialNumber = serialNumberInput.value.trim();
        if (!serialNumber) return;

        window.currentUevmData = null; // Reset UEVM data on new search
        deviceSearchResult.innerHTML = `<p class="text-gray-400">Keresés...</p>`;

        try {
            // Base query
            let baseQuery = db.collection('partners').doc(partnerId).collection('devices');

            // EKV users can only search for isI: true devices
            if (userData && userData.isEkvUser) {
                baseQuery = baseQuery.where('isI', '==', true);
            }

            let querySnapshot;

            if (selectedAutocompleteDeviceId) {
                const docRef = db.collection('partners').doc(partnerId).collection('devices').doc(selectedAutocompleteDeviceId);
                const doc = await docRef.get();
                if (doc.exists) {
                     querySnapshot = { empty: false, docs: [doc] };
                     selectedAutocompleteDeviceId = null;
                } else {
                     querySnapshot = { empty: true, docs: [] };
                }
            } else {
                // 1. Try string match
                querySnapshot = await baseQuery.where('serialNumber', '==', serialNumber).limit(1).get();

                // 2. If not found and input is numeric, try number match
                // Note: serialNumber is from input, so it's a string.
                if (querySnapshot.empty && !isNaN(serialNumber) && serialNumber.trim() !== '') {
                     // Convert to number for strict equality check in Firestore
                     const numericSerial = Number(serialNumber);
                     querySnapshot = await baseQuery.where('serialNumber', '==', numericSerial).limit(1).get();
                }
            }

            if (querySnapshot.empty) {
                deviceSearchResult.innerHTML = `
                    <p class="text-red-400">Nem található eszköz ezzel a gyári számmal.</p>
                    <button onclick="saveSerialAndRedirect()" class="btn btn-primary mt-4">Új eszköz felvitele</button>
                `;
                currentInspectedDevice = null;
            } else {
                const device = querySnapshot.docs[0].data();
                currentInspectedDevice = { id: querySnapshot.docs[0].id, ...device };

                // Check if modal container exists, if not add it
                if (!document.getElementById('uevm-modal-container')) {
                    const modalContainer = document.createElement('div');
                    modalContainer.id = 'uevm-modal-container';
                    modalContainer.innerHTML = getUevmModalHtml();
                    document.body.appendChild(modalContainer);
                }

                const keyMappings = {
                    description: 'Megnevezés',
                    type: 'Típus',
                    effectiveLength: 'Hasznos hossz',
                    loadCapacity: 'Teherbírás (WLL)',
                    manufacturer: 'Gyártó',
                    yearOfManufacture: 'Gyártás éve',
                    serialNumber: 'Gyári szám',
                    operatorId: 'Üzemeltetői azonosító',
                    id: 'id'
                };

                // Check if modal container exists, if not add it
                if (!document.getElementById('uevm-modal-container')) {
                    const modalContainer = document.createElement('div');
                    modalContainer.id = 'uevm-modal-container';
                    modalContainer.innerHTML = getUevmModalHtml();
                    document.body.appendChild(modalContainer);
                }

                let detailsHtml = '<h3 class="text-xl font-bold mb-4 text-green-300">Megtalált eszköz adatai</h3>';
                detailsHtml += '<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-left">';

                // Manual layout
                // Row 1
                detailsHtml += `
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['description']}:</span>
                        <p class="font-semibold text-white break-words">${device.description || '-'}</p>
                    </div>
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['type']}:</span>
                        <p class="font-semibold text-white break-words">${device.type || '-'}</p>
                    </div>
                `;
                // Row 2
                detailsHtml += `
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['loadCapacity']}:</span>
                        <p class="font-semibold text-white break-words">${device.loadCapacity || '-'}</p>
                    </div>
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['effectiveLength']}:</span>
                        <p class="font-semibold text-white break-words">${device.effectiveLength || '-'}</p>
                    </div>
                `;
                // Row 3
                detailsHtml += `
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['serialNumber']}:</span>
                        <p class="font-semibold text-white break-words">${device.serialNumber || '-'}</p>
                    </div>
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['operatorId']}:</span>
                        <p class="font-semibold text-white break-words">${device.operatorId || '-'}</p>
                    </div>
                `;
                // Row 4
                detailsHtml += `
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['manufacturer']}:</span>
                        <p class="font-semibold text-white break-words">${device.manufacturer || '-'}</p>
                    </div>
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['yearOfManufacture']}:</span>
                        <p class="font-semibold text-white break-words">${device.yearOfManufacture || '-'}</p>
                    </div>
                `;
                // Row 5
                detailsHtml += `
                    <div class="border-b border-blue-800 py-1">
                        <span class="text-blue-300 text-sm">${keyMappings['id']}:</span>
                        <p class="font-semibold text-white break-words">${currentInspectedDevice.id || '-'}</p>
                    </div>
                `;

                detailsHtml += '</div>';

                detailsHtml += `
                    <div class="mt-6 pt-4 border-t border-blue-700">
                        <h3 class="text-xl font-bold mb-4 text-green-300">Vizsgálati adatok rögzítése</h3>
                        <div id="new-inspection-form" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <label class="block text-sm">Következő időszakos vizsgálat</label>
                                <select name="kov_idoszakos_vizsgalat_period" class="input-field">
                                    <option value="">Válasszon periódust</option>
                                    <option value="0.25">1/4 év</option>
                                    <option value="0.5">1/2 év</option>
                                    <option value="0.75">3/4 év</option>
                                    <option value="1">1 év</option>
                                </select>
                                <input name="kov_idoszakos_vizsgalat" type="date" class="input-field mt-2">
                            </div>
                            <div id="container-kov-terhelesi">
                                <label class="block text-sm">Következő Terhelési próba</label>
                                <select name="kov_terhelesi_proba_period" class="input-field">
                                    <option value="">Válasszon periódust</option>
                                    <option value="0.25">1/4 év</option>
                                    <option value="0.5">1/2 év</option>
                                    <option value="0.75">3/4 év</option>
                                    <option value="1">1 év</option>
                                </select>
                                <input name="kov_terhelesi_proba" type="date" class="input-field mt-2">
                            </div>
                            <div>
                                <label class="block text-sm">Vizsgálat eredménye</label>
                                <div class="flex items-center gap-2">
                                    <select name="vizsgalat_eredmenye" class="input-field flex-grow">
                                        <option>Megfelelt</option>
                                        <option>Nem felelt meg</option>
                                    </select>
                                    ${(userData && userData.isEkvUser) ? `
                                    <button type="button" id="openUevmBtn" class="ml-2 px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded border border-blue-500 transition-colors">
                                        <i class="fas fa-paperclip mr-1"></i> Vizsgálati melléklet
                                    </button>
                                    <div id="uevm-status-indicator" class="ml-2 text-xs text-gray-500 hidden"><i class="fas fa-check text-green-500"></i> Csatolva</div>
                                    ` : `
                                    <div class="flex items-center ml-2 border border-gray-600 rounded px-2 py-1 bg-gray-700">
                                        <input type="checkbox" id="ajanlatKeresInput" name="ajanlat_keres" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                        <label for="ajanlatKeresInput" class="ml-2 text-xs font-medium text-gray-300 cursor-pointer select-none">Ajánlat menjen</label>
                                    </div>
                                    `}
                                </div>
                            </div>
                            <div class="md:col-span-2">
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-sm">Feltárt hiba</label>
                                    <button type="button" id="dictate-error-btn" class="dictation-btn" title="Diktálás">
                                        <i class="fas fa-microphone"></i>
                                    </button>
                                </div>
                                <textarea name="feltart_hiba" class="input-field" rows="2"></textarea>
                            </div>
                            <div class="md:col-span-2">
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-sm">Felhasznált anyagok</label>
                                    <button type="button" id="dictate-material-btn" class="dictation-btn" title="Diktálás">
                                        <i class="fas fa-microphone"></i>
                                    </button>
                                </div>
                                <textarea name="felhasznalt_anyagok" class="input-field" rows="2"></textarea>
                            </div>
                        </div>
                        <div class="mt-6 flex gap-4">
                            <button id="saveInspectionButton" class="btn btn-primary">Vizsgálat mentése</button>
                            <button type="button" id="copyPreviousInspectionDataBtn" class="btn btn-info">Előző adatok másolása</button>
                        </div>
                    </div>
                `;

                deviceSearchResult.innerHTML = detailsHtml;

                // --- AUTO-DATE LOGIC FOR 'NEM FELELT MEG' ---
                const vizsgalatEredmenyeSelect = document.querySelector('[name="vizsgalat_eredmenye"]');
                if (vizsgalatEredmenyeSelect) {
                    vizsgalatEredmenyeSelect.addEventListener('change', (e) => {
                        if (e.target.value === 'Nem felelt meg' || e.target.value === 'Nicht zugelassen' || e.target.value === 'Nicht zugelassen/Nem felelt meg') {
                            const today = new Date().toISOString().slice(0, 10);
                            const idoszakosDateInput = document.querySelector('[name="kov_idoszakos_vizsgalat"]');
                            const terhelesiDateInput = document.querySelector('[name="kov_terhelesi_proba"]');
                            
                            if (idoszakosDateInput) idoszakosDateInput.value = today;
                            if (terhelesiDateInput) terhelesiDateInput.value = today;
                        }
                    });
                }

                // --- VISIBILITY LOGIC FOR 'RÖGZÍTŐESZKÖZ VIZSGÁLAT' ---
                const templateSelect = document.getElementById('templateSelectNewInspection');
                const loadTestContainer = document.getElementById('container-kov-terhelesi');

                if (templateSelect && loadTestContainer) {
                    const handleTemplateChange = () => {
                        if (templateSelect.value === 'Rögzítőeszköz vizsgálat' || templateSelect.value === 'Prüfung von Ladungssicherungsmitteln') {
                            loadTestContainer.style.display = 'none';
                            // Opcionális: üríthetjük is a mezőket, ha elrejtjük
                            const inputs = loadTestContainer.querySelectorAll('input, select');
                            inputs.forEach(input => input.value = '');
                        } else {
                            loadTestContainer.style.display = 'block';
                        }

                        // Update Result Dropdown Options
                        if (vizsgalatEredmenyeSelect) {
                            const currentVal = vizsgalatEredmenyeSelect.value;
                            if (templateSelect.value === 'Prüfung von Ladungssicherungsmitteln' || templateSelect.value === 'Prüfung von Lastaufnahmemitteln') {
                                vizsgalatEredmenyeSelect.innerHTML = `
                                    <option>Zugelassen/Megfelelt</option>
                                    <option>Nicht zugelassen/Nem felelt meg</option>
                                `;
                            } else if (templateSelect.value === 'Inspection of Lifting Accessories') {
                                vizsgalatEredmenyeSelect.innerHTML = `
                                    <option>Megfelelt / Suitable</option>
                                    <option>Nem felelt meg / Not suitable</option>
                                `;
                            } else {
                                vizsgalatEredmenyeSelect.innerHTML = `
                                    <option>Megfelelt</option>
                                    <option>Nem felelt meg</option>
                                `;
                            }
                        }
                    };

                    templateSelect.addEventListener('change', handleTemplateChange);
                    handleTemplateChange(); // Initial check
                }

                // --- DICTATION LOGIC START ---
                const setupDictation = (btnId, inputName) => {
                    const btn = document.getElementById(btnId);
                    const input = document.querySelector(`[name="${inputName}"]`);
                    
                    if (!btn || !input) return;

                    // Check browser support
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    if (!SpeechRecognition) {
                        console.warn("Speech Recognition API not supported in this browser.");
                        btn.style.display = 'none'; // Hide button if not supported
                        return;
                    }

                    const recognition = new SpeechRecognition();
                    recognition.lang = 'hu-HU';
                    recognition.continuous = false;
                    recognition.interimResults = false;

                    recognition.onstart = () => {
                        console.log(`Dictation started for ${inputName}`);
                        btn.classList.add('recording');
                    };

                    recognition.onend = () => {
                        console.log(`Dictation ended for ${inputName}`);
                        btn.classList.remove('recording');
                    };

                    recognition.onerror = (event) => {
                        console.error("Speech recognition error", event.error);
                        btn.classList.remove('recording');
                        // Optional: alert user on specific errors like 'not-allowed'
                    };

                    recognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript;
                        console.log(`Transcript: ${transcript}`);
                        
                        // Append with space if needed
                        if (input.value && !input.value.endsWith(' ') && !input.value.endsWith('\n')) {
                             input.value += ' ';
                        }
                        input.value += transcript;
                        // Trigger change event just in case
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    };

                    btn.addEventListener('click', () => {
                        if (btn.classList.contains('recording')) {
                            recognition.stop();
                        } else {
                            recognition.start();
                        }
                    });
                };

                // Initialize dictation for both fields
                setupDictation('dictate-error-btn', 'feltart_hiba');
                setupDictation('dictate-material-btn', 'felhasznalt_anyagok');
                // --- DICTATION LOGIC END ---

            // UEVM Button Logic
            const openUevmBtn = document.getElementById('openUevmBtn');
            if (openUevmBtn) {
                    openUevmBtn.addEventListener('click', () => {
                        initUevmModal((data) => {
                            window.currentUevmData = data; // Save to global/window for persistence
                            // Update UI to show it's attached
                            const indicator = document.getElementById('uevm-status-indicator');
                            if (indicator) {
                                indicator.classList.remove('hidden');
                            }
                            openUevmBtn.classList.remove('bg-blue-700', 'border-blue-500');
                            openUevmBtn.classList.add('bg-green-700', 'border-green-500');
                            openUevmBtn.innerHTML = '<i class="fas fa-edit mr-1"></i> Melléklet szerkesztése';
                        }, window.currentUevmData || null);
                    });
            }

            // Automatikus scroll az eredményhez
                const copyButton = document.getElementById('copyPreviousInspectionDataBtn');
                if (copyButton) {
                    copyButton.addEventListener('click', () => {
                        const fieldsToLoad = [
                            'kov_idoszakos_vizsgalat_period',
                            'kov_idoszakos_vizsgalat',
                            'kov_terhelesi_proba_period',
                            'kov_terhelesi_proba',
                            'vizsgalat_eredmenye',
                            'feltart_hiba',
                            'felhasznalt_anyagok'
                        ];
                        fieldsToLoad.forEach(name => {
                            const field = document.querySelector(`[name="${name}"]`);
                            const savedValue = sessionStorage.getItem(`persist_${name}`);
                            if (field && savedValue !== null) {
                                field.value = savedValue;
                                field.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    });
                }

                const inspectionDateInputForCalc = document.getElementById('inspectionDateInput');
                const kovIdoszakosVizsgalatPeriod = document.querySelector('[name="kov_idoszakos_vizsgalat_period"]');
                const kovIdoszakosVizsgalatDate = document.querySelector('[name="kov_idoszakos_vizsgalat"]');
                const kovTerhelesiProbaPeriod = document.querySelector('[name="kov_terhelesi_proba_period"]');
                const kovTerhelesiProbaDate = document.querySelector('[name="kov_terhelesi_proba"]');

                function calculateNextDate(baseDate, years) {
                    if (!baseDate || !years || isNaN(years)) return '';
                    const date = new Date(baseDate);
                    const monthsToAdd = Math.floor(years * 12);
                    date.setMonth(date.getMonth() + monthsToAdd);
                    return date.toISOString().slice(0, 10);
                }

                if (kovIdoszakosVizsgalatPeriod) {
                    kovIdoszakosVizsgalatPeriod.addEventListener('change', (e) => {
                        const period = parseFloat(e.target.value);
                        const baseDate = inspectionDateInputForCalc.value;
                        kovIdoszakosVizsgalatDate.value = calculateNextDate(baseDate, period);
                    });
                }

                if (kovTerhelesiProbaPeriod) {
                    kovTerhelesiProbaPeriod.addEventListener('change', (e) => {
                        const period = parseFloat(e.target.value);
                        const baseDate = inspectionDateInputForCalc.value;
                        kovTerhelesiProbaDate.value = calculateNextDate(baseDate, period);
                    });
                }

                inspectionDateInputForCalc.addEventListener('change', () => {
                    if (kovIdoszakosVizsgalatPeriod) {
                        const idoszakosPeriod = parseFloat(kovIdoszakosVizsgalatPeriod.value);
                        kovIdoszakosVizsgalatDate.value = calculateNextDate(inspectionDateInputForCalc.value, idoszakosPeriod);
                    }
                    if (kovTerhelesiProbaPeriod) {
                        const terhelesiPeriod = parseFloat(kovTerhelesiProbaPeriod.value);
                        kovTerhelesiProbaDate.value = calculateNextDate(inspectionDateInputForCalc.value, terhelesiPeriod);
                    }
                });

                const saveInspectionButton = document.getElementById('saveInspectionButton');
                if (saveInspectionButton) {
                    saveInspectionButton.addEventListener('click', async () => {
                        // Hide keyboard on mobile
                        if (document.activeElement) {
                            document.activeElement.blur();
                        }

                        const user = auth.currentUser;
                        if (!user || !currentInspectedDevice) {
                            alert('Hiba: Nincs bejelentkezett felhasználó vagy kiválasztott eszköz.');
                            return;
                        }

                        const fieldsToSave = [
                            'kov_idoszakos_vizsgalat_period',
                            'kov_idoszakos_vizsgalat',
                            'kov_terhelesi_proba_period',
                            'kov_terhelesi_proba',
                            'vizsgalat_eredmenye',
                            'feltart_hiba',
                            'felhasznalt_anyagok'
                        ];
                        fieldsToSave.forEach(name => {
                            const field = document.querySelector(`[name="${name}"]`);
                            if (field) {
                                sessionStorage.setItem(`persist_${name}`, field.value);
                            }
                        });

                        const inspectionData = {
                            deviceId: currentInspectedDevice.id,
                            partnerId: partnerId,
                            vizsgalatJellege: document.getElementById('templateSelectNewInspection').value,
                            szakerto: (userData && userData.isEkvUser) ? (user.displayName || user.email) : document.getElementById('expertSelectNewInspection').value,
                            inspectionProtocol: (userData && userData.isEkvUser) ? document.getElementById('expertSelectNewInspection').value : null,
                            vizsgalatHelye: document.getElementById('inspectionLocationInput').value,
                            vizsgalatIdopontja: document.getElementById('inspectionDateInput').value,
                            kovetkezoIdoszakosVizsgalat: document.querySelector('[name="kov_idoszakos_vizsgalat"]').value,
                            kovetkezoTerhelesiProba: document.querySelector('[name="kov_terhelesi_proba"]').value,
                            vizsgalatEredmenye: document.querySelector('[name="vizsgalat_eredmenye"]').value,
                            feltartHiba: document.querySelector('[name="feltart_hiba"]').value,
                            felhasznaltAnyagok: document.querySelector('[name="felhasznalt_anyagok"]').value,

                            ajanlatKeres: document.getElementById('ajanlatKeresInput') ? document.getElementById('ajanlatKeresInput').checked : false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            createdBy: user.displayName || user.email,
                            createdByUid: user.uid, // Save UID for EKV filtering
                            status: 'draft', // Piszkozat állapot beállítása
                            uevmData: window.currentUevmData || null // Save UEVM data if exists
                        };

                        // Ha Rögzítőeszköz vizsgálat, akkor a következő terhelési próba nem releváns (hidden),
                        // de a validáció miatt ne akadjon el, illetve ne mentsünk be hülyeséget.
                        if (inspectionData.vizsgalatJellege === 'Rögzítőeszköz vizsgálat' || inspectionData.vizsgalatJellege === 'Prüfung von Ladungssicherungsmitteln') { // Note: Lastaufnahmemitteln DOES need load test, so we exclude it here
                             inspectionData.kovetkezoTerhelesiProba = ''; // Clear it
                        }

                        const dataToHash = `${inspectionData.deviceId}${inspectionData.szakerto}${inspectionData.vizsgalatIdopontja}`;
                        inspectionData.hash = await generateHash(dataToHash);

                        // Validation
                        const requiredFields = [
                            inspectionData.vizsgalatJellege,
                            inspectionData.szakerto,
                            inspectionData.vizsgalatHelye,
                            inspectionData.vizsgalatIdopontja,
                            inspectionData.kovetkezoIdoszakosVizsgalat,
                            inspectionData.vizsgalatEredmenye
                        ];

                        // Csak akkor kötelező a terhelési, ha NEM Rögzítőeszköz vizsgálat (és nem a német változata)
                        // A Lastaufnahmemitteln (Lastfelvétel) viszont IGÉNYEL terhelésit.
                        if (inspectionData.vizsgalatJellege !== 'Rögzítőeszköz vizsgálat' && inspectionData.vizsgalatJellege !== 'Prüfung von Ladungssicherungsmitteln') {
                             requiredFields.push(inspectionData.kovetkezoTerhelesiProba);
                        }

                        if (requiredFields.some(field => !field || field.trim() === '')) {
                            alert('Kérjük, töltse ki az összes kötelező mezőt a vizsgálat mentéséhez! (A "Feltárt hiba" és a "Felhasznált anyagok" nem kötelező).');
                            return;
                        }

                        try {
                            console.log("Data to be saved as draft:", inspectionData);
                            // 1. Csak a vizsgálati piszkozatot mentjük az 'inspections' alkollekcióba
                            const newInspectionRef = db.collection('partners').doc(partnerId).collection('devices').doc(currentInspectedDevice.id).collection('inspections');
                            await newInspectionRef.add(inspectionData);

                            // 2. Az eszköz dokumentum azonnali frissítése eltávolítva.
                            //    Ez majd a véglegesítéskor fog megtörténni.

                            // alert('Vizsgálati piszkozat sikeresen mentve!');
                            showSuccessModal(`Vizsgálati piszkozat sikeresen mentve!<br><br>Gyári szám:<br><span class="font-bold text-2xl text-yellow-500">${currentInspectedDevice.serialNumber}</span>`);
                            // A felület ürítése és visszajelzés a felhasználónak
                            deviceSearchResult.innerHTML = '<p class="text-green-400">Vizsgálati piszkozat sikeresen rögzítve. Keressen új eszközt a folytatáshoz.</p>';
                            serialNumberInput.value = ''; // Gyári szám mező ürítése
                            // serialNumberInput.focus(); // Fókusz vissza a gyári szám mezőre - REMOVED to prevent keyboard from reopening on mobile

                        } catch (error) {
                            console.error("Hiba a vizsgálati piszkozat mentésekor: ", error);
                            alert('Hiba történt a vizsgálati piszkozat mentésekor: ' + error.message);
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Hiba az eszköz keresésekor:", error);
            deviceSearchResult.innerHTML = `<p class="text-red-400">Hiba történt a keresés során.</p>`;
        }
    });
    // Custom Success Modal Function
    function showSuccessModal(messageHtml) {
        let modal = document.getElementById('custom-success-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-success-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-gray-800 border border-orange-500 rounded-lg p-6 max-w-sm w-full shadow-2xl transform transition-all">
                    <div class="text-center">
                        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/50 mb-4 ring-2 ring-green-500">
                            <svg class="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-2">Siker!</h3>
                        <div class="mt-2 mb-6">
                            <p class="text-gray-300" id="modal-success-message"></p>
                        </div>
                        <div>
                            <button id="modal-success-ok-btn" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:text-sm">
                                Rendben
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            document.getElementById('modal-success-ok-btn').addEventListener('click', () => {
                 modal.classList.add('hidden');
            });
        }
        
        document.getElementById('modal-success-message').innerHTML = messageHtml;
        modal.classList.remove('hidden');
    }
    }
    // --- RETURNING FROM NEW DEVICE CREATION ---
    if (sessionStorage.getItem('returnToNewInspection') === 'true') {
        sessionStorage.removeItem('returnToNewInspection'); // Clear flag immediately

        // 1. Switch to New Inspection Screen
        const newInspectionScreen = document.getElementById('newInspectionScreen');
        if (newInspectionScreen) {
             // We need to access showScreen which is defined inside this scope.
             // showScreen is defined at line 275.
             showScreen(newInspectionScreen);
        }

        // 2. Restore Header Values
        const savedTemplate = sessionStorage.getItem('persist_return_template');
        const savedExpert = sessionStorage.getItem('persist_return_expert');
        const savedPlace = sessionStorage.getItem('persist_return_place');
        const savedDate = sessionStorage.getItem('persist_return_date');

        // We need to wait for select options to populate (loadExperts/loadProtocols is async)
        // A simple timeout or polling mechanism is needed for the selects.
        // For inputs it's instant.
        
        if (document.getElementById('inspectionLocationInput') && savedPlace) {
             console.log("Restoration: Restoring place", savedPlace);
             document.getElementById('inspectionLocationInput').value = savedPlace;
        } else {
             console.log("Restoration: Place not restored", { element: !!document.getElementById('inspectionLocationInput'), savedPlace });
        }
        
        if (document.getElementById('inspectionDateInput') && savedDate) {
             document.getElementById('inspectionDateInput').value = savedDate;
        }

        const restoreSelects = () => {
            const tmplSel = document.getElementById('templateSelectNewInspection');
            const expSel = document.getElementById('expertSelectNewInspection');
            
            console.log("Restoration: restoring selects...", { 
                savedTemplate, 
                savedExpert, 
                tmplSel: !!tmplSel, 
                expSel: !!expSel,
                expOptions: expSel ? expSel.options.length : 0 
            });

            if (tmplSel && savedTemplate) tmplSel.value = savedTemplate;
            
            // Expert/Protocol select might need time to load options
            // Basic retry logic
            if (expSel && savedExpert) {
                if (expSel.options.length > 1) {
                    expSel.value = savedExpert;
                    console.log("Restoration: Expert restored to", savedExpert);
                } else {
                    console.log("Restoration: Expert options not loaded yet, retrying...");
                    setTimeout(restoreSelects, 200);
                    return;
                }
            }
            
            // Clean up stored values
            console.log("Restoration: Cleaning up persistent storage");
            sessionStorage.removeItem('persist_return_template');
            sessionStorage.removeItem('persist_return_expert');
            sessionStorage.removeItem('persist_return_place');
            sessionStorage.removeItem('persist_return_date');
        };

        // Start trying to restore selects
        setTimeout(restoreSelects, 500);

        // 3. Auto-populate and Search for the new device
        // 3. Auto-populate and Search for the new device
        const newSerial = sessionStorage.getItem('lastCreatedDeviceSerial');
        console.log("Restoration: Checking for newSerial", newSerial);

        if (newSerial) {
            const serialInput = document.getElementById('serialNumberInput');
            if (serialInput) {
                console.log("Restoration: Setting serial input to", newSerial);
                serialInput.value = newSerial;
                sessionStorage.removeItem('lastCreatedDeviceSerial'); // Only remove if successful
                
                // Trigger search
                setTimeout(() => {
                    console.log("Restoration: Triggering search...");
                    const form = document.getElementById('searchDeviceForm');
                    if (form) {
                         form.dispatchEvent(new Event('submit'));
                    } else {
                        console.error("Restoration: searchDeviceForm not found!");
                    }
                }, 1000);
            } else {
                console.error("Restoration: serialNumberInput not found!");
            }
        }
    }
}


// ===================================================================================
// PARTNER MUNKA KÉPERNYŐ (KERET)
// ===================================================================================

function getNewInspectionScreenHtml(userData) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD formátum
    const isEkvUser = (userData && userData.isEkvUser) || false;
    const secondFieldLabel = isEkvUser ? "2. Jegyzőkönyv" : "2. Szakértő";
    const secondFieldPlaceholder = isEkvUser ? "Jegyzőkönyvek betöltése..." : "Szakértők betöltése...";

    return `
        <div class="card max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold text-center mb-8">Új vizsgálat rögzítése</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-blue-800 pb-8">
                <div>
                    <h3 class="text-lg font-semibold mb-3">Vizsgálat jellege</h3>
                    <select id="templateSelectNewInspection" class="input-field">
                        <option>Fővizsgálat</option>
                        <option>Szerkezeti vizsgálat</option>
                        <option>Biztonsági Felülvizsgálat</option>
                        <option>Rögzítőeszköz vizsgálat</option>
                        <option>Prüfung von Ladungssicherungsmitteln</option>
                        <option>Prüfung von Lastaufnahmemitteln</option>
                        <option>Inspection of Lifting Accessories</option>
                    </select>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-3">${secondFieldLabel}</h3>
                    <select id="expertSelectNewInspection" class="input-field" required>
                        <option value="" disabled selected>${secondFieldPlaceholder}</option>
                    </select>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-3">3. Vizsgálat helye</h3>
                    <input type="text" id="inspectionLocationInput" placeholder="Pl. a partner telephelye" class="input-field">
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-3">4. Vizsgálat időpontja</h3>
                    <input type="date" id="inspectionDateInput" class="input-field" value="${today}">
                </div>
            </div>

            <h3 class="text-lg font-semibold mb-3">5. Eszköz keresése</h3>
            
            <div class="flex flex-col gap-4 mb-6">
                <!-- Option 1: Manual -->
                <div class="w-full">
                    <label class="block text-sm text-gray-400 mb-1">1. Opció: Gyári szám megadása</label>
                    <form id="searchDeviceForm" class="flex flex-col sm:flex-row items-center gap-4 relative">
                        <div class="relative w-full flex-grow">
                             <input type="text" id="serialNumberInput" placeholder="Gyári szám..." class="input-field w-full" autocomplete="off" required>
                             <ul id="serialNumberSuggestions" class="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg mt-1 hidden max-h-60 overflow-y-auto">
                                <!-- Suggestions will be injected here -->
                             </ul>
                        </div>
                        <button id="searchDeviceBySerialBtn" class="btn btn-primary w-full sm:w-auto">Keresés</button>
                    </form>
                </div>

                <div class="flex items-center justify-center text-gray-500 text-sm font-bold">- VAGY -</div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Option 2: QR -->
                    <button type="button" id="btn-qr-search-start-new" class="flex items-center justify-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors text-white">
                        <i class="fas fa-qrcode text-green-400 text-xl"></i>
                        <span>2. Opció: QR-kód beolvasása</span>
                    </button>

                    <!-- Option 3: NFC -->
                    <button type="button" id="btn-nfc-search-start-new" class="flex items-center justify-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors text-white">
                        <i class="fas fa-rss text-blue-400 text-xl"></i>
                        <span>3. Opció: NFC chip beolvasása</span>
                    </button>
                </div>
            </div>
            <div id="deviceSearchResult" class="bg-blue-900/50 p-6 rounded-lg min-h-[8rem]">
                <p class="text-gray-400">A keresés eredménye itt fog megjelenni.</p>
            </div>

            <div class="mt-8 text-left"><button id="backToDeviceListBtn" class="btn btn-secondary">Vissza az eszközlistához</button></div>
        </div>
    `;
}

function getNewUsageScreenHtml() {
    const today = new Date().toISOString().slice(0, 10);
    return `
        <div class="card max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold text-center mb-6">Új használatba vétel</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Fejléc adatok -->
                <div class="space-y-4">
                    <h3 class="font-semibold text-lg border-b border-gray-600 pb-2">Dokumentum adatok (Fejléc)</h3>
                    
                    <div>
                        <p class="mb-2 text-sm text-gray-300">EK-megfelelőségi nyilatkozat (CE):</p>
                        <div class="flex items-center space-x-4">
                            <label class="inline-flex items-center">
                                <input type="radio" name="ce_radio" value="Megvan" class="form-radio text-blue-600" checked>
                                <span class="ml-2">Megvan</span>
                            </label>
                            <label class="inline-flex items-center">
                                <input type="radio" name="ce_radio" value="Nincs" class="form-radio text-red-600">
                                <span class="ml-2">Nincs</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <p class="mb-2 text-sm text-gray-300">Gyártóművi műbizonylat:</p>
                        <div class="flex items-center space-x-4">
                            <label class="inline-flex items-center">
                                <input type="radio" name="mubizonylat_radio" value="Megvan" class="form-radio text-blue-600" checked>
                                <span class="ml-2">Megvan</span>
                            </label>
                            <label class="inline-flex items-center">
                                <input type="radio" name="mubizonylat_radio" value="Nincs" class="form-radio text-red-600">
                                <span class="ml-2">Nincs</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <p class="mb-2 text-sm text-gray-300">Magyar nyelvű kezelési utasítás:</p>
                        <div class="flex items-center space-x-4">
                            <label class="inline-flex items-center">
                                <input type="radio" name="kezelesi_radio" value="Megvan" class="form-radio text-blue-600" checked>
                                <span class="ml-2">Megvan</span>
                            </label>
                            <label class="inline-flex items-center">
                                <input type="radio" name="kezelesi_radio" value="Nincs" class="form-radio text-red-600">
                                <span class="ml-2">Nincs</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <h3 class="font-semibold text-lg border-b border-gray-600 pb-2">Dátumok és Jóváhagyás</h3>
                    
                    <div>
                        <label class="block text-sm font-medium mb-1">Használatba vétel dátuma:</label>
                        <input type="date" id="usageDateInput" class="input-field" value="${today}">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-1">Következő esedékes vizsgálat:</label>
                        <input type="date" id="nextInspectionDateInput" class="input-field">
                        <div class="mt-2 flex flex-wrap gap-2">
                             <button type="button" class="period-select-btn px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-months="3">3 hó</button>
                             <button type="button" class="period-select-btn px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-months="6">6 hó</button>
                             <button type="button" class="period-select-btn px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-months="9">9 hó</button>
                             <button type="button" class="period-select-btn px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-months="12">1 év</button>
                             <button type="button" class="period-select-btn px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-months="24">2 év</button>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-1">Engedélyező személy:</label>
                        <input type="text" id="approverNameInput" class="input-field" placeholder="Név">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-1">Beosztás:</label>
                        <input type="text" id="approverPositionInput" class="input-field" placeholder="Beosztás">
                    </div>
                </div>
            </div>

            <h3 class="font-semibold text-lg border-b border-gray-600 pb-2 mb-4">Kiválasztott eszközök</h3>
            <div class="overflow-x-auto mb-6">
                <table class="min-w-full divide-y divide-gray-700">
                    <thead class="bg-gray-800">
                        <tr>
                            <th class="px-4 py-2 text-left text-sm font-medium text-white">Gyári szám</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-white">Megnevezés</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-white">Típus</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-white">Hossz</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-white">Teherbírás</th>
                        </tr>
                    </thead>
                    <tbody id="selectedUsageDevicesBody" class="divide-y divide-gray-700 bg-gray-900/50">
                        <!-- Populated by JS -->
                    </tbody>
                </table>
            </div>

            <div class="flex justify-between mt-6">
                <button id="cancelUsageBtn" class="btn btn-secondary">Mégse</button>
                <button id="createUsageDocsBtn" class="btn btn-primary">Dokumentumok létrehozása</button>
            </div>
        </div>
    `;
}

export function getPartnerWorkScreenHtml(partner, userData) {
    const user = auth.currentUser;
    const logoUrl = partner.logoUrl || 'images/ETAR_H.png';
    const role = userData.partnerRoles[partner.id];
    const userRoles = userData.roles || [];

    const isReadOnly = role === 'read' && !userData.isEjkUser;
    const canInspect = userRoles.includes('EJK_admin') || userRoles.includes('EJK_write') || userData.isEkvUser;
    
    // ENY users with Write permissions (Admin or Write role)
    const isEnyUser = !userData.isEjkUser && !userData.isEkvUser;
    const canRegisterUsage = isEnyUser && (role === 'admin' || role === 'write');

    let uploadButtonHtml;
    if (isReadOnly) {
        uploadButtonHtml = `<button onclick="alert('Read jogosultsággal nem tölthet fel adatokat. Forduljon a jogosultság osztójához.')" class="menu-btn menu-btn-primary opacity-50 cursor-not-allowed w-full text-left"><i class="fas fa-upload fa-fw"></i>Új eszköz feltöltés</button>`;
    } else {
        uploadButtonHtml = `<button id="uploadDeviceBtn" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-upload fa-fw"></i>Új eszköz feltöltés</button>`;
    }

    let newInspectionButtonHtml = '';
    if (canInspect) {
        newInspectionButtonHtml = `<button id="showNewInspectionBtn" class="menu-btn menu-btn-primary"><i class="fas fa-plus fa-fw"></i>Új vizsgálat</button>`;
    } else if (canRegisterUsage) {
        newInspectionButtonHtml = `<button id="showNewUsageBtn" class="menu-btn menu-btn-primary"><i class="fas fa-file-signature fa-fw"></i>Új használatba vétel</button>`;
    }

    let newInspectionButtonHtmlMobile = '';
    if (canInspect) {
        newInspectionButtonHtmlMobile = `<button id="showNewInspectionBtnMobile" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-plus fa-fw"></i>Új vizsgálat</button>`;
    } else if (canRegisterUsage) {
        newInspectionButtonHtmlMobile = `<button id="showNewUsageBtnMobile" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-file-signature fa-fw"></i>Új használatba vétel</button>`;
    }

    let actionButtonsHtml = '';
    let actionButtonsHtmlMobile = '';
    if (!isReadOnly) {
        // EKV users cannot decommission devices
        const showDecommissionBtn = !userData.isEkvUser;
        
        actionButtonsHtml = `
            <button id="delete-device-btn" class="menu-btn menu-btn-primary"><i class="fas fa-trash fa-fw"></i>Törlés</button>
            ${showDecommissionBtn ? `<button id="decommission-reactivate-btn" class="menu-btn menu-btn-primary"><i class="fas fa-ban fa-fw"></i>Leselejtezés</button>` : ''}
        `;
        actionButtonsHtmlMobile = `
            <button id="delete-device-btn-mobile" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-trash fa-fw"></i>Törlés</button>
            ${showDecommissionBtn ? `<button id="decommission-reactivate-btn-mobile" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-ban fa-fw"></i>Leselejtezés</button>` : ''}
        `;
    }

    return `
        <header id="partner-work-screen-header" class="bg-gray-800 text-white shadow-lg relative">
            <div class="p-4 flex items-center justify-between">
                <div class="flex items-center">
                    <img src="${logoUrl}" alt="${partner.name} Logo" class="h-12 w-12 xl:h-16 xl:w-16 object-contain mr-4 rounded-full border-2 border-blue-400">
                    <div>
                        <h1 class="text-lg xl:text-xl font-bold text-blue-300">${partner.name}</h1>
                        <p class="text-xs xl:text-sm text-gray-400">${partner.address}</p>
                        ${(userData.isEjkUser === true || role === 'admin' || (userRoles && (userRoles.includes('admin') || userRoles.includes('EJK_admin')))) ? `<p class="text-xs xl:text-sm text-gray-400">ETAR kód: <span class="text-red-500 font-bold">${partner.etarCode || '-'}</span></p>` : ''}
                        <p class="text-xs xl:text-sm text-gray-400 mt-1">Bejelentkezve: ${userData.name || user.displayName || user.email} (${role || 'N/A'})</p>
                    </div>
                </div>
                <!-- Hamburger Menu Button -->
                <div class="xl:hidden">
                    <button id="hamburger-btn" class="text-white focus:outline-none">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                </div>
                 <!-- Desktop Menu -->
                <nav class="hidden xl:flex items-center gap-2 flex-nowrap">
                    <button id="download-db-btn" class="menu-btn menu-btn-primary whitespace-nowrap text-xs xl:text-xs 2xl:text-sm px-2"><i class="fas fa-download fa-fw"></i>Adatbázis</button>
                    ${uploadButtonHtml.replace('w-full text-left', '').replace('Új eszköz feltöltés', 'Feltöltés').replace('menu-btn-primary', 'menu-btn-primary whitespace-nowrap text-xs xl:text-xs 2xl:text-sm px-2')}
                    ${newInspectionButtonHtml.replace('Új vizsgálat', 'Új vizsgálat').replace('menu-btn-primary', 'menu-btn-primary whitespace-nowrap text-xs xl:text-xs 2xl:text-sm px-2')}
                    ${actionButtonsHtml.replace(/menu-btn-primary/g, 'menu-btn-primary whitespace-nowrap text-xs xl:text-xs 2xl:text-sm px-2')}
                    <button id="generate-protocol-btn" class="menu-btn menu-btn-primary whitespace-nowrap text-xs xl:text-xs 2xl:text-sm px-2"><i class="fas fa-file-alt fa-fw"></i>Jegyzőkönyvek</button>
                    <button id="backToMainFromWorkScreenBtn" class="menu-btn menu-btn-secondary whitespace-nowrap text-xs xl:text-xs 2xl:text-sm px-2"><i class="fas fa-arrow-left fa-fw"></i>Vissza</button>
                </nav>
            </div>
            <!-- Mobile Menu -->
            <nav id="mobile-menu" class="hidden xl:hidden bg-gray-700 p-4 space-y-2">
                <button id="download-db-btn-mobile" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-download fa-fw"></i>Adatbázis letöltés</button>
                ${uploadButtonHtml.replace('id="uploadDeviceBtn"', 'id="uploadDeviceBtnMobile"')}
                ${newInspectionButtonHtmlMobile}
                ${actionButtonsHtmlMobile}
                <button id="generate-protocol-btn-mobile" class="menu-btn menu-btn-primary w-full text-left"><i class="fas fa-file-alt fa-fw"></i>Jegyzőkönyvek</button>
                <button id="backToMainFromWorkScreenBtnMobile" class="menu-btn menu-btn-secondary w-full text-left"><i class="fas fa-arrow-left fa-fw"></i>Vissza</button>
            </nav>
        </header>
        <main class="p-4 sm:p-6 lg:p-8 flex-grow">
            <div id="deviceListScreen" class="screen active">
                ${getEszkozListaHtml()}
            </div>

            <!-- Véglegesített Jegyzőkönyvek Szekció -->
            <div id="finalizedDocsScreen" class="mt-12">
                <div class="px-4 sm:px-6 lg:px-8">
                    <div class="sm:flex sm:items-center cursor-pointer select-none" onclick="document.getElementById('finalized-reports-content').classList.toggle('hidden'); document.getElementById('finalized-reports-chevron').classList.toggle('rotate-180');">
                        <div class="sm:flex-auto flex items-center gap-2">
                             <h1 class="text-2xl font-semibold text-white">Véglegesített Jegyzőkönyvek</h1>
                             <i id="finalized-reports-chevron" class="fas fa-chevron-down text-gray-400 transition-transform duration-200"></i>
                        </div>
                    </div>
                    <p class="mt-2 text-sm text-gray-300 px-4 sm:px-6 lg:px-8">A partnerhez tartozó, véglegesített és archivált vizsgálati jegyzőkönyvek.</p>
                    
                    <div id="finalized-reports-content" class="hidden mt-4 flex flex-col transition-all duration-300">
                        <div class="mb-4 px-4 sm:px-6 lg:px-8">
                            <input type="text" id="finalized-reports-search-input" placeholder="Keressen gyári számra..." class="input-field w-full sm:w-1/2 lg:w-1/3">
                        </div>
                        <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                                <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                    <table class="min-w-full divide-y divide-gray-700">
                                        <thead class="bg-gray-800">
                                            <tr>
                                                <th scope="col" class="py-3.5 px-3 text-left text-sm font-semibold text-white">Vizsgálat Dátuma</th>
                                                <th scope="col" class="py-3.5 px-3 text-left text-sm font-semibold text-white">Eszköz Gyári Száma</th>
                                                <th scope="col" class="py-3.5 px-3 text-left text-sm font-semibold text-white">Eszköz Megnevezése</th>
                                                <th scope="col" class="py-3.5 px-3 text-left text-sm font-semibold text-white">Szakértő</th>
                                                <th scope="col" class="relative py-3.5 px-3"><span class="sr-only">Megtekintés</span></th>
                                            </tr>
                                        </thead>
                                        <tbody id="finalized-docs-body" class="divide-y divide-gray-800 bg-gray-900/50">
                                            <!-- Tartalom JS-ből -->
                                            <tr><td colspan="5" class="text-center p-4 text-gray-400">Jegyzőkönyvek betöltése...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="newInspectionScreen" class="screen">
                ${getNewInspectionScreenHtml(userData)}
            </div>
            
            <div id="newUsageScreen" class="screen">
                ${getNewUsageScreenHtml()}
            </div>
        </main>
        <!-- NFC Modal -->
        <div id="nfc-modal" class="nfc-modal-backdrop">
            <div class="nfc-modal-content">
                <h3 id="nfc-modal-title" class="text-xl font-semibold">NFC Chip Olvasás</h3>
                <div id="nfc-modal-body" class="nfc-modal-body">
                    <!-- Content will be set by JS -->
                </div>
                <button id="nfc-modal-close-btn" class="btn btn-secondary">Mégse</button>
            </div>
        </div>
        <!-- Scan Chip Modal -->
        <div id="scan-chip-modal" class="nfc-modal-backdrop" style="display: none;">
            <div class="nfc-modal-content">
                <h3 class="text-xl font-semibold">NFC Chip Olvasás</h3>
                <div class="nfc-modal-body">
                    <p>Kérem, érintse a chipet a készülékhez a kereséshez.</p>
                    <div class="loader-small"></div>
                </div>
                <button id="scan-chip-modal-close-btn" class="btn btn-secondary">Mégse</button>
            </div>
        </div>
        <footer class="p-4 bg-gray-800 text-white text-center text-sm">
            <p>&copy; ${new Date().getFullYear()} H-ITB Kft. | ETAR Rendszer</p>
        </footer>
    `;
}
