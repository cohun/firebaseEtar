import { auth } from './firebase.js';
import { showLoginScreen, showMainScreen } from './ui.js';

/**
 * Figyeli a felhasználó bejelentkezési állapotának változását.
 */
export function onAuthStateChanged() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Felhasználó be van jelentkezve
            console.log("Bejelentkezve:", user.email);
            showMainScreen(user);
        } else {
            // Felhasználó ki van jelentkezve
            console.log("Kijelentkezve.");
            showLoginScreen();
        }
    });
}

/**
 * Kijelentkezteti a felhasználót.
 */
function signOutUser() { // Az export felesleges, ha csak belsőleg használjuk
    auth.signOut().catch(error => {
        console.error("Kijelentkezési hiba:", error);
        alert("Hiba történt a kijelentkezés során.");
    });
}
