import { db } from './firebase.js';
import { showScreen, screens } from './ui.js';
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

    // 2. Show loading state
    const loadingHtml = `
        <div class="card max-w-4xl mx-auto text-center">
            <h1 class="text-3xl font-bold mb-6">Statisztikák</h1>
            <div class="loader mx-auto"></div>
            <p class="mt-4 text-blue-300">Adatok betöltése és feldolgozása...</p>
            <button id="backToMainFromStatsLoading" class="btn btn-secondary mt-6">Vissza</button>
        </div>
    `;
    screens.statistics.innerHTML = loadingHtml;
    showScreen('statistics');

    document.getElementById('backToMainFromStatsLoading').addEventListener('click', () => {
        window.location.reload();
    });

    try {
        // 3. Fetch Data
        const partners = await getPartnersForSelection(userData);
        const partnerIds = partners.map(p => p.id);

        const partnerStats = []; // Array to hold stats for each partner

        // Fetch devices for all partners
        await Promise.all(partnerIds.map(async (partnerId) => {
            const partner = partners.find(p => p.id === partnerId);
            const devicesSnapshot = await db.collection('partners').doc(partnerId).collection('devices').get();
            
            const stats = {
                partnerId: partner.id,
                partnerName: partner.name,
                partnerAddress: partner.address,
                expiredCount: 0,
                noInspectionCount: 0,
                monthlyExpirations: {}, // Key: "YYYY-MM", Value: { count: number, companies: Set<string> }
                totalDevices: 0,
                devices: []
            };

            const devices = await Promise.all(devicesSnapshot.docs.map(async (doc) => {
                const deviceData = doc.data();
                deviceData.id = doc.id; // Add ID for persistence
                
                // Fetch latest inspection
                const latestInspectionSnapshot = await db.collection('partners').doc(partnerId)
                    .collection('devices').doc(doc.id)
                    .collection('inspections')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();
                
                if (!latestInspectionSnapshot.empty) {
                    const latestInspection = latestInspectionSnapshot.docs[0].data();
                    deviceData.kov_vizsg = latestInspection.kovetkezoIdoszakosVizsgalat;
                }
                
                return deviceData;
            }));

            stats.totalDevices = devices.length;
            stats.devices = devices;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            devices.forEach(device => {
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

        // 5. Render UI
        renderStatisticsUI(partnerStats, userData.isEjkUser);

    } catch (error) {
        console.error("Hiba a statisztikák betöltésekor:", error);
        screens.statistics.innerHTML = `
            <div class="card max-w-md mx-auto text-center">
                <h2 class="text-2xl font-bold mb-4 text-red-400">Hiba történt</h2>
                <p class="text-gray-300 mb-6">Nem sikerült betölteni a statisztikákat.</p>
                <button id="backToMainFromStatsError" class="btn btn-secondary w-full">Vissza</button>
            </div>
        `;
        document.getElementById('backToMainFromStatsError').addEventListener('click', () => {
            window.location.reload();
        });
    }
}

function renderStatisticsUI(partnerStats, isEjkUser) {
    // Sort partners alphabetically
    partnerStats.sort((a, b) => a.partnerName.localeCompare(b.partnerName));

    let contentHtml = '';

    if (isEjkUser) {
        // EJK View: Dropdown + Aggregate/Specific View
        const optionsHtml = partnerStats.map(p => `<option value="${p.partnerId}">${p.partnerName}</option>`).join('');
        
        const dropdownHtml = `
            <div class="mb-6">
                <label for="stats-partner-select" class="block text-sm font-medium text-gray-300 mb-2">Partner kiválasztása</label>
                <select id="stats-partner-select" class="input-field w-full bg-gray-700 border-gray-600 text-white">
                    <option value="all" selected>Összes Partner (Összesítő)</option>
                    ${optionsHtml}
                </select>
            </div>
        `;

        contentHtml += dropdownHtml;
        contentHtml += `<div id="stats-content-area"></div>`; // Placeholder for stats
    } else {
        // ENY View: List all associated partners
        contentHtml += `<div id="stats-content-area"></div>`;
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
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">Statisztikák</h1>
                <div class="flex gap-2">
                    <button id="openSchedulerBtn" class="btn btn-primary hidden">Vizsgálati időpont egyeztetés</button>
                    <button id="backToMainFromStats" class="btn btn-secondary">Vissza</button>
                </div>
            </div>
            
            ${contentHtml}
        </div>
        ${modalHtml}
    `;

    screens.statistics.innerHTML = html;

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


    const contentArea = document.getElementById('stats-content-area');

    // Function to render cards based on selection
    const renderContent = (filterId) => {
        let statsToRender = [];
        let isAggregate = false;

        if (filterId === 'all') {
            if (isEjkUser) {
                // Aggregate for EJK
                isAggregate = true;
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
                            // Initialize with array for company details
                            aggregateStats.monthlyExpirations[month] = { count: 0, companyDetails: [] };
                        }
                        aggregateStats.monthlyExpirations[month].count += data.count;
                        
                        // Add company details (name and count for this month)
                        aggregateStats.monthlyExpirations[month].companyDetails.push({
                            name: stat.partnerName,
                            count: data.count
                        });
                    }
                });
                statsToRender = [aggregateStats];
            } else {
                // Show all for ENY (default behavior)
                statsToRender = partnerStats;
            }
        } else {
            // Specific partner
            statsToRender = partnerStats.filter(p => p.partnerId === filterId);
        }

        contentArea.innerHTML = statsToRender.map(stats => generateStatsCardHtml(stats, isAggregate)).join('');
        
        // Add click listeners for aggregate view rows
        if (isAggregate) {
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
        }
    };

    // Initial Render
    renderContent('all');

    // Event Listener for Dropdown
    if (isEjkUser) {
        const partnerSelect = document.getElementById('stats-partner-select');
        if (partnerSelect) {
            partnerSelect.addEventListener('change', (e) => {
                renderContent(e.target.value);
            });
        }
    }

    // Scheduler Button Logic
    const schedulerBtn = document.getElementById('openSchedulerBtn');
    if (schedulerBtn) {
        // Show for everyone (ENY and EJK)
        schedulerBtn.classList.remove('hidden');
        schedulerBtn.addEventListener('click', () => {
            // Collect all devices from all stats
            let allDevices = [];
            let partnerName = "Saját eszközök";
            let isAggregate = false;
            let partnerId = 'unknown';
            
            if (isEjkUser) {
                // For EJK, check if a specific partner is selected
                const partnerSelect = document.getElementById('stats-partner-select');
                const selectedPartnerId = partnerSelect ? partnerSelect.value : 'all';
                
                if (selectedPartnerId === 'all') {
                    isAggregate = true;
                    partnerName = "Összes Partner (Összesítő)";
                    partnerStats.forEach(stat => {
                        if (stat.devices) {
                            // Add partnerName to each device for breakdown
                            const devicesWithPartner = stat.devices.map(d => ({...d, partnerName: stat.partnerName}));
                            allDevices = allDevices.concat(devicesWithPartner);
                        }
                    });
                } else {
                    const selectedStat = partnerStats.find(p => p.partnerId === selectedPartnerId);
                    if (selectedStat) {
                        partnerName = selectedStat.partnerName;
                        partnerId = selectedStat.partnerId;
                        allDevices = selectedStat.devices || [];
                    }
                }
            } else {
                // ENY Logic
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

            showScheduler(partnerId, partnerName, allDevices, isEjkUser, isAggregate);
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
        
        // Add ID and cursor pointer if aggregate view
        const rowId = isAggregate ? `id="row-${month}"` : '';
        const cursorClass = isAggregate ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : '';

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

    return `
        <div class="bg-gray-800/50 rounded-lg border border-blue-800 p-6 mb-8">
            <div class="mb-6 border-b border-gray-700 pb-4">
                <h2 class="text-2xl font-bold text-blue-300">${stats.partnerName}</h2>
                <p class="text-gray-400 text-sm">${stats.partnerAddress}</p>
                <p class="text-gray-400 text-sm mt-1">Összes eszköz: <span class="text-white font-semibold">${stats.totalDevices}</span></p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <!-- Expired Card -->
                <div class="p-4 rounded-lg border ${stats.expiredCount > 0 ? 'border-red-500 bg-red-900/20' : 'border-green-500 bg-green-900/20'} text-center">
                    <h3 class="text-lg font-semibold mb-1 text-gray-200">Lejárt</h3>
                    <p class="text-3xl font-bold ${stats.expiredCount > 0 ? 'text-red-400' : 'text-green-400'}">${stats.expiredCount}</p>
                    <p class="text-xs text-gray-400">eszköz</p>
                </div>
                <!-- No Inspection Card -->
                <div class="p-4 rounded-lg border ${stats.noInspectionCount > 0 ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-600 bg-gray-700/20'} text-center">
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
