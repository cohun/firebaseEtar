import { auth, db } from './firebase.js';
import { registerUser, registerNewCompany, joinCompanyWithCode } from './auth.js';
import { getUsersForPermissionManagement, updateUserPartnerRole, removeUserPartnerAssociation, getPartnersForSelection } from './admin.js';
import { getPartnerWorkScreenHtml } from './partner.js';

const screens = {
    loading: document.getElementById('loadingScreen'),
    login: document.getElementById('loginScreen'),
    main: document.getElementById('mainScreen'),
    permissionManagement: document.getElementById('permissionManagementScreen'),
    partnerSelection: document.getElementById('partnerSelectionScreen'),
    partnerWork: document.getElementById('partnerWorkScreen'),
};

export function showScreen(screenId) {
    // Hide all screens
    for (const key in screens) {
        if (screens[key]) {
            screens[key].classList.remove('active');
        }
    }
    // Show the target screen
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
    }

    // Add a class to the body when the partner work screen is active
    if (screenId === 'partnerWork') {
        document.body.classList.add('partner-work-active');
    } else {
        document.body.classList.remove('partner-work-active');
    }
}

export function showLoginScreen() {
    const loginHtml = `
        <div class="card max-w-md mx-auto">
            <img src="images/logo.jpg" alt="ETAR Logó" class="mx-auto mb-8 w-64 h-auto rounded-lg shadow-md">
            <h1 class="text-3xl sm:text-4xl font-bold mb-2">ETAR Rendszer</h1>
            <p class="mb-6 text-blue-300">Kérjük, jelentkezzen be a használathoz.</p>
            <form id="loginForm">
                <div class="space-y-4">
                    <input type="email" id="emailInput" placeholder="E-mail cím" class="input-field" required>
                    <input type="password" id="passwordInput" placeholder="Jelszó" class="input-field" required>
                </div>
                <p id="loginError" class="text-red-400 text-sm mt-4 h-5"></p>
                <button type="submit" class="btn btn-primary text-lg w-full mt-6">Bejelentkezés</button>
            </form>
            <div class="mt-6 text-center">
                <p class="text-gray-400">Nincs még fiókja? <button id="showRegistrationBtn" class="text-blue-400 hover:underline">Regisztráljon itt!</button></p>
            </div>
        </div>
    `;
    screens.login.innerHTML = loginHtml;
    showScreen('login');

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const errorP = document.getElementById('loginError');
        
        try {
            errorP.textContent = '';
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error("Bejelentkezési hiba:", error.code);
            errorP.textContent = "Hibás e-mail cím vagy jelszó.";
        }
    });

    document.getElementById('showRegistrationBtn').addEventListener('click', () => {
        showRegistrationScreen();
    });
}

export function showRegistrationScreen() {
    const registrationHtml = `
        <div class="card max-w-md mx-auto">
            <h1 class="text-3xl sm:text-4xl font-bold mb-6">Regisztráció</h1>
            <form id="registrationForm">
                <div class="space-y-4">
                    <input type="text" id="nameInput" placeholder="Teljes név" class="input-field" required>
                    <input type="email" id="regEmailInput" placeholder="E-mail cím" class="input-field" required>
                    <input type="password" id="regPasswordInput" placeholder="Jelszó" class="input-field" required>
                </div>
                <p id="registrationError" class="text-red-400 text-sm mt-4 h-5"></p>
                <button type="submit" class="btn btn-primary text-lg w-full mt-6">Regisztráció</button>
            </form>
            <div class="mt-6 text-center">
                <p class="text-gray-400">Már van fiókja? <button id="showLoginBtn" class="text-blue-400 hover:underline">Jelentkezzen be!</button></p>
            </div>
        </div>
    `;
    screens.login.innerHTML = registrationHtml; // Still using the login screen container

    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('nameInput').value;
        const email = document.getElementById('regEmailInput').value;
        const password = document.getElementById('regPasswordInput').value;
        const errorP = document.getElementById('registrationError');

        try {
            errorP.textContent = '';
            await registerUser(email, password, name);
            // onAuthStateChanged will handle the screen change
        } catch (error) {
            console.error("Regisztrációs hiba:", error.code);
            errorP.textContent = "Hiba a regisztráció során. Próbálja újra!";
        }
    });

    document.getElementById('showLoginBtn').addEventListener('click', () => {
        showLoginScreen();
    });
}

export function showCompanyRegistrationOptions() {
    const companyRegHtml = `
        <div class="card max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-4">Sikeres regisztráció!</h2>
            <p class="mb-6 text-blue-300">Válassza ki a következő lépést:</p>
            <div class="space-y-4">
                <button id="registerNewCompanyBtn" class="btn btn-primary w-full">Új céget regisztrálok, én leszek a jogosultság osztó</button>
                <button id="joinCompanyBtn" class="btn btn-secondary w-full">Már regisztrált cégbe lépek ETAR kóddal</button>
            </div>
        </div>
    `;
    screens.login.innerHTML = companyRegHtml; // Display in the same area
    showScreen('login');

    document.getElementById('registerNewCompanyBtn').addEventListener('click', () => {
        showNewCompanyForm();
    });
    document.getElementById('joinCompanyBtn').addEventListener('click', () => {
        showJoinCompanyForm();
    });
}

export function showNewCompanyForm() {
    const newCompanyHtml = `
        <div class="card max-w-md mx-auto">
            <h1 class="text-3xl sm:text-4xl font-bold mb-6">Új cég regisztrálása</h1>
            <form id="newCompanyForm">
                <div class="space-y-4">
                    <input type="text" id="companyNameInput" placeholder="Cégnév" class="input-field" required>
                    <input type="text" id="companyAddressInput" placeholder="Cím" class="input-field" required>
                </div>
                <p id="newCompanyError" class="text-red-400 text-sm mt-4 h-5"></p>
                <button type="submit" class="btn btn-primary text-lg w-full mt-6">Cég regisztrálása</button>
            </form>
        </div>
    `;
    screens.login.innerHTML = newCompanyHtml;

    document.getElementById('newCompanyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const companyName = document.getElementById('companyNameInput').value;
        const companyAddress = document.getElementById('companyAddressInput').value;
        const errorP = document.getElementById('newCompanyError');

        try {
            errorP.textContent = '';
            await registerNewCompany(companyName, companyAddress);
            showPendingApprovalScreen();
        } catch (error) {
            console.error("Cég regisztrációs hiba:", error);
            errorP.textContent = "Hiba a cég regisztrációja során.";
        }
    });
}

export function showJoinCompanyForm() {
    const joinHtml = `
        <div class="card max-w-md mx-auto">
            <h1 class="text-3xl sm:text-4xl font-bold mb-6">Csatlakozás céghez</h1>
            <form id="joinCompanyForm">
                <div class="space-y-4">
                    <input type="text" id="etarCodeInput" placeholder="ETAR Kód" class="input-field" required>
                </div>
                <p id="joinCompanyError" class="text-red-400 text-sm mt-4 h-5"></p>
                <button type="submit" class="btn btn-primary text-lg w-full mt-6">Csatlakozási kérelem küldése</button>
            </form>
        </div>
    `;
    screens.login.innerHTML = joinHtml;

    document.getElementById('joinCompanyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const etarCode = document.getElementById('etarCodeInput').value;
        const errorP = document.getElementById('joinCompanyError');

        try {
            errorP.textContent = '';
            const success = await joinCompanyWithCode(etarCode);
            if (success) {
                showPendingApprovalScreen();
            } else {
                errorP.textContent = "Érvénytelen vagy nem létező ETAR kód.";
            }
        } catch (error) {
            console.error("Csatlakozási hiba:", error);
            errorP.textContent = "Hiba történt a csatlakozás során.";
        }
    });
}

export function showPendingApprovalScreen() {
    const pendingHtml = `
        <div class="card max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-4">Kérelem rögzítve</h2>
            <p class="text-blue-300 mb-6">Kérelmét rögzítettük. Amint egy adminisztrátor jóváhagyja, hozzáférést kap a rendszerhez.</p>
            <p class="mb-6">Köszönjük türelmét!</p>
            <button id="backToLoginBtn" class="btn btn-secondary w-full">Vissza a bejelentkezéshez</button>
        </div>
    `;
    screens.login.innerHTML = pendingHtml;

    document.getElementById('backToLoginBtn').addEventListener('click', () => {
        auth.signOut().catch(error => {
            console.error("Kijelentkezési hiba:", error);
        });
    });
}

export async function showMainScreen(user, userData) {
    const partnerInfo = userData && userData.associatedPartner && userData.associatedPartner.length > 0
        ? userData.associatedPartner[0]
        : null;

    let partnerDetails = null;
    if (partnerInfo && partnerInfo.etarCode) {
        const snapshot = await db.collection('partners').where('etarCode', '==', partnerInfo.etarCode).limit(1).get();
        if (!snapshot.empty) {
            partnerDetails = snapshot.docs[0].data();
        }
    }

    const role = partnerInfo ? partnerInfo.role : null;
    const type = partnerInfo ? partnerInfo.type : null;

    let menuHtml = '';
    if (role && role !== 'pending') {
        const isEjkAdmin = type === 'EJK' && role === 'admin';
        const isEnyAdmin = type === 'ENY' && role === 'admin';
        const canManagePermissions = isEjkAdmin || isEnyAdmin;

        const isEjkUser = type === 'EJK';
        const isEnyUserWithMultiplePartners = type === 'ENY' && userData.associatedPartner && userData.associatedPartner.length > 1;
        const canSelectPartner = isEjkUser || isEnyUserWithMultiplePartners;

        let buttonsHtml = '';
        if (canManagePermissions) {
            buttonsHtml += `<button id="managePermissionsBtn" class="btn btn-secondary w-full">Jogosultságok kezelése</button>`;
        }
        if (canSelectPartner) {
            buttonsHtml += `<button id="selectPartnerBtn" class="btn btn-secondary w-full">Partner adatbázis kiválasztása</button>`;
        }

        // Add new buttons for ENY users
        if (type === 'ENY') {
            buttonsHtml += `<button id="registerAnotherCompanyBtn" class="btn btn-secondary w-full">Még egy céget regisztrálok</button>`;
            buttonsHtml += `<button id="joinAnotherCompanyBtn" class="btn btn-secondary w-full">Csatlakozás másik céghez ETAR kóddal</button>`;
        }

        if (buttonsHtml) {
            menuHtml = `
                <div class="space-y-4 mt-8">
                    ${buttonsHtml}
                    <button id="signOutButton" class="btn btn-primary w-full mt-4">Kijelentkezés</button>
                </div>
            `;
        } else {
            menuHtml = `
                <div class="mt-8">
                    <button id="signOutButton" class="btn btn-primary w-full">Kijelentkezés</button>
                </div>
            `;
        }
    } else {
        // Ha a szerepkör 'pending' vagy nincs, csak a kijelentkezés gomb látszik
        menuHtml = `
            <div class="mt-8">
                <button id="signOutButton" class="btn btn-primary w-full">Kijelentkezés</button>
            </div>
        `;
    }

    const companyInfoHtml = partnerDetails
        ? `
            <div class="text-left my-4 p-3 border border-blue-800 rounded-lg bg-blue-900/30">
                <p class="text-gray-300 font-semibold">Cégnév: <strong class="font-normal text-blue-300">${partnerDetails.name}</strong></p>
                <p class="text-gray-300 font-semibold">Cím: <strong class="font-normal text-blue-300">${partnerDetails.address}</strong></p>
            </div>
        `
        : '';

    const mainHtml = `
        <div class="card max-w-md mx-auto text-center">
            <img src="images/logo.jpg" alt="ETAR Logó" class="mx-auto mb-8 w-64 h-auto rounded-lg shadow-md">
            <h1 class="text-3xl sm:text-4xl font-bold mb-2">ETAR Rendszer</h1>
            <p class="mb-2 text-blue-300">Bejelentkezve mint: ${userData.name || user.displayName || user.email}</p>
            ${companyInfoHtml}
            
            <div class="text-left my-6 p-4 border border-blue-800 rounded-lg">
                <p class="text-gray-300">Típus: <strong class="font-semibold text-blue-300">${type || 'N/A'}</strong> | Szerepkör: <strong class="font-semibold text-blue-300">${role || 'Nincs meghatározva'}</strong></p>
                <!-- Ide jöhet a jövőben a főképernyő tartalma -->
            </div>

            ${menuHtml}
        </div>
    `;
    screens.main.innerHTML = mainHtml;
    showScreen('main');

    // Kijelentkezés gomb eseménykezelője
    document.getElementById('signOutButton').addEventListener('click', () => {
        auth.signOut().catch(error => {
            console.error("Kijelentkezési hiba:", error);
        });
    });

    // A menügombok eseménykezelői, ha léteznek
    if (role && role !== 'pending') {
        const managePermissionsBtn = document.getElementById('managePermissionsBtn');
        if (managePermissionsBtn) {
            managePermissionsBtn.addEventListener('click', async () => {
                showPermissionManagementLoadingScreen();
                try {
                    const users = await getUsersForPermissionManagement(user, userData);
                    showPermissionManagementScreen(users, userData);
                } catch (error) {
                    console.error("Hiba a jogosultságkezelő adatok lekérése során:", error);
                    alert("Hiba történt a felhasználói adatok lekérése közben.");
                    window.location.reload(); // Go back
                }
            });
        }

        const selectPartnerBtn = document.getElementById('selectPartnerBtn');
        if (selectPartnerBtn) {
            selectPartnerBtn.addEventListener('click', async () => {
                showPartnerSelectionLoadingScreen();
                try {
                    const partners = await getPartnersForSelection(userData);
                    showPartnerSelectionScreen(partners, userData);
                } catch (error) {
                    console.error("Hiba a partnerek lekérése során:", error);
                    alert("Hiba történt a partner adatok lekérése közben.");
                    window.location.reload(); // Go back
                }
            });
        }

        // Event listeners for new ENY buttons
        if (type === 'ENY') {
            const registerAnotherCompanyBtn = document.getElementById('registerAnotherCompanyBtn');
            if (registerAnotherCompanyBtn) {
                registerAnotherCompanyBtn.addEventListener('click', () => {
                    showNewCompanyForm();
                    showScreen('login');
                });
            }

            const joinAnotherCompanyBtn = document.getElementById('joinAnotherCompanyBtn');
            if (joinAnotherCompanyBtn) {
                joinAnotherCompanyBtn.addEventListener('click', () => {
                    showJoinCompanyForm();
                    showScreen('login');
                });
            }
        }
    }
}

export function showPermissionManagementLoadingScreen() {
    const loadingHtml = `
        <div class="card max-w-4xl mx-auto text-center">
            <h1 class="text-3xl font-bold mb-6">Jogosultságok Kezelése</h1>
            <div class="loader mx-auto"></div>
            <p class="mt-4 text-blue-300">Felhasználók és partnerek betöltése...</p>
            <button id="backToMainScreenBtn" class="btn btn-secondary mt-6">Vissza</button>
        </div>
    `;
    screens.permissionManagement.innerHTML = loadingHtml;
    showScreen('permissionManagement');

    document.getElementById('backToMainScreenBtn').addEventListener('click', () => {
        window.location.reload();
    });
}

export function showPermissionManagementScreen(users, currentUserData) {
    const currentUserType = currentUserData && currentUserData.associatedPartner && currentUserData.associatedPartner.length > 0
        ? currentUserData.associatedPartner[0].type
        : null;

    const typeOptions = ['EJK', 'ENY'];
    const roleOptions = ['pending', 'admin', 'write', 'read', 'Törlés'];

    const userListHtml = users.map(user => {
        const associationsHtml = user.associations.map(assoc => {
            if (!assoc.partnerDetails) return '';

            let typeDropdown = '';
            if (currentUserType === 'EJK') {
                typeDropdown = `
                    <div>
                        <label for="type-select-${user.id}-${assoc.etarCode}" class="block text-sm font-medium text-gray-400">Típus</label>
                        <select id="type-select-${user.id}-${assoc.etarCode}" class="input-field mt-1 block w-full bg-gray-700 border-gray-600">
                                                        ${typeOptions.map(opt => `<option value="${opt}" ${assoc.type === opt ? 'selected' : ''}>${opt}</option>`).join('')}                        </select>
                    </div>
                `;
            }

            const roleDropdown = `
                <div>
                    <label for="role-select-${user.id}-${assoc.etarCode}" class="block text-sm font-medium text-gray-400">Szerepkör</label>
                    <select id="role-select-${user.id}-${assoc.etarCode}" class="input-field mt-1 block w-full bg-gray-700 border-gray-600">
                        ${roleOptions.map(opt => `<option value="${opt}" ${assoc.role === opt ? 'selected' : ''} ${opt === 'Törlés' ? 'class="text-red-500"' : ''}>${opt}</option>`).join('')}                    </select>
                </div>
            `;
            
            const partnerDetailsHtml = `
                <div class="flex-1">
                    <p><strong>Cégnév:</strong> ${assoc.partnerDetails.name || 'N/A'}</p>
                    <p><strong>Cím:</strong> ${assoc.partnerDetails.address || 'N/A'}</p>
                    <p class="text-sm text-gray-400"><strong>ETAR Kód:</strong> ${assoc.etarCode || 'N/A'}</p>
                    <p class="text-sm text-gray-400"><strong>Létrehozva:</strong> ${assoc.partnerDetails.createdAt ? new Date(assoc.partnerDetails.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                    <p class="text-sm text-gray-400"><strong>Módosítva:</strong> ${assoc.partnerDetails.updatedAt ? new Date(assoc.partnerDetails.updatedAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                </div>
            `;

            const isInitiallyDeleteType = assoc.role === 'Törlés';

            const saveButtonHtml = `<button id="save-btn-${user.id}-${assoc.etarCode}" class="btn btn-primary rounded-full w-16 h-16 flex items-center justify-center ${isInitiallyDeleteType ? 'hidden' : ''}">Mentés</button>`;
            const deleteButtonHtml = `<button id="delete-btn-${user.id}-${assoc.etarCode}" class="btn bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16 flex items-center justify-center ${!isInitiallyDeleteType ? 'hidden' : ''}">Törlés</button>`;

            return `
            <div class="p-3 bg-blue-900/50 rounded-md mt-2 flex flex-col md:flex-row gap-4 items-center">
                ${partnerDetailsHtml}
                <div class="text-center">
                    ${saveButtonHtml}
                    ${deleteButtonHtml}
                </div>
                <div class="flex flex-col gap-4">
                    ${typeDropdown}
                    ${roleDropdown}
                </div>
            </div>
            `;
        }).join('');

        return `
            <div class="p-4 border border-blue-800 rounded-lg mb-4">
                <h3 class="text-xl font-bold text-red-700">${user.name}</h3>
                <p class="text-blue-300">${user.email}</p>
                <div class="mt-4 space-y-2">
                    <h4 class="font-semibold">Kapcsolt Partnerek:</h4>
                    ${associationsHtml.length > 0 ? associationsHtml : '<p class="text-gray-400">Nincsenek kapcsolt partnerek.</p>'}
                </div>
            </div>
        `;
    }).join('');

    const screenHtml = `
        <div class="card max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">Jogosultságok Kezelése</h1>
                <button id="backToMainScreenBtn" class="btn btn-secondary">Vissza</button>
            </div>
            <div class="max-h-[60vh] overflow-y-auto pr-2">
                ${userListHtml.length > 0 ? userListHtml : '<p class="text-center text-gray-400">Nincsenek a feltételeknek megfelelő felhasználók.</p>'}
            </div>
        </div>
    `;
    screens.permissionManagement.innerHTML = screenHtml;
    showScreen('permissionManagement');

    // Logic to show/hide save/delete buttons and handle their actions
    users.forEach(user => {
        user.associations.forEach(assoc => {
            if (!assoc.partnerDetails) return;

            const typeSelect = document.getElementById(`type-select-${user.id}-${assoc.etarCode}`);
            const roleSelect = document.getElementById(`role-select-${user.id}-${assoc.etarCode}`);
            const saveButton = document.getElementById(`save-btn-${user.id}-${assoc.etarCode}`);
            const deleteButton = document.getElementById(`delete-btn-${user.id}-${assoc.etarCode}`);

            const updateButtonVisibility = () => {
                const currentSelectedType = typeSelect ? typeSelect.value : assoc.type;
                const currentSelectedRole = roleSelect ? roleSelect.value : assoc.role;

                const hasTypeChanged = typeSelect ? (typeSelect.value !== assoc.type) : false;
                const hasRoleChanged = roleSelect ? (roleSelect.value !== assoc.role) : false;

                const hasAnyChange = hasTypeChanged || hasRoleChanged;

                if (currentSelectedRole === 'Törlés') {
                    if (deleteButton) {
                        deleteButton.classList.remove('hidden');
                    }
                    if (saveButton) {
                        saveButton.classList.add('hidden');
                    }
                } else {
                    if (deleteButton) {
                        deleteButton.classList.add('hidden');
                    }
                    if (saveButton) {
                        if (hasAnyChange) {
                            saveButton.classList.remove('hidden');
                        } else {
                            saveButton.classList.add('hidden');
                        }
                    }
                }
            };

            // Call it once to set the initial state based on current values
            updateButtonVisibility();

            if (typeSelect) {
                typeSelect.addEventListener('change', updateButtonVisibility);
            }
            if (roleSelect) {
                roleSelect.addEventListener('change', updateButtonVisibility);
            }

            if (saveButton) {
                saveButton.addEventListener('click', async () => {
                    const newType = typeSelect ? typeSelect.value : assoc.type;
                    const newRole = roleSelect.value;

                    // Show loading state
                    saveButton.disabled = true;
                    saveButton.textContent = '...';

                    try {
                        await updateUserPartnerRole(user.id, assoc.etarCode, newType, newRole);
                        
                        // Visual feedback for success
                        saveButton.textContent = 'Mentve';
                        saveButton.classList.remove('btn-primary');
                        saveButton.classList.add('btn-success');

                        setTimeout(() => {
                            saveButton.classList.add('hidden');
                            saveButton.disabled = false;
                            saveButton.textContent = 'Mentés';
                            saveButton.classList.remove('btn-success');
                            saveButton.classList.add('btn-primary');
                        }, 2000);

                    } catch (error) {
                        console.error("Hiba a jogosultságok mentésekor:", error);
                        alert(`Hiba történt a mentés során: ${error.message}`);
                        
                        // Re-enable button on failure
                        saveButton.disabled = false;
                        saveButton.textContent = 'Mentés';
                    }
                });
            }

            if (deleteButton) {
                deleteButton.addEventListener('click', async () => {
                    const confirmation = confirm(`Biztosan törölni szeretné a(z) ${assoc.partnerDetails.name} partnerkapcsolatot ${user.name} felhasználótól? Ez a művelet nem visszavonható.`);
                    
                    if (confirmation) {
                        // Show loading state
                        deleteButton.disabled = true;
                        deleteButton.textContent = '...';

                        try {
                            await removeUserPartnerAssociation(user.id, assoc.etarCode);
                            
                            // Visual feedback for success
                            deleteButton.textContent = 'Törölve';
                            deleteButton.classList.remove('bg-red-600', 'hover:bg-red-700');
                            deleteButton.classList.add('btn-success');

                            setTimeout(() => {
                                window.location.reload(); // Reload to reflect changes
                            }, 1500);

                        } catch (error) {
                            console.error("Hiba a partnerkapcsolat törlésekor:", error);
                            alert(`Hiba történt a törlés során: ${error.message}`);
                            
                            // Re-enable button on failure
                            deleteButton.disabled = false;
                            deleteButton.textContent = 'Törlés';
                            deleteButton.classList.remove('btn-success');
                            deleteButton.classList.add('bg-red-600', 'hover:bg-red-700');
                        }
                    }
                });
            }
        });
    });

    document.getElementById('backToMainScreenBtn').addEventListener('click', () => {
        window.location.reload();
    });
}

export function showPartnerSelectionLoadingScreen() {
    const loadingHtml = `
        <div class="card max-w-4xl mx-auto text-center">
            <h1 class="text-3xl font-bold mb-6">Partnerek Betöltése</h1>
            <div class="loader mx-auto"></div>
            <p class="mt-4 text-blue-300">Partner adatok lekérése...</p>
            <button id="backToMainScreenFromPartnerSelectBtn" class="btn btn-secondary mt-6">Vissza</button>
        </div>
    `;
    screens.partnerSelection.innerHTML = loadingHtml;
    showScreen('partnerSelection');

    document.getElementById('backToMainScreenFromPartnerSelectBtn').addEventListener('click', () => {
        window.location.reload(); // Simple way to go back to main screen
    });
}



export function showPartnerSelectionScreen(partners, userData) {
    const userType = userData && userData.associatedPartner && userData.associatedPartner.length > 0 ? userData.associatedPartner[0].type : null;
    const userRole = userData && userData.associatedPartner && userData.associatedPartner.length > 0 ? userData.associatedPartner[0].role : null;

    const canSeeEtarCode = userType === 'EJK' || (userType === 'ENY' && userRole === 'admin');

    const partnerListHtml = partners.map(partner => {
        const etarCodeHtml = canSeeEtarCode
            ? `<p class="text-gray-400 mt-2">ETAR Kód: ${partner.etarCode}</p>`
            : '';

        return `
        <div class="p-4 border border-blue-800 rounded-lg mb-4 cursor-pointer hover:bg-blue-900/50 transition-colors" data-partner-id="${partner.id}">
            <h3 class="text-xl font-bold text-red-700">${partner.name}</h3>
            <p class="text-blue-300">${partner.address}</p>
            ${etarCodeHtml}
        </div>
    `}).join('');

    const screenHtml = `
        <div class="card max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">Partnerek</h1>
                <button id="backToMainScreenFromPartnerSelectBtn" class="btn btn-secondary">Vissza</button>
            </div>
            <div id="partner-list" class="max-h-[60vh] overflow-y-auto pr-2">
                ${partnerListHtml.length > 0 ? partnerListHtml : '<p class="text-center text-gray-400">Nincsenek megjeleníthető partnerek.</p>'}
            </div>
        </div>
    `;
    screens.partnerSelection.innerHTML = screenHtml;
    showScreen('partnerSelection');

    document.getElementById('backToMainScreenFromPartnerSelectBtn').addEventListener('click', () => {
        window.location.reload();
    });

    document.getElementById('partner-list').addEventListener('click', (e) => {
        const card = e.target.closest('[data-partner-id]');
        if (card) {
            const partnerId = card.dataset.partnerId;
            const partner = partners.find(p => p.id === partnerId);
            if (partner) {
                showPartnerWorkScreen(partner, userData);
            }
        }
    });
}

function showPartnerWorkScreen(partner, userData) {
    const partnerWorkScreen = document.getElementById('partnerWorkScreen');
    partnerWorkScreen.innerHTML = getPartnerWorkScreenHtml(partner, userData);
    showScreen('partnerWork');

    document.getElementById('backToMainFromWorkScreenBtn').addEventListener('click', () => {
        window.location.reload(); // Reload to go back to the main screen
    });
}


