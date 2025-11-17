
console.log("--- DEBUG: adatbevitel.js LOADED ---");
import { auth, db } from './firebase.js';

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.getElementById('backButton');
    const saveButton = document.getElementById('saveButton');
    const loadPreviousButton = document.getElementById('loadPreviousButton');
    const form = document.getElementById('dataEntryForm');
    const storageKey = 'previousDeviceData';

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
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
    }


    // Function to populate form from an object
    const populateForm = (data) => {
        form.querySelector('[name="eszkoz_megnevezes"]').value = data.description || '';
        form.querySelector('[name="eszkoz_tipus"]').value = data.type || '';
        form.querySelector('[name="eszkoz_gyarto"]').value = data.manufacturer || '';
        form.querySelector('[name="eszkoz_hossz"]').value = data.effectiveLength || '';
        form.querySelector('[name="gyartas_eve"]').value = data.yearOfManufacture || '';
        form.querySelector('[name="eszkoz_teherbiras"]').value = data.loadCapacity || '';
        // Gyári szám és üzemeltetői azonosító szándékosan kihagyva
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
        if (!createdByName) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            createdByName = userDoc.exists ? userDoc.data().name || user.email : user.email;
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
