import { auth, db } from './firebase.js';
import { registerUser, registerNewCompany, joinCompanyWithCode, sendPasswordReset } from './auth.js';
import { getUsersForPermissionManagement, updateUserPartnerRole, removeUserPartnerAssociation, getPartnersForSelection, getExternalExperts } from './admin.js';
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
    document.body.classList.remove('ekv-mode'); // Clean up EKV mode styles
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
            <p class="mb-4 text-blue-300">Az Ön személyes adatai:</p>
            <form id="registrationForm" novalidate>
                <div class="space-y-4">
                    <input type="text" id="nameInput" placeholder="Teljes név" class="input-field" required>
                    <input type="email" id="regEmailInput" placeholder="E-mail cím" class="input-field" required>
                    <input type="password" id="regPasswordInput" placeholder="Jelszó" class="input-field" required>
                    
                    <div class="flex items-center">
                        <input type="checkbox" id="ekvCheckbox" class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2">
                        <label for="ekvCheckbox" class="ml-2 text-sm font-medium text-gray-300">Külső Szakértő (EKV) regisztráció</label>
                    </div>

                    <div id="ekvFields" class="hidden space-y-4 border-l-2 border-blue-500 pl-4">
                        <input type="text" id="szakertoiCimInput" placeholder="Szakértői cím" class="input-field">
                        <input type="text" id="vizsgaloCegNeveInput" placeholder="Vizsgáló cég neve" class="input-field">
                        <input type="text" id="vizsgaloCegCimeInput" placeholder="Vizsgáló cég címe" class="input-field">
                        <input type="text" id="kamaraiSzamInput" placeholder="Kamarai/Jogosultsági szám" class="input-field">
                    </div>
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

    const ekvCheckbox = document.getElementById('ekvCheckbox');
    const ekvFields = document.getElementById('ekvFields');
    const szakertoiCimInput = document.getElementById('szakertoiCimInput');
    const vizsgaloCegNeveInput = document.getElementById('vizsgaloCegNeveInput');
    const vizsgaloCegCimeInput = document.getElementById('vizsgaloCegCimeInput');
    const kamaraiSzamInput = document.getElementById('kamaraiSzamInput');

    ekvCheckbox.addEventListener('change', () => {
        if (ekvCheckbox.checked) {
            if (confirm("Ön valóban szakértőként kíván regisztrálni?")) {
                ekvFields.classList.remove('hidden');
            } else {
                ekvCheckbox.checked = false;
                ekvFields.classList.add('hidden');
            }
        } else {
            ekvFields.classList.add('hidden');
        }
    });

    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('nameInput');
        const emailInput = document.getElementById('regEmailInput');
        const passwordInput = document.getElementById('regPasswordInput');
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const isEkvUser = ekvCheckbox.checked;
        const errorP = document.getElementById('registrationError');

        // Clear previous errors
        errorP.textContent = '';

        // Manual validation for basic fields
        if (!name || !email || !password) {
             errorP.textContent = "Kérjük, töltsön ki minden kötelező mezőt!";
             return;
        }

        let szakertoiCim = '';
        let vizsgaloCegNeve = '';
        let vizsgaloCegCime = '';
        let kamaraiSzam = '';

        if (isEkvUser) {
            szakertoiCim = szakertoiCimInput.value.trim();
            vizsgaloCegNeve = vizsgaloCegNeveInput.value.trim();
            vizsgaloCegCime = vizsgaloCegCimeInput.value.trim();
            kamaraiSzam = kamaraiSzamInput.value.trim();

            if (!szakertoiCim || !vizsgaloCegNeve || !vizsgaloCegCime || !kamaraiSzam) {
                errorP.textContent = "EKV regisztrációhoz minden mező kitöltése kötelező!";
                return;
            }
        }

        try {
            errorP.textContent = '';
            await registerUser(email, password, name, isEkvUser, szakertoiCim, vizsgaloCegNeve, vizsgaloCegCime, kamaraiSzam);
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

export function showCompanyRegistrationOptions(userData) {
    const isEkvUser = userData && userData.isEkvUser === true;

    if (isEkvUser) {
        showJoinCompanyForm(true); // Pass true to indicate EKV flow
        return;
    }

    let buttonsHtml = '';
    if (!isEkvUser) {
        buttonsHtml += `<button id="registerNewCompanyBtn" class="btn btn-primary w-full">Új céget regisztrálok, én leszek a jogosultság osztó</button>`;
    }
    buttonsHtml += `<button id="joinCompanyBtn" class="btn btn-secondary w-full">Már regisztrált cégbe lépek ETAR kóddal</button>`;

    const companyRegHtml = `
        <div class="card max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-4">Sikeres regisztráció!</h2>
            <p class="mb-6 text-blue-300">Válassza ki a következő lépést:</p>
            <div class="space-y-4">
                ${buttonsHtml}
            </div>
        </div>
    `;
    screens.login.innerHTML = companyRegHtml; // Display in the same area
    showScreen('login');

    if (!isEkvUser) {
        document.getElementById('registerNewCompanyBtn').addEventListener('click', () => {
            showNewCompanyForm();
        });
    }
    document.getElementById('joinCompanyBtn').addEventListener('click', () => {
        showJoinCompanyForm(false);
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

export function showJoinCompanyForm(isEkvFlow = false) {
    const joinHtml = `
        <div class="card max-w-md mx-auto">
            <h1 class="text-3xl sm:text-4xl font-bold mb-6">Csatlakozás céghez</h1>
            ${isEkvFlow ? '<p class="mb-4 text-blue-300">Kérjük, adja meg annak a cégnek az ETAR kódját, amelyhez csatlakozni kíván.</p>' : ''}
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
                if (isEkvFlow) {
                    showEkvSuccessScreen();
                } else {
                    showPendingApprovalScreen();
                }
            } else {
                errorP.textContent = "Érvénytelen vagy nem létező ETAR kód.";
            }
        } catch (error) {
            console.error("Csatlakozási hiba:", error);
            errorP.textContent = "Hiba történt a csatlakozás során.";
        }
    });
}



function showEkvSuccessScreen() {
    const successHtml = `
        <div class="card max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-4">Sikeres jelentkezés!</h2>
            <p class="text-blue-300 mb-6">A továbblépéshez fel kell vennie a kapcsolatot egy ETAR adminisztrátorral, aki a belépését véglegesíti.</p>
            <button id="backToLoginBtn" class="btn btn-secondary w-full">Vissza a bejelentkezéshez</button>
        </div>
    `;
    screens.login.innerHTML = successHtml;

    document.getElementById('backToLoginBtn').addEventListener('click', () => {
        auth.signOut().catch(console.error);
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

    // Apply EKV mode styles if applicable
    if (userData.isEkvUser) {
        document.body.classList.add('ekv-mode');
    } else {
        document.body.classList.remove('ekv-mode');
    }

    let buttonsHtml = '';
    if (isEjkUser || userData.isEkvUser) {
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
    // Statistics button for everyone (functionality differs)
    buttonsHtml += `<button id="statisticsBtn" class="btn btn-secondary w-full mt-2">Statisztikák</button>`;

    if (isEjkUser) {
        buttonsHtml += `<button id="externalExpertsBtn" class="btn btn-secondary w-full mt-2">Külső Szakértők</button>`;
    }

    // "Add new company" buttons are always available for non-EJK users
    // "Add new company" buttons are always available for non-EJK users
    if (!isEjkUser) {
        // EKV users cannot create new companies, only join existing ones
        if (!userData.isEkvUser) {
            buttonsHtml += `<button id="registerAnotherCompanyBtn" class="btn btn-secondary w-full">Új céget regisztrálok</button>`;
        }
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
            <p class="text-gray-300">Felhasználói típus: <strong class="font-semibold text-blue-300">${isEjkUser ? 'EJK' : (userData.isEkvUser ? 'EKV' : 'ENY')}</strong></p>
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
        if (!userData.isEkvUser) {
            document.getElementById('registerAnotherCompanyBtn').addEventListener('click', () => {
                showNewCompanyForm();
                showScreen('login');
            });
        }
        document.getElementById('joinAnotherCompanyBtn').addEventListener('click', () => {
            showJoinCompanyForm(false);
            showScreen('login');
        });
    }

    if (isEjkUser) {
        document.getElementById('externalExpertsBtn').addEventListener('click', async () => {
            // Re-use the permissions loading screen style as it's similar
            showPermissionManagementLoadingScreen(); 
            try {
                const experts = await getExternalExperts();
                showExternalExpertsScreen(experts, userData);
            } catch (error) {
                console.error("Hiba a külső szakértők lekérése során:", error);
                alert("Hiba történt az adatok lekérése közben.");
                window.location.reload();
            }
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

import { attachPermissionManagementListeners } from './ui_helpers.js';

export function showPermissionManagementScreen(users, currentUserData) {
    // ... existing content ...
    const isAdminEJK = currentUserData.isEjkUser;

    const roleOptions = ['pending', 'admin', 'write', 'read', 'inspector', 'pending_inspector'];
    // ... render html ...
    const renderUserList = (userList) => {
        if (userList.length === 0) {
            return '<p class="text-center text-gray-400">Nincsenek a feltételeknek megfelelő felhasználók.</p>';
        }

        return userList.map(user => {
            const associationsHtml = user.associations.map(assoc => {
                if (!assoc.partnerDetails) return '';
    
                const partnerId = assoc.partnerId;
    
                // Szerepkör legördülő menü
                let roleDropdownContent = '';
                let isDisabled = false;
                let displayRole = assoc.role;
                let extraInfo = '';
    
                // ENY logic handling
                if (!currentUserData.isEjkUser) {
                    if (assoc.role === 'pending_inspector') {
                        isDisabled = true;
                        // Keep original value but it will be disabled
                    } else if (assoc.role === 'subcontractor') {
                        isDisabled = true;
                        displayRole = 'i-vizsgáló'; // Visually show as i-vizsgáló instead of inspector
                        extraInfo = ''; 
                    } else if (assoc.role === 'subscriber') {
                         // Subscriber can be changed to Inspector, so not disabled by default
                    }
                }
    
                const roleDropdown = `
                    <div>
                        <label for="role-select-${user.id}-${partnerId}" class="block text-sm font-medium text-gray-400">Szerepkör</label>
                        <select id="role-select-${user.id}-${partnerId}" data-original-role="${assoc.role}" class="input-field mt-1 block w-full bg-gray-700 border-gray-600 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}" ${isDisabled ? 'disabled' : ''}>
                            ${roleOptions.map(opt => {
                                // If it's a subcontractor showing as inspector (or i-vizsgáló)
                                if (assoc.role === 'subcontractor' && opt === 'inspector') {
                                    return `<option value="${assoc.role}" selected>${displayRole}</option>`;
                                }
                                 // Standard matching
                                return `<option value="${opt}" ${assoc.role === opt ? 'selected' : ''}>${opt}</option>`;
                            }).join('')}
                            ${!roleOptions.includes(assoc.role) && assoc.role !== 'subcontractor' ? `<option value="${assoc.role}" selected>${assoc.role}</option>` : ''}
                            ${assoc.role === 'subcontractor' ? '' : `<option value="Törlés" class="text-red-500">Kapcsolat Törlése</option>`}
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
    };

    const screenHtml = `
        <div class="card max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">Jogosultságok Kezelése</h1>
                <button id="backToMainScreenBtn" class="btn btn-secondary">Vissza</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <input type="text" id="searchCompanyName" placeholder="Keresés cégnév alapján..." class="input-field">
                </div>
                <div>
                    <input type="text" id="searchAdminName" placeholder="Keresés ENY admin neve alapján..." class="input-field">
                </div>
            </div>

            <div id="permissionUserListContainer" class="max-h-[60vh] overflow-y-auto pr-2">
                ${renderUserList(users)}
            </div>
        </div>
    `;
    screens.permissionManagement.innerHTML = screenHtml;
    showScreen('permissionManagement');

    // Filter Logic
    const searchCompanyNameInput = document.getElementById('searchCompanyName');
    const searchAdminNameInput = document.getElementById('searchAdminName');
    const userListContainer = document.getElementById('permissionUserListContainer');

    const filterUsers = () => {
        const companyTerm = searchCompanyNameInput.value.toLowerCase();
        const adminTerm = searchAdminNameInput.value.toLowerCase();

        const filteredUsers = users.filter(user => {
            const nameMatch = user.name.toLowerCase().includes(adminTerm);
            
            // Check if ANY of the user's associated partners match the company search term
            const companyMatch = user.associations.some(assoc => {
                return assoc.partnerDetails && assoc.partnerDetails.name.toLowerCase().includes(companyTerm);
            });

            // If company search is empty, we don't filter by it (companyMatch is effectively true for "all")
            // BUT strict logic: if companyTerm is present, we need at least one match.
            const isCompanyMatchValid = companyTerm === '' || companyMatch;

            return nameMatch && isCompanyMatchValid;
        });

        userListContainer.innerHTML = renderUserList(filteredUsers);
        
        // Re-attach listeners because we re-rendered the DOM
        attachPermissionManagementListeners(filteredUsers, currentUserData); 
    };

    searchCompanyNameInput.addEventListener('input', filterUsers);
    searchAdminNameInput.addEventListener('input', filterUsers);

    // Initial attach
    attachPermissionManagementListeners(users, currentUserData);

    document.getElementById('backToMainScreenBtn').addEventListener('click', () => {
        window.location.reload();
    });
}

export function showExternalExpertsScreen(experts, userData) {
    const roleOptions = ['pending_inspector', 'subcontractor', 'subscriber'];

    const userListHtml = experts.map(user => {
        const associationsHtml = user.associations.map(assoc => {
            if (!assoc.partnerDetails) return '';

            const partnerId = assoc.partnerId;

            // Priority: ejkRole (saved by EJK) > role (current actual role)
            const roleToShow = assoc.ejkRole || assoc.role;

            let subscriptionHtml = '';
            if (roleToShow === 'subscriber' && assoc.subscription) {
                const now = Date.now();
                const expiry = assoc.subscription;
                const msPerDay = 1000 * 60 * 60 * 24;
                const daysRemaining = Math.max(0, Math.ceil((expiry - now) / msPerDay));
                const colorClass = daysRemaining < 10 ? 'text-red-500' : 'text-green-500';
                
                subscriptionHtml = `
                    <span id="sub-counter-${user.id}-${partnerId}" 
                          data-expiry="${expiry}" 
                          class="${colorClass} font-bold cursor-pointer ml-2" 
                          title="Kattintson a meghosszabbításhoz">
                          ${daysRemaining} nap
                    </span>`;
            }

            const roleDropdown = `
                <div>
                    <label for="role-select-${user.id}-${partnerId}" class="block text-sm font-medium text-gray-400">
                        Szerepkör ${subscriptionHtml}
                    </label>
                    <select id="role-select-${user.id}-${partnerId}" data-original-role="${roleToShow}" class="input-field mt-1 block w-full bg-gray-700 border-gray-600">
                        ${roleOptions.map(opt => `<option value="${opt}" ${roleToShow === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        <option value="Törlés" class="text-red-500">Kapcsolat Törlése</option>
                    </select>
                </div>
            `;
            
            const partnerDetailsHtml = `
                <div class="flex-1">
                    <p><strong>Cégnév:</strong> ${assoc.partnerDetails.name || 'N/A'}</p>
                    <p><strong>Cím:</strong> ${assoc.partnerDetails.address || 'N/A'}</p>
                    <p class="text-sm text-gray-400"><strong>Partner ID:</strong> ${partnerId}</p>
                </div>
            `;

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
                ${user.vizsgaloCegNeve ? `<p class="text-sm text-gray-400">Vizsgáló cég: ${user.vizsgaloCegNeve}</p>` : ''}
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
                <h1 class="text-3xl font-bold">Külső Szakértők</h1>
                <button id="backToMainScreenBtn2" class="btn btn-secondary">Vissza</button>
            </div>
            <div class="max-h-[60vh] overflow-y-auto pr-2">
                ${userListHtml.length > 0 ? userListHtml : '<p class="text-center text-gray-400">Nincsenek külső szakértők.</p>'}
            </div>
        </div>
    `;
    // Reuse the permissionManagement screen container as it is a generic full screen container
    screens.permissionManagement.innerHTML = screenHtml;
    showScreen('permissionManagement');

    attachPermissionManagementListeners(experts, userData);
    
    // Need to attach listener to the new back button ID
    document.getElementById('backToMainScreenBtn2').addEventListener('click', () => {
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
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 class="text-3xl font-bold">Partnerek</h1>
                <div class="relative w-full md:w-auto flex-1 md:mx-4">
                     <input type="text" id="partnerSearchInput" placeholder="Keresés partner neve alapján..." class="input-field w-full">
                </div>
                <button id="backToMainScreenFromPartnerSelectBtn" class="btn btn-secondary whitespace-nowrap">Vissza</button>
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

    const searchInput = document.getElementById('partnerSearchInput');
    const partnerList = document.getElementById('partner-list');
    const partnerCards = partnerList.children;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        let hasVisible = false;

        Array.from(partnerCards).forEach(card => {
            // Skip if it's the "no partners" message (though that shouldn't be matched usually as it's a p tag, but purely technically it's a child)
            // Better: search within h3 inside the card
            const nameEl = card.querySelector('h3');
            if (nameEl) {
                const name = nameEl.textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    card.classList.remove('hidden');
                    hasVisible = true;
                } else {
                    card.classList.add('hidden');
                }
            }
        });
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
    
    // Apply EKV mode styles if applicable
    if (userData && userData.isEkvUser) {
        document.body.classList.add('ekv-mode');
    } else {
        document.body.classList.remove('ekv-mode');
    }

    const partnerWorkScreen = document.getElementById('partnerWorkScreen');
    partnerWorkScreen.innerHTML = getPartnerWorkScreenHtml(partner, userData);
    showScreen('partnerWork');
    initPartnerWorkScreen(partner.id, userData); // ESZKÖZLISTA INICIALIZÁLÁSA

    const backToMain = () => {
        sessionStorage.removeItem('lastPartnerId');
        sessionStorage.removeItem('currentOperatorCategory'); // Clear category selection
        sessionStorage.removeItem('operatorIdFilterValue'); // Clear filter value
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



export function showLoadingModal(message) {
    let modal = document.getElementById('loading-modal');
    if (!modal) {
        const modalHtml = `
            <div id="loading-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div class="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <div class="loader mx-auto"></div>
                    <p id="loading-modal-message" class="mt-4 text-blue-300">${message}</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        const messageEl = document.getElementById('loading-modal-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
}

export function hideLoadingModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) {
        modal.remove();
    }
}
