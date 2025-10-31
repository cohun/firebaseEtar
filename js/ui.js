import { auth } from './firebase.js';
import { registerUser, registerNewCompany, joinCompanyWithCode } from './auth.js';

const screens = {
    loading: document.getElementById('loadingScreen'),
    login: document.getElementById('loginScreen'),
    main: document.getElementById('mainScreen'),
};

function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenId].classList.add('active');
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


export function showMainScreen(user) {
    const mainHtml = `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">ETAR Főképernyő</h1>
                <button id="signOutButton" class="btn btn-secondary text-sm">Kijelentkezés</button>
            </div>
            <p>Üdv, ${user.displayName || user.email}!</p>
            <p class="mt-4">Innen folytatjuk a fejlesztést...</p>
        </div>
    `;
    screens.main.innerHTML = mainHtml;
    showScreen('main');

    document.getElementById('signOutButton').addEventListener('click', () => {
        auth.signOut().catch(error => {
            console.error("Kijelentkezési hiba:", error);
        });
    });
}
