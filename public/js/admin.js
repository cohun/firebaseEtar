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
            
            // Check roles with more granularity
            const userPartnerEntries = Object.entries(user.partnerRoles || {});
            
            // Allow if user is an EJK User (internal)
            if (isUserEjk) return true;

            // Otherwise check specific roles
            return userPartnerEntries.some(([partnerId, role]) => {
                // Global visibility for EJK Admin:
                // 1. Existing Admins of any company
                // 2. Pending Admins of any company
                // 3. Independent Experts seeking approval
                if (['admin', 'pendingAdmin', 'pending_inspector'].includes(role)) {
                    return true;
                }
                
                // Restricted visibility:
                // 4. Regular "pending" users -> Only if applying to a company THIS admin manages (e.g. H-ITB)
                if (role === 'pending') {
                    return adminPartnerIds.includes(partnerId);
                }
                
                return false;
            });

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

    const validUsers = usersWithAssociations.filter(u => u);

    // 1. Sort associations within each user alphabetically by company name
    validUsers.forEach(user => {
        if (user.associations && user.associations.length > 0) {
            user.associations.sort((a, b) => {
                const nameA = a.partnerDetails?.name || '';
                const nameB = b.partnerDetails?.name || '';
                return nameA.localeCompare(nameB);
            });
        }
    });

    // 2. Sort the users list
    validUsers.sort((a, b) => {
        // Check if user has any pending role
        const getPriority = (user) => {
             const hasPending = user.associations.some(assoc => 
                ['pending', 'pendingAdmin', 'pending_inspector'].includes(assoc.role)
             );
             return hasPending ? 0 : 1; // 0 is higher priority (comes first)
        };

        const priorityA = getPriority(a);
        const priorityB = getPriority(b);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // Secondary sort: Company Name (of the first company)
        const companyA = a.associations[0]?.partnerDetails?.name || '';
        const companyB = b.associations[0]?.partnerDetails?.name || '';

        return companyA.localeCompare(companyB);
    });

    return validUsers;
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
    const partnerRef = db.collection('partners').doc(partnerId);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const partnerDoc = await transaction.get(partnerRef);

            if (!userDoc.exists) {
                throw "A felhasználó nem található!";
            }
            if (!partnerDoc.exists) {
                 throw "A partner nem található!";
            }

            const userData = userDoc.data();
            const partnerData = partnerDoc.data();
            const updates = {};

            // Determine if this is the EJK company (H-ITB)
            // We check by Code (Q27LXR) or Name includes/equals H-ITB logic
            const isEjkCompany = partnerData.etarCode === 'Q27LXR' || 
                                 (partnerData.name && partnerData.name.includes('H-ITB Kft'));

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

            // 2. Logic for EJK Company: Update 'roles' array and 'isEjkUser' flag
            if (isEjkCompany) {
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

                // Update isEjkUser flag
                // True if user is NOT pending, AND has some valid role
                // Valid roles: admin, write, read, inspector, subcontractor, subscriber
                // Invalid/Pending: pending, pendingAdmin, pending_inspector
                const shouldBeEjkUser = !newRole.startsWith('pending');
                updates['isEjkUser'] = shouldBeEjkUser;
                
                console.log(`EJK Role Update: ${oldEjkRole} -> ${newEjkRole}. isEjkUser: ${shouldBeEjkUser}`);
            }

            transaction.update(userRef, updates);
        });

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
        if (partnerDoc.exists) {
            const partnerData = partnerDoc.data();
            const isEjkCompany = partnerData.etarCode === 'Q27LXR' || partnerData.name.includes('H-ITB Kft');
            
            if (isEjkCompany) {
                 await userRef.update({
                     isEjkUser: false
                 });
                 console.log("Removed isEjkUser flag.");
            }
        }

        console.log("Partnerkapcsolat sikeresen eltávolítva.");
    } catch (error) {
        console.error("Hiba a partnerkapcsolat eltávolítása közben: ", error);
        throw new Error("A partnerkapcsolat eltávolítása sikertelen volt. " + error);
    }
}

export async function getPartnersForSelection(userData) {
    let partners = [];
    if (userData.isEjkUser) {
        const partnersSnapshot = await db.collection('partners').get();
        partners = partnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // For EJK users, we need to check ALL partners.
        // To be efficient, we fetch all users once (similar to getUsersForPermissionManagement)
        // because running N queries for N partners is slow.
        const usersSnapshot = await db.collection('users').get();
        const allUsers = usersSnapshot.docs.map(doc => doc.data());

        partners = partners.map(p => {
            const hasActiveAdmin = allUsers.some(u => u.partnerRoles && u.partnerRoles[p.id] === 'admin');
            return { ...p, hasActiveAdmin };
        });

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
        partners = [];
        partnerSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                partners.push({ id: doc.id, ...doc.data() });
            });
        });

        // For ENY users, we check active admin per partner.
        // Since they usually have few partners, individual queries are acceptable.
        await Promise.all(partners.map(async (p) => {
            try {
                const adminQuery = await db.collection('users')
                    .where(`partnerRoles.${p.id}`, '==', 'admin')
                    .limit(1)
                    .get();
                p.hasActiveAdmin = !adminQuery.empty;
            } catch (error) {
                console.error(`Error checking admin for partner ${p.id}`, error);
                // Fallback: assume true (don't highlight as pending/error)
                p.hasActiveAdmin = true; 
            }
        }));
    }

    // Sort partners
    partners.sort((a, b) => {
        // Priority 1: No Active Admin (hasActiveAdmin === false) comes first
        // false < true
        if (a.hasActiveAdmin !== b.hasActiveAdmin) {
            return a.hasActiveAdmin ? 1 : -1; 
        }

        // Priority 2: Alphabetical by Name
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
    });

    return partners;
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
