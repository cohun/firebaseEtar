import { auth, db } from './firebase.js';

let knowledgeList = [];
let currentUser = null;

// Auth check
auth.onAuthStateChanged(async (user) => {
    if (user) {
        sessionStorage.removeItem('authRetryDone');
        currentUser = user;
        document.getElementById('userEmail').textContent = user.email;
        
        // Optional: Check if user is admin enabled
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Simple check: allow EJK admins or specific emails
        // Adjust this check to match your security model
        const hasAccess = userData?.roles?.some(r => ['EJK_admin', 'EJK_write'].includes(r)) || 
                          userData?.partnerRoles?.['sysadmin'] === 'admin' ||
                          user.email === 'attila.hitb@gmail.com'; 

        if (!hasAccess) {
             alert("Nincs jogosultságod ehhez az oldalhoz.");
             window.location.href = '/';
             return;
        }

        loadKnowledge();
    } else {
        if (!sessionStorage.getItem('authRetryDone')) {
            // Auto retry on first null state to workaround Firebase Auth IndexedDB lock
            sessionStorage.setItem('authRetryDone', 'true');
            window.location.reload();
            return;
        }
        window.location.href = '/'; // Redirect to home/login if not logged in
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

// Load Data
async function loadKnowledge() {
    const listContainer = document.getElementById('knowledgeList');
    listContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        const snapshot = await db.collection('expert_knowledge').get();
        knowledgeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderList();
    } catch (error) {
        console.error("Error loading knowledge:", error);
        listContainer.innerHTML = '<div class="alert alert-danger">Hiba történt az adatok betöltésekor.</div>';
    }
}

// Render List
function renderList() {
    const listContainer = document.getElementById('knowledgeList');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;

    const filtered = knowledgeList.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm) || item.content.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
        return matchesSearch && matchesCategory;
    });

    listContainer.innerHTML = '';
    
    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="col-12 text-center text-muted py-5">Nincs találat.</div>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card h-100 knowledge-card shadow-sm border-${item.isActive ? 'primary' : 'secondary'}">
                <div class="card-body">
                    <span class="badge ${item.isActive ? 'bg-success' : 'bg-secondary'} status-badge">
                        ${item.isActive ? 'Aktív' : 'Inaktív'}
                    </span>
                    <h5 class="card-title pe-4">${item.title}</h5>
                    <h6 class="card-subtitle mb-3 text-muted badge bg-light text-dark border">${item.category || 'Egyéb'}</h6>
                    <p class="card-text text-truncate" style="max-height: 60px; overflow: hidden;">
                        ${item.content}
                    </p>
                </div>
                <div class="card-footer bg-transparent border-top-0 d-flex justify-content-between">
                    <small class="text-muted"><i class="far fa-clock me-1"></i>${item.updatedAt ? new Date(item.updatedAt.toDate()).toLocaleDateString() : '-'}</small>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editItem('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Search/Filter handlers
document.getElementById('searchInput').addEventListener('input', renderList);
document.getElementById('categoryFilter').addEventListener('change', renderList);

// Global window functions for HTML click handlers
window.prepareAdd = () => {
    document.getElementById('knowledgeForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('modalTitle').textContent = 'Új Szabály Hozzáadása';
};

window.editItem = (id) => {
    const item = knowledgeList.find(i => i.id === id);
    if (!item) return;

    document.getElementById('editId').value = item.id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editContent').value = item.content || '';
    document.getElementById('editCategory').value = item.category || 'General';
    document.getElementById('editIsActive').checked = item.isActive;
    
    // Show current file if exists
    const fileLinkDiv = document.getElementById('currentFileLink');
    if (item.fileUrl) {
        fileLinkDiv.innerHTML = `<a href="${item.fileUrl}" target="_blank" class="text-danger"><i class="fas fa-file-pdf me-1"></i>Jelenlegi PDF megtekintése</a>`;
    } else {
        fileLinkDiv.innerHTML = '';
    }
    document.getElementById('pdfUpload').value = ''; // Reset file input

    document.getElementById('modalTitle').textContent = 'Szabály Szerkesztése';
    
    // Open modal via bootstrap API
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
};

window.saveKnowledge = async () => {
    const id = document.getElementById('editId').value;
    const fileInput = document.getElementById('pdfUpload');
    const file = fileInput.files[0];
    
    const data = {
        title: document.getElementById('editTitle').value,
        content: document.getElementById('editContent').value,
        category: document.getElementById('editCategory').value,
        isActive: document.getElementById('editIsActive').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!data.title) {
        alert('A cím kötelező!');
        return;
    }
    
    // Validate: either content OR file must be present
    // If editing existing item with file, content can be empty if we don't delete the file (logic handled below)
    const existingItem = id ? knowledgeList.find(i => i.id === id) : null;
    const hasExistingFile = existingItem && existingItem.fileUrl;
    
    if (!data.content && !file && !hasExistingFile) {
        alert('Vagy a szöveges tartalom, vagy egy PDF feltöltése kötelező!');
        return;
    }

    // Indicate loading
    const saveBtn = document.querySelector('#editModal .btn-primary');
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Mentés...';

    try {
        // Upload file if selected
        if (file) {
            if (file.type !== 'application/pdf') {
                throw new Error("Csak PDF fájl tölthető fel!");
            }
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`expert_knowledge_files/${Date.now()}_${file.name}`);
            await fileRef.put(file);
            const downloadURL = await fileRef.getDownloadURL();
            
            data.fileUrl = downloadURL;
            data.mimeType = 'application/pdf';
            data.fileName = file.name;
        }

        if (id) {
            await db.collection('expert_knowledge').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('expert_knowledge').add(data);
        }
        
        // Hide modal
        const modalEl = document.getElementById('editModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        
        // Refresh list
        loadKnowledge();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Mentési hiba: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
    }
};

window.deleteItem = async (id) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a szabályt? A szakértő azonnal elfelejti.')) return;
    
    try {
        await db.collection('expert_knowledge').doc(id).delete();
        // Note: We are not deleting the file from Storage to keep it simple, but in production we should.
        loadKnowledge();
    } catch (error) {
        console.error("Error deleting:", error);
        alert("Törlési hiba: " + error.message);
    }
};
