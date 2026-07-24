import { auth, db, storage } from './firebase.js';

let manualsList = [];
let allMegnevezesek = [];
let selectedMegnevezesek = new Set();
let currentUser = null;

// Auth check
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('userEmail').textContent = user.email;

        // Hard restriction to attila.hitb@gmail.com
        if (user.email !== 'attila.hitb@gmail.com') {
            alert("Nincs jogosultságod ehhez az oldalhoz. Kizárólag attila.hitb@gmail.com érheti el.");
            window.location.href = 'app.html';
            return;
        }

        // Initialize lists
        await loadMegnevezesek();
        loadManuals();
    } else {
        window.location.href = 'index.html';
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

// Load all Megnevezesek from public JSON file
async function loadMegnevezesek() {
    try {
        const response = await fetch('osszes_megnevezes.json');
        if (!response.ok) throw new Error('Nem sikerült betölteni a megnevezések listáját.');
        allMegnevezesek = await response.json();
        renderSelectorList();
    } catch (error) {
        console.error("Hiba a megnevezések betöltésekor:", error);
        showAlert('danger', 'Hiba történt a megnevezés lista betöltése közben.');
    }
}

// Render the checkbox selector list
function renderSelectorList() {
    const container = document.getElementById('megnevezesListContainer');
    const filterText = document.getElementById('selectorSearch').value.toLowerCase();
    container.innerHTML = '';

    const filtered = allMegnevezesek.filter(m => m.toLowerCase().includes(filterText));

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-muted text-center py-2">Nincs találat</div>';
        return;
    }

    filtered.forEach(m => {
        const isChecked = selectedMegnevezesek.has(m);
        const div = document.createElement('div');
        div.className = 'd-flex align-items-start py-1 megnevezes-item';
        div.style.cursor = 'pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'me-2 mt-1 flex-shrink-0';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.cursor = 'pointer';
        checkbox.id = `checkbox_${m.replace(/[^a-zA-Z0-9]/g, '_')}`;
        checkbox.checked = isChecked;
        checkbox.value = m;

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedMegnevezesek.add(m);
            } else {
                selectedMegnevezesek.delete(m);
            }
            renderSelectedTags();
        });

        const label = document.createElement('label');
        label.className = 'cursor-pointer text-white-50 w-100';
        label.style.userSelect = 'none';
        label.style.lineHeight = '1.3';
        label.htmlFor = checkbox.id;
        label.textContent = m;

        // Make label click toggle checkbox
        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// Render selected items as tags
function renderSelectedTags() {
    const container = document.getElementById('selectedTags');
    container.innerHTML = '';

    if (selectedMegnevezesek.size === 0) {
        container.innerHTML = '<span class="text-muted fs-7 p-1 italic" id="noTagsPlaceholder">Nincs kijelölt megnevezés.</span>';
        return;
    }

    selectedMegnevezesek.forEach(m => {
        const tag = document.createElement('span');
        tag.className = 'selected-tag';
        tag.innerHTML = `${m} <i class="fas fa-times-circle" data-val="${m}"></i>`;
        
        tag.querySelector('i').addEventListener('click', (e) => {
            const val = e.target.dataset.val;
            selectedMegnevezesek.delete(val);
            renderSelectedTags();
            renderSelectorList(); // Refresh checkboxes
        });

        container.appendChild(tag);
    });
}

// Add filter listeners
document.getElementById('selectorSearch').addEventListener('input', renderSelectorList);
document.getElementById('searchInput').addEventListener('input', renderManualsTable);

// Load Manuals from Firestore
async function loadManuals() {
    const listContainer = document.getElementById('manualsList');
    listContainer.innerHTML = '<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const snapshot = await db.collection('generic_handlings').orderBy('uploadedAt', 'desc').get();
        manualsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderManualsTable();
    } catch (error) {
        console.error("Error loading manuals:", error);
        showAlert('danger', 'Hiba történt a kezelési útmutatók betöltése közben.');
        listContainer.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Nem sikerült betölteni az adatokat.</td></tr>';
    }
}

// Render Table
function renderManualsTable() {
    const listContainer = document.getElementById('manualsList');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    const filtered = manualsList.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm) || 
                              item.fileName.toLowerCase().includes(searchTerm) ||
                              item.associatedDescriptions.some(m => m.toLowerCase().includes(searchTerm));
        return matchesSearch;
    });

    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nincs feltöltött kezelési útmutató.</td></tr>';
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        
        // Render associated descriptions as badges
        const badgesHtml = item.associatedDescriptions.map(m => `<span class="description-badge">${m}</span>`).join(' ');

        tr.innerHTML = `
            <td class="fw-semibold text-white">${item.title}</td>
            <td><a href="${item.downloadUrl}" target="_blank" class="text-info"><i class="fas fa-file-code me-1"></i>${item.fileName}</a></td>
            <td><div style="max-height: 80px; overflow-y: auto;">${badgesHtml}</div></td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-primary me-2" onclick="window.editManual('${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteManual('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        listContainer.appendChild(tr);
    });
}

// Global functions for modal preparation
window.prepareAdd = () => {
    document.getElementById('manualForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('htmlUpload').required = true;
    document.getElementById('currentFileLink').innerHTML = '';
    selectedMegnevezesek.clear();
    renderSelectedTags();
    renderSelectorList();
    document.getElementById('modalTitle').textContent = 'Útmutató Feltöltése';
};

window.editManual = (id) => {
    const item = manualsList.find(m => m.id === id);
    if (!item) return;

    document.getElementById('editId').value = item.id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('htmlUpload').required = false; // file not required when editing
    
    document.getElementById('currentFileLink').innerHTML = `
        <div class="alert alert-info py-2 mb-0 mt-1 fs-7">
            <i class="fas fa-info-circle me-1"></i>
            Jelenlegi fájl: <a href="${item.downloadUrl}" target="_blank" class="fw-bold">${item.fileName}</a>
            <br><span class="text-muted">Csak akkor tölts fel újat, ha le szeretnéd cserélni a meglévőt.</span>
        </div>
    `;

    selectedMegnevezesek = new Set(item.associatedDescriptions);
    renderSelectedTags();
    renderSelectorList();

    document.getElementById('modalTitle').textContent = 'Útmutató Szerkesztése';
    
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
};

window.saveManual = async () => {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitle').value.trim();
    const fileInput = document.getElementById('htmlUpload');
    const file = fileInput.files[0];

    if (!title) {
        alert('Az útmutató címe kötelező!');
        return;
    }

    if (!id && !file) {
        alert('Új útmutató esetén kötelező a HTML fájl feltöltése!');
        return;
    }

    if (selectedMegnevezesek.size === 0) {
        alert('Legalább egy Megnevezést társítani kell az útmutatóhoz!');
        return;
    }

    const saveBtn = document.querySelector('#editModal .btn-primary');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Mentés...';

    try {
        let updateData = {
            title: title,
            associatedDescriptions: Array.from(selectedMegnevezesek),
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            uploadedBy: currentUser.displayName || currentUser.email
        };

        if (file) {
            // Check file type
            if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
                throw new Error("Csak .html formátumú fájl tölthető fel!");
            }

            // Upload to storage
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `generic_handlings/${timestamp}_${safeName}`;
            const storageRef = storage.ref().child(storagePath);

            await storageRef.put(file);
            const downloadUrl = await storageRef.getDownloadURL();

            updateData.fileName = file.name;
            updateData.storagePath = storagePath;
            updateData.downloadUrl = downloadUrl;

            // If we are replacing an old file, delete the old file from Storage first
            if (id) {
                const oldItem = manualsList.find(m => m.id === id);
                if (oldItem && oldItem.storagePath) {
                    try {
                        await storage.ref().child(oldItem.storagePath).delete();
                    } catch (e) {
                        console.warn("Régi fájl törlése sikertelen:", e);
                    }
                }
            }
        }

        if (id) {
            await db.collection('generic_handlings').doc(id).update(updateData);
            showAlert('success', 'Útmutató sikeresen frissítve.');
        } else {
            await db.collection('generic_handlings').add(updateData);
            showAlert('success', 'Útmutató sikeresen hozzáadva.');
        }

        // Close modal
        const modalEl = document.getElementById('editModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();

        loadManuals();
    } catch (error) {
        console.error("Hiba a mentés során:", error);
        alert("Hiba történt: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
};

window.deleteManual = async (id) => {
    const item = manualsList.find(m => m.id === id);
    if (!item) return;

    if (!confirm(`Biztosan törölni szeretnéd a(z) "${item.title}" kezelési útmutatót? A törlés végleges és nem visszavonható.`)) {
        return;
    }

    try {
        // 1. Delete file from Storage
        if (item.storagePath) {
            try {
                await storage.ref().child(item.storagePath).delete();
            } catch (storageError) {
                console.error("Hiba a fájl törlésekor Storage-ból (lehet hogy már nem létezik):", storageError);
            }
        }

        // 2. Delete document from Firestore
        await db.collection('generic_handlings').doc(id).delete();
        showAlert('success', 'Kezelési útmutató törölve.');
        loadManuals();
    } catch (error) {
        console.error("Hiba a törlés során:", error);
        showAlert('danger', 'Hiba történt a törlés közben: ' + error.message);
    }
};

// Alert display utility
function showAlert(type, message) {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Bezárás"></button>
        </div>
    `;
    // Auto dismiss after 4 seconds
    setTimeout(() => {
        const alertNode = container.querySelector('.alert');
        if (alertNode) {
            const bsAlert = bootstrap.Alert.getInstance(alertNode) || new bootstrap.Alert(alertNode);
            bsAlert.close();
        }
    }, 4000);
}
