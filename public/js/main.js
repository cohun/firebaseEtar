import { onAuthStateChanged } from './auth.js';
import { checkAndEnforceSubscriptionExpiry } from './admin.js';
import { auth } from './firebase.js';

// Amikor a DOM betöltődött, elindítjuk az authentikáció figyelését.
document.addEventListener('DOMContentLoaded', () => {
    console.log("ETAR Firebase App Started");
    onAuthStateChanged();
    
    // Check expiry whenever auth state is stable (actually onAuthStateChanged is the listener, 
    // but we can also hook into it if we modify auth.js or just check here if we can access the user)
    // The onAuthStateChanged from ./auth.js handles the UI flow.
    // It's better to hook this into where the user is confirmed logged in.
    // Let's modify auth.js instead to be cleaner, or add a listener here to firebase auth.
    
    auth.onAuthStateChanged(user => {
        if (user) {
             checkAndEnforceSubscriptionExpiry(user);
        }
    });
});
