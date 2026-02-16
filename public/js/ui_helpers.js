// Helper to manage role updates
import { updateUserPartnerRole, removeUserPartnerAssociation, updateUserPartnerStatus } from './admin.js';

export function attachPermissionManagementListeners(users, currentUserData) {
     users.forEach(user => {
        user.associations.forEach(assoc => {
            if (!assoc.partnerDetails) return;

            const partnerId = assoc.partnerId;
            const roleSelect = document.getElementById(`role-select-${user.id}-${partnerId}`);
            const saveButton = document.getElementById(`save-btn-${user.id}-${partnerId}`);
            
            if (roleSelect && saveButton) {
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
            }

            // Subscription Extension/Set Listener (Inline Input)
            const subInput = document.getElementById(`sub-input-${user.id}-${partnerId}`);
            if (subInput && currentUserData.isEjkUser) {
                // We use 'change' event which fires when committing the value (enter or blur)
                subInput.addEventListener('change', async () => {
                    const days = parseInt(subInput.value);
                    if (isNaN(days) || days < 0) {
                        alert("Érvénytelen napok száma!");
                        return;
                    }

                    const roleToUpdate = subInput.dataset.role || 'subscriber';
                    const now = Date.now();
                    
                    // User request: "stands at 0 by default... overwrite it"
                    // Interpretation: The input sets the REMAINING days from NOW.
                    // So newExpiry = Now + (Input * 24h)
                    const newExpiry = now + (days * 24 * 60 * 60 * 1000);
                    
                    try {
                        // Show visual feedback or disable input temporarily?
                        subInput.disabled = true;
                        subInput.classList.add('opacity-50');

                        await updateUserPartnerRole(user.id, partnerId, roleToUpdate, true, newExpiry);
                        
                        // Visual success feedback
                        subInput.classList.remove('border-gray-600');
                        subInput.classList.add('border-green-500', 'text-green-400');
                        
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    } catch (e) {
                         console.error(e);
                         alert("Hiba a mentés során.");
                         subInput.disabled = false;
                         subInput.classList.remove('opacity-50');
                    }
                });
            }
            // Subscriber Inspector Approval Listeners
            // DYNAMIC UI UPDATE to prevent reload
            
            const renderApprovedState = () => {
                const container = document.getElementById(`approval-container-${user.id}-${partnerId}`);
                if (container) {
                    container.innerHTML = `
                        <span class="px-2 py-1 bg-green-900 text-green-300 text-xs rounded border border-green-700">Érvényes szakértő</span>
                        <button id="revoke-btn-${user.id}-${partnerId}" class="btn btn-sm btn-outline-danger w-full mt-2 text-xs">Jóváhagyás Visszavonása</button>
                    `;
                    attachRevokeListener(); // Re-bind
                }
            };
            
            const renderPendingState = () => {
                 const container = document.getElementById(`approval-container-${user.id}-${partnerId}`);
                 if (container) {
                     container.innerHTML = `
                        <span class="px-2 py-1 bg-yellow-900 text-yellow-300 text-xs rounded border border-yellow-700">Engedélyre váró szakértő</span>
                        <button id="approve-btn-${user.id}-${partnerId}" class="btn btn-sm btn-outline-success w-full mt-2 text-xs">Szakértő Engedélyezése</button>
                     `;
                     attachApproveListener(); // Re-bind
                 }
            };

            const attachApproveListener = () => {
                const btn = document.getElementById(`approve-btn-${user.id}-${partnerId}`);
                if (btn) {
                    // Clone to remove old listeners (if any exist from re-renders) - though re-rendering destroys element so not needed usually.
                    // But safe to just add listener.
                    btn.onclick = async () => {
                         if (confirm(`Biztosan engedélyezi ${user.name} szakértői hozzáférését?`)) {
                            try {
                                btn.disabled = true;
                                btn.textContent = 'Engedélyezés...';
                                await updateUserPartnerStatus(user.id, partnerId, 'subscriber_approved');
                                // Success! Update UI
                                renderApprovedState();
                            } catch (e) {
                                 console.error(e);
                                 alert("Hiba az engedélyezés során.");
                                 btn.disabled = false;
                                 btn.textContent = 'Szakértő Engedélyezése';
                            }
                        }
                    };
                }
            };

            const attachRevokeListener = () => {
                const btn = document.getElementById(`revoke-btn-${user.id}-${partnerId}`);
                if (btn) {
                    btn.onclick = async () => {
                        if (confirm(`Biztosan visszavonja ${user.name} szakértői engedélyét?`)) {
                            try {
                                btn.disabled = true;
                                btn.textContent = 'Visszavonás...';
                                await updateUserPartnerStatus(user.id, partnerId, 'pending');
                                // Success! Update UI
                                renderPendingState();
                            } catch (e) {
                                console.error(e);
                                alert("Hiba a visszavonás során.");
                                btn.disabled = false;
                                btn.textContent = 'Jóváhagyás Visszavonása';
                            }
                        }
                    };
                }
            };

            // Initial Attach
            attachApproveListener();
            attachRevokeListener();

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
            // Force reload for inspector role to show the "Partners" button immediately
            let shouldReload = newRole === 'inspector';

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

function createExtensionModal(onConfirm) {
    // Remove existing if any
    const existing = document.getElementById('extension-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'extension-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300 opacity-0';
    
    modal.innerHTML = `
        <div class="bg-gray-800 border-2 border-green-500 rounded-lg p-6 max-w-sm w-full shadow-2xl transform scale-95 transition-transform duration-300">
            <h3 class="text-xl font-bold text-white mb-4 text-center">Előfizetés Hosszabbítása</h3>
            
            <div class="mb-6">
                <label for="extensionDaysInput" class="block text-sm font-medium text-gray-400 mb-2">Hosszabbítás időtartama</label>
                <div class="relative">
                    <input type="number" id="extensionDaysInput" class="input-field w-full text-center text-lg font-bold bg-gray-700 border-green-500 text-white rounded-md py-2" value="30" min="1">
                    <span class="absolute right-12 top-2 text-gray-500 font-bold">nap</span>
                </div>
                <p class="text-xs text-gray-400 mt-2 text-center">A jelenlegi lejárati dátumhoz (vagy a mai naphoz) adódik hozzá.</p>
            </div>

            <div class="flex space-x-3">
                <button id="cancelExtensionBtn" class="flex-1 btn btn-secondary py-2">Mégse</button>
                <button id="confirmExtensionBtn" class="flex-1 btn btn-primary bg-green-600 hover:bg-green-700 py-2">Hosszabbítás</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fade in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        const content = modal.querySelector('div');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    });

    const input = document.getElementById('extensionDaysInput');
    input.focus();
    input.select();

    // internal close function
    const close = () => {
        modal.classList.add('opacity-0');
        const content = modal.querySelector('div');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => {
             if(modal.parentNode) modal.parentNode.removeChild(modal);
        }, 300);
    };

    document.getElementById('cancelExtensionBtn').addEventListener('click', close);
    
    document.getElementById('confirmExtensionBtn').addEventListener('click', () => {
        const val = parseInt(input.value);
        if (isNaN(val) || val <= 0) {
            alert("Kérjük, adjon meg érvényes napszámot!");
            input.focus();
            return;
        }
        // Show loading state
        const btn = document.getElementById('confirmExtensionBtn');
        btn.textContent = 'Mentés...';
        btn.disabled = true;
        
        // Pass value to callback
        onConfirm(val); 
        
        // Note: The callback handles success/reload. If it fails, we might want to reset button?
        // But for now, we assume success or page reload.
    });

    // Enter key support
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('confirmExtensionBtn').click();
        if (e.key === 'Escape') close();
    });
}
