// Helper to manage role updates
import { updateUserPartnerRole, removeUserPartnerAssociation } from './admin.js';

export function attachPermissionManagementListeners(users, currentUserData) {
     users.forEach(user => {
        user.associations.forEach(assoc => {
            if (!assoc.partnerDetails) return;

            const partnerId = assoc.partnerId;
            const roleSelect = document.getElementById(`role-select-${user.id}-${partnerId}`);
            const saveButton = document.getElementById(`save-btn-${user.id}-${partnerId}`);
            
            if (!roleSelect || !saveButton) return;

            const originalRole = roleSelect.dataset.originalRole;

            roleSelect.addEventListener('change', () => {
                const selectedValue = roleSelect.value;

                if (selectedValue === originalRole) {
                    // Visszaállt az eredeti, gomb elrejtése
                    saveButton.classList.add('hidden');
                } else if (selectedValue === 'Törlés') {
                    // Törlés opció, gomb pirosra váltása
                    saveButton.textContent = 'Törlés';
                    saveButton.classList.remove('hidden', 'btn-primary', 'btn-success');
                    saveButton.classList.add('btn-danger');
                } else {
                    // Más szerepkör, mentés gomb megjelenítése
                    saveButton.textContent = 'Mentés';
                    saveButton.classList.remove('hidden', 'btn-danger', 'btn-success');
                    saveButton.classList.add('btn-primary');
                }
            });

            saveButton.addEventListener('click', async () => {
                const newRole = roleSelect.value;
                await handleRoleUpdate(user, partnerId, newRole, saveButton, roleSelect, assoc, currentUserData);
            });

            // Subscription Extension Listener
            const subCounter = document.getElementById(`sub-counter-${user.id}-${partnerId}`);
            if (subCounter && currentUserData.isEjkUser) {
                subCounter.addEventListener('click', async () => {
                    const daysStr = prompt("Hány nappal szeretné meghosszabbítani?", "30");
                    if (daysStr === null) return;
                    
                    const days = parseInt(daysStr);
                    if (isNaN(days) || days <= 0) {
                        alert("Érvénytelen szám.");
                        return;
                    }

                    const currentExpiry = parseInt(subCounter.dataset.expiry); // timestamp
                    const now = Date.now();
                    // If already expired, start from now? Or from original expiry?
                    // Usually from now if it's expired long ago.
                    // But if recent, maybe from expiry.
                    // Let's take the MAX of now and currentExpiry to be safe, so we don't extend into the past.
                    const effectiveStart = Math.max(now, currentExpiry);
                    
                    const newExpiry = effectiveStart + (days * 24 * 60 * 60 * 1000);
                    
                    try {
                        // We are keeping the role as 'subscriber' presumably
                        await updateUserPartnerRole(user.id, partnerId, 'subscriber', true, newExpiry);
                        alert("Előfizetés meghosszabbítva!");
                        window.location.reload();
                    } catch (e) {
                         console.error(e);
                         alert("Hiba a hosszabbítás során.");
                    }
                });
            }
        });
    });
}

async function handleRoleUpdate(user, partnerId, newRole, saveButton, roleSelect, assoc, currentUserData) {
    if (newRole === "Törlés") {
        const confirmation = confirm(`Biztosan törölni szeretné a(z) ${assoc.partnerDetails.name} partnerkapcsolatot ${user.name} felhasználótól? Ez a művelet nem visszavonható.`);
        if (confirmation) {
            saveButton.disabled = true;
            saveButton.textContent = 'Törlés...';
            try {
                await removeUserPartnerAssociation(user.id, partnerId);
                saveButton.textContent = 'Törölve';
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error("Hiba a partnerkapcsolat törlésekor:", error);
                alert(`Hiba történt a törlés során: ${error.message}`);
                saveButton.disabled = false;
                saveButton.textContent = 'Törlés';
            }
        }
    } else {
        saveButton.disabled = true;
        saveButton.textContent = 'Mentés...';
        try {
            const isEjkAction = currentUserData && currentUserData.isEjkUser;
            let expiryDate = null;
            let shouldReload = false;

            if (newRole === 'subscriber' && isEjkAction) {
                const daysStr = prompt("Hány napra fizetett elő?", "30");
                if (daysStr === null) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Mentés';
                    return; // Cancelled
                }
                const days = parseInt(daysStr);
                if (isNaN(days) || days <= 0) {
                    alert("Érvénytelen napok száma!");
                    saveButton.disabled = false;
                    saveButton.textContent = 'Mentés';
                    return;
                }
                // Calculate expiry: Now + days * 24h
                expiryDate = Date.now() + (days * 24 * 60 * 60 * 1000);
                shouldReload = true;
            }

            await updateUserPartnerRole(user.id, partnerId, newRole, isEjkAction, expiryDate);
            saveButton.textContent = 'Mentve';
            saveButton.classList.add('btn-success');
            
            roleSelect.dataset.originalRole = newRole;

            setTimeout(() => {
                if (shouldReload) {
                    window.location.reload();
                } else {
                    saveButton.classList.add('hidden');
                    saveButton.disabled = false;
                    saveButton.textContent = 'Mentés';
                    saveButton.classList.remove('btn-success');
                }
            }, 1000); // Shortened delay for better UX if reloading
        } catch (error) {
            console.error("Hiba a jogosultságok mentésekor:", error);
            alert(`Hiba történt a mentés során: ${error.message}`);
            saveButton.disabled = false;
            saveButton.textContent = 'Mentés';
        }
    }
}
