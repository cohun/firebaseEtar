
console.log("--- DEBUG: adatbevitel.js LOADED ---");
import { auth, db, storage } from './firebase.js';

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.getElementById('backButton');
    const saveButton = document.getElementById('saveButton');
    const loadPreviousButton = document.getElementById('loadPreviousButton');
    const form = document.getElementById('dataEntryForm');
    const storageKey = 'previousDeviceData';
    let currentUserData = null; // Store user data for save logic
    let scannedChipId = null; // Store scanned chip ID

    // Wait for Auth to be ready
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User authenticated:", user.email);
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUserData = userDoc.data();
                    
                    // Apply EKV mode if applicable
                    if (currentUserData.isEkvUser) {
                        document.body.classList.add('ekv-mode');
                    } else {
                        document.body.classList.remove('ekv-mode');
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        } else {
            console.log("User not authenticated, redirecting to login...");
            window.location.href = 'index.html';
        }
    });

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'app.html';
        });
    }

    const editDeviceId = sessionStorage.getItem('editDeviceId');
    const partnerIdForEdit = sessionStorage.getItem('partnerIdForEdit');

    if (editDeviceId && partnerIdForEdit) {
        // =================================
        // MÓDOSÍTÁS ÜZEMMÓD
        // =================================
        console.log(`--- DEBUG: EDIT MODE --- Device: ${editDeviceId}, Partner: ${partnerIdForEdit}`);
        if(loadPreviousButton) {
            loadPreviousButton.style.display = 'none';
        }

        const isReadOnlyMode = sessionStorage.getItem('isReadOnlyMode') === 'true';

        // UI elemek módosítása
        if (isReadOnlyMode) {
            document.querySelector('h2').textContent = 'Eszköz adatainak megtekintése';
            saveButton.style.display = 'none';
            
            // Disable all inputs after a short delay to ensure dynamic fields are rendered
            setTimeout(() => {
                const formElements = form.querySelectorAll('input, select, textarea');
                formElements.forEach(el => el.disabled = true);
                
                // Hide chip assignment button if exists
                const chipBtn = document.getElementById('assignChipButton');
                if (chipBtn) chipBtn.style.display = 'none';
                
                // Hide excel read button if exists
                const excelBtn = document.getElementById('excelReadButton');
                if (excelBtn) excelBtn.style.display = 'none';
                
                // Add a visual indicator
                const warningBanner = document.createElement('div');
                warningBanner.className = 'bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-2 rounded-lg mb-4 text-sm';
                warningBanner.innerHTML = '<i class="fas fa-info-circle mr-2"></i>Olvasási jogosultsággal tekinti meg az eszközt. Az adatok nem módosíthatók.';
                form.insertBefore(warningBanner, form.firstChild);
            }, 600);
        } else {
            document.querySelector('h2').textContent = 'Eszköz adatainak módosítása';
            saveButton.textContent = 'Módosítások mentése';
            saveButton.style.display = 'block';
        }

        // Adatok lekérése a Firestore-ból
        db.collection('partners').doc(partnerIdForEdit).collection('devices').doc(editDeviceId).get()
            .then(doc => {
                if (doc.exists) {
                    const deviceData = doc.data();
                    console.log("DEBUG: Fetched device data:", deviceData); // Adatok logolása
                    
                    // Form kitöltése a kapott adatokkal
                    form.querySelector('[name="eszkoz_megnevezes"]').value = deviceData.description || '';
                    form.querySelector('[name="eszkoz_tipus"]').value = deviceData.type || '';
                    form.querySelector('[name="eszkoz_gyarto"]').value = deviceData.manufacturer || '';
                    form.querySelector('[name="eszkoz_hossz"]').value = deviceData.effectiveLength || '';
                    form.querySelector('[name="gyartas_eve"]').value = deviceData.yearOfManufacture || '';
                    form.querySelector('[name="eszkoz_teherbiras"]').value = deviceData.loadCapacity || '';
                    form.querySelector('[name="eszkoz_gyariszam"]').value = deviceData.serialNumber || '';

                    form.querySelector('[name="eszkoz_uzemeltetoi_azonosito"]').value = deviceData.operatorId || '';

                    // Chip Data
                    if (deviceData.chip) {
                        scannedChipId = deviceData.chip;
                        updateChipButtonUI(scannedChipId);
                    }
                    
                    // Populate Custom IDs
                    // Note: populateForm function is defined below, but we can reuse the logic or call it if we move it up.
                    // Instead, let's just do it directly here for reliability.
                    const populateCustomIdsEdit = () => {
                         if (deviceData.customIds) {
                            Object.entries(deviceData.customIds).forEach(([cat, val]) => {
                                const input = form.querySelector(`input[data-category="${cat}"]`);
                                if (input) input.value = val;
                            });
                        }
                    };
                    setTimeout(populateCustomIdsEdit, 500); // Wait for dynamic fields to render

                    // --- ATTACHED DOCUMENTS ---
                    if (typeof initAttachedDocuments === 'function') {
                        initAttachedDocuments(partnerIdForEdit, editDeviceId, currentUserData);
                    }

                } else {
                    console.error("Hiba: A szerkesztendő eszköz nem található!");
                    alert("A szerkesztendő eszköz nem található. Lehet, hogy időközben törölték.");
                    window.history.back();
                }
            })
            .catch(error => {
                console.error("Hiba az eszköz adatainak lekérésekor:", error);
                alert("Hiba történt az eszköz adatainak lekérése közben.");
                window.history.back();
            });

    } else {
        // =================================
        // ÚJ ESZKÖZ ÜZEMMÓD
        // =================================
        document.querySelector('h2').textContent = 'Adatbevitel'; // Explicitly set title for new entry
        // Gyári szám előtöltése, ha új eszközt hozunk létre a partneri felületről
        const newDeviceSerialNumber = sessionStorage.getItem('newDeviceSerialNumber');
        if (newDeviceSerialNumber) {
            const serialNumberField = form.querySelector('[name="eszkoz_gyariszam"]');
            if (serialNumberField) {
                serialNumberField.value = newDeviceSerialNumber;
            }
            sessionStorage.removeItem('newDeviceSerialNumber');
        }
    }const customIdsContainer = document.getElementById('customIdsContainer');
    let dynamicCategories = [];

    async function loadDynamicFields() {
        const partnerId = partnerIdForEdit || sessionStorage.getItem('lastPartnerId');
        console.log("DEBUG: loadDynamicFields called. partnerId:", partnerId);
        
        if (!partnerId) {
            console.error("DEBUG: No partnerId found for dynamic fields.");
            return;
        }

        try {
            const partnerDoc = await db.collection('partners').doc(partnerId).get();
            if (partnerDoc.exists) {
                const data = partnerDoc.data();
                console.log("DEBUG: Partner data fetched:", data);
                dynamicCategories = data.definedIdCategories || [];
                console.log("DEBUG: dynamicCategories:", dynamicCategories);
                renderDynamicFields();
                // If in edit mode, we might need to populate values here if data was already fetched
                // But data fetching happens in parallel. We'll handle population in populateForm.
            } else {
                console.warn("DEBUG: Partner document does not exist:", partnerId);
            }
        } catch (error) {
            console.error("Error loading partner categories:", error);
        }
    }

    function highlightActiveCategoryField() {
        const currentCategory = sessionStorage.getItem('currentOperatorCategory');
        console.log("DEBUG: highlightActiveCategoryField called. Category:", currentCategory);
        if (!currentCategory) return;

        // Remove previous highlights if any (though usually fresh load)
        const highlighted = form.querySelectorAll('.border-blue-500');
        highlighted.forEach(el => el.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500', 'ring-opacity-50'));

        if (currentCategory === 'Default') {
            const defaultInput = form.querySelector('[name="eszkoz_uzemeltetoi_azonosito"]');
            if (defaultInput) {
                defaultInput.classList.add('border-blue-500', 'ring-2', 'ring-blue-500', 'ring-opacity-50');
                setTimeout(() => {
                    defaultInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    defaultInput.focus();
                }, 300);
            }
        } else {
            const customInput = form.querySelector(`input[data-category="${currentCategory}"]`);
            if (customInput) {
                customInput.classList.add('border-blue-500', 'ring-2', 'ring-blue-500', 'ring-opacity-50');
                setTimeout(() => {
                    customInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    customInput.focus();
                }, 300);
            }
        }
    }

    function renderDynamicFields() {
        if (!customIdsContainer) return;
        customIdsContainer.innerHTML = ''; // Clear existing
        
        dynamicCategories.forEach(cat => {
            const div = document.createElement('div');
            // Safe key generation for label
            div.innerHTML = `<label class="block text-sm text-blue-300">${cat}</label><input name="customId_${cat}" class="input-field dynamic-custom-id" data-category="${cat}">`;
            customIdsContainer.appendChild(div);
        });

        // Highlight the active field after render
        highlightActiveCategoryField();
    }

    // Call this immediately
    loadDynamicFields();


    // Function to populate form from an object
    const populateForm = (data) => {
        form.querySelector('[name="eszkoz_megnevezes"]').value = data.description || '';
        form.querySelector('[name="eszkoz_tipus"]').value = data.type || '';
        form.querySelector('[name="eszkoz_gyarto"]').value = data.manufacturer || '';
        form.querySelector('[name="eszkoz_hossz"]').value = data.effectiveLength || '';
        form.querySelector('[name="gyartas_eve"]').value = data.yearOfManufacture || '';
        form.querySelector('[name="eszkoz_teherbiras"]').value = data.loadCapacity || '';

        // Gyári szám és üzemeltetői azonosító szándékosan kihagyva
        
        // Populate Custom IDs if fields exist (wait for render?)
        // Since loadDynamicFields is async, fields might not exist yet.
        // But populateForm is called after fetch. Ideally we await loadDynamicFields first.
        const populateCustomIds = () => {
             if (data.customIds) {
                Object.entries(data.customIds).forEach(([cat, val]) => {
                    const input = form.querySelector(`input[data-category="${cat}"]`);
                    if (input) input.value = val;
                });
            }
        };
        
        // Try immediately, or set up a listener/promise? 
        // Simple hack: check if dynamicCategories is populated using a small retry if needed, or mostly it will be fast enough or we re-call populate.
        populateCustomIds();
        
        // Wait retry if fields not ready
        if (dynamicCategories.length > 0 && customIdsContainer.children.length === 0) {
             // Should not happen if we rendered.
        } else {
             // Retry once after a short delay just in case renderDynamicFields is pending
             setTimeout(populateCustomIds, 500); 
        }
    };

    // Load previous data button event listener
    loadPreviousButton.addEventListener('click', function() {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            populateForm(JSON.parse(savedData));
        } else {
            alert('Nincsenek mentett előző adatok.');
        }
    });

    const excelReadButton = document.getElementById('excelReadButton');
    if (excelReadButton) {
        excelReadButton.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                alert('Nincs bejelentkezett felhasználó. Kérjük, jelentkezzen be!');
                return;
            }

            try {
                // Use cached userData if available, otherwise fetch
                let userData = currentUserData;
                if (!userData) {
                     const userDoc = await db.collection('users').doc(user.uid).get();
                     userData = userDoc.exists ? userDoc.data() : {};
                }

                if (userData.isEjkUser) {
                    window.location.href = 'excel_import.html';
                } else {
                    alert("Jelenleg ez a funkció csak H-ITB számára engedélyezett. Kérjük forduljon a H-ITB kapcsolattartójához, aki ezt a műveletet elvégzi Önnek!");
                }
            } catch (error) {
                console.error("Hiba a jogosultság ellenőrzésekor:", error);
                alert("Hiba történt a jogosultság ellenőrzése közben.");
            }
        });
    }

    saveButton.addEventListener('click', async function () {
        // Hide keyboard on mobile
        if (document.activeElement) {
            document.activeElement.blur();
        }

        const user = auth.currentUser;
        if (!user) {
            alert('Nincs bejelentkezett felhasználó. Kérjük, jelentkezzen be!');
            return;
        }

        const description = form.querySelector('[name="eszkoz_megnevezes"]').value;
        const serialNumber = form.querySelector('[name="eszkoz_gyariszam"]').value;
        const loadCapacity = form.querySelector('[name="eszkoz_teherbiras"]').value;

        if (!description || !serialNumber || !loadCapacity) {
            alert('A Megnevezés, Gyári szám és Teherbírás (WLL) mezők kitöltése kötelező!');
            return;
        }

        let createdByName = user.displayName;
        if (!createdByName && currentUserData) {
            createdByName = currentUserData.name || user.email;
        }

        const deviceData = {
            description: description,
            operatorId: form.querySelector('[name="eszkoz_uzemeltetoi_azonosito"]').value,
            type: form.querySelector('[name="eszkoz_tipus"]').value,
            effectiveLength: form.querySelector('[name="eszkoz_hossz"]').value,
            loadCapacity: loadCapacity,
            manufacturer: form.querySelector('[name="eszkoz_gyarto"]').value,
            serialNumber: serialNumber,
            yearOfManufacture: form.querySelector('[name="gyartas_eve"]').value ? parseInt(form.querySelector('[name="gyartas_eve"]').value) : null,
            comment: 'active',
            chip: scannedChipId || null,

            status: ''
        };

        // Collect Custom IDs
        const customInputs = document.querySelectorAll('.dynamic-custom-id');
        if (customInputs.length > 0) {
            deviceData.customIds = {};
            customInputs.forEach(input => {
                const cat = input.dataset.category;
                if (input.value.trim() !== "") {
                    deviceData.customIds[cat] = input.value.trim();
                }
            });
        }

        // Check if we are in edit mode
        const editDeviceId = sessionStorage.getItem('editDeviceId');
        const partnerIdForEdit = sessionStorage.getItem('partnerIdForEdit');

        if (editDeviceId && partnerIdForEdit) {
            // UPDATE existing device
            deviceData.lastModifiedAt = firebase.firestore.FieldValue.serverTimestamp();
            deviceData.lastModifiedBy = createdByName;
            
            // PREVENT overwriting vital data during simple edits!
            delete deviceData.status;
            delete deviceData.comment;

            console.log("Updating device in Firestore:", JSON.stringify(deviceData, null, 2));

            try {
                await db.collection('partners').doc(partnerIdForEdit).collection('devices').doc(editDeviceId).update(deviceData);
                // alert('Eszköz sikeresen frissítve!');
                showSuccessModal(`Eszköz sikeresen frissítve!<br><br>Gyári szám:<br><span class="font-bold text-2xl text-yellow-500">${deviceData.serialNumber}</span>`);
                
                // Clean up session storage and redirect
                sessionStorage.removeItem('editDeviceId');
                sessionStorage.removeItem('partnerIdForEdit');
                
                // Add a small delay before redirect so user can see the modal
                document.getElementById('modal-success-ok-btn').addEventListener('click', () => {
                   window.location.href = 'app.html';
                }, { once: true });

            } catch (error) {
                console.error("Hiba az eszköz frissítésekor:", error);
                alert('Hiba történt az eszköz frissítésekor: ' + error.message);
            }

        } else {
            // ADD new device
            const partnerId = sessionStorage.getItem('lastPartnerId');
            if (!partnerId) {
                alert('Nincs kiválasztott partner. Kérjük, válasszon partnert!');
                return;
            }

            // Check if user is EKV or has inspector role using cached data
            console.log("Checking user data for isI...");
            let userData = currentUserData;
            if (!userData) {
                 console.log("currentUserData is null, fetching...");
                 const userDoc = await db.collection('users').doc(user.uid).get();
                 userData = userDoc.exists ? userDoc.data() : {};
            }
            console.log("User data used for check:", userData);
            
            const isInspector = Object.values(userData.partnerRoles || {}).some(role => role.includes('inspector'));
            
            if (userData.isEkvUser || isInspector) {
                console.log("User is EKV or Inspector, setting isI to true.");
                deviceData.isI = true;
            } else {
                console.log("User is NOT EKV/Inspector, isI remains undefined.");
            }

            deviceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            deviceData.createdBy = createdByName;
            deviceData.partnerId = partnerId;

            // Save data for "load previous" functionality
            const dataToStore = { ...deviceData };
            delete dataToStore.serialNumber;
            delete dataToStore.operatorId;
            delete dataToStore.createdAt;
            localStorage.setItem(storageKey, JSON.stringify(dataToStore));

            console.log("Adding new device to Firestore:", JSON.stringify(deviceData, null, 2));

            try {
                await db.collection('partners').doc(partnerId).collection('devices').add(deviceData);

                // alert('Eszköz sikeresen mentve!');
                // Check if we need to return to New Inspection
                const returnFlag = sessionStorage.getItem('returnToNewInspection');
                console.log("DEBUG: check returnToNewInspection flag:", returnFlag);
                
                let shouldRedirectBack = false;
                if (returnFlag === 'true') {
                    console.log("DEBUG: Saving lastCreatedDeviceSerial:", deviceData.serialNumber);
                    sessionStorage.setItem('lastCreatedDeviceSerial', deviceData.serialNumber);
                    console.log("DEBUG: sessionStorage after set:", {
                        returnToNewInspection: sessionStorage.getItem('returnToNewInspection'),
                        lastCreatedDeviceSerial: sessionStorage.getItem('lastCreatedDeviceSerial')
                    });
                    shouldRedirectBack = true;
                } else {
                     console.log("DEBUG: Not returning to new inspection, flag is:", returnFlag);
                }

                showSuccessModal(`Eszköz sikeresen mentve!<br><br>Gyári szám:<br><span class="font-bold text-2xl text-yellow-500">${deviceData.serialNumber}</span>`, shouldRedirectBack);

                form.reset();
            } catch (error) {
                console.error("Hiba az eszköz mentésekor:", error);
                alert('Hiba történt az eszköz mentésekor: ' + error.message);
            }
        }
    });

    // Custom Success Modal Function
    function showSuccessModal(messageHtml, shouldRedirect = false) {
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
        }
        
        document.getElementById('modal-success-message').innerHTML = messageHtml;
        modal.classList.remove('hidden');

        // Handle OK button click
        const okBtn = document.getElementById('modal-success-ok-btn');
        // Clone button to remove old listeners
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', () => {
             modal.classList.add('hidden');
             if (shouldRedirect) {
                 console.log("DEBUG: Redirecting to app.html via showSuccessModal");
                 window.location.href = 'app.html';
             }
        });
    }

    // --- CHIP / NFC Handler Code ---
    
    function updateChipButtonUI(chipId) {
        const btn = document.getElementById('chipScanButton');
        if (!btn) return;
        
        if (chipId) {
            btn.classList.remove('text-glow', 'text-white-filled', 'text-hollow');
            btn.classList.add('text-green-400', 'font-bold'); // Visual feedback for 'assigned'
            btn.innerHTML = `CHIP (OK)`;
            // Optionally show ID in title
            btn.title = `Chip ID: ${chipId}`;
        } else {
            // Default state
            btn.classList.remove('text-green-400', 'font-bold');
            btn.classList.add('text-glow');
            btn.innerHTML = `CHIP`;
            btn.title = '';
        }
    }

    const chipScanButton = document.getElementById('chipScanButton');
    if (chipScanButton) {
        chipScanButton.addEventListener('click', () => {
            const confirmMsg = scannedChipId 
                ? "Már van hozzárendelt Chip. Szeretné felülírni új beolvasással?" 
                : "Kérjük, olvassa be a chipet.";
            
            if (!scannedChipId || confirm(confirmMsg)) {
                startNFCReader();
            }
        });
    }

    async function startNFCReader() {
        const modal = document.getElementById('nfc-modal');
        const modalTitle = document.getElementById('nfc-modal-title');
        const modalBody = document.getElementById('nfc-modal-body');
        const modalCloseBtn = document.getElementById('nfc-modal-close-btn');

        if (!modal) {
            console.error("NFC Modal not found!");
            alert("Hiba: A felugró ablak nem elérhető.");
            return;
        }

        const showModal = (title, bodyHtml, buttonText = 'Mégse') => {
            modalTitle.textContent = title;
            modalBody.innerHTML = bodyHtml;
            modalCloseBtn.textContent = buttonText;
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // Ensure flex layout
        };
        const hideModal = () => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        };

        modalCloseBtn.onclick = hideModal;

        // Content
        const modalContent = `
            <p>Kérem, érintse a chipet a készülékhez (Android) vagy az USB olvasóhoz.</p>
            <div class="loader-small my-4" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 20px auto;"></div>
            <input type="text" id="nfc-usb-input" style="opacity: 0; position: absolute; pointer-events: none;" autocomplete="off">
            <p class="text-xs text-gray-400 mt-2">USB olvasó esetén kattintson ide, ha nem aktív a beolvasás.</p>
            <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        
        showModal('Chip Betanítás...', modalContent, 'Mégse');

        const usbInput = document.getElementById('nfc-usb-input');
        if (usbInput) {
            usbInput.focus();
            
            // Keep focus
            usbInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (!modal.classList.contains('hidden')) usbInput.focus();
                }, 100);
            });
            
            // Listen for Enter key
            usbInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const chipId = usbInput.value.trim();
                    if (chipId) {
                        console.log(`> USB Reader Input: ${chipId}`);
                        processChipId(chipId);
                    }
                    usbInput.value = '';
                }
            });
        }

        // Web NFC
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
                
                // Add abort controller to cleanup if modal closed? 
                // Currently simplified.

                ndef.addEventListener("reading", onReading);
                await ndef.scan();
                console.log("> Web NFC scan started");

            } catch (error) {
                console.warn(`Web NFC init failed: ${error.name}`, error);
            }
        }

        const processChipId = (chipId) => {
            scannedChipId = chipId;
            updateChipButtonUI(scannedChipId);
            
            // Success feedback in modal
            modalTitle.textContent = 'Sikeres Olvasás!';
            modalBody.innerHTML = `
                <div class="text-center">
                    <p class="text-green-400 font-bold text-xl mb-2">Chip rögzítve</p>
                    <p class="text-white">ID: ${chipId}</p>
                    <p class="text-gray-400 text-sm mt-4">A mentéshez kattintson a Mentés gombra az űrlapon.</p>
                </div>
            `;
            modalCloseBtn.textContent = 'Kész';
            
            // Auto close after short delay?
            setTimeout(() => {
                hideModal();
            }, 1500);
        };
    }

    // --- ATTACHED DOCUMENTS LOGIC ---
    function initAttachedDocuments(partnerId, deviceId, initialCurrentUser) {
        const section = document.getElementById('attachedDocumentsSection');
        const uploadArea = document.getElementById('documentUploadArea');
        const fileInput = document.getElementById('documentFileInput');
        const docList = document.getElementById('attachedDocumentsList');
        const quotaWarning = document.getElementById('storage-quota-warning');
        
        const progressContainer = document.getElementById('uploadProgressContainer');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressText = document.getElementById('uploadProgressText');

        if (!section || !uploadArea || !fileInput || !docList) return;

        section.classList.remove('hidden');
        
        const isReadOnlyMode = sessionStorage.getItem('isReadOnlyMode') === 'true';
        if (isReadOnlyMode) {
            uploadArea.style.display = 'none';
        }

        // --- RELIABLE USER NAME RESOLUTION ---
        // Resolves a race condition where initialCurrentUser is sometimes passed as null
        let cachedUserName = null;
        async function getReliableUserName() {
            if (cachedUserName) return cachedUserName;
            
            if (auth.currentUser) {
                try {
                    const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
                    if (userDoc.exists && userDoc.data().name) {
                        cachedUserName = userDoc.data().name;
                        return cachedUserName;
                    }
                } catch (e) {
                    console.warn("Could not fetch user profile for name:", e);
                }
                
                cachedUserName = auth.currentUser.displayName || auth.currentUser.email || 'Ismeretlen';
                return cachedUserName;
            }
            
            // Fallback to the argument which might have been populated later if passed by reference (unlikely for null though)
            if (initialCurrentUser && initialCurrentUser.name) return initialCurrentUser.name;
            if (initialCurrentUser && initialCurrentUser.email) return initialCurrentUser.email;
            
            return 'Ismeretlen';
        }

        let isQuotaExceeded = false;
        let partnerStorageRef = db.collection('partners').doc(partnerId);

        // 1. Listen for Quota Changes
        const quotaUnsubscribe = partnerStorageRef.onSnapshot((doc) => {
            if (doc.exists) {
                const partnerData = doc.data();
                const usedBytes = partnerData.storageUsedBytes || 0;
                let limitBytes = partnerData.storageLimitBytes || 52428800; // 50MB default
                
                // Enforce automatic fallback to Free tier (50MB) if subscription expired
                if (partnerData.storageRenewalDate) {
                    const renewalDate = new Date(partnerData.storageRenewalDate);
                    if (new Date() > renewalDate) {
                        limitBytes = 52428800; // Force 50MB limit
                    }
                }
                
                if (usedBytes >= limitBytes) {
                    isQuotaExceeded = true;
                    quotaWarning.classList.remove('hidden');
                    uploadArea.classList.add('opacity-50', 'pointer-events-none');
                } else {
                    isQuotaExceeded = false;
                    quotaWarning.classList.add('hidden');
                    uploadArea.classList.remove('opacity-50', 'pointer-events-none');
                }
            }
        });

        // 2. Setup Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                if (!isQuotaExceeded) uploadArea.classList.add('bg-gray-700', 'border-blue-500');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('bg-gray-700', 'border-blue-500');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            if (isQuotaExceeded) return;
            let dt = e.dataTransfer;
            let files = dt.files;
            handleFiles(files);
        });

        fileInput.addEventListener('change', function() {
            if (isQuotaExceeded) return;
            handleFiles(this.files);
        });

        function handleFiles(files) {
            if (files.length === 0) return;
            const file = files[0]; // Process only the first file
            
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                alert('A fájl mérete túl nagy! Maximum 10 MB engedélyezett.');
                return;
            }

            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                alert('Csak PDF, JPG és PNG fájlok engedélyezettek.');
                return;
            }

            uploadFile(file);
        }

        function uploadFile(file) {
            // Generate unique filename to prevent overwrites
            const timestamp = new Date().getTime();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${timestamp}_${safeFileName}`;
            
            // Storage Path matching rules: partners/{partnerId}/devices/{deviceId}/attached_documents/{filename}
            const storagePath = `partners/${partnerId}/devices/${deviceId}/attached_documents/${fileName}`;
            const storageRef = storage.ref().child(storagePath);
            
            const uploadTask = storageRef.put(file);

            // Show Progress UI
            progressContainer.classList.remove('hidden');
            fileInput.disabled = true;

            uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressBar.style.width = progress + '%';
                    progressText.textContent = Math.round(progress) + '%';
                }, 
                (error) => {
                    console.error('Upload failed:', error);
                    alert('Hiba a fájl feltöltése során: ' + error.message);
                    resetUploadUI();
                }, 
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        
                        // Reliable Username Resolution
                        const createdByName = await getReliableUserName();
                        
                        // Save Metadata to Firestore
                        await partnerStorageRef.collection('devices').doc(deviceId).collection('attached_documents').add({
                            fileName: file.name,
                            storagePath: storagePath,
                            downloadUrl: downloadURL,
                            sizeBytes: file.size,
                            contentType: file.type,
                            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            uploadedBy: createdByName
                        });
                        
                        resetUploadUI();
                        // alert('Fájl sikeresen feltöltve!'); // Silent success, list updates automatically
                        
                    } catch (error) {
                         console.error('Error saving document metadata:', error);
                         alert('Hiba történt a dokumentum mentésekor.');
                         resetUploadUI();
                    }
                }
            );
        }

        function resetUploadUI() {
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            fileInput.value = ''; // Clear input
            fileInput.disabled = false;
        }

        // Helper function for formatting bytes
        function formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        // 3. Render List (Realtime)
        const docsUnsubscribe = partnerStorageRef.collection('devices')
            .doc(deviceId)
            .collection('attached_documents')
            .orderBy('uploadedAt', 'desc')
            .onSnapshot(async (snapshot) => {
                const filesDocs = snapshot.docs;
                const fileListContainer = document.getElementById('attachedDocumentsList');

                if (filesDocs.length === 0) {
                    fileListContainer.innerHTML = '<p class="text-gray-400 text-sm italic py-4 text-center">Nincsenek csatolt dokumentumok.</p>';
                    return;
                }

                let htmlContent = '';
                
                // Determine current user name using our reliable async function
                let currentUserNameToFix = await getReliableUserName();

                for (const docSnap of filesDocs) {
                    const data = docSnap.data();
                    const docId = docSnap.id;
                    
                    // Retroactive Fix: Update existing documents that have 'Ismeretlen' or email
                    if (data.uploadedBy === 'Ismeretlen' || (data.uploadedBy && data.uploadedBy.includes('@'))) {
                        // Only fix if we actually have a valid name to put in
                        if (currentUserNameToFix !== 'Ismeretlen' && !currentUserNameToFix.includes('@')) {
                            console.log(`Auto-fixing uploadedBy for document ${docId}`);
                            // We do this asynchronously without waiting, to not block UI rendering
                            docSnap.ref.update({ uploadedBy: currentUserNameToFix }).catch(e => console.error("Auto-fix failed:", e));
                            data.uploadedBy = currentUserNameToFix; // Update local display immediately
                        }
                    }

                    const fileName = data.fileName || 'Ismeretlen fájl';
                    const fileSize = data.sizeBytes ? formatBytes(data.sizeBytes) : 'Ismeretlen méret';
                    const uploadedDateRaw = data.uploadedAt ? data.uploadedAt.toDate() : new Date();
                    
                    // Format Date to DD/MM/YYYY
                    const dd = String(uploadedDateRaw.getDate()).padStart(2, '0');
                    const mm = String(uploadedDateRaw.getMonth() + 1).padStart(2, '0'); 
                    const yyyy = uploadedDateRaw.getFullYear();
                    const formattedDate = `${dd}/${mm}/${yyyy}`;

                    // Safe reading 'uploadedBy'
                    const uploadedBy = data.uploadedBy || 'Ismeretlen';

                    const downloadUrl = data.downloadUrl || '#';
                    const storagePath = data.storagePath;

                    // Ikon választás (PDF = piros, Kép = zöld/kék, Egyéb = szürke)
                    let iconHtml = '<i class="fas fa-file text-gray-400 text-xl"></i>';
                    if (data.contentType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
                         iconHtml = '<i class="fas fa-file-pdf text-red-500 text-xl"></i>';
                    } else if (data.contentType?.startsWith('image/') || fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
                         iconHtml = '<i class="fas fa-file-image text-blue-400 text-xl"></i>';
                    }
                    
                    htmlContent += `
                        <div class="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors">
                            <div class="flex items-center gap-3 overflow-hidden">
                                ${iconHtml}
                                <div class="overflow-hidden">
                                    <p class="text-white font-medium truncate" title="${fileName}">${fileName}</p>
                                    <p class="text-xs text-gray-400">${fileSize} • ${formattedDate} • Feltöltötte: ${uploadedBy}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 ml-2">
                                <a href="${downloadUrl}" target="_blank" class="btn btn-sm btn-info px-2 py-1 flex items-center justify-center" aria-label="Letöltés" title="Letöltés">
                                    <i class="fas fa-download"></i>
                                </a>
                                ${isReadOnlyMode ? '' : `
                                <button type="button" class="btn btn-sm btn-danger px-2 py-1 flex items-center justify-center delete-doc-btn" data-doc-id="${docId}" data-storage-path="${data.storagePath}" aria-label="Törlés" title="Törlés">
                                    <i class="fas fa-trash"></i>
                                </button>
                                `}
                            </div>
                        </div>
                    `;
                }

                docList.innerHTML = htmlContent;

                // Attach Delete Listeners
                const deleteBtns = docList.querySelectorAll('.delete-doc-btn');
                deleteBtns.forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const docId = e.currentTarget.dataset.docId;
                        const storagePath = e.currentTarget.dataset.storagePath;
                        
                        if (confirm('Biztosan törölni szeretné ezt a dokumentumot? A törlés nem visszavonható.')) {
                            try {
                                // 1. Törlés a Storage-ból
                                const fileRef = storage.ref().child(storagePath);
                                await fileRef.delete();
                                
                                // 2. Törlés a Firestore-ból
                                await partnerStorageRef.collection('devices').doc(deviceId).collection('attached_documents').doc(docId).delete();
                                
                                // alert('Dokumentum sikeresen törölve.'); // Cloud function decreases quota naturally
                            } catch (error) {
                                console.error("Hiba a dokumentum törlésekor:", error);
                                alert("Hiba történt a törlés során: " + error.message);
                                
                                // Check if it's a storage object not found error, still delete firestore doc if so
                                if (error.code === 'storage/object-not-found') {
                                    console.log("File missing in storage, cleaning up Firestore document anyway.");
                                    partnerStorageRef.collection('devices').doc(deviceId).collection('attached_documents').doc(docId).delete().catch(console.error);
                                }
                            }
                        }
                    });
                });
            }, error => {
                console.error("Error listening to documents:", error);
            });

        // Cleanup listener on page unload if needed, though browser handles it.
        // window.addEventListener('beforeunload', () => { docsUnsubscribe(); quotaUnsubscribe(); });
    }

});
