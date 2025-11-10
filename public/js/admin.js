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

    // Determine admin's capabilities
    const isAdminEJK = adminUserData.isEjkUser;
    const adminPartnerIds = Object.keys(adminUserData.partnerRoles || {});

    // Filter users based on admin's permissions
    const usersToProcess = allUsers.filter(user => {
        if (user.id === adminUser.uid) return false; // Exclude admin

        if (isAdminEJK) {
            const isUserEjk = user.isEjkUser === true;
            const userRoles = Object.values(user.partnerRoles || {});
            const isPendingOrAdmin = userRoles.some(role => role === 'admin' || role === 'pendingAdmin');
            return isUserEjk || isPendingOrAdmin;
        } else { // ENY admin
            if (!user.partnerRoles) return false;
            const userPartnerIds = Object.keys(user.partnerRoles);
            return userPartnerIds.some(partnerId => adminPartnerIds.includes(partnerId));
        }
    });

    // Create a new structure that's easier for the UI to consume
    let usersWithAssociations = await Promise.all(usersToProcess.map(async (user) => {
        const userPartnerRoles = user.partnerRoles || {};
        let partnerIds = Object.keys(userPartnerRoles);

        // If ENY admin, filter to only show associations for partners they also manage
        if (!isAdminEJK) {
            partnerIds = partnerIds.filter(id => adminPartnerIds.includes(id));
            // If, after filtering, there are no common partners, don't show this user to the ENY admin.
            if (partnerIds.length === 0) {
                return null;
            }
        }

        // Fetch partner details for the relevant partner IDs
        const partnerDocs = await Promise.all(
            partnerIds.map(id => db.collection('partners').doc(id).get())
        );

        const associations = partnerDocs.map(doc => {
            if (!doc.exists) return null;
            const partnerId = doc.id;
            const partnerDetails = { id: partnerId, ...doc.data() };
            const role = userPartnerRoles[partnerId];
            
            return {
                partnerId: partnerId,
                role: role,
                partnerDetails: partnerDetails
            };
        }).filter(a => a); // Filter out nulls if a partner doc didn't exist

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            associations: associations
        };
    }));

    return usersWithAssociations.filter(u => u); // Filter out any nulls from the mapping
}

export async function updateUserPartnerRole(userId, partnerId, newRole) {
    if (!userId || !partnerId || !newRole) {
        throw new Error("Hiányzó paraméterek a frissítéshez.");
    }
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        [`partnerRoles.${partnerId}`]: newRole
    });
}

export async function removeUserPartnerAssociation(userId, partnerIdToRemove) {
    if (!userId || !partnerIdToRemove) {
        throw new Error("Hiányzó paraméterek a partnerkapcsolat törléséhez.");
    }
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        [`partnerRoles.${partnerIdToRemove}`]: firebase.firestore.FieldValue.delete()
    });
}

export async function getPartnersForSelection(userData) {
    if (userData.isEjkUser) {
        const partnersSnapshot = await db.collection('partners').get();
        return partnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else { // ENY user
        const partnerIds = Object.keys(userData.partnerRoles || {});
        if (partnerIds.length === 0) {
            return [];
        }
        
        // Firestore 'in' query is limited to 30 elements in the newer SDKs.
        // If there are more, we need to do multiple queries.
        const partnerPromises = [];
        for (let i = 0; i < partnerIds.length; i += 30) {
            const chunk = partnerIds.slice(i, i + 30);
            partnerPromises.push(db.collection('partners').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get());
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