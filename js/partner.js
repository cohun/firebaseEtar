import { auth, db } from './firebase.js';

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
            <div id="filter-controls" class="mt-4 mb-3 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div class="md:col-span-2">
                    <label for="main-search-input" class="block text-sm font-medium text-gray-300">Keresés gyári számra</label>
                    <input type="search" id="main-search-input" class="input-field w-full mt-1" placeholder="Gyári szám...">
                </div>
                <div>
                    <label for="filter-vizsg-idopont" class="block text-sm font-medium text-gray-300">Vizsgálat dátuma</label>
                    <input type="date" id="filter-vizsg-idopont" class="input-field w-full mt-1">
                </div>
                <div>
                    <label for="filter-kov-vizsg" class="block text-sm font-medium text-gray-300">Következő vizsga</label>
                    <input type="date" id="filter-kov-vizsg" class="input-field w-full mt-1">
                </div>
                <div>
                    <button id="reset-filters-btn" class="btn btn-secondary w-full">Szűrők törlése</button>
                </div>
            </div>

            <!-- Eszközök Táblázata -->
            <div class="mt-4 flex flex-col">
                <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table class="min-w-full divide-y divide-gray-700">
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th scope="col" data-sort="vizsg_idopont" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Vizsg. Időp. <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="description" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable active-sort">Megnevezés <i class="fas fa-sort-down"></i></th>
                                        <th scope="col" data-sort="type" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Típus <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="effectiveLength" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Hossz <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="serialNumber" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Gyári szám <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="operatorId" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Üzemeltetői azonosító <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="status" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Megállapítások <i class="fas fa-sort"></i></th>
                                        <th scope="col" data-sort="kov_vizsg" class="py-3.5 px-3 text-left text-sm font-semibold text-white sortable">Köv. Vizsg. <i class="fas fa-sort"></i></th>
                                        <th scope="col" class="relative py-3.5 px-3"><span class="sr-only">QR</span></th>
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
 * Initializes the device list logic (state, event listeners, initial fetch).
 * @param {string} partnerId The ID of the partner whose devices to display.
 */
export function initPartnerWorkScreen(partnerId) {
    // --- SCREEN MANAGEMENT ---
    const deviceListScreen = document.getElementById('deviceListScreen');
    const newInspectionScreen = document.getElementById('newInspectionScreen');
    
    const showNewInspectionBtn = document.getElementById('showNewInspectionBtn');
    const showNewInspectionBtnMobile = document.getElementById('showNewInspectionBtnMobile');
    const backToDeviceListBtn = document.getElementById('backToDeviceListBtn');
    const partnerWorkScreenHeader = document.getElementById('partner-work-screen-header');

    function showScreen(screenToShow) {
        deviceListScreen.classList.remove('active');
        newInspectionScreen.classList.remove('active');
        screenToShow.classList.add('active');

        if (screenToShow === newInspectionScreen) {
            partnerWorkScreenHeader.classList.add('hidden');
        } else {
            partnerWorkScreenHeader.classList.remove('hidden');
        }
    }

    showNewInspectionBtn.addEventListener('click', () => showScreen(newInspectionScreen));
    showNewInspectionBtnMobile.addEventListener('click', () => showScreen(newInspectionScreen));
    backToDeviceListBtn.addEventListener('click', () => showScreen(deviceListScreen));


    // --- DEVICE LIST LOGIC ---
    let itemsPerPage = 50;
    let currentSortField = 'description';
    let currentSortDirection = 'asc';
    let searchTerm = '';
    let filters = {
        vizsg_idopont: '',
        kov_vizsg: ''
    };
    
    let firstVisibleDoc = null;
    let lastVisibleDoc = null;
    let currentPage = 1;

    const tableBody = document.getElementById('eszköz-lista-body');
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const searchInput = document.getElementById('main-search-input');
    const vizsgIdopontInput = document.getElementById('filter-vizsg-idopont');
    const kovVizsgInput = document.getElementById('filter-kov-vizsg');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const tableHeaders = document.querySelectorAll('th.sortable');

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    async function fetchDevices(direction = 'next') {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400">Adatok betöltése...</td></tr>`;

        try {
            let query = db.collection('partners').doc(partnerId).collection('devices');

            if (searchTerm) {
                query = query.where('serialNumber', '==', searchTerm);
            }
            if (filters.vizsg_idopont) {
                query = query.where('vizsg_idopont', '==', filters.vizsg_idopont);
            }
            if (filters.kov_vizsg) {
                query = query.where('kov_vizsg', '==', filters.kov_vizsg);
            }

            query = query.orderBy(currentSortField, currentSortDirection);

            if (direction === 'next' && lastVisibleDoc) {
                query = query.startAfter(lastVisibleDoc);
            } else if (direction === 'prev' && firstVisibleDoc) {
                query = query.endBefore(firstVisibleDoc).limitToLast(itemsPerPage);
            } else {
                query = query.limit(itemsPerPage);
            }

            const snapshot = await query.get();
            const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
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

        } catch (error) {
            console.error("Hiba az eszközök lekérésekor:", error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-red-400">Hiba történt az adatok betöltése közben.</td></tr>`;
            if (error.code === 'failed-precondition') {
                tableBody.innerHTML += `<tr><td colspan="8" class="text-center p-2 text-yellow-400 text-sm">Tipp: Hiányzó Firestore index. Kérjük, ellenőrizze a böngésző konzolját a létrehozási linkért.</td></tr>`;
            }
        }
    }

    function renderTable(devices) {
        if (!devices || devices.length === 0) {
            if (currentPage === 1) {
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center p-4 text-gray-400">Nincsenek a szűrési feltételeknek megfelelő eszközök.</td></tr>`;
            }
            return;
        }

        tableBody.innerHTML = devices.map(dev => `
            <tr class="hover:bg-gray-700/50">
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.vizsg_idopont || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm font-medium text-white">${dev.description || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.type || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.effectiveLength || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.serialNumber || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.operatorId || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.status || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.kov_vizsg || 'N/A'}</td>
                <td class="relative whitespace-nowrap py-2 px-3 text-center align-middle">
                    <canvas class="qr-code-canvas" data-id="${dev.id}"></canvas>
                </td>
            </tr>
        `).join('');

        generateQRCodes();
    }

    function generateQRCodes() {
        const canvases = tableBody.querySelectorAll('.qr-code-canvas');
        canvases.forEach(canvas => {
            const deviceId = canvas.dataset.id;
            if (deviceId) {
                QRCode.toCanvas(canvas, deviceId, { 
                    width: 64, 
                    margin: 1,
                    errorCorrectionLevel: 'L',
                    color: {
                        dark: '#e5e7eb', // gray-200
                        light: '#00000000' // transparent
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
        fetchDevices();
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

    searchInput.addEventListener('keyup', (e) => {
        debouncedSearch(e.target.value.trim());
    });

    vizsgIdopontInput.addEventListener('change', (e) => {
        filters.vizsg_idopont = e.target.value;
        resetAndFetch();
    });

    kovVizsgInput.addEventListener('change', (e) => {
        filters.kov_vizsg = e.target.value;
        resetAndFetch();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        vizsgIdopontInput.value = '';
        kovVizsgInput.value = '';
        searchTerm = '';
        filters = { vizsg_idopont: '', kov_vizsg: '' };
        resetAndFetch();
    });

    fetchDevices();

    // --- NEW INSPECTION LOGIC ---
    const searchDeviceForm = document.getElementById('searchDeviceForm');
    const serialNumberInput = document.getElementById('serialNumberInput');
    const deviceSearchResult = document.getElementById('deviceSearchResult');
    let currentInspectedDevice = null;

    searchDeviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serialNumber = serialNumberInput.value.trim();
        if (!serialNumber) return;

        deviceSearchResult.innerHTML = `<p class="text-gray-400">Keresés...</p>`;

        try {
            const querySnapshot = await db.collection('partners').doc(partnerId).collection('devices')
                .where('serialNumber', '==', serialNumber).limit(1).get();

            if (querySnapshot.empty) {
                deviceSearchResult.innerHTML = `
                    <p class="text-red-400">Nem található eszköz ezzel a gyári számmal.</p>
                    <button onclick="window.location.href='adatbevitel.html'" class="btn btn-primary mt-4">Új eszköz felvitele</button>
                `;
                currentInspectedDevice = null;
            } else {
                const device = querySnapshot.docs[0].data();
                currentInspectedDevice = { id: querySnapshot.docs[0].id, ...device };

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
                // TODO: Add the new inspection data form here
                deviceSearchResult.innerHTML = detailsHtml;
            }
        } catch (error) {
            console.error("Hiba az eszköz keresésekor:", error);
            deviceSearchResult.innerHTML = `<p class="text-red-400">Hiba történt a keresés során.</p>`;
        }
    });
}


// ===================================================================================
// PARTNER MUNKA KÉPERNYŐ (KERET)
// ===================================================================================

function getNewInspectionScreenHtml() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD formátum
    return `
        <div class="card max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold text-center mb-8">Új vizsgálat rögzítése</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-blue-800 pb-8">
                <div>
                    <h3 class="text-lg font-semibold mb-3">Vizsgálat jellege</h3>
                    <select id="templateSelectNewInspection" class="input-field">
                        <option>Fővizsgálat</option>
                        <option>Szerkezeti vizsgálat</option>
                    </select>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-3">2. Szakértő</h3>
                    <select id="expertSelectNewInspection" class="input-field" required>
                        <option value="" disabled selected>Válassz egy szakértőt...</option>
                        <option value="Nagy Imre">Nagy Imre</option>
                        <option value="Gerőly Iván">Gerőly Iván</option>
                        <option value="Szadlon Norbert">Szadlon Norbert</option>
                        <option value="Bagyinszki Lóránt">Bagyinszki Lóránt</option>
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
            <p class="mb-4 text-blue-300">Add meg a vizsgálandó eszköz gyári számát a meglévő adatok betöltéséhez.</p>
            <form id="searchDeviceForm" class="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <input type="text" id="serialNumberInput" placeholder="Gyári szám..." class="input-field flex-grow" required>
                <button id="searchDeviceBySerialBtn" class="btn btn-primary w-full sm:w-auto">Eszköz keresése</button>
            </form>
            <div id="deviceSearchResult" class="bg-blue-900/50 p-6 rounded-lg min-h-[8rem]">
                <p class="text-gray-400">A keresés eredménye itt fog megjelenni.</p>
            </div>

            <div class="mt-8 text-left"><button id="backToDeviceListBtn" class="btn btn-secondary">Vissza az eszközlistához</button></div>
        </div>
    `;
}

export function getPartnerWorkScreenHtml(partner, userData) {
    const user = auth.currentUser;
    const logoUrl = partner.logoUrl || 'images/ETAR_H.png';
    const role = userData.partnerRoles[partner.id];

    const isReadOnly = role === 'read';

    let uploadButtonHtml;
    if (isReadOnly) {
        uploadButtonHtml = `<button onclick="alert('Read jogosultsággal nem tölthet fel adatokat. Forduljon a jogosultság osztójához.')" class="btn btn-secondary opacity-50 cursor-not-allowed w-full text-left">Új eszköz feltöltés</button>`;
    } else {
        uploadButtonHtml = `<button onclick="window.location.href='adatbevitel.html'" class="btn btn-secondary w-full text-left">Új eszköz feltöltés</button>`;
    }

    return `
        <header id="partner-work-screen-header" class="bg-gray-800 text-white shadow-lg relative">
            <div class="p-4 flex items-center justify-between">
                <div class="flex items-center">
                    <img src="${logoUrl}" alt="${partner.name} Logo" class="h-12 w-12 xl:h-16 xl:w-16 object-contain mr-4 rounded-full border-2 border-blue-400">
                    <div>
                        <h1 class="text-lg xl:text-xl font-bold text-blue-300">${partner.name}</h1>
                        <p class="text-xs xl:text-sm text-gray-400">${partner.address}</p>
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
                <nav class="hidden xl:flex items-center space-x-2">
                    <button class="btn btn-secondary">Adatbázis letöltés</button>
                    ${uploadButtonHtml.replace('w-full text-left', '')}
                    <button id="showNewInspectionBtn" class="btn btn-secondary">Új vizsgálat</button>
                    <button class="btn btn-secondary">Jegyzőkönyv generálás</button>
                    <button id="backToMainFromWorkScreenBtn" class="btn btn-primary">Vissza</button>
                </nav>
            </div>
            <!-- Mobile Menu -->
            <nav id="mobile-menu" class="hidden xl:hidden bg-gray-700 p-4 space-y-2">
                <button class="btn btn-secondary w-full text-left">Adatbázis letöltés</button>
                ${uploadButtonHtml}
                <button id="showNewInspectionBtnMobile" class="btn btn-secondary w-full text-left">Új vizsgálat</button>
                <button class="btn btn-secondary w-full text-left">Jegyzőkönyv generálás</button>
                <button id="backToMainFromWorkScreenBtnMobile" class="btn btn-primary w-full text-left">Vissza</button>
            </nav>
        </header>
        <main class="p-4 sm:p-6 lg:p-8 flex-grow">
            <div id="deviceListScreen" class="screen active">
                ${getEszkozListaHtml()}
            </div>
            <div id="newInspectionScreen" class="screen">
                ${getNewInspectionScreenHtml()}
            </div>
        </main>
        <footer class="p-4 bg-gray-800 text-white text-center text-sm">
            <p>&copy; ${new Date().getFullYear()} H-ITB Kft. | ETAR Rendszer</p>
        </footer>
    `;
}
