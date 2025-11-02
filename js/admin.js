import { db } from './firebase.js';

async function getPartnerByEtarCode(etarCode) {
    if (!etarCode) return null; // Guard against missing etarCode
    const snapshot = await db.collection('partners').where('etarCode', '==', etarCode).limit(1).get();
    if (snapshot.empty) {
        return null;
    }
    const partnerDoc = snapshot.docs[0];
    return { id: partnerDoc.id, ...partnerDoc.data() };
}

export async function getUsersForPermissionManagement(adminUser, adminUserData) {
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // --- MIGRATION LOGIC START ---
    const migrationPromises = allUsers.map(async (user) => {
        // If roles field is missing or not an array, and associatedPartner exists
        if ((!user.roles || !Array.isArray(user.roles)) && user.associatedPartner && user.associatedPartner.length > 0) {
            const newRoles = user.associatedPartner.map(p => `${p.type}_${p.role}`);
            await db.collection('users').doc(user.id).update({ roles: newRoles });
            user.roles = newRoles; // Update the local object for immediate use
        }
    });
    await Promise.all(migrationPromises);
    // --- MIGRATION LOGIC END ---

    // Determine admin's capabilities from their roles
    const isAdminENY = adminUserData.roles && adminUserData.roles.includes('ENY_admin');
    const isAdminEJK = adminUserData.roles && adminUserData.roles.includes('EJK_admin');

    let usersToProcess;

    // If EJK admin, apply specific filtering logic
    if (isAdminEJK) {
        usersToProcess = allUsers.filter(user => {
            if (user.id === adminUser.uid) return false; // Exclude admin
            if (!user.associatedPartner) return false;

            return user.associatedPartner.some(p => {
                if (p.type === 'EJK') {
                    return true; // Include all EJK users
                }
                if (p.type === 'ENY' && (p.role === 'admin' || p.role === 'pendingAdmin')) {
                    return true; // Include ENY admins and pendingAdmins
                }
                return false;
            });
        });
    }
    // If ENY admin (and not also EJK admin), filter for users associated with the same ETAR code(s).
    else if (isAdminENY) { // No need to check for !isAdminEJK because of the if/else
        const adminEtarCodes = adminUserData.associatedPartner.map(p => p.etarCode);
        usersToProcess = allUsers.filter(user =>
            user.id !== adminUser.uid && // Exclude the admin themselves from the list
            user.associatedPartner &&
            user.associatedPartner.some(p => adminEtarCodes.includes(p.etarCode))
        );
    } else {
        usersToProcess = []; // If not an admin, show no one
    }

    // Create a new structure that's easier for the UI to consume
    let usersWithAssociations = await Promise.all(usersToProcess.map(async (user) => {
        if (!user.associatedPartner) return null;

        let associations = await Promise.all(
            user.associatedPartner.map(async (p) => {
                if (!p || !p.etarCode) return null;
                const partnerDetails = await getPartnerByEtarCode(p.etarCode);
                return {
                    ...p, // etarCode, type, role
                    partnerDetails: partnerDetails
                };
            })
        );
        
        associations = associations.filter(a => a);

        // If ENY admin (and not EJK admin), only show associations relevant to their ETAR code(s)
        if (isAdminENY && !isAdminEJK) {
            const adminEtarCodes = adminUserData.associatedPartner.map(p => p.etarCode);
            associations = associations.filter(a => adminEtarCodes.includes(a.etarCode));
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            associations: associations.filter(a => a && a.partnerDetails)
        };
    }));
    
    usersWithAssociations = usersWithAssociations.filter(u => u && u.associations.length > 0);

    return usersWithAssociations;
}

export async function updateUserPartnerRole(userId, etarCode, newType, newRole) {
    if (!userId || !etarCode || !newType || !newRole) {
        throw new Error("Hiányzó paraméterek a frissítéshez.");
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new Error("A felhasználó nem található.");
    }

    const userData = userDoc.data();
    const associatedPartners = userData.associatedPartner || [];

    const partnerIndex = associatedPartners.findIndex(p => p.etarCode === etarCode);

    if (partnerIndex === -1) {
        throw new Error("A partnerkapcsolat nem található a felhasználónál.");
    }

    // Update the type and role
    associatedPartners[partnerIndex].type = newType;
    associatedPartners[partnerIndex].role = newRole;

    // Regenerate the roles array from the updated associatedPartners
    const newRoles = associatedPartners.map(p => `${p.type}_${p.role}`);

    // Write the entire array back to Firestore
    await userRef.update({
        associatedPartner: associatedPartners,
        roles: newRoles
    });
}

export async function getPartnersForSelection(userData) {
    const userType = userData.associatedPartner[0].type;

    if (userType === 'EJK') {
        const partnersSnapshot = await db.collection('partners').get();
        return partnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else { // ENY user
        const etarCodes = userData.associatedPartner.map(p => p.etarCode);
        if (etarCodes.length === 0) {
            return [];
        }
        // Firestore 'in' query is limited to 10 elements.
        // If there are more, we need to do multiple queries.
        const partnerPromises = [];
        for (let i = 0; i < etarCodes.length; i += 10) {
            const chunk = etarCodes.slice(i, i + 10);
            partnerPromises.push(db.collection('partners').where('etarCode', 'in', chunk).get());
        }

        const partnerSnapshots = await Promise.all(partnerPromises);
        const partners = [];
        partnerSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                partners.push({ id: doc.id, ...doc.data() });
            });
        });
        return partners;
    }
}