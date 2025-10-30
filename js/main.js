import { onAuthStateChanged } from './auth.js';

// Amikor a DOM betöltődött, elindítjuk az authentikáció figyelését.
document.addEventListener('DOMContentLoaded', () => {
    console.log("ETAR Firebase App Started");
    onAuthStateChanged();
});
