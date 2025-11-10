import { auth, db } from './firebase.js';
import { getTemplates, showTemplateSelector, generateZipFromDrafts } from './doc-generator.js';

let allEnrichedDrafts = []; // Store all fetched drafts globally in this module

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('drafts-table-body');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.email);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Piszkozatok betöltése...</td></tr>`;

            try {
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

                    if (draft.partnerId) {
                        const partnerDoc = await db.collection('partners').doc(draft.partnerId).get();
                        if (partnerDoc.exists) {
                            partnerName = partnerDoc.data().name;
                        }
                    }

                    if (draft.partnerId && draft.deviceId) {
                        const deviceDoc = await db.collection('partners').doc(draft.partnerId).collection('devices').doc(draft.deviceId).get();
                        if (deviceDoc.exists) {
                            serialNumber = deviceDoc.data().serialNumber;
                        }
                    }
                    
                    return { ...draft, partnerName, serialNumber };
                }));

                renderTable(allEnrichedDrafts);

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
});

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
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Kérjük, válasszon ki legalább egy piszkozatot a generáláshoz!');
        return;
    }

    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    const selectedDrafts = allEnrichedDrafts.filter(draft => selectedIds.includes(draft.id));

    try {
        const templates = await getTemplates();
        // A partnerId itt null, mert a generateZipFromDrafts nem használja, a sablonválasztó pedig általánosan kezeli.
        showTemplateSelector(templates, selectedDrafts, null, generateZipFromDrafts);
    } catch (error) {
        console.error("Hiba a sablonok betöltésekor:", error);
        alert("Hiba történt a jegyzőkönyv sablonok betöltése közben. Kérjük, próbálja újra később.");
    }
});

document.getElementById('finalizeDraftsButton').addEventListener('click', () => {
    alert('Véglegesítés (Cloud Function) - implementálás alatt.');
});
