
console.log("--- DEBUG: adatbevitel.js LOADED ---");
import { auth, db } from './firebase.js';

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.getElementById('backButton');
    const saveButton = document.getElementById('saveButton');
    const loadPreviousButton = document.getElementById('loadPreviousButton');
    const form = document.getElementById('dataEntryForm');
    const storageKey = 'previousDeviceData';
    let currentUserData = null; // Store user data for save logic

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
        
        // UI elemek módosítása
        document.querySelector('h2').textContent = 'Eszköz adatainak módosítása';
        saveButton.textContent = 'Módosítások mentése';
        
        if(loadPreviousButton) {
            loadPreviousButton.style.display = 'none';
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

            console.log("Updating device in Firestore:", JSON.stringify(deviceData, null, 2));

            try {
                await db.collection('partners').doc(partnerIdForEdit).collection('devices').doc(editDeviceId).update(deviceData);
                alert('Eszköz sikeresen frissítve!');
                
                // Clean up session storage and redirect
                sessionStorage.removeItem('editDeviceId');
                sessionStorage.removeItem('partnerIdForEdit');
                window.location.href = 'app.html'; // Redirect to partner page

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
                alert('Eszköz sikeresen mentve!');
                form.reset();
                // window.location.href = 'app.html'; // Redirect to partner page for consistency
            } catch (error) {
                console.error("Hiba az eszköz mentésekor:", error);
                alert('Hiba történt az eszköz mentésekor: ' + error.message);
            }
        }
    });
});
