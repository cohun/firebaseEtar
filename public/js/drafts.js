import { auth, db, storage } from './firebase.js';
import { showLoadingModal, hideLoadingModal } from './ui.js';
import { generateAndUploadFinalizedHtml, generateHtmlView, getTemplateForDraft } from './html-generator.js';

let allEnrichedDrafts = []; // Store all fetched drafts globally in this module
let currentSortField = 'createdAt';
let currentSortDirection = 'desc';

// Filter state
let showK = true;
let showB = true;
let selectedPartnerFilter = null; // null means "Összes"

function isK(expertName) {
    return expertName === 'Gerőly Iván' || expertName === 'Szadlon Norbert';
}

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('drafts-table-body');
    if (!tableBody) return; // Exit if not on drafts page

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.email);
            
            let userData = {};
            let isEkvUser = false; // Declare outside try block
            let userRoles = [];
            
            // Check user roles to adjust UI
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                    userRoles = userData.roles || [];
                    isEkvUser = userData.isEkvUser === true; // Assign value

                    if (isEkvUser) {
                        document.body.classList.add('ekv-mode');
                    } else {
                        // Show filter container for EJK users
                        const filterContainer = document.getElementById('expert-filter-container');
                        if (filterContainer) filterContainer.classList.remove('hidden');
                    }
                    
                    // If user has EJK_read but NOT admin or write, AND is NOT an EKV user, hide dangerous buttons
                    if (!isEkvUser && userRoles.includes('EJK_read') && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write') && !userRoles.includes('EJK_inspector')) {
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
                    // EKV users only see isI: true drafts AND only if they have inspector/subcontractor role for that partner
                    allEnrichedDrafts = allEnrichedDrafts.filter(draft => {
                        const role = userData.partnerRoles && draft.partnerId ? userData.partnerRoles[draft.partnerId] : null;
                        
                        // Internal inspectors see all their drafts (query already filters by createdByUid)
                        if (role === 'internal_inspector' || role === 'external_inspector') return true;

                        // Other EKV roles (subcontractor/subscriber) only see isI: true devices
                        if (draft.isI !== true) {
                            console.log(`Filtering out draft ${draft.id} because isI is ${draft.isI} and user is EKV`);
                            return false;
                        }
                        
                        return role === 'inspector' || role === 'subcontractor' || role === 'subscriber';
                    });
                } else {
                    // EJK users only see isI: false (or undefined) drafts
                    allEnrichedDrafts = allEnrichedDrafts.filter(draft => {
                        const keep = draft.isI !== true;
                        if (!keep) console.log(`Filtering out draft ${draft.id} because isI is true and user is EJK`);
                        return keep;
                    });

                    // EJK_inspector restriction: only see assigned partners
                    if (userRoles.includes('EJK_inspector') && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write') && !userRoles.includes('EJK_read')) {
                         const myPartnerIds = Object.keys(userData.partnerRoles || {});
                         allEnrichedDrafts = allEnrichedDrafts.filter(draft => myPartnerIds.includes(draft.partnerId));
                    }
                }

                console.log("Final Enriched Drafts Count:", allEnrichedDrafts.length);

                sortAndRender(); // Initial render with default sorting
                populatePartnerDropdown(); // Populate the partner filter dropdown

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
    
    // Scroll Preservation: Handle Navigation Type
    try {
        const navEntries = performance.getEntriesByType("navigation");
        if (navEntries.length > 0 && navEntries[0].type === 'navigate') {
            console.log('Fresh navigation detected. Resetting scroll position.');
            sessionStorage.removeItem('draftsScrollY');
        } else {
             console.log('Reload or Back/Forward detected. Keeping scroll position.');
        }
    } catch (err) {
        console.warn('Navigation Timing API not supported or error:', err);
    }

    // Scroll Preservation: Save
    window.addEventListener('scroll', () => {
        sessionStorage.setItem('draftsScrollY', window.scrollY);
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
            updateFloatingBarVisibility();
        });
    }

    // Filter listeners
    const filterK = document.getElementById('filterK');
    const filterB = document.getElementById('filterB');
    if (filterK) {
        filterK.addEventListener('change', (e) => {
            showK = e.target.checked;
            sortAndRender();
        });
    }
    if (filterB) {
        filterB.addEventListener('change', (e) => {
            showB = e.target.checked;
            sortAndRender();
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

    // Partner Dropdown Logic
    const partnerHeaderContainer = document.getElementById('partner-header-container');
    const partnerDropdown = document.getElementById('partner-dropdown');

    if (partnerHeaderContainer && partnerDropdown) {
        // Toggle dropdown
        partnerHeaderContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            partnerDropdown.classList.toggle('hidden');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!partnerHeaderContainer.contains(e.target) && !partnerDropdown.contains(e.target)) {
                partnerDropdown.classList.add('hidden');
            }
        });
    }
});

function sortAndRender() {
    let filteredDrafts = [];
    
    // Apply filters first
    filteredDrafts = allEnrichedDrafts.filter(draft => {
        // If we want to restrict this logic to ONLY EJK users, we can check a global flag or passed arg.
        // Assuming this is fine for everyone who sees the controls (but we only show controls to EJK).
        // For EKV users, controls are hidden, defaults are TRUE, so no impact.
        
        const isExpertK = isK(draft.szakerto);
        if (isExpertK && !showK) return false;
        if (!isExpertK && !showB) return false;
        
        // Partner Filter
        if (selectedPartnerFilter && draft.partnerName !== selectedPartnerFilter) {
            return false;
        }

        return true;
    });

    const sortedDrafts = [...filteredDrafts].sort((a, b) => {
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

function populatePartnerDropdown() {
    const listElement = document.getElementById('partner-dropdown-list');
    if (!listElement) return;

    // Get unique partner names
    const partners = [...new Set(allEnrichedDrafts.map(d => d.partnerName))].sort();

    // Clear list
    listElement.innerHTML = '';

    // Add "Összes" option
    const allOption = document.createElement('li');
    allOption.className = 'px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center';
    allOption.innerHTML = `<span>Összes</span>${selectedPartnerFilter === null ? '<i class="fas fa-check text-blue-500"></i>' : ''}`;
    allOption.addEventListener('click', () => {
        selectedPartnerFilter = null;
        sortAndRender();
        populatePartnerDropdown(); // Re-render to update checkmark
        document.getElementById('partner-dropdown').classList.add('hidden');
    });
    listElement.appendChild(allOption);

    // Add partner options
    partners.forEach(partner => {
        const li = document.createElement('li');
        li.className = 'px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center';
        li.innerHTML = `<span>${partner}</span>${selectedPartnerFilter === partner ? '<i class="fas fa-check text-blue-500"></i>' : ''}`;
        li.addEventListener('click', () => {
            selectedPartnerFilter = partner;
            sortAndRender();
            populatePartnerDropdown(); // Re-render to update checkmark
            document.getElementById('partner-dropdown').classList.add('hidden');
        });
        listElement.appendChild(li);
    });
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

    // Attach event listeners to new row checkboxes
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateFloatingBarVisibility);
    });

    // Restore scroll position if previously saved
    const savedScrollY = sessionStorage.getItem('draftsScrollY');
    if (savedScrollY) {
        setTimeout(() => {
            window.scrollTo(0, parseInt(savedScrollY));
            // Optional: convert to int and check validity
        }, 100); 
    }
}

function updateFloatingBarVisibility() {
    const selectedCount = document.querySelectorAll('.row-checkbox:checked').length;
    console.log('Selection changed. Count:', selectedCount); // Debug log

    const floatingBar = document.getElementById('floating-action-bar');
    const selectedCountSpan = document.getElementById('selected-count');
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedCount;
    }

    if (floatingBar) {
        if (selectedCount > 0) {
            // Force visibility using inline style to ensure it overrides classes if needed
            floatingBar.style.transform = 'translateY(0)';
            floatingBar.classList.remove('translate-y-full');
        } else {
            floatingBar.style.transform = ''; // Revert to class-based (hidden)
            floatingBar.classList.add('translate-y-full');
        }
    } else {
        console.warn('Floating action bar element not found in DOM.');
    }
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

        if (!userData.isEkvUser && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write') && !userRoles.includes('EJK_read') && !userRoles.includes('EJK_inspector')) {
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

        // 1. Check for PDF files
        const hasPdf = selectedDrafts.some(d => d.inspectionProtocol === 'pdf_feltoltes' || (d.fileUrl && d.fileUrl.toLowerCase().includes('.pdf')));

        if (hasPdf) {
            // Special Handling for PDFs
            if (selectedDrafts.length === 1) {
                // Single PDF: Open directly
                const pdfUrl = selectedDrafts[0].fileUrl;
                if (pdfUrl) {
                    window.open(pdfUrl, '_blank');
                } else {
                    alert('Hiba: A kiválasztott piszkozathoz nem tartozik fájl URL.');
                }
                return;
            } else {
                // Multiple files with at least one PDF: List them
                const newTab = window.open('', '_blank');
                if (!newTab) {
                    alert('A böngésző letiltotta a felugró ablakot. Kérjük, engedélyezze a felugró ablakokat az oldal számára.');
                    return;
                }

                newTab.document.write(`
                    <!DOCTYPE html>
                    <html lang="hu">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Piszkozatok Megtekintése</title>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    </head>
                    <body class="bg-gray-100 p-8">
                        <div class="max-w-3xl mx-auto bg-white rounded shadow p-6">
                            <h1 class="text-2xl font-bold mb-6 text-gray-800">Kiválasztott Piszkozatok</h1>
                            <p class="mb-4 text-gray-600">A kiválasztott elemek között PDF fájlok is találhatók. Kérjük, nyissa meg őket az alábbi linkekre kattintva:</p>
                            <ul class="space-y-3">
                                ${selectedDrafts.map((draft, index) => `
                                    <li>
                                        ${(draft.fileUrl || (draft.inspectionProtocol === 'pdf_feltoltes')) ? 
                                            `<a href="${draft.fileUrl || '#'}" target="_blank" class="block p-4 border rounded hover:bg-gray-50 bg-gray-50 flex items-center justify-between text-blue-600 font-semibold">
                                                <span>${index + 1}. ${draft.serialNumber || 'Eszköz'} - ${draft.vizsgalatJellege || 'Vizsgálat'} (PDF)</span>
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                            </a>` 
                                            : 
                                            `<span class="block p-4 border rounded bg-gray-100 text-gray-500">
                                                ${index + 1}. ${draft.serialNumber || 'Eszköz'} - Hagyományos HTML Sablon (Nem támogatott vegyes nézetben)
                                            </span>`
                                        }
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </body>
                    </html>
                `);
                newTab.document.close();
                return;
            }
        }

        // 2. Standard HTML Generation for non-PDF drafts
        // Open new tab immediately to avoid popup blockers (iPad fix)
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
                let downloadURL;

                // 1. Check if it's a PDF draft (skip HTML generation)
                // Note: 'pdf_feltoltes' is the protocol name for PDF uploads
                if (draft.inspectionProtocol === 'pdf_feltoltes' || (draft.fileUrl && draft.fileUrl.toLowerCase().includes('.pdf'))) {
                     console.log(`Finalizing PDF draft: ${draft.id}`);
                     if (draft.fileUrl) {
                         downloadURL = draft.fileUrl; 
                     } else {
                         console.error("PDF draft missing fileUrl:", draft);
                         // Skip this one
                         continue;
                     }
                } else {
                    // 2. Standard HTML Generation
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
                    downloadURL = await generateAndUploadFinalizedHtml(htmlTemplateString, draft);
                }

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
                
                // --- NEW OPTIMIZATION 2024-02-05: Update Parent Device ---
                // Denormalize next inspection date and expert to device document for fast statistics
                // Also ensures QR code works for PDF uploads
                if (draft.kovetkezoIdoszakosVizsgalat) {
                    const deviceRef = db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId);
                    const deviceUpdate = {
                        kov_vizsg: draft.kovetkezoIdoszakosVizsgalat, 
                        // Update with Inspection Result (Megfelelt/Nem felelt meg) instead of document status (finalized)
                        status: draft.vizsgalatEredmenye || '', 
                        // Update with Inspection Date
                        vizsg_idopont: draft.vizsgalatIdopontja || '',
                        // Update with File URL for the icon
                        finalizedFileUrl: downloadURL,
                        
                        kovetkezoIdoszakosVizsgalat: draft.kovetkezoIdoszakosVizsgalat,
                        szakerto: draft.szakerto || auth.currentUser.displayName || 'Admin',
                        lastModificationDate: now
                    };
                    batch.update(deviceRef, deviceUpdate);
                }
                // ---------------------------------------------------------

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

        if (!userData.isEkvUser && !userRoles.includes('EJK_admin') && !userRoles.includes('EJK_write') && !userRoles.includes('EJK_inspector')) {
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
