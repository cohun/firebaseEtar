import { auth } from './firebase.js';

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
        </div>
    `;
    screens.login.innerHTML = loginHtml;
    showScreen('login');

    // Eseménykezelő a bejelentkezési űrlaphoz
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const errorP = document.getElementById('loginError');
        
        try {
            errorP.textContent = '';
            await auth.signInWithEmailAndPassword(email, password);
            // Az onAuthStateChanged automatikusan kezeli a sikeres bejelentkezést
        } catch (error) {
            console.error("Bejelentkezési hiba:", error.code);
            errorP.textContent = "Hibás e-mail cím vagy jelszó.";
        }
    });
}

export function showMainScreen(user) {
    const mainHtml = `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">ETAR Főképernyő</h1>
                <button id="signOutButton" class="btn btn-secondary text-sm">Kijelentkezés</button>
            </div>
            <p>Üdv, ${user.email}!</p>
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
