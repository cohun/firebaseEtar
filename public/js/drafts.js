import { auth, db, storage } from './firebase.js';
import { showLoadingModal, hideLoadingModal } from './ui.js';
import { generateAndUploadFinalizedHtml, generateHtmlView, getTemplateForDraft } from './html-generator.js';

let allEnrichedDrafts = []; // Store all fetched drafts globally in this module
let currentSortField = 'createdAt';
let currentSortDirection = 'desc';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('drafts-table-body');
    if (!tableBody) return; // Exit if not on drafts page

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.email);
            
            let userData = {};
            let isEkvUser = false; // Declare outside try block
            
            // Check user roles to adjust UI
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                    const userRoles = userData.roles || [];
                    isEkvUser = userData.isEkvUser === true; // Assign value

                    if (isEkvUser) {
                        document.body.classList.add('ekv-mode');
                    }
                    
                    // If user has EJK_read but NOT admin or write, AND is NOT an EKV user, hide dangerous buttons
                    if (!isEkvUser && userRoles.includes('EJK_read') && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write')) {
                        const deleteBtn = document.getElementById('deleteDraftsButton');
                        const finalizeBtn = document.getElementById('finalizeDraftsButton');
                        if (deleteBtn) deleteBtn.style.display = 'none';
                        if (finalizeBtn) finalizeBtn.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error("Error fetching user roles:", error);
            }

            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Piszkozatok betöltése...</td></tr>`;

            try {
                // The initial query is already sorted by creation date
                // The initial query is already sorted by creation date
                let dGroup = db.collectionGroup('inspections').where('status', '==', 'draft');

                if (isEkvUser) {
                     // EKV users only see their own drafts
                     // This requires a composite index 'status' + 'createdByUid' + 'createdAt'
                     dGroup = dGroup.where('createdByUid', '==', user.uid);
                }

                const snapshot = await dGroup.orderBy('createdAt', 'desc').get();
                
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
                    let isI = false; // Default to false

                    if (draft.partnerId) {
                        const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
                        if (partnerDoc.exists) {
                            partnerName = partnerDoc.data().name;
                        }
                    }

                    if (draft.partnerId && draft.deviceId) {
                        try {
                            const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();
                            if (deviceDoc.exists) {
                                const deviceData = deviceDoc.data();
                                serialNumber = deviceData.serialNumber || 'N/A';
                                description = deviceData.description || 'N/A';
                                isI = deviceData.isI === true;
                            }
                        } catch (error) {
                            console.warn(`Nem sikerült lekérni az eszközt (${draft.deviceId}):`, error);
                            // Permission error is expected for EKV users accessing non-EKV devices
                        }
                    }
                    
                    return { ...draft, partnerName, serialNumber, description, isI };
                }));

                // Filter drafts based on user type
                if (userData && userData.isEkvUser) {
                    // EKV users only see isI: true drafts
                    allEnrichedDrafts = allEnrichedDrafts.filter(draft => draft.isI === true);
                } else {
                    // EJK users only see isI: false (or undefined) drafts
                    allEnrichedDrafts = allEnrichedDrafts.filter(draft => draft.isI !== true);
                }

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
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });
    }

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
            <tr class="hover:bg-gray-700/50 ${draft.ajanlatKeres ? 'row-highlight-yellow' : ''}">
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

const generateDraftsButton = document.getElementById('generateDraftsButton');
if (generateDraftsButton) {
    generateDraftsButton.addEventListener('click', async () => {
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

        if (!userData.isEkvUser && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write') && !userRoles.includes('EJK_read')) {
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
                <title>Előnézet betöltése...</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f3f4f6; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .message { margin-left: 15px; color: #374151; font-size: 1.1rem; }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <div class="message">Előnézet generálása...</div>
            </body>
            </html>
        `);
        newTab.document.close();

        // Use the new HTML preview function directly, passing the pre-opened window
        await generateHtmlView(newTab, selectedDrafts);
    } catch (error) {
        console.error("Hiba a jogosultság-ellenőrzés vagy sablon betöltés közben:", error);
    }
});
}

/**
 * Starts the finalization process for selected drafts.
 * @param {object[]} draftsToFinalize The array of draft objects to finalize.
 */
async function startFinalizationProcess(draftsToFinalize) {
    const total = draftsToFinalize.length;
    showLoadingModal(`Véglegesítés előkészítése... 1 / ${total}`);

    try {
        // TEMPLATE FETCHING REMOVED FROM HERE - DONE PER DRAFT NOW
        // const url = 'jkv.html'; 
        // const response = await fetch(url);
        // ...
        // const htmlTemplateString = await response.text();

        const batch = db.batch();
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const finalizedIds = [];

        for (let i = 0; i < draftsToFinalize.length; i++) {
            const draft = draftsToFinalize[i];
            showLoadingModal(`Folyamatban: ${i + 1} / ${total} (${draft.serialNumber || 'N/A'}) generálása és feltöltése...`);
            
            if (draft.partnerId && draft.deviceId && draft.id) {
                // Get the appropriate template for this specific draft
                let htmlTemplateString;
                try {
                    htmlTemplateString = await getTemplateForDraft(draft);
                } catch (err) {
                    console.error("Failed to load template for draft:", draft.id, err);
                    // Skip or continue? Let's skip this one to avoid bad data
                    continue; 
                }

                // Generate HTML, upload, and get URL
                const downloadURL = await generateAndUploadFinalizedHtml(htmlTemplateString, draft);

                // Prepare the batch update
                const docRef = db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).collection('inspections').doc(draft.id);
                batch.update(docRef, { 
                    status: 'finalized',
                    finalizedAt: now,
                    finalizedByUid: auth.currentUser.uid, // Save UID for EKV visibility
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


const finalizeDraftsButton = document.getElementById('finalizeDraftsButton');
if (finalizeDraftsButton) {
    finalizeDraftsButton.addEventListener('click', async () => {
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

        if (!userData.isEkvUser && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write')) {
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
        await startFinalizationProcess(draftsToFinalize);

    } catch (error) {
        console.error("Hiba a véglegesítés előkészítésekor: ", error);
    }
});
}

const deleteDraftsButton = document.getElementById('deleteDraftsButton');
if (deleteDraftsButton) {
    deleteDraftsButton.addEventListener('click', async () => {
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
    }
});
}
