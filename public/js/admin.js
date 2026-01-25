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
    // Fix: Only use partner IDs where the user is actually an ADMIN.
    // Otherwise, a user who is 'admin' in their own company but 'pending' in EJK would see all EJK users.
    const adminPartnerIds = Object.entries(adminUserData.partnerRoles || {})
        .filter(([_, role]) => role === 'admin')
        .map(([id, _]) => id);

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

export async function getExternalExperts() {
    // 1. Fetch all users where isEkvUser == true
    const usersSnapshot = await db.collection('users').where('isEkvUser', '==', true).get();
    const ekvUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Enhance with partner details
    const expertsWithAssociations = await Promise.all(ekvUsers.map(async (user) => {
        const userPartnerRoles = user.partnerRoles || {};
        const partnerIds = Object.keys(userPartnerRoles);

        if (partnerIds.length === 0) {
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                associations: []
            };
        }

        // Fetch partner details
        // Note: Ideally we should batch this or cache partners, but for now individual fetches or Promise.all is okay given scale.
        // To be safer with limits, we'll do Promise.all.
        const partnerDocs = await Promise.all(
            partnerIds.map(id => db.collection('partners').doc(id).get())
        );

        const associations = partnerDocs.map(doc => {
            if (!doc.exists) return null;
            const partnerId = doc.id;
            const partnerDetails = { id: partnerId, ...doc.data() };
            const role = userPartnerRoles[partnerId];
            const ejkRole = user.ejkPartnerRoles ? user.ejkPartnerRoles[partnerId] : null;
            const subscription = user.partnerSubscriptions ? user.partnerSubscriptions[partnerId] : null;
            
            return {
                partnerId: partnerId,
                role: role,
                ejkRole: ejkRole,
                subscription: subscription,
                partnerDetails: partnerDetails
            };
        }).filter(a => a);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            associations: associations
        };
    }));

    return expertsWithAssociations;
}

export async function updateUserPartnerRole(userId, partnerId, newRole, isEjkAction = false, newExpiryDate = null) {
    if (!userId || !partnerId || !newRole) {
        throw new Error("Hiányzó paraméterek a frissítéshez.");
    }

    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw "A felhasználó nem található!";
            }

            const userData = userDoc.data();
            const updates = {};

            // 1. Update the partnerRoles map
            updates[`partnerRoles.${partnerId}`] = newRole;

            // Update EJK specific memory of the role if this is an EJK action
            if (isEjkAction) {
                updates[`ejkPartnerRoles.${partnerId}`] = newRole;
            }

            // Handle Subscription Date
            if (newExpiryDate) {
                updates[`partnerSubscriptions.${partnerId}`] = newExpiryDate;
            } else if (newRole !== 'subscriber' && isEjkAction) {
                // If role changes from subscriber to something else, remove subscription
                 updates[`partnerSubscriptions.${partnerId}`] = firebase.firestore.FieldValue.delete();
            }

            // 2. If the user is an EJK user, also update the main 'roles' array
            if (userData.isEjkUser === true) {
                const oldRole = userData.partnerRoles?.[partnerId];
                const oldEjkRole = oldRole ? `EJK_${oldRole}` : null;
                const newEjkRole = `EJK_${newRole}`;

                let currentRoles = userData.roles || [];

                // Remove the old role if it existed
                if (oldEjkRole) {
                    currentRoles = currentRoles.filter(role => role !== oldEjkRole);
                }

                // Add the new role if it's not already there
                if (!currentRoles.includes(newEjkRole)) {
                    currentRoles.push(newEjkRole);
                }

                updates['roles'] = currentRoles;
            }

            transaction.update(userRef, updates);

            // 3. SPECIAL LOGIC FOR EJK PARTNER (Q27LXR)
            // If we are updating the EJK partner role, we must also set/unset the isEjkUser flag on the user.
            // We need to know if the partnerId corresponds to EJK.
            // Since we are inside a transaction, we should ideally fetch the partner doc, but we can't easily do a query inside tx if we didn't prepare.
            // However, we can do a check *after* or *outside*. 
            // BUT, to keep it consistent, let's assume valid EJK Partner ID if isEjkAction is true OR check against known ID if possible.
            // Better approach: We know EJK Code is Q27LXR. We can't know the ID easily without querying.
            // Let's rely on `isEjkAction` which implies the admin is an EJK admin acting. 
            // IF the admin is EJK admin, and they are modifying a user's role for THE EJK company, we update the flag.
            
            // Note: `isEjkAction` currently just means "An EJK admin is performing this". 
            // But an EJK admin can also manage other partners? 
            // Based on `admin.js` logic: `isAdminEJK` sees all companies.
            
            // Let's safe check: Fetch the partner to see if it is the EJK company.
            // This transaction is already running. We can't easily query inside it for "where etarCode == ...".
            // So we might need to split this or assume the calling code knows.
            
            // ALTERNATIVE: We can just check if the partnerDoc matches the EJK criteria if we had it.
            // Let's do a separate update for the flag if needed, or try to do it here if we can verify the partner.
            
            // For now, let's look up the partner OUTSIDE the transaction if we want to be 100% sure, or just check the ID if we knew it.
            // Let's assume we can fetch the partner doc to check its code.
        });
        
        // After transaction, let's check if we need to update isEjkUser flag.
        // This is a bit looser consistency but acceptable for this flag.
        const partnerDoc = await db.collection('partners').doc(partnerId).get();
        if (partnerDoc.exists && partnerDoc.data().etarCode === 'Q27LXR') {
             const isNowFullEJK = ['admin', 'write', 'read'].includes(newRole); // Define what constitutes "EJK User" access (usually admin/write)
             // Actually, isEjkUser usually implies being an employee/member of EJK.
             // If role is NOT pending, we consider them an EJK User.
             const shouldBeEjkUser = !newRole.startsWith('pending');

             await userRef.update({
                 isEjkUser: shouldBeEjkUser
             });
             console.log(`Updated isEjkUser to ${shouldBeEjkUser}`);
        }

        console.log("Felhasználói szerepkör sikeresen frissítve.");
    } catch (error) {
        console.error("Hiba a felhasználói szerepkör frissítése közben: ", error);
        throw new Error("A felhasználói szerepkör frissítése sikertelen volt. " + error);
    }
}

export async function removeUserPartnerAssociation(userId, partnerIdToRemove) {
    if (!userId || !partnerIdToRemove) {
        throw new Error("Hiányzó paraméterek a partnerkapcsolat törléséhez.");
    }

    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw "A felhasználó nem található!";
            }

            const userData = userDoc.data();
            const updates = {};

            // 1. Remove the partner association
            updates[`partnerRoles.${partnerIdToRemove}`] = firebase.firestore.FieldValue.delete();

            // 2. If the user is an EJK user, also update the main 'roles' array
            if (userData.isEjkUser === true) {
                const roleToRemove = userData.partnerRoles?.[partnerIdToRemove];
                if (roleToRemove) {
                    const ejkRoleToRemove = `EJK_${roleToRemove}`;
                    updates['roles'] = firebase.firestore.FieldValue.arrayRemove(ejkRoleToRemove);
                }
            }

            transaction.update(userRef, updates);
        });
        
        // Check if we removed EJK association
        const partnerDoc = await db.collection('partners').doc(partnerIdToRemove).get();
        if (partnerDoc.exists && partnerDoc.data().etarCode === 'Q27LXR') {
             await userRef.update({
                 isEjkUser: false
             });
             console.log("Removed isEjkUser flag.");
        }

        console.log("Partnerkapcsolat sikeresen eltávolítva.");
    } catch (error) {
        console.error("Hiba a partnerkapcsolat eltávolítása közben: ", error);
        throw new Error("A partnerkapcsolat eltávolítása sikertelen volt. " + error);
    }
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
export async function checkAndEnforceSubscriptionExpiry(user) {
    if (!user) return; // Basic check
    
    // We need the full user doc to check roles and subscriptions
    // 'user' might be just the auth object which doesn't have firestore data
    const userRef = db.collection('users').doc(user.uid);
    
    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) return;
        
        const userData = userDoc.data();
        // Only relevant for EKV users
        if (!userData.isEkvUser) return;

        const partnerSubscriptions = userData.partnerSubscriptions || {};
        const partnerRoles = userData.partnerRoles || {};
        const now = Date.now();
        let changed = false;

        for (const [partnerId, expiryTimestamp] of Object.entries(partnerSubscriptions)) {
             // Only check if current role is 'subscriber'
            if (partnerRoles[partnerId] === 'subscriber') {
                if (now > expiryTimestamp) {
                    console.log(`Subscription expired for partner ${partnerId}. Downgrading...`);
                    
                    // We call the existing update function which handles roles array logic properly
                    await updateUserPartnerRole(user.uid, partnerId, 'pending_inspector', true); // isEjkAction=true ensures ejkPartnerRoles is matched
                    changed = true;
                }
            }
        }
        
        if (changed) {
            console.log("Subscriptions enforced. Refreshing...");
            // Optional: reload page to update UI if currently viewing something relevant?
            // Or just let the user navigate.
            // A reload ensures they don't do actions they aren't allowed to do anymore visually.
            window.location.reload();
        }

    } catch (e) {
        console.error("Error enforcing subscription", e);
    }
}
