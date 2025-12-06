export function getUevmModalHtml() {
    return `
    <div id="uevm-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 hidden">
        <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-700">
            <!-- Header -->
            <div class="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 class="text-xl font-bold text-white">Univerzális Emelőgép Vizsgálati Melléklet (UEVM)</h3>
                <button id="uevm-close-btn" class="text-gray-400 hover:text-white focus:outline-none">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-gray-700 bg-gray-900/50">
                <button class="px-6 py-3 text-sm font-medium text-white border-b-2 border-blue-500 focus:outline-none transition-colors" data-tab="tab-general">
                    I. Általános Adatok
                </button>
                <button class="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent focus:outline-none transition-colors" data-tab="tab-detailed">
                    II. Részletes Vizsgálat
                </button>
                <button class="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent focus:outline-none transition-colors" data-tab="tab-loadtest">
                    III. Teherpróbák
                </button>
                <button class="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent focus:outline-none transition-colors" data-tab="tab-summary">
                    IV. Összegzés
                </button>
            </div>

            <!-- Content -->
            <div class="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <form id="uevm-form">
                    
                    <!-- TAB I: Általános Adatok -->
                    <div id="tab-general" class="tab-content">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Vizsgálat Típusa -->
                            <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                                <h4 class="text-blue-300 font-semibold mb-3">Vizsgálat típusa</h4>
                                <div class="flex flex-col gap-2">
                                    <label class="inline-flex items-center">
                                        <input type="checkbox" name="uevm_checkSzv" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-500 bg-gray-700">
                                        <span class="ml-2 text-white">Szerkezeti (SzV)</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="checkbox" name="uevm_checkFv" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-500 bg-gray-700">
                                        <span class="ml-2 text-white">Fővizsgálat (Fv)</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="checkbox" name="uevm_checkIbf" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-500 bg-gray-700">
                                        <span class="ml-2 text-white">Időszakos Biztonsági Felülvizsgálat (IBF)</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Gép Adatai -->
                            <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-1">Emelőgép jellege/típusa</label>
                                    <input type="text" name="uevm_emelogepTipusa" class="input-field w-full">
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Gyártási év</label>
                                        <input type="text" name="uevm_gyartasiEv" class="input-field w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Teherbírás (Q)</label>
                                        <input type="text" name="uevm_teherbiras" class="input-field w-full">
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Vizsgálati csoportszám</label>
                                        <input type="text" name="uevm_csoportszam" class="input-field w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Üzemóra / Km állás</label>
                                        <input type="text" name="uevm_uzemoraAllas" class="input-field w-full">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Szabványok -->
                        <div class="mt-6">
                            <label class="block text-sm font-medium text-gray-400 mb-1">Specifikus szabványok (vesszővel elválasztva)</label>
                            <input type="text" name="uevm_specifikusSzabvany" class="input-field w-full" placeholder="Pl. MSZ EN 12345...">
                            <p class="text-xs text-gray-500 mt-1">Alapértelmezett: EBSZ 47/1999. (VIII. 4.) GM r., Mvt., MSZ 9721-1:2020</p>
                        </div>
                    </div>

                    <!-- TAB II: Részletes Vizsgálat -->
                    <div id="tab-detailed" class="tab-content hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-700 border border-gray-700">
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/4">Vizsgálat Tárgya</th>
                                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/3">Mért érték / Megállapítás</th>
                                        <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-12">3</th>
                                        <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-12">2</th>
                                        <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-12">1</th>
                                        <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-12">0</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-gray-900/30 divide-y divide-gray-700">
                                    <!-- Row Helper Function would be nice, but explicit for now -->
                                    ${generateDetailedRow('4.2.', 'Dokumentáció', 'Napló, gépkönyv, CE, üzembehelyezési jkv.', 'uevm_dok', 'SZV')}
                                    ${generateDetailedRow('-', 'Korábbi hiányosságok', 'Előző jkv. szerinti hibák javítása', 'uevm_korabbi', 'SZV')}
                                    ${generateDetailedRow('4.4.', 'Tartószerkezet', 'Főtartó, gém, oszlop deformációja', 'uevm_tarto', 'SZV, MM')}
                                    ${generateDetailedRow('4.5.', 'Kötések állapota', 'Hegesztési varratok, csavarok', 'uevm_kotes', 'SZV, T')}
                                    ${generateDetailedRow('4.6.1', 'Gépészeti egységek', 'Kerekek, dobok, tengelyek kopása', 'uevm_gepeszet', 'SZV, ME')}
                                    ${generateDetailedRow('-', 'Hajlékony vonóelem', 'Drótkötél/Lánc sodrása, korróziója', 'uevm_vono', 'ME')}
                                    ${generateDetailedRow('-', 'Teherfelvevő eszköz', 'Horog, villa kopása, nyílásméret', 'uevm_teherfel', 'ME')}
                                    ${generateDetailedRow('4.8.', 'Biztonsági berendezések', 'Vészleállító, végállások, fékek', 'uevm_bizt', 'ÜJ')}
                                    ${generateDetailedRow('-', 'Érintésvédelem', 'Jegyzőkönyv száma, érvényessége', 'uevm_ev', 'SZV')}
                                    ${generateDetailedRow('4.10.', 'Korrózióvédelem', 'Festés állapota, rétegvastagság', 'uevm_korr', 'ME')}
                                    ${generateDetailedRow('4.18.', 'Korszerűsítési szükséglet', 'Kockázatcsökkentés lehetőségei', 'uevm_korsz', 'SZV')}
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-4 p-3 bg-gray-800 rounded border border-gray-600 text-xs text-gray-400">
                            <strong>Jelmagyarázat: 3:</strong> Megfelelő | <strong>2:</strong> Fokozott ellenőrzés szükséges | <strong>1:</strong> Javítandó (határidővel) | <strong>0:</strong> Azonnal leállítandó!
                        </div>
                    </div>

                    <!-- TAB III: Teherpróbák -->
                    <div id="tab-loadtest" class="tab-content hidden">
                        <div class="space-y-6">
                            <!-- Üresjárati -->
                            <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                                <h4 class="text-blue-300 font-semibold mb-2">1. Üresjárati vizsgálat (ÜJ)</h4>
                                <p class="text-sm text-gray-400 mb-3">Funkciók, irányhűség, vészleállító, végállások ellenőrzése terhelés nélkül.</p>
                                <div class="flex items-center gap-6">
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resUj" value="ok" class="form-radio h-4 w-4 text-green-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Megfelelt</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resUj" value="nok" class="form-radio h-4 w-4 text-red-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Nem felelt meg</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Üzemi Terhelés -->
                            <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                                <h4 class="text-blue-300 font-semibold mb-2">2. Üzemi Terhelés (ÜT)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-400 mb-1">Névleges teher (kg)</label>
                                        <input type="number" name="uevm_nevlegesTeher" class="input-field w-full">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-400 mb-1">Süllyedés (mm)</label>
                                        <input type="number" name="uevm_sullyedesMm" class="input-field w-full">
                                    </div>
                                </div>
                                <div class="flex items-center gap-6">
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resUt" value="ok" class="form-radio h-4 w-4 text-green-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Megfelelt</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resUt" value="nok" class="form-radio h-4 w-4 text-red-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Nem felelt meg</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Túlterhelés -->
                            <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                                <h4 class="text-blue-300 font-semibold mb-2">3. Túlterhelés (TT)</h4>
                                <div class="mb-3">
                                    <label class="block text-xs font-medium text-gray-400 mb-1">Próbateher (kg)</label>
                                    <input type="number" name="uevm_probateher" class="input-field w-full md:w-1/3">
                                </div>
                                <div class="flex items-center gap-6">
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resTt" value="ok" class="form-radio h-4 w-4 text-green-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Letiltott (Megfelelt)</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resTt" value="nok" class="form-radio h-4 w-4 text-red-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Nem tiltott le</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="uevm_resTt" value="na" class="form-radio h-4 w-4 text-gray-500 bg-gray-700 border-gray-500">
                                        <span class="ml-2 text-white">Nincs kiépítve</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB IV: Összegzés (Szöveg) -->
                    <div id="tab-summary" class="tab-content hidden">
                        <!-- Minősítés -->
                        <div class="mb-6">
                            <h4 class="text-white font-semibold mb-3">Minősítés</h4>
                            <div class="space-y-2">
                                <label class="flex items-center p-3 border border-gray-700 rounded hover:bg-gray-700/50 cursor-pointer">
                                    <input type="radio" name="uevm_minosites" value="w4" class="form-radio h-5 w-5 text-green-500 bg-gray-800 border-gray-600">
                                    <div class="ml-3">
                                        <span class="block text-white font-medium">ÜZEMSZERŰ HASZNÁLATRA ALKALMAS (w.4)</span>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-700 rounded hover:bg-gray-700/50 cursor-pointer">
                                    <input type="radio" name="uevm_minosites" value="w3" class="form-radio h-5 w-5 text-yellow-500 bg-gray-800 border-gray-600">
                                    <div class="ml-3">
                                        <span class="block text-white font-medium">FELTÉTELESEN ÜZEMELTETHETŐ (w.3)</span>
                                        <span class="block text-xs text-gray-400">Fokozott felügyelet szükséges a következő vizsgálatig.</span>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-700 rounded hover:bg-gray-700/50 cursor-pointer">
                                    <input type="radio" name="uevm_minosites" value="w2" class="form-radio h-5 w-5 text-orange-500 bg-gray-800 border-gray-600">
                                    <div class="ml-3">
                                        <span class="block text-white font-medium">EGYENÉRTÉKŰ BIZTONSÁG MELLETT ÜZEMELTETHETŐ (w.2)</span>
                                        <span class="block text-xs text-gray-400">Javítás a megadott határidőig kötelező.</span>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-700 rounded hover:bg-gray-700/50 cursor-pointer">
                                    <input type="radio" name="uevm_minosites" value="w1" class="form-radio h-5 w-5 text-red-500 bg-gray-800 border-gray-600">
                                    <div class="ml-3">
                                        <span class="block text-white font-medium">ÜZEMELTETÉSRE ALKALMATLAN (w.1)</span>
                                        <span class="block text-xs text-gray-400">Azonnali leállítás szükséges a hiba elhárításáig.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Hibák -->
                        <div class="mb-6">
                            <h4 class="text-white font-semibold mb-3">Feltárt Hibák és Intézkedési Terv</h4>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-700 border border-gray-700">
                                    <thead class="bg-gray-800">
                                        <tr>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-300 w-16">Hiv.</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-300">Géprész / Hiányosság</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-300">Teendő</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-300 w-32">Határidő</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-gray-900/30 divide-y divide-gray-700">
                                        ${generateDefectRow(1)}
                                        ${generateDefectRow(2)}
                                        ${generateDefectRow(3)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </form>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800">
                <button id="uevm-cancel-btn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors">Mégse</button>
                <button id="uevm-save-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-semibold transition-colors">Melléklet Mentése</button>
            </div>
        </div>
    </div>
    `;
}

function generateDetailedRow(ref, title, sub, key, methods) {
    return `
    <tr>
        <td class="px-4 py-2">
            <div class="text-sm font-medium text-white">${title}</div>
            <div class="text-xs text-gray-400">${sub} <span class="text-gray-500">(${methods})</span></div>
            ${ref !== '-' ? `<div class="text-xs text-blue-400 font-mono mt-1">Ref: ${ref}</div>` : ''}
        </td>
        <td class="px-4 py-2">
            <textarea name="${key}_megjegyzes" class="w-full bg-gray-700 border border-gray-600 rounded text-white text-xs p-1 focus:border-blue-500 focus:outline-none" rows="2"></textarea>
        </td>
        <td class="px-2 py-2 text-center">
            <input type="radio" name="${key}_val" value="3" class="form-radio h-4 w-4 text-green-500 bg-gray-800 border-gray-600">
        </td>
        <td class="px-2 py-2 text-center">
            <input type="radio" name="${key}_val" value="2" class="form-radio h-4 w-4 text-yellow-500 bg-gray-800 border-gray-600">
        </td>
        <td class="px-2 py-2 text-center">
            <input type="radio" name="${key}_val" value="1" class="form-radio h-4 w-4 text-orange-500 bg-gray-800 border-gray-600">
        </td>
        <td class="px-2 py-2 text-center">
            <input type="radio" name="${key}_val" value="0" class="form-radio h-4 w-4 text-red-500 bg-gray-800 border-gray-600">
        </td>
    </tr>
    `;
}

function generateDefectRow(num) {
    return `
    <tr>
        <td class="p-2 align-top">
            <input type="text" name="uevm_h${num}Id" class="w-full bg-gray-700 border border-gray-600 rounded text-white text-xs p-1" placeholder="Ref.">
        </td>
        <td class="p-2 align-top">
            <textarea name="uevm_h${num}Desc" class="w-full bg-gray-700 border border-gray-600 rounded text-white text-xs p-1" rows="2" placeholder="Leírás..."></textarea>
        </td>
        <td class="p-2 align-top">
            <textarea name="uevm_h${num}Action" class="w-full bg-gray-700 border border-gray-600 rounded text-white text-xs p-1" rows="2" placeholder="Teendő..."></textarea>
        </td>
        <td class="p-2 align-top">
            <input type="date" name="uevm_h${num}Date" class="w-full bg-gray-700 border border-gray-600 rounded text-white text-xs p-1">
        </td>
    </tr>
    `;
}

export function initUevmModal(saveCallback, initialData = null) {
    // Inject logic
    const modal = document.getElementById('uevm-modal');
    const form = document.getElementById('uevm-form');
    const closeBtn = document.getElementById('uevm-close-btn');
    const cancelBtn = document.getElementById('uevm-cancel-btn');
    const saveBtn = document.getElementById('uevm-save-btn');
    const tabs = document.querySelectorAll('#uevm-modal [data-tab]');
    const tabContents = document.querySelectorAll('#uevm-modal .tab-content');

    // 1. Show Modal
    modal.classList.remove('hidden');

    // 2. Pre-fill data if available
    if (initialData) {
        Object.keys(initialData).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.value === initialData[key] || initialData[key] === true) {
                        input.checked = true;
                    } 
                    // Special case for radio groups where value matches
                    if (input.type === 'radio' && input.name === key) {
                         const groupRadio = form.querySelector(`[name="${key}"][value="${initialData[key]}"]`);
                         if (groupRadio) groupRadio.checked = true;
                    }
                } else {
                    input.value = initialData[key];
                }
            } else {
                 // Try radio buttons by name
                 const radio = form.querySelector(`[name="${key}"][value="${initialData[key]}"]`);
                 if (radio) radio.checked = true;
            }
        });
    }

    // 3. Tab Logic
    tabs.forEach(tab => {
        tab.onclick = () => {
             // UI Update
             tabs.forEach(t => {
                 t.classList.remove('border-blue-500', 'text-white');
                 t.classList.add('border-transparent', 'text-gray-400');
             });
             tab.classList.remove('border-transparent', 'text-gray-400');
             tab.classList.add('border-blue-500', 'text-white');

             // Content Update
             const targetId = tab.dataset.tab;
             tabContents.forEach(content => {
                 if (content.id === targetId) {
                     content.classList.remove('hidden');
                 } else {
                     content.classList.add('hidden');
                 }
             });
        }
    });

    // 4. Close/Cancel
    const closeModal = () => {
        modal.classList.add('hidden');
        // Clean up listeners to avoid dupes? Ideally we destroy, but hiding is ok for simple app
    };
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    // 5. Save
    saveBtn.onclick = (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {};
        
        // Handle normal inputs
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Handle Checkboxes explicitly (FormData only includes them if checked)
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            data[cb.name] = cb.checked;
        });
        
        console.log("UEVM Data Saved:", data);
        if (saveCallback) saveCallback(data);
        closeModal();
    };
}
