
import { auth, db } from './firebase.js';

document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
    const loadPreviousButton = document.getElementById('loadPreviousButton');
    const form = document.getElementById('dataEntryForm');
    const storageKey = 'previousDeviceData';

    // Pre-fill serial number if available in sessionStorage
    const newDeviceSerialNumber = sessionStorage.getItem('newDeviceSerialNumber');
    if (newDeviceSerialNumber) {
        const serialNumberField = form.querySelector('[name="eszkoz_gyariszam"]');
        if (serialNumberField) {
            serialNumberField.value = newDeviceSerialNumber;
        }
        sessionStorage.removeItem('newDeviceSerialNumber');
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

        const partnerId = sessionStorage.getItem('lastPartnerId');
        if (!partnerId) {
            alert('Nincs kiválasztott partner. Kérjük, válasszon partnert!');
            return;
        }

        const description = form.querySelector('[name="eszkoz_megnevezes"]').value;
        const serialNumber = form.querySelector('[name="eszkoz_gyariszam"]').value;
        const loadCapacity = form.querySelector('[name="eszkoz_teherbiras"]').value;

        if (!description || !serialNumber || !loadCapacity) {
            alert('A Megnevezés, Gyári szám és Teherbírás (WLL) mezők kitöltése kötelező!');
            return;
        }

        const yearOfManufacture = form.querySelector('[name="gyartas_eve"]').value;

        let createdByName = user.displayName;
        if (!createdByName) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                createdByName = userDoc.data().name || user.email;
            } else {
                createdByName = user.email;
            }
        }

        const newDevice = {
            description: description,
            operatorId: form.querySelector('[name="eszkoz_uzemeltetoi_azonosito"]').value,
            type: form.querySelector('[name="eszkoz_tipus"]').value,
            effectiveLength: form.querySelector('[name="eszkoz_hossz"]').value,
            loadCapacity: loadCapacity,
            manufacturer: form.querySelector('[name="eszkoz_gyarto"]').value,
            serialNumber: serialNumber,
            yearOfManufacture: yearOfManufacture ? parseInt(yearOfManufacture) : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: createdByName,
            partnerId: partnerId,
            status: 'active'
        };

        // Save data for "load previous" functionality (excluding specified fields)
        const dataToStore = { ...newDevice };
        delete dataToStore.serialNumber;
        delete dataToStore.operatorId;
        delete dataToStore.createdAt; // also remove server-generated fields
        localStorage.setItem(storageKey, JSON.stringify(dataToStore));

        console.log("Attempting to save new device:", newDevice);

        try {
            await db.collection('partners').doc(partnerId).collection('devices').add(newDevice);
            alert('Eszköz sikeresen mentve!');
            form.reset(); // Clear the form after successful save
        } catch (error) {
            console.error("Hiba az eszköz mentésekor:", error);
            alert('Hiba történt az eszköz mentésekor: ' + error.message);
        }
    });
});
