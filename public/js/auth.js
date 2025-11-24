import { auth, db } from './firebase.js';
import { showLoginScreen, showMainScreen, showCompanyRegistrationOptions, showPendingApprovalScreen, showPartnerWorkScreen } from './ui.js';

/**
 * Generates a 6-character random alphanumeric ETAR code.
 * @returns {string}
 */
function generateEtarCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Figyeli a felhasználó bejelentkezési állapotának változását.
 */
export function onAuthStateChanged() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userRef = db.collection('users').doc(user.uid);
            let userDoc = await userRef.get();


            console.log("Bejelentkezve:", user.email);
            if (userDoc.exists) {
                const userData = userDoc.data();

                const lastPartnerId = sessionStorage.getItem('lastPartnerId');

                if (lastPartnerId) {
                    const hasRole = userData.partnerRoles && userData.partnerRoles[lastPartnerId];
                    const isEjkUser = userData.isEjkUser === true;

                    if (hasRole || isEjkUser) {
                        const partnerDoc = await db.collection('partners').doc(lastPartnerId).get();
                        if (partnerDoc.exists) {
                            showPartnerWorkScreen({ id: partnerDoc.id, ...partnerDoc.data() }, userData);
                            return;
                        }
                    }
                }

                if (userData.partnerRoles && Object.keys(userData.partnerRoles).length > 0) {
                    const roles = Object.values(userData.partnerRoles);
                    const allRolesArePending = roles.length > 0 && roles.every(role => role.startsWith('pending'));

                    if (allRolesArePending) {
                        showPendingApprovalScreen();
                    } else {
                        showMainScreen(user, userData);
                    }
                } else {
                    showCompanyRegistrationOptions();
                }
            } else {
                // This case might happen if user exists in Auth but not in Firestore
                // For safety, we show company registration options.
                showCompanyRegistrationOptions();
            }
        } else {
            console.log("Kijelentkezve.");
            showLoginScreen();
        }
    });
}

/**
 * Regisztrál egy új felhasználót email, jelszó és név alapján.
 * @param {string} email 
 * @param {string} password 
 * @param {string} name 
 */
export async function registerUser(email, password, name) {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await user.updateProfile({
        displayName: name
    });

    await db.collection('users').doc(user.uid).set({
        email: user.email,
        name: name,
        partnerRoles: {},
        roles: []
    });
    // onAuthStateChanged will trigger and show the correct screen
}

/**
 * Registers a new company and associates it with the current user.
 * @param {string} companyName 
 * @param {string} companyAddress 
 */
export async function registerNewCompany(companyName, companyAddress) {
    const user = auth.currentUser;
    if (!user) throw new Error("Nincs bejelentkezett felhasználó.");

    const etarCode = generateEtarCode();

    // 1. Create partner document and get its ID
    const partnerRef = await db.collection('partners').add({
        name: companyName,
        address: companyAddress,
        etarCode: etarCode,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const partnerId = partnerRef.id;

    const userRef = db.collection('users').doc(user.uid);

    // Update user with the new partner role using dot notation
    await userRef.update({
        [`partnerRoles.${partnerId}`]: 'pendingAdmin',
        roles: firebase.firestore.FieldValue.arrayUnion('ENY_pendingAdmin')
    });
}

/**
 * Associates a user with a company using an ETAR code.
 * @param {string} etarCode 
 * @returns {boolean} - True if successful, false otherwise.
 */
export async function joinCompanyWithCode(etarCode) {
    const user = auth.currentUser;
    if (!user) throw new Error("Nincs bejelentkezett felhasználó.");

    // 1. Find partner with the given ETAR code
    const partnersRef = db.collection('partners');
    const snapshot = await partnersRef.where('etarCode', '==', etarCode).get();

    if (snapshot.empty) {
        console.log("Nincs partner ezzel a kóddal:", etarCode);
        return false;
    }
    const partnerId = snapshot.docs[0].id;

    // 2. Update user's document
    const userRef = db.collection('users').doc(user.uid);
    const type = etarCode === 'Q27LXR' ? 'EJK' : 'ENY';
    const newRole = 'pending';

    await userRef.update({
        [`partnerRoles.${partnerId}`]: newRole,
        isEjkUser: type === 'EJK',
        roles: firebase.firestore.FieldValue.arrayUnion(`${type}_${newRole}`)
    });

    return true;
}



/**
 * Sends a password reset email to the user.
 * @param {string} email 
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(email) {
    await auth.sendPasswordResetEmail(email);
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
