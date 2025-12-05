// Helper to manage role updates
import { updateUserPartnerRole, removeUserPartnerAssociation } from './admin.js';

export function attachPermissionManagementListeners(users) {
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
                await handleRoleUpdate(user, partnerId, newRole, saveButton, roleSelect, assoc);
            });
        });
    });
}

async function handleRoleUpdate(user, partnerId, newRole, saveButton, roleSelect, assoc) {
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
            await updateUserPartnerRole(user.id, partnerId, newRole);
            saveButton.textContent = 'Mentve';
            saveButton.classList.add('btn-success');
            
            roleSelect.dataset.originalRole = newRole;

            setTimeout(() => {
                saveButton.classList.add('hidden');
                saveButton.disabled = false;
                saveButton.textContent = 'Mentés';
                saveButton.classList.remove('btn-success');
            }, 2000);
        } catch (error) {
            console.error("Hiba a jogosultságok mentésekor:", error);
            alert(`Hiba történt a mentés során: ${error.message}`);
            saveButton.disabled = false;
            saveButton.textContent = 'Mentés';
        }
    }
}
