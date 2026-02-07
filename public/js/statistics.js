import { db } from './firebase.js';
import { showScreen, screens, showPartnerWorkScreen } from './ui.js';
import { getPartnersForSelection } from './admin.js';
import { showScheduler } from './scheduler.js';

export async function showStatisticsScreen(user, userData) {
    // 1. Create screen element if it doesn't exist
    if (!screens.statistics) {
        const statsScreen = document.createElement('div');
        statsScreen.id = 'statisticsScreen';
        statsScreen.className = 'screen hidden'; // Ensure it starts hidden
        document.getElementById('app-container').appendChild(statsScreen);
        screens.statistics = statsScreen;
    }

    // 2. Show initial loading state (just for the structure)
    showScreen('statistics');
    screens.statistics.innerHTML = `
        <div class="card max-w-4xl mx-auto text-center">
            <h1 class="text-3xl font-bold mb-6">Statisztikák</h1>
            <div class="loader mx-auto"></div>
            <p class="mt-4 text-blue-300">Partnerlista betöltése...</p>
        </div>
    `;

    try {
        // 3. Fetch Partners List First
        const partners = await getPartnersForSelection(userData);
        
        // 4. Render the Initial UI (Dropdown frame)
        renderInitialStatisticsUI(partners, userData);

    } catch (error) {
        console.error("Hiba a partnerek betöltésekor:", error);
        screens.statistics.innerHTML = `
            <div class="card max-w-md mx-auto text-center">
                <h2 class="text-2xl font-bold mb-4 text-red-400">Hiba történt</h2>
                <p class="text-gray-300 mb-6">Nem sikerült betölteni a partnerlistát.</p>
                <button id="backToMainFromStatsError" class="btn btn-secondary w-full">Vissza</button>
            </div>
        `;
        document.getElementById('backToMainFromStatsError').addEventListener('click', () => {
            window.location.reload();
        });
    }
}

// Helper to fetch and render stats for specific partners
async function loadStatsForPartners(partnerIdsToLoad, allPartners, userData) {
    const contentArea = document.getElementById('stats-content-area');
    if (!contentArea) return;

    // Show loading in the content area
    contentArea.innerHTML = `
        <div class="text-center py-12">
            <div class="loader mx-auto mb-4"></div>
            <p class="text-blue-300">Adatok lekérése és feldolgozása...</p>
            <p class="text-sm text-gray-400 mt-2">Ez több másodpercig is eltarthat...</p>
        </div>
    `;

    try {
        const partnerStats = []; // Array to hold stats for each partner

        // Fetch devices for selected partners
        await Promise.all(partnerIdsToLoad.map(async (partnerId) => {
            const partner = allPartners.find(p => p.id === partnerId);
            if (!partner) return;

            const devicesSnapshot = await db.collection('partners').doc(partnerId).collection('devices').get();
            
            const stats = {
                partnerId: partner.id,
                partnerName: partner.name,
                partnerAddress: partner.address,
                partnerObj: partner, // Store full object for navigation
                expiredCount: 0,
                noInspectionCount: 0,
                monthlyExpirations: {}, // Key: "YYYY-MM", Value: { count: number, companies: Set<string> }
                totalDevices: 0,
                devices: []
            };

            // Helper to process items in chunks
            async function processInChunks(items, chunkProcessor, chunkSize = 10) {
                const results = [];
                for (let i = 0; i < items.length; i += chunkSize) {
                    const chunk = items.slice(i, i + chunkSize);
                    const chunkResults = await Promise.all(chunk.map(chunkProcessor));
                    results.push(...chunkResults);
                }
                return results;
            }

            const devices = await processInChunks(devicesSnapshot.docs, async (doc) => {
                const deviceData = doc.data();
                deviceData.id = doc.id; // Add ID for persistence
                
                // --- OPTIMIZATION (2024-02-05): Check Denormalized Data First ---
                if (deviceData.kovetkezoIdoszakosVizsgalat) {
                    // Fast path: Data exists on device document
                    deviceData.kov_vizsg = deviceData.kovetkezoIdoszakosVizsgalat;
                    deviceData.szakerto = deviceData.szakerto;
                } else {
                    // Slow path: Fallback to fetching latest inspection (Legacy/Backward Compatibility)
                    try {
                        const latestInspectionSnapshot = await db.collection('partners').doc(partnerId)
                            .collection('devices').doc(doc.id)
                            .collection('inspections')
                            .orderBy('createdAt', 'desc')
                            .limit(1)
                            .get();
                        
                        if (!latestInspectionSnapshot.empty) {
                            const latestInspection = latestInspectionSnapshot.docs[0].data();
                            deviceData.kov_vizsg = latestInspection.kovetkezoIdoszakosVizsgalat;
                            deviceData.szakerto = latestInspection.szakerto;
                        }
                    } catch (err) {
                        console.error(`Error fetching inspection for device ${doc.id}:`, err);
                        // Continue even if one fails
                    }
                }
                
                return deviceData;
            }, 10); // Process 10 devices at a time

            // Filter devices for EKV users (only isI: true)
            const statsDevices = (userData.isEkvUser) ? devices.filter(d => d.isI === true) : devices;

            stats.totalDevices = statsDevices.length;
            stats.devices = statsDevices;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            statsDevices.forEach(device => {
                if (!device.kov_vizsg) {
                    stats.noInspectionCount++;
                    return;
                }

                // Normalize date format (YYYY.MM.DD -> YYYY-MM-DD)
                const dateStr = device.kov_vizsg.replace(/\./g, '-');
                const vizsgDate = new Date(dateStr);
                
                if (isNaN(vizsgDate.getTime())) {
                    stats.noInspectionCount++; // Treat invalid date as no inspection
                    return; 
                }

                if (vizsgDate < today) {
                    stats.expiredCount++;
                } else {
                    // Upcoming
                    const yearMonth = dateStr.substring(0, 7); // "YYYY-MM"
                    if (!stats.monthlyExpirations[yearMonth]) {
                        stats.monthlyExpirations[yearMonth] = { count: 0, companies: new Set() };
                    }
                    stats.monthlyExpirations[yearMonth].count++;
                    stats.monthlyExpirations[yearMonth].companies.add(partner.name);
                }
            });
            
            partnerStats.push(stats);
        }));

        // Render the results
        renderStatsContent(partnerStats, userData);
        
        // Re-attach scheduler button listener since we have new data
        setupSchedulerButton(partnerStats, userData);

    } catch (error) {
        console.error("Hiba a statisztikák betöltésekor:", error);
        contentArea.innerHTML = `
            <div class="text-center text-red-400 py-8">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Hiba történt az adatok betöltése közben.</p>
            </div>
        `;
    }
}

function renderInitialStatisticsUI(partners, userData) {
    const isEjkUser = userData.isEjkUser;
    
    // Sort partners alphabetically
    partners.sort((a, b) => a.name.localeCompare(b.name));

    let contentHtml = '';

    if (isEjkUser) {
        // EJK View: Dropdown + Aggregate/Specific View
        const optionsHtml = partners.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        const dropdownHtml = `
            <div class="mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-grow">
                    <label for="stats-partner-select" class="block text-sm font-medium text-gray-300 mb-2">Partner kiválasztása</label>
                    <select id="stats-partner-select" class="input-field w-full bg-gray-700 border-gray-600 text-white">
                        <option value="all" selected>Összes Partner (Összesítő)</option>
                        ${optionsHtml}
                    </select>
                </div>
                <div id="action-button-container">
                     <!-- This will dynamically change based on selection -->
                     <button id="load-all-stats-btn" class="btn btn-primary h-12 w-full md:w-auto">
                        <i class="fas fa-download mr-2"></i> Adatok betöltése (Összes)
                     </button>
                </div>
            </div>
        `;

        contentHtml += dropdownHtml;
        contentHtml += `<div id="stats-content-area" class="min-h-[200px]">
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-chart-bar text-4xl mb-4 opacity-50"></i>
                <p>Válassz egy partnert a listából, vagy töltsd be az összes adatot.</p>
            </div>
        </div>`; 
    } else {
        // ENY View: List all associated partners - Auto load since usually small number
        contentHtml += `<div id="stats-content-area" class="min-h-[200px]"></div>`;
    }

    // Modal for company details
    const modalHtml = `
        <div id="statsModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center hidden z-50">
            <div class="bg-gray-800 border border-blue-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 id="statsModalTitle" class="text-xl font-bold text-white mb-4">Cégek listája</h3>
                <ul id="statsModalList" class="text-gray-300 space-y-2 mb-6 max-h-60 overflow-y-auto">
                    <!-- List items will be injected here -->
                </ul>
                <button id="closeStatsModal" class="btn btn-secondary w-full">Bezárás</button>
            </div>
        </div>
    `;

    const html = `
        <div class="card max-w-5xl mx-auto relative">
             <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 class="text-3xl font-bold">Statisztikák</h1>
                <div class="flex gap-2 w-full md:w-auto justify-end">
                    <button id="openSchedulerBtn" class="btn btn-primary hidden">Vizsgálati időpont egyeztetés</button>
                    <button id="backToMainFromStats" class="btn btn-secondary">Vissza</button>
                </div>
            </div>
            
            ${contentHtml}
        </div>
        ${modalHtml}
    `;

    screens.statistics.innerHTML = html;

    // Navigation Listeners
    document.getElementById('backToMainFromStats').addEventListener('click', () => {
        showScreen('main');
    });

    // Modal Logic
    const modal = document.getElementById('statsModal');
    const closeModalBtn = document.getElementById('closeStatsModal');
    
    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    window.showStatsModal = (title, items) => {
        document.getElementById('statsModalTitle').textContent = title;
        const list = document.getElementById('statsModalList');
        list.innerHTML = items.map(item => `<li class="border-b border-gray-700 pb-1 last:border-0">${item}</li>`).join('');
        modal.classList.remove('hidden');
    };

    // --- Logic for EJK Dropdown & Actions ---
    if (isEjkUser) {
        const partnerSelect = document.getElementById('stats-partner-select');
        const actionContainer = document.getElementById('action-button-container');
        const loadAllBtn = document.getElementById('load-all-stats-btn');

        // Handle Load All Click
        if (loadAllBtn) {
            loadAllBtn.addEventListener('click', () => {
                const allPartnerIds = partners.map(p => p.id);
                loadStatsForPartners(allPartnerIds, partners, userData);
            });
        }

        // Handle Change
        partnerSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            
            if (selectedValue === 'all') {
                // Show "Load All" button again, clear content or show placeholder
                actionContainer.innerHTML = `
                     <button id="load-all-stats-btn" class="btn btn-primary h-12 w-full md:w-auto">
                        <i class="fas fa-download mr-2"></i> Adatok betöltése (Összes)
                     </button>
                `;
                document.getElementById('load-all-stats-btn').addEventListener('click', () => {
                    const allPartnerIds = partners.map(p => p.id);
                    loadStatsForPartners(allPartnerIds, partners, userData);
                });
                
                document.getElementById('stats-content-area').innerHTML = `
                    <div class="text-center py-12 text-gray-400">
                         <i class="fas fa-chart-bar text-4xl mb-4 opacity-50"></i>
                        <p>Válassz egy partnert a listából, vagy töltsd be az összes adatot.</p>
                    </div>
                `;
            } else {
                // Specific Partner Selected -> Auto Load
                actionContainer.innerHTML = ''; // Hide button, auto-loading
                loadStatsForPartners([selectedValue], partners, userData);
            }
        });
    } else {
        // ENY User - Auto load their partners
        const allPartnerIds = partners.map(p => p.id);
        loadStatsForPartners(allPartnerIds, partners, userData);
    }
}

function renderStatsContent(partnerStats, userData) {
    const isEjkUser = userData.isEjkUser;
    const contentArea = document.getElementById('stats-content-area');
    
    // Sort partners alphabetically
    partnerStats.sort((a, b) => a.partnerName.localeCompare(b.partnerName));
    
    // Determine context (Single vs Aggregate) logic based on userData and selection
    // NOTE: If we are here, 'partnerStats' contains exactly the data we requested.
    // However, for EJK 'all' view, we want to aggregate them into ONE card.
    // For specific view or ENY view, we show separate cards (or one specific card).

    const partnerSelect = document.getElementById('stats-partner-select');
    const isAggregateMode = isEjkUser && (!partnerSelect || partnerSelect.value === 'all');

    let statsToRender = [];
    
    if (isAggregateMode && partnerStats.length > 1) {
        // Calculate Aggregate
         const aggregateStats = {
            partnerName: "Összesített Statisztika",
            partnerAddress: "Minden partner adatai",
            expiredCount: 0,
            noInspectionCount: 0,
            monthlyExpirations: {},
            totalDevices: 0
        };

        partnerStats.forEach(stat => {
            aggregateStats.expiredCount += stat.expiredCount;
            aggregateStats.noInspectionCount += stat.noInspectionCount;
            aggregateStats.totalDevices += stat.totalDevices;
            
            for (const [month, data] of Object.entries(stat.monthlyExpirations)) {
                if (!aggregateStats.monthlyExpirations[month]) {
                    aggregateStats.monthlyExpirations[month] = { count: 0, companyDetails: [] };
                }
                aggregateStats.monthlyExpirations[month].count += data.count;
                
                // Add company details
                aggregateStats.monthlyExpirations[month].companyDetails.push({
                    name: stat.partnerName,
                    count: data.count
                });
            }
        });
        statsToRender = [aggregateStats];
    } else {
        // List mode (individual cards)
        statsToRender = partnerStats;
    }

    contentArea.innerHTML = statsToRender.map(stats => generateStatsCardHtml(stats, isAggregateMode)).join('');

    // Add click listeners for aggregate view rows
    if (isAggregateMode) {
            statsToRender.forEach(stats => {
            const sortedMonths = Object.keys(stats.monthlyExpirations).sort();
            sortedMonths.forEach(month => {
                const rowId = `row-${month}`;
                const rowElement = document.getElementById(rowId);
                if (rowElement) {
                    rowElement.addEventListener('click', () => {
                        const companyDetails = stats.monthlyExpirations[month].companyDetails.sort((a, b) => a.name.localeCompare(b.name));
                        const companyStrings = companyDetails.map(c => `${c.name} <span class="float-right font-bold text-white">${c.count} db</span>`);
                        
                        const [year, m] = month.split('-');
                        const monthName = new Date(year, m - 1).toLocaleString('hu-HU', { month: 'long' });
                        window.showStatsModal(`${year}. ${monthName} - Érintett cégek`, companyStrings);
                    });
                }
            });
            });
    } else {
        // Add click listeners for Expired Cards (only in non-aggregate mode)
        statsToRender.forEach(stats => {
            const expiredCardId = `expired-card-${stats.partnerId}`;
            const expiredCard = document.getElementById(expiredCardId);
            
            if (expiredCard) {
                expiredCard.addEventListener('click', () => {
                    if (stats.expiredCount > 0) {
                        // Navigate to device list with filter
                        sessionStorage.setItem('validityFilter', 'expired');
                        
                        // Need to reconstruct partner object since we might not have it fully if we came from aggregate breakdown,
                        // but here in 'else' block we are either in ENY view or EJK specific view.
                        // stats.partnerObj should be available if we added it in loadStatsForPartners.
                        // If for some reason it's missing (e.g. aggregate breakdown logic that I didn't verifyfully), we might need fallback.
                        // But wait, loadStatsForPartners creates 'stats' object where I added 'partnerObj'.
                        
                if (stats.partnerObj) {
                            showPartnerWorkScreen(stats.partnerObj, userData);
                        } else {
                            console.error("Partner object missing for navigation", stats);
                            alert("Hiba: Nem sikerült a navigáció a partnerhez.");
                        }
                    }
                });
            }

            // No Inspection Card Click Listener
            const noInspectionCardId = `no-inspection-card-${stats.partnerId}`;
            const noInspectionCard = document.getElementById(noInspectionCardId);
            
            if (noInspectionCard) {
                noInspectionCard.addEventListener('click', () => {
                    if (stats.noInspectionCount > 0) {
                        sessionStorage.setItem('validityFilter', 'no_inspection');
                        
                        if (stats.partnerObj) {
                            showPartnerWorkScreen(stats.partnerObj, userData);
                        } else {
                            console.error("Partner object missing for navigation", stats);
                            alert("Hiba: Nem sikerült a navigáció a partnerhez.");
                        }
                    }
                });
            }

            // Monthly breakdown Row Click Listeners
            const sortedMonths = Object.keys(stats.monthlyExpirations).sort();
            sortedMonths.forEach(month => {
                const rowId = `row-${stats.partnerId}-${month}`;
                const rowElement = document.getElementById(rowId);
                
                if (rowElement && stats.monthlyExpirations[month].count > 0) {
                    rowElement.addEventListener('click', () => {
                        const filterValue = month.replace('-', '.'); // YYYY-MM -> YYYY.MM
                        sessionStorage.setItem('kovVizsgFilter', filterValue);

                        if (stats.partnerObj) {
                            showPartnerWorkScreen(stats.partnerObj, userData);
                        } else {
                            console.error("Partner object missing for navigation", stats);
                            alert("Hiba: Nem sikerült a navigáció a partnerhez.");
                        }
                    });
                }
            });
        });
    }
}

function setupSchedulerButton(partnerStats, userData) {
    const isEjkUser = userData.isEjkUser;
     // Scheduler Button Logic
    const schedulerBtn = document.getElementById('openSchedulerBtn');
    if (schedulerBtn) {
        // Show for everyone except EKV users
        if (!userData.isEkvUser) {
            schedulerBtn.classList.remove('hidden');
        }

        // Remove old listeners to avoid duplicates (clone node trick or just overwrite property)
        const newBtn = schedulerBtn.cloneNode(true);
        schedulerBtn.parentNode.replaceChild(newBtn, schedulerBtn);
        
        newBtn.addEventListener('click', () => {
            // Collect all devices from all stats
            let allDevices = [];
            let partnerName = "Saját eszközök";
            let isAggregate = false;
            let partnerId = 'unknown';
            
            const partnerSelect = document.getElementById('stats-partner-select');
            const isAggregateMode = isEjkUser && (!partnerSelect || partnerSelect.value === 'all');

            if (isAggregateMode) {
                    isAggregate = true;
                    partnerName = "Összes Partner (Összesítő)";
                    // Flatten all devices
                     partnerStats.forEach(stat => {
                        if (stat.devices) {
                            // Add partnerName to each device for breakdown
                            const devicesWithPartner = stat.devices.map(d => ({...d, partnerName: stat.partnerName}));
                            allDevices = allDevices.concat(devicesWithPartner);
                        }
                    });

            } else {
                // Specific Partner or ENY
                 if (partnerStats.length === 1) {
                    partnerName = partnerStats[0].partnerName;
                    partnerId = partnerStats[0].partnerId;
                }
                partnerStats.forEach(stat => {
                    if (stat.devices) {
                         allDevices = allDevices.concat(stat.devices);
                    }
                });
            }

            let isReadOnly = false;
            if (isEjkUser) {
                 // Check roles array for EJK read access
                if (userData.roles && (userData.roles.includes('EJK_read') || userData.roles.includes('EJK_reader'))) {
                    isReadOnly = true;
                }
            } else {
                 // ENY Logic
                if (userData.partnerRoles && userData.partnerRoles[partnerId] === 'read') {
                    isReadOnly = true;
                }
            }

            showScheduler(partnerId, partnerName, allDevices, isEjkUser, isAggregate, isReadOnly);
        });
    }
}

function generateStatsCardHtml(stats, isAggregate) {
    const sortedMonths = Object.keys(stats.monthlyExpirations).sort();
    
    const rowsHtml = sortedMonths.map(month => {
        const [year, m] = month.split('-');
        const monthName = new Date(year, m - 1).toLocaleString('hu-HU', { month: 'long' });
        const formattedMonth = `${year}. ${monthName}`;
        const data = stats.monthlyExpirations[month];
        
        // Add ID and cursor pointer
        const rowId = isAggregate ? `id="row-${month}"` : `id="row-${stats.partnerId}-${month}"`;
        // Animation class for interactivity
        const cursorClass = 'cursor-pointer hover:bg-gray-700/50 transition-colors transform hover:translate-x-1 duration-200';

        return `
            <tr ${rowId} class="border-b border-gray-700 ${cursorClass}">
                <td class="py-2 px-3 text-gray-300 text-sm">
                    ${formattedMonth}
                    ${isAggregate ? '<i class="fas fa-info-circle ml-2 text-blue-400 text-xs"></i>' : ''}
                </td>
                <td class="py-2 px-3 text-white font-bold text-right text-sm">${data.count} db</td>
            </tr>
        `;
    }).join('');

    // Determine interactivity for expired card
    const expiredCardId = !isAggregate ? `expired-card-${stats.partnerId}` : '';
    const expiredCursorClass = (!isAggregate && stats.expiredCount > 0) ? 'cursor-pointer transform hover:scale-105 transition-all duration-200 shadow-lg' : '';
    const expiredTitle = (!isAggregate && stats.expiredCount > 0) ? 'title="Kattintson a listázáshoz"' : '';

    return `
        <div class="bg-gray-800/50 rounded-lg border border-blue-800 p-6 mb-8">
            <div class="mb-6 border-b border-gray-700 pb-4">
                <h2 class="text-2xl font-bold text-blue-300">${stats.partnerName}</h2>
                <p class="text-gray-400 text-sm">${stats.partnerAddress}</p>
                <p class="text-gray-400 text-sm mt-1">Összes eszköz: <span class="text-white font-semibold">${stats.totalDevices}</span></p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <!-- Expired Card -->
                <div id="${expiredCardId}" ${expiredTitle} class="p-4 rounded-lg border ${stats.expiredCount > 0 ? 'border-red-500 bg-red-900/20' : 'border-green-500 bg-green-900/20'} text-center ${expiredCursorClass}">
                    <h3 class="text-lg font-semibold mb-1 text-gray-200">Lejárt</h3>
                    <p class="text-3xl font-bold ${stats.expiredCount > 0 ? 'text-red-400' : 'text-green-400'}">${stats.expiredCount}</p>
                    <p class="text-xs text-gray-400">eszköz</p>
                </div>
                <!-- No Inspection Card -->
                <div id="${!isAggregate ? `no-inspection-card-${stats.partnerId}` : ''}" ${!isAggregate && stats.noInspectionCount > 0 ? 'title="Kattintson a listázáshoz"' : ''} class="p-4 rounded-lg border ${stats.noInspectionCount > 0 ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-600 bg-gray-700/20'} text-center ${(!isAggregate && stats.noInspectionCount > 0) ? 'cursor-pointer transform hover:scale-105 transition-all duration-200 shadow-lg' : ''}">
                    <h3 class="text-lg font-semibold mb-1 text-gray-200">Nincs vizsgálat</h3>
                    <p class="text-3xl font-bold ${stats.noInspectionCount > 0 ? 'text-yellow-400' : 'text-gray-400'}">${stats.noInspectionCount}</p>
                    <p class="text-xs text-gray-400">eszköz</p>
                </div>
            </div>

            <h3 class="text-lg font-semibold mb-3 text-white">Következő vizsgálatok esedékessége</h3>
            <div class="overflow-x-auto bg-gray-900/50 rounded-lg border border-gray-700">
                <table class="min-w-full text-left">
                    <thead class="bg-gray-800 text-gray-400 uppercase text-xs">
                        <tr>
                            <th class="py-2 px-3">Hónap</th>
                            <th class="py-2 px-3 text-right">Darabszám</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="2" class="py-3 px-3 text-center text-gray-500 text-sm">Nincs megjeleníthető adat.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

