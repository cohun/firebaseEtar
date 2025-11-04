
import { auth, db } from './firebase.js';

document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
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

        const form = document.getElementById('dataEntryForm');
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
            // Fallback: if displayName is not set, try to get it from the users collection
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
