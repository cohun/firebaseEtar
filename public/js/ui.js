import { auth, db } from './firebase.js';
import { registerUser, registerNewCompany, joinCompanyWithCode, sendPasswordReset } from './auth.js';
import { getUsersForPermissionManagement, updateUserPartnerRole, removeUserPartnerAssociation, getPartnersForSelection } from './admin.js';
import { getPartnerWorkScreenHtml, initPartnerWorkScreen } from './partner.js';
import { showStatisticsScreen } from './statistics.js';

export const screens = {
    loading: document.getElementById('loadingScreen'),
    login: document.getElementById('loginScreen'),
    main: document.getElementById('mainScreen'),
    permissionManagement: document.getElementById('permissionManagementScreen'),
    partnerSelection: document.getElementById('partnerSelectionScreen'),
    partnerSelection: document.getElementById('partnerSelectionScreen'),
    partnerWork: document.getElementById('partnerWorkScreen'),
    statistics: document.getElementById('statisticsScreen'),
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
                <p class="mt-2"><button id="showForgotPasswordBtn" class="text-sm text-gray-500 hover:text-blue-300 transition-colors">Elfelejtette a jelszavát?</button></p>
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

    document.getElementById('showForgotPasswordBtn').addEventListener('click', () => {
        showForgotPasswordScreen();
    });
}

export function showForgotPasswordScreen() {
    const forgotPasswordHtml = `
        <div class="card max-w-md mx-auto">
            <h1 class="text-3xl sm:text-4xl font-bold mb-6">Jelszó emlékeztető</h1>
            <p class="mb-6 text-blue-300">Adja meg a regisztrált e-mail címét, és küldünk egy linket az új jelszó beállításához.</p>
            <form id="forgotPasswordForm">
                <div class="space-y-4">
                    <input type="email" id="resetEmailInput" placeholder="E-mail cím" class="input-field" required>
                </div>
                <p id="resetError" class="text-red-400 text-sm mt-4 h-5"></p>
                <p id="resetSuccess" class="text-green-400 text-sm mt-4 h-5"></p>
                <button type="submit" class="btn btn-primary text-lg w-full mt-6">Küldés</button>
            </form>
            <div class="mt-6 text-center">
                <button id="backToLoginFromResetBtn" class="text-blue-400 hover:underline">Vissza a bejelentkezéshez</button>
            </div>
        </div>
    `;
    screens.login.innerHTML = forgotPasswordHtml;

    document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmailInput').value;
        const errorP = document.getElementById('resetError');
        const successP = document.getElementById('resetSuccess');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        try {
            errorP.textContent = '';
            successP.textContent = '';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Küldés...';
            
            await sendPasswordReset(email);
            
            successP.textContent = "A jelszó-visszaállító emailt elküldtük!";
            submitBtn.textContent = 'Elküldve';
        } catch (error) {
            console.error("Jelszó visszaállítási hiba:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Küldés';
            if (error.code === 'auth/user-not-found') {
                errorP.textContent = "Nincs ilyen e-mail címmel regisztrált felhasználó.";
            } else if (error.code === 'auth/invalid-email') {
                errorP.textContent = "Érvénytelen e-mail cím formátum.";
            } else {
                errorP.textContent = "Hiba történt. Próbálja újra később.";
            }
        }
    });

    document.getElementById('backToLoginFromResetBtn').addEventListener('click', () => {
        showLoginScreen();
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
    const partnerRoles = userData.partnerRoles || {};
    const partnerIds = Object.keys(partnerRoles);
    const hasPartners = partnerIds.length > 0;
    const isEjkUser = userData.isEjkUser || false;

    // Determine if user has an admin role for any partner
    const hasAdminRole = Object.values(partnerRoles).some(role => role === 'admin');
    const canManagePermissions = hasAdminRole;

    // Determine button visibility
    const canSelectPartner = isEjkUser || partnerIds.length > 1;
    const isEnyUserWithSinglePartner = !isEjkUser && partnerIds.length === 1;

    let buttonsHtml = '';
    if (isEjkUser) {
        buttonsHtml += `<button onclick="window.location.href='drafts.html'" class="btn btn-secondary w-full">Piszkozatok áttekintése</button>`;
    }
    if (canManagePermissions) {
        buttonsHtml += `<button id="managePermissionsBtn" class="btn btn-secondary w-full">Jogosultságok kezelése</button>`;
    }
    if (canSelectPartner) {
        buttonsHtml += `<button id="selectPartnerBtn" class="btn btn-secondary w-full">Partner adatbázis kiválasztása</button>`;
    } else if (isEnyUserWithSinglePartner) {
        buttonsHtml += `<button id="partnerPortalBtn" class="btn btn-primary w-full">Partner portál</button>`;
    }

    // Statistics button for everyone (functionality differs)
    buttonsHtml += `<button id="statisticsBtn" class="btn btn-secondary w-full mt-2">Statisztikák</button>`;

    // "Add new company" buttons are always available for non-EJK users
    if (!isEjkUser) {
        buttonsHtml += `<button id="registerAnotherCompanyBtn" class="btn btn-secondary w-full">Új céget regisztrálok</button>`;
        buttonsHtml += `<button id="joinAnotherCompanyBtn" class="btn btn-secondary w-full">Csatlakozás másik céghez ETAR kóddal</button>`;
    }

    const menuHtml = `
        <div class="space-y-4 mt-8">
            ${buttonsHtml}
            <button id="signOutButton" class="btn btn-danger w-full mt-4">Kijelentkezés</button>
        </div>
    `;

    // Display info about the user type
    const userInfoHtml = `
        <div class="text-left my-6 p-4 border border-blue-800 rounded-lg bg-blue-900/30">
            <p class="text-gray-300">Felhasználói típus: <strong class="font-semibold text-blue-300">${isEjkUser ? 'EJK' : 'ENY'}</strong></p>
            <p class="text-gray-300">Társított partnerek: <strong class="font-semibold text-blue-300">${partnerIds.length}</strong></p>
        </div>
    `;

    const mainHtml = `
        <div class="card max-w-md mx-auto text-center">
            <img src="images/logo.jpg" alt="ETAR Logó" class="mx-auto mb-8 w-64 h-auto rounded-lg shadow-md">
            <h1 class="text-3xl sm:text-4xl font-bold mb-2">ETAR Rendszer</h1>
            <p class="mb-2 text-blue-300">Bejelentkezve mint: ${userData.name || user.displayName || user.email}</p>
            ${userInfoHtml}
            ${menuHtml}
        </div>
    `;
    screens.main.innerHTML = mainHtml;
    showScreen('main');

    // --- Event Listeners ---

    document.getElementById('signOutButton').addEventListener('click', () => {
        sessionStorage.removeItem('lastPartnerId');
        document.body.classList.remove('partner-mode-active');
        auth.signOut().catch(error => console.error("Kijelentkezési hiba:", error));
    });

    if (canManagePermissions) {
        document.getElementById('managePermissionsBtn').addEventListener('click', async () => {
            showPermissionManagementLoadingScreen();
            try {
                const users = await getUsersForPermissionManagement(user, userData);
                showPermissionManagementScreen(users, userData);
            } catch (error) {
                console.error("Hiba a jogosultságkezelő adatok lekérése során:", error);
                alert("Hiba történt a felhasználói adatok lekérése közben.");
                window.location.reload();
            }
        });
    }

    if (canSelectPartner) {
        document.getElementById('selectPartnerBtn').addEventListener('click', async () => {
            showPartnerSelectionLoadingScreen();
            try {
                const partners = await getPartnersForSelection(userData);
                showPartnerSelectionScreen(partners, userData);
            } catch (error) {
                console.error("Hiba a partnerek lekérése során:", error);
                alert("Hiba történt a partner adatok lekérése közben.");
                window.location.reload();
            }
        });
    }

    if (isEnyUserWithSinglePartner) {
        document.getElementById('partnerPortalBtn').addEventListener('click', async () => {
            const partnerId = partnerIds[0];
            const partnerDoc = await db.collection('partners').doc(partnerId).get();
            if (partnerDoc.exists) {
                showPartnerWorkScreen({ id: partnerDoc.id, ...partnerDoc.data() }, userData);
            } else {
                alert("Hiba: A társított partner nem található az adatbázisban.");
            }
        });
    }

    document.getElementById('statisticsBtn').addEventListener('click', () => {
        showStatisticsScreen(user, userData);
    });

    if (!isEjkUser) {
        document.getElementById('registerAnotherCompanyBtn').addEventListener('click', () => {
            showNewCompanyForm();
            showScreen('login');
        });
        document.getElementById('joinAnotherCompanyBtn').addEventListener('click', () => {
            showJoinCompanyForm();
            showScreen('login');
        });
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
    const isAdminEJK = currentUserData.isEjkUser;

    const roleOptions = ['pending', 'admin', 'write', 'read'];

    const userListHtml = users.map(user => {
        const associationsHtml = user.associations.map(assoc => {
            if (!assoc.partnerDetails) return '';

            const partnerId = assoc.partnerId;

            // Szerepkör legördülő menü
            const roleDropdown = `
                <div>
                    <label for="role-select-${user.id}-${partnerId}" class="block text-sm font-medium text-gray-400">Szerepkör</label>
                    <select id="role-select-${user.id}-${partnerId}" data-original-role="${assoc.role}" class="input-field mt-1 block w-full bg-gray-700 border-gray-600">
                        ${roleOptions.map(opt => `<option value="${opt}" ${assoc.role === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        <option value="Törlés" class="text-red-500">Kapcsolat Törlése</option>
                    </select>
                </div>
            `;
            
            // Partner részleteinek megjelenítése
            const partnerDetailsHtml = `
                <div class="flex-1">
                    <p><strong>Cégnév:</strong> ${assoc.partnerDetails.name || 'N/A'}</p>
                    <p><strong>Cím:</strong> ${assoc.partnerDetails.address || 'N/A'}</p>
                    <p class="text-sm text-gray-400"><strong>Partner ID:</strong> ${partnerId}</p>
                </div>
            `;

            // Mentés és Törlés gombok
            const saveButtonHtml = `<button id="save-btn-${user.id}-${partnerId}" class="btn btn-primary w-full mt-2 hidden">Mentés</button>`;

            return `
            <div class="p-3 bg-blue-900/50 rounded-md mt-2 flex flex-col md:flex-row gap-4 items-start">
                ${partnerDetailsHtml}
                <div class="flex flex-col gap-2">
                    ${roleDropdown}
                    ${saveButtonHtml}
                </div>
            </div>
            `;
        }).join('');

        return `
            <div class="p-4 border border-blue-800 rounded-lg mb-4">
                <h3 class="text-xl font-bold text-blue-300">${user.name}</h3>
                <p class="text-gray-400">${user.email}</p>
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

    // Eseménykezelők a mentés és törlés gombokhoz
    users.forEach(user => {
        user.associations.forEach(assoc => {
            if (!assoc.partnerDetails) return;

            const partnerId = assoc.partnerId;
            const roleSelect = document.getElementById(`role-select-${user.id}-${partnerId}`);
            const saveButton = document.getElementById(`save-btn-${user.id}-${partnerId}`);
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

                if (newRole === "Törlés") {
                    // Törlési logika
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
                            saveButton.textContent = 'Törlés'; // Visszaállítjuk a gombot hiba esetén
                        }
                    }
                } else {
                    // Frissítési logika
                    saveButton.disabled = true;
                    saveButton.textContent = 'Mentés...';
                    try {
                        await updateUserPartnerRole(user.id, partnerId, newRole);
                        saveButton.textContent = 'Mentve';
                        saveButton.classList.add('btn-success');
                        
                        // Frissítjük az originalRole-t a sikeres mentés után
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
            });
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
    const partnerRoles = userData.partnerRoles || {};
    const isEjkUser = userData.isEjkUser || false;

    // An admin of any partner is allowed to see the ETAR code for all partners they can see.
    const hasAdminRole = Object.values(partnerRoles).some(role => role === 'admin');
    const canSeeEtarCode = isEjkUser || hasAdminRole;

    const partnerListHtml = partners.map(partner => {
        const role = partnerRoles[partner.id];
        const isPending = role && role.startsWith('pending');

        const etarCodeHtml = canSeeEtarCode
            ? `<p class="text-gray-400 mt-2">ETAR Kód: ${partner.etarCode}</p>`
            : '';

        let isClickable = false;
        let cardClasses = '';
        let statusHtml = '';

        if (isEjkUser) {
            isClickable = true;
            // For EJK users, show their specific role if they have one, otherwise show a generic access message.
            statusHtml = role 
                ? `<p class="text-blue-400 mt-2">Szerepkör: ${role}</p>` 
                : '<p class="text-gray-400 mt-2">Teljes hozzáférés</p>';
        } else {
            isClickable = role && !isPending;
            if (isPending) {
                statusHtml = '<p class="text-yellow-400 font-bold mt-2">Jóváhagyásra vár</p>';
            } else if (!role) {
                // This case should not be visible to ENY users due to how partners are fetched, but as a fallback.
                statusHtml = '<p class="text-gray-500 font-bold mt-2">Nincs hozzáférés</p>';
            }
        }

        cardClasses = isClickable
            ? 'p-4 border border-blue-800 rounded-lg mb-4 cursor-pointer hover:bg-blue-900/50 transition-colors'
            : 'p-4 border border-blue-800 rounded-lg mb-4 opacity-60 cursor-not-allowed';

        return `
        <div class="${cardClasses}" ${isClickable ? `data-partner-id="${partner.id}"` : ''}>
            <h3 class="text-xl font-bold text-blue-300">${partner.name}</h3>
            <p class="text-gray-300">${partner.address}</p>
            ${etarCodeHtml}
            ${statusHtml}
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
}export function showPartnerWorkScreen(partner, userData) {
    sessionStorage.setItem('lastPartnerId', partner.id);
    document.body.classList.add('partner-mode-active');
    const partnerWorkScreen = document.getElementById('partnerWorkScreen');
    partnerWorkScreen.innerHTML = getPartnerWorkScreenHtml(partner, userData);
    showScreen('partnerWork');
    initPartnerWorkScreen(partner.id, userData); // ESZKÖZLISTA INICIALIZÁLÁSA

    const backToMain = () => {
        sessionStorage.removeItem('lastPartnerId');
        document.body.classList.remove('partner-mode-active');
        window.location.reload(); // Reload to go back to the main screen
    };

    // Desktop back button
    document.getElementById('backToMainFromWorkScreenBtn').addEventListener('click', backToMain);

    // Hamburger menu logic
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileBackBtn = document.getElementById('backToMainFromWorkScreenBtnMobile');

    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    if (mobileBackBtn) {
        mobileBackBtn.addEventListener('click', backToMain);
    }
}


