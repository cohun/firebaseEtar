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
            <div id="filter-controls" class="mt-4 mb-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="md:col-span-2">
                    <input type="search" id="main-search-input" class="input-field w-full" placeholder="Keresés (Megnevezés, Gyári szám)...">
                </div>
                <select id="filter-tipus" class="input-field"><option value="">Minden típus</option></select>
                <select id="filter-megallapitas" class="input-field"><option value="">Minden megállapítás</option></select>
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
export function initEszkozLista(partnerId) {
    // Állapotkezelő változók
    let itemsPerPage = 50;
    let currentSortField = 'description';
    let currentSortDirection = 'asc';
    let searchTerm = '';
    let filters = {};
    
    let firstVisibleDoc = null;
    let lastVisibleDoc = null;
    let currentPage = 1;
    // totalItems is removed as it's unreliable and inefficient.

    // DOM Elemek
    const tableBody = document.getElementById('eszköz-lista-body');
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const searchInput = document.getElementById('main-search-input');
    const tableHeaders = document.querySelectorAll('th.sortable');

    /**
     * Fetches devices from Firestore based on current state (sort, filter, pagination).
     */
    async function fetchDevices(direction = 'next') {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400">Adatok betöltése...</td></tr>`;

        try {
            const collectionRef = db.collection('partners').doc(partnerId).collection('devices');
            
            // The unreliable totalItems count has been removed.

            let query = collectionRef;

            // TODO: Szűrés implementálása
            // if (searchTerm) { ... }

            // 2. Rendezés
            query = query.orderBy(currentSortField, currentSortDirection);

            // 3. Lapozás
            if (direction === 'next' && lastVisibleDoc) {
                query = query.startAfter(lastVisibleDoc);
            } else if (direction === 'prev' && firstVisibleDoc) {
                // Firestore doesn't have endBefore, so we query backwards and reverse
                query = query.endBefore(firstVisibleDoc).limitToLast(itemsPerPage);
            } else {
                query = query.limit(itemsPerPage);
            }

            const snapshot = await query.get();
            const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (direction === 'prev') devices.reverse(); // Correct order for previous page

            // Update visible doc references for pagination
            if (snapshot.docs.length > 0) {
                firstVisibleDoc = snapshot.docs[0];
                lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            } else {
                // If no docs, reset pagination markers on the current page
                if (direction === 'next') lastVisibleDoc = null;
                if (direction === 'prev') firstVisibleDoc = null;
            }

            renderTable(devices);
            updatePagination(snapshot.size);

        } catch (error) {
            console.error("Hiba az eszközök lekérésekor:", error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-red-400">Hiba történt az adatok betöltése közben.</td></tr>`;
            // It's likely an index is missing. Firestore provides a link in the console error.
            if (error.code === 'failed-precondition') {
                tableBody.innerHTML += `<tr><td colspan="8" class="text-center p-2 text-yellow-400 text-sm">Tipp: Hiányzó Firestore index. Kérjük, ellenőrizze a böngésző konzolját a létrehozási linkért.</td></tr>`;
            }
        }
    }

    /**
     * Renders the device data into the table.
     * @param {Array} devices Array of device objects.
     */
    function renderTable(devices) {
        if (!devices || devices.length === 0) {
            // Only show "no devices" if it's the first page. Otherwise, the user is just at the end.
            if (currentPage === 1) {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400">Nincsenek megjeleníthető eszközök.</td></tr>`;
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
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.status || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${dev.kov_vizsg || 'N/A'}</td>
                <td class="relative whitespace-nowrap py-4 px-3 text-right text-sm font-medium">
                    <button data-id="${dev.id}" class="text-blue-400 hover:text-blue-300">QR</button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Updates the pagination controls and info text.
     * @param {number} fetchedCount The number of items fetched in the current query.
     */
    function updatePagination(fetchedCount) {
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = startItem + fetchedCount - 1;

        if (fetchedCount > 0) {
            paginationInfo.textContent = `Eredmények: ${startItem} - ${endItem}`;
        } else {
            // If we are on page 1 and have no results, renderTable shows the main message.
            // If on a later page, it means we're at the end.
            paginationInfo.textContent = currentPage > 1 ? "Nincs több eredmény" : "";
        }

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = fetchedCount < itemsPerPage;
    }

    // Eseménykezelők
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
            
            // Reset pagination and fetch
            currentPage = 1;
            firstVisibleDoc = null;
            lastVisibleDoc = null;
            fetchDevices();

            // Update header styles
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

    // TODO: Debounce search input
    // searchInput.addEventListener('keyup', (e) => { ... });

    // Kezdeti adatbetöltés
    fetchDevices();
}


// ===================================================================================
// PARTNER MUNKA KÉPERNYŐ (KERET)
// ===================================================================================

export function getPartnerWorkScreenHtml(partner, userData) {
    const user = auth.currentUser;
    const logoUrl = partner.logoUrl || 'images/ETAR_H.png';
    const role = userData.partnerRoles[partner.id];

    const isReadOnly = role === 'read';

    let uploadButtonHtml;
    if (isReadOnly) {
        uploadButtonHtml = `<button onclick="alert('Read jogosultsággal nem tölthet fel adatokat. Forduljon a jogosultság osztójához.')" class="btn btn-secondary opacity-50 cursor-not-allowed">Új eszköz feltöltés</button>`;
    } else {
        uploadButtonHtml = `<button onclick="window.location.href='adatbevitel.html'" class="btn btn-secondary">Új eszköz feltöltés</button>`;
    }

    return `
        <header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-lg">
            <div class="flex items-center">
                <img src="${logoUrl}" alt="${partner.name} Logo" class="h-16 w-16 object-contain mr-4 rounded-full border-2 border-blue-400">
                <div>
                    <h1 class="text-xl font-bold text-blue-300">${partner.name}</h1>
                    <p class="text-sm text-gray-400">${partner.address}</p>
                    <p class="text-sm text-gray-400 mt-2">Bejelentkezve: ${userData.name || user.displayName || user.email} (${role || 'N/A'})</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="btn btn-secondary">Adatlap</button>
                <button class="btn btn-secondary">Eszközök</button>
                <button class="btn btn-secondary">Jegyzőkönyvek</button>
                ${uploadButtonHtml}
                <button id="backToMainFromWorkScreenBtn" class="btn btn-primary">Vissza</button>
            </div>
        </header>
        <main class="p-4 sm:p-6 lg:p-8 flex-grow">
            ${getEszkozListaHtml()}
        </main>
        <footer class="p-4 bg-gray-800 text-white text-center text-sm">
            <p>&copy; ${new Date().getFullYear()} H-ITB Kft. | ETAR Rendszer</p>
        </footer>
    `;
}
