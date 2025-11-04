import { auth } from './firebase.js';

export function getPartnerWorkScreenHtml(partner, userData) {
    const user = auth.currentUser;
    const logoUrl = partner.logoUrl || 'images/ETAR_H.png';
    const role = userData.associatedPartner.find(ap => ap.etarCode === partner.etarCode)?.role;

    const isReadOnly = role === 'read';

    let uploadButtonHtml;
    if (isReadOnly) {
        uploadButtonHtml = `<button onclick="alert('Read jogosultsággal nem tölthet fel adatokat. Forduljon a jogosultság osztójához.')" class="btn btn-secondary opacity-50 cursor-not-allowed">Új eszköz feltöltés</button>`;
    } else {
        uploadButtonHtml = `<button onclick="window.location.href='adatbevitel.html'" class="btn btn-secondary">Új eszköz feltöltés</button>`;
    }

    return `
        <header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-lg">
            <div class="flex items-center">
                <img src="${logoUrl}" alt="${partner.name} Logo" class="h-16 w-16 object-contain mr-4 rounded-full border-2 border-blue-400">
                <div>
                    <h1 class="text-xl font-bold text-blue-300">${partner.name}</h1>
                    <p class="text-sm text-gray-400">${partner.address}</p>
                    <p class="text-sm text-gray-400 mt-2">Bejelentkezve: ${userData.name || user.displayName || user.email} (${role || 'N/A'})</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="btn btn-secondary">Adatlap</button>
                <button class="btn btn-secondary">Eszközök</button>
                <button class="btn btn-secondary">Jegyzőkönyvek</button>
                ${uploadButtonHtml}
                <button id="backToMainFromWorkScreenBtn" class="btn btn-primary">Vissza</button>
            </div>
        </header>
        <main class="p-8 flex-grow">
            <h2 class="text-3xl font-bold text-center text-white">Partner Portál</h2>
            <p class="text-center text-gray-300 mt-2">Itt jelennek majd meg a partner-specifikus funkciók és adatok.</p>
            <!-- Dinamikus tartalom helye -->
        </main>
        <footer class="p-4 bg-gray-800 text-white text-center text-sm">
            <p>&copy; ${new Date().getFullYear()} H-ITB Kft. | ETAR Rendszer</p>
        </footer>
    `;
}
