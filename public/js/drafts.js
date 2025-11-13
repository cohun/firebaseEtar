import { auth, db, storage } from './firebase.js';
import { getTemplates, showTemplateSelector, generateZipFromDrafts, showLoadingModal, hideLoadingModal } from './doc-generator.js';
import { generateAndUploadFinalizedHtml, generateHtmlView } from './html-generator.js';

let allEnrichedDrafts = []; // Store all fetched drafts globally in this module
let currentSortField = 'createdAt';
let currentSortDirection = 'desc';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('drafts-table-body');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.email);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Piszkozatok betöltése...</td></tr>`;

            try {
                // The initial query is already sorted by creation date
                const snapshot = await db.collectionGroup('inspections')
                    .where('status', '==', 'draft')
                    .orderBy('createdAt', 'desc')
                    .get();
                
                console.log(`Lekérdezés lefutott, ${snapshot.docs.length} dokumentumot talált.`);

                if (snapshot.empty) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Nincsenek feldolgozásra váró piszkozatok.</td></tr>`;
                    return;
                }

                const drafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                allEnrichedDrafts = await Promise.all(drafts.map(async (draft) => {
                    let partnerName = 'Ismeretlen';
                    let serialNumber = 'Ismeretlen';
                    let description = 'Ismeretlen';

                    if (draft.partnerId) {
                        const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
                        if (partnerDoc.exists) {
                            partnerName = partnerDoc.data().name;
                        }
                    }

                    if (draft.partnerId && draft.deviceId) {
                        const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();
                        if (deviceDoc.exists) {
                            const deviceData = deviceDoc.data();
                            serialNumber = deviceData.serialNumber || 'N/A';
                            description = deviceData.description || 'N/A';
                        }
                    }
                    
                    return { ...draft, partnerName, serialNumber, description };
                }));

                sortAndRender(); // Initial render with default sorting

            } catch (error) {
                console.error("CATCH block: Hiba történt a piszkozatok lekérésekor!", error);
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-400">Hiba történt a piszkozatok betöltése közben. (Lásd a konzolt a részletekért).</td></tr>`;
                if (error.code === 'failed-precondition') {
                    tableBody.innerHTML += `<tr><td colspan="6" class="text-center p-2 text-yellow-400 text-sm">Tipp: A lekérdezéshez hiányzik a megfelelő Firestore index. Kérjük, ellenőrizze a böngésző konzolját a létrehozási linkért.</td></tr>`;
                }
            }
        } else {
            console.log("No user logged in. Redirecting to login page.");
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-400">Nincs bejelentkezett felhasználó. Átirányítás a bejelentkező képernyőre...</td></tr>`;
            setTimeout(() => { window.location.href = 'app.html'; }, 2000);
        }
    });

    // Event listener for the "select all" checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const rowCheckboxes = document.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    });

    // Add event listeners for sorting
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortField = header.dataset.sort;
            if (currentSortField === sortField) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = sortField;
                currentSortDirection = 'asc';
            }
            sortAndRender();
        });
    });
});

function sortAndRender() {
    const sortedDrafts = [...allEnrichedDrafts].sort((a, b) => {
        const fieldA = a[currentSortField];
        const fieldB = b[currentSortField];

        let comparison = 0;
        if (currentSortField === 'createdAt') {
            const dateA = fieldA?.toDate() || 0;
            const dateB = fieldB?.toDate() || 0;
            comparison = dateA - dateB;
        } else {
            const valA = String(fieldA || '').toLowerCase();
            const valB = String(fieldB || '').toLowerCase();
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
        }
        return currentSortDirection === 'asc' ? comparison : -comparison;
    });

    renderTable(sortedDrafts);
    updateHeaderIcons();
}

function updateHeaderIcons() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        const icon = header.querySelector('i');
        header.classList.remove('active-sort');
        icon.className = 'fas fa-sort'; // Reset icon

        if (header.dataset.sort === currentSortField) {
            header.classList.add('active-sort');
            icon.className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    });
}

function renderTable(drafts) {
    const tableBody = document.getElementById('drafts-table-body');
    if (!drafts || drafts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Nincsenek feldolgozásra váró piszkozatok.</td></tr>`;
        return;
    }

    tableBody.innerHTML = drafts.map(draft => {
        const createdAt = draft.createdAt?.toDate().toLocaleString('hu-HU') || 'N/A';
        return `
            <tr class="hover:bg-gray-700/50">
                <td class="relative px-6 py-4">
                    <input type="checkbox" class="row-checkbox absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" data-id="${draft.id}">
                </td>
                <td class="whitespace-nowrap py-4 px-3 text-sm font-medium text-white">${draft.partnerName}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${draft.serialNumber}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${draft.vizsgalatEredmenye || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${draft.szakerto || 'N/A'}</td>
                <td class="whitespace-nowrap py-4 px-3 text-sm text-gray-300">${createdAt}</td>
            </tr>
        `;
    }).join('');
}

document.getElementById('generateDraftsButton').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        alert('A művelethez bejelentkezés szükséges.');
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('Hiba: A felhasználói adatlap nem található.');
            return;
        }
        
        const userData = userDoc.data();
        const userRoles = userData.roles || [];

        if (!userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write')) {
            alert('Ehhez a művelethez nincs jogosultsága!');
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy piszkozatot a generáláshoz!');
            return;
        }

        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
        const selectedDrafts = allEnrichedDrafts.filter(draft => selectedIds.includes(draft.id));

        // Use the new HTML preview function directly, no template selection needed.
        await generateHtmlView(null, selectedDrafts);
    } catch (error) {
        console.error("Hiba a jogosultság-ellenőrzés vagy sablon betöltés közben:", error);
        alert("Hiba történt a művelet közben. Kérjük, próbálja újra később.");
    }
});

/**
 * Starts the finalization process for selected drafts.
 * This function is called after a template has been selected.
 * @param {string} templateName The selected template name.
 * @param {object[]} draftsToFinalize The array of draft objects to finalize.
 * @deprecated This function is for DOCX generation and is being replaced by the HTML flow.
 */
async function startFinalizationProcess(templateName, draftsToFinalize) {
    const total = draftsToFinalize.length;
    showLoadingModal(`Véglegesítés előkészítése... 1 / ${total}`);

    try {
        // Fetch HTML template content once
        const url = 'jkv.html'; // The path to our new HTML template
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Hiba a jkv.html sablon betöltésekor: ${response.statusText}`);
        const htmlTemplateString = await response.text();

        const batch = db.batch();
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const finalizedIds = [];

        for (let i = 0; i < draftsToFinalize.length; i++) {
            const draft = draftsToFinalize[i];
            showLoadingModal(`Folyamatban: ${i + 1} / ${total} (${draft.serialNumber || 'N/A'}) generálása és feltöltése...`);
            
            if (draft.partnerId && draft.deviceId && draft.id) {
                // Generate HTML, upload, and get URL
                const downloadURL = await generateAndUploadFinalizedHtml(htmlTemplateString, draft);

                // Prepare the batch update
                const docRef = db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).collection('inspections').doc(draft.id);
                batch.update(docRef, { 
                    status: 'finalized',
                    finalizedAt: now,
                    fileUrl: downloadURL, // Save the generated file's URL
                    deviceDetails: {
                        serialNumber: draft.serialNumber || 'N/A',
                        description: draft.description || 'N/A'
                    }
                });
                finalizedIds.push(draft.id);
            } else {
                console.warn('Piszkozat kihagyva: hiányzó partnerId, deviceId, vagy id.', draft);
            }
        }

        showLoadingModal('Véglegesítés mentése az adatbázisba...');
        await batch.commit();
        
        // Remove finalized drafts from the global array and UI
        allEnrichedDrafts = allEnrichedDrafts.filter(draft => !finalizedIds.includes(draft.id));
        document.getElementById('select-all-checkbox').checked = false;
        sortAndRender(); // Re-render the table

        hideLoadingModal();
        alert(`${finalizedIds.length} piszkozat sikeresen véglegesítve és feltöltve.`);

    } catch (error) {
        console.error("Hiba a piszkozatok HTML alapú véglegesítésekor: ", error);
        hideLoadingModal();
        alert("Hiba történt a véglegesítés közben. A folyamat leállt. " + error.message);
    }
}


document.getElementById('finalizeDraftsButton').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        alert('A művelethez bejelentkezés szükséges.');
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('Hiba: A felhasználói adatlap nem található.');
            return;
        }
        
        const userData = userDoc.data();
        const userRoles = userData.roles || [];

        if (!userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write')) {
            alert('Ehhez a művelethez nincs jogosultsága!');
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Kérjük, válasszon ki legalább egy piszkozatot a véglegesítéshez!');
            return;
        }

        if (!confirm(`Biztosan véglegesíti a kiválasztott ${selectedCheckboxes.length} piszkozatot? A művelet generálja és feltölti a jegyzőkönyveket.`)) {
            return;
        }

        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
        const draftsToFinalize = allEnrichedDrafts.filter(draft => selectedIds.includes(draft.id));

        // Directly call the finalization process. No template selection needed for HTML.
        await startFinalizationProcess(null, draftsToFinalize);

    } catch (error) {
        console.error("Hiba a véglegesítés előkészítésekor: ", error);
        alert("Hiba történt az előkészítés közben. " + error.message);
    }
});

document.getElementById('deleteDraftsButton').addEventListener('click', async () => {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Kérjük, válasszon ki legalább egy piszkozatot a törléshez!');
        return;
    }

    if (!confirm(`Biztosan törölni szeretné a kiválasztott ${selectedCheckboxes.length} piszkozatot? A művelet nem vonható vissza.`)) {
        return;
    }

    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    const draftsToDelete = allEnrichedDrafts.filter(draft => selectedIds.includes(draft.id));

    const batch = db.batch();

    draftsToDelete.forEach(draft => {
        if (draft.partnerId && draft.deviceId && draft.id) {
            const docRef = db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).collection('inspections').doc(draft.id);
            batch.delete(docRef);
        }
    });

    try {
        await batch.commit();
        
        // Remove deleted drafts from the global array
        allEnrichedDrafts = allEnrichedDrafts.filter(draft => !selectedIds.includes(draft.id));
        
        // Uncheck the "select all" checkbox
        document.getElementById('select-all-checkbox').checked = false;

        sortAndRender(); // Re-render the table
        alert(`${draftsToDelete.length} piszkozat sikeresen törölve.`);

    } catch (error) {
        console.error("Hiba a piszkozatok törlésekor: ", error);
        alert("Hiba történt a piszkozatok törlése közben. Lehetséges, hogy nincs jogosultsága a művelethez. " + error.message);
    }
});
