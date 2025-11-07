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
                                        <th scope="col" class="relative px-6 py-3.5"><input type="checkbox" id="select-all-checkbox" class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"></th>
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

    if (showNewInspectionBtn) {
        showNewInspectionBtn.addEventListener('click', () => showScreen(newInspectionScreen));
    }
    if (showNewInspectionBtnMobile) {
        showNewInspectionBtnMobile.addEventListener('click', () => showScreen(newInspectionScreen));
    }
    backToDeviceListBtn.addEventListener('click', () => showScreen(deviceListScreen));


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
    const selectAllCheckbox = document.getElementById('select-all-checkbox');

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
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

            // ÚJ RÉSZ: Minden eszközhöz lekérem a legfrissebb vizsgálatot
            const inspectionPromises = devices.map(device => {
                return db.collection('partners').doc(partnerId)
                         .collection('devices').doc(device.id)
                         .collection('inspections')
                         .orderBy('createdAt', 'desc')
                         .limit(1)
                         .get()
                         .then(inspectionSnapshot => {
                             if (!inspectionSnapshot.empty) {
                                 const latestInspection = inspectionSnapshot.docs[0].data();
                                 // Felülírjuk az eszköz adatait a legfrissebb vizsgálat adataival
                                 device.vizsg_idopont = latestInspection.vizsgalatIdopontja;
                                 device.status = latestInspection.vizsgalatEredmenye;
                                 device.kov_vizsg = latestInspection.kovetkezoIdoszakosVizsgalat;
                             }
                         });
            });

            await Promise.all(inspectionPromises);
            
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

    function getKovVizsgColorClass(kovVizsgDate) {
        if (!kovVizsgDate) {
            return 'text-gray-300';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

        const vizsgDate = new Date(kovVizsgDate);
        vizsgDate.setHours(0, 0, 0, 0); // Normalize inspection date

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
        if (status === 'Megfelelt') {
            return 'text-green-400 font-semibold';
        } else if (status === 'Nem felelt meg') {
            return 'text-red-400 font-bold';
        }
        return 'text-gray-300';
    }

    function renderTable(devices) {
        if (!devices || devices.length === 0) {
            if (currentPage === 1) {
                tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-4 text-gray-400">Nincsenek a szűrési feltételeknek megfelelő eszközök.</td></tr>`;
            }
            return;
        }

        tableBody.innerHTML = devices.map(dev => {
            const kovVizsgColorClass = getKovVizsgColorClass(dev.kov_vizsg);
            const statusColorClass = getStatusColorClass(dev.status);
            return `
            <tr class="hover:bg-gray-700/50">
                <td class="relative px-6 py-4"><input type="checkbox" class="row-checkbox absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" data-id="${dev.id}"></td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.vizsg_idopont || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm font-medium text-white">${dev.description || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.type || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.effectiveLength || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.serialNumber || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.operatorId || ''}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm ${statusColorClass}">${dev.status || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm ${kovVizsgColorClass}">${dev.kov_vizsg || 'N/A'}</td>
                <td class="relative whitespace-nowrap py-2 px-3 text-center align-middle">
                    <canvas class="qr-code-canvas" data-id="${dev.id}"></canvas>
                </td>
            </tr>
        `}).join('');

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
    loadExperts();

    // --- NEW INSPECTION LOGIC ---
    const searchDeviceForm = document.getElementById('searchDeviceForm');
    const serialNumberInput = document.getElementById('serialNumberInput');
    const deviceSearchResult = document.getElementById('deviceSearchResult');
    let currentInspectedDevice = null;

    window.saveSerialAndRedirect = function() {
        const serialNumber = serialNumberInput.value.trim();
        if (serialNumber) {
            sessionStorage.setItem('newDeviceSerialNumber', serialNumber);
        }
        window.location.href = 'adatbevitel.html';
    }

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
                    <button onclick="saveSerialAndRedirect()" class="btn btn-primary mt-4">Új eszköz felvitele</button>
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
                            <div>
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
                                <select name="vizsgalat_eredmenye" class="input-field">
                                    <option>Megfelelt</option>
                                    <option>Nem felelt meg</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm">Feltárt hiba</label>
                                <textarea name="feltart_hiba" class="input-field" rows="2"></textarea>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm">Felhasznált anyagok</label>
                                <textarea name="felhasznalt_anyagok" class="input-field" rows="2"></textarea>
                            </div>
                        </div>
                        <div class="mt-6">
                            <button id="saveInspectionButton" class="btn btn-primary">Vizsgálat mentése</button>
                        </div>
                    </div>
                `;

                deviceSearchResult.innerHTML = detailsHtml;

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
                        const user = auth.currentUser;
                        if (!user || !currentInspectedDevice) {
                            alert('Hiba: Nincs bejelentkezett felhasználó vagy kiválasztott eszköz.');
                            return;
                        }

                        const inspectionData = {
                            deviceId: currentInspectedDevice.id,
                            partnerId: partnerId,
                            vizsgalatJellege: document.getElementById('templateSelectNewInspection').value,
                            szakerto: document.getElementById('expertSelectNewInspection').value,
                            vizsgalatHelye: document.getElementById('inspectionLocationInput').value,
                            vizsgalatIdopontja: document.getElementById('inspectionDateInput').value,
                            kovetkezoIdoszakosVizsgalat: document.querySelector('[name="kov_idoszakos_vizsgalat"]').value,
                            kovetkezoTerhelesiProba: document.querySelector('[name="kov_terhelesi_proba"]').value,
                            vizsgalatEredmenye: document.querySelector('[name="vizsgalat_eredmenye"]').value,
                            feltartHiba: document.querySelector('[name="feltart_hiba"]').value,
                            felhasznaltAnyagok: document.querySelector('[name="felhasznalt_anyagok"]').value,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            createdBy: user.displayName || user.email,
                        };

                        const dataToHash = `${inspectionData.deviceId}${inspectionData.szakerto}${inspectionData.vizsgalatIdopontja}`;
                        inspectionData.hash = await generateHash(dataToHash);

                        // Validation
                        const requiredFields = [
                            inspectionData.vizsgalatJellege,
                            inspectionData.szakerto,
                            inspectionData.vizsgalatHelye,
                            inspectionData.vizsgalatIdopontja,
                            inspectionData.kovetkezoIdoszakosVizsgalat,
                            inspectionData.kovetkezoTerhelesiProba,
                            inspectionData.vizsgalatEredmenye
                        ];

                        if (requiredFields.some(field => !field || field.trim() === '')) {
                            alert('Kérjük, töltse ki az összes kötelező mezőt a vizsgálat mentéséhez! (A "Feltárt hiba" és a "Felhasznált anyagok" nem kötelező).');
                            return;
                        }

                        try {
                            console.log("Data to be saved:", inspectionData);
                            // 1. Save the inspection record to the new subcollection
                            const newInspectionRef = db.collection('partners').doc(partnerId).collection('devices').doc(currentInspectedDevice.id).collection('inspections');
                            await newInspectionRef.add(inspectionData);

                            // 2. Update the device document
                            const deviceRef = db.collection('partners').doc(partnerId).collection('devices').doc(currentInspectedDevice.id);
                            await deviceRef.update({
                                kov_vizsg: inspectionData.kovetkezoIdoszakosVizsgalat,
                                // kov_terhelesi_proba: inspectionData.kovetkezoTerhelesiProba, // This field does not exist in the table
                                status: inspectionData.vizsgalatEredmenye,
                                vizsg_idopont: inspectionData.vizsgalatIdopontja // Update existing field
                            });

                            alert('Vizsgálat sikeresen mentve!');
                            // Optionally, clear the form or give other feedback
                            deviceSearchResult.innerHTML = '<p class="text-green-400">Vizsgálat sikeresen rögzítve. Keressen új eszközt a folytatáshoz.</p>';

                        } catch (error) {
                            console.error("Hiba a vizsgálat mentésekor: ", error);
                            alert('Hiba történt a vizsgálat mentésekor: ' + error.message);
                        }
                    });
                }
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
                        <option value="" disabled selected>Szakértők betöltése...</option>
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
    const userRoles = userData.roles || [];

    const isReadOnly = role === 'read';
    const canInspect = userRoles.includes('EJK_admin') || userRoles.includes('EJK_write');

    let uploadButtonHtml;
    if (isReadOnly) {
        uploadButtonHtml = `<button onclick="alert('Read jogosultsággal nem tölthet fel adatokat. Forduljon a jogosultság osztójához.')" class="btn btn-secondary opacity-50 cursor-not-allowed w-full text-left">Új eszköz feltöltés</button>`;
    } else {
        uploadButtonHtml = `<button onclick="window.location.href='adatbevitel.html'" class="btn btn-secondary w-full text-left">Új eszköz feltöltés</button>`;
    }

    let newInspectionButtonHtml = '';
    if (canInspect) {
        newInspectionButtonHtml = `<button id="showNewInspectionBtn" class="btn btn-secondary">Új vizsgálat</button>`;
    }

    let newInspectionButtonHtmlMobile = '';
    if (canInspect) {
        newInspectionButtonHtmlMobile = `<button id="showNewInspectionBtnMobile" class="btn btn-secondary w-full text-left">Új vizsgálat</button>`;
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
                    ${newInspectionButtonHtml}
                    <button class="btn btn-secondary">Jegyzőkönyv generálás</button>
                    <button id="backToMainFromWorkScreenBtn" class="btn btn-primary">Vissza</button>
                </nav>
            </div>
            <!-- Mobile Menu -->
            <nav id="mobile-menu" class="hidden xl:hidden bg-gray-700 p-4 space-y-2">
                <button class="btn btn-secondary w-full text-left">Adatbázis letöltés</button>
                ${uploadButtonHtml}
                ${newInspectionButtonHtmlMobile}
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
