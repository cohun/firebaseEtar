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
            console.log("Bejelentkezve:", user.email);
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();

                const lastPartnerId = sessionStorage.getItem('lastPartnerId');
                if (lastPartnerId && userData.associatedPartner && userData.associatedPartner.length > 0) {
                    try {
                        const partnerDoc = await db.collection('partners').doc(lastPartnerId).get();
                        if (partnerDoc.exists) {
                            const partnerData = { id: partnerDoc.id, ...partnerDoc.data() };
                            const hasAccess = userData.associatedPartner.some(p => p.etarCode === partnerData.etarCode);
                            if (hasAccess) {
                                showPartnerWorkScreen(partnerData, userData);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching last partner:", e);
                    }
                }

                if (userData.associatedPartner && userData.associatedPartner.length > 0) {
                    const partner = userData.associatedPartner[0];
                    if (partner.role.startsWith('pending')) {
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
        associatedPartner: [],
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

    // 1. Create partner document
    await db.collection('partners').add({
        name: companyName,
        address: companyAddress,
        etarCode: etarCode,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    const newPartnerData = {
        etarCode: etarCode,
        type: 'ENY',
        role: 'pendingAdmin'
    };

    if (userDoc.exists) {
        await userRef.update({
            associatedPartner: firebase.firestore.FieldValue.arrayUnion(newPartnerData),
            roles: firebase.firestore.FieldValue.arrayUnion('ENY_pendingAdmin')
        });
    } else {
        await userRef.set({
            email: user.email,
            name: user.displayName,
            associatedPartner: [newPartnerData],
            roles: ['ENY_pendingAdmin']
        });
    }
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

    // 2. Update user's document
    const userRef = db.collection('users').doc(user.uid);
    const type = etarCode === 'Q27LXR' ? 'EJK' : 'ENY';

    const newPartnerData = {
        etarCode: etarCode,
        type: type,
        role: 'pending'
    };

    const newRole = `${type}_pending`;

    await userRef.update({
        associatedPartner: firebase.firestore.FieldValue.arrayUnion(newPartnerData),
        roles: firebase.firestore.FieldValue.arrayUnion(newRole)
    });

    return true;
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
