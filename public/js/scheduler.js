import { db } from './firebase.js';

let currentYear;
let currentMonth;
let currentDevices = [];
// moves structure: Key: originalDate (YYYY-MM-DD), Value: { targetDate: string, initiator: 'ENY'|'EJK', status: 'pending'|'accepted' }
let moves = {}; 
let parkingEvents = new Set(); // Set of originalDate (YYYY-MM-DD) currently in parking
let partnerNameStr = '';
let isEjkUserGlobal = false;
let isAggregateGlobal = false;
let currentPartnerId = null;
let unsubscribe = null;
let showK = true;
let showB = true;

function isK(device) {
    const name = device.szakerto;
    return name === 'Gerőly Iván' || name === 'Szadlon Norbert';
}

export function showScheduler(partnerId, partnerName, devices, isEjkUser = false, isAggregate = false) {
    currentDevices = devices;
    partnerNameStr = partnerName;
    isEjkUserGlobal = isEjkUser;
    isAggregateGlobal = isAggregate;
    currentPartnerId = partnerId;
    moves = {}; // Reset moves
    parkingEvents = new Set(); // Reset parking
    showK = true; // Reset filters
    showB = true;
    
    // Sync moves from devices (if they have appointment_proposal)
    syncMovesFromDevices();

    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    // Create Modal if not exists
    let modal = document.getElementById('schedulerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'schedulerModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center hidden z-50';
        document.body.appendChild(modal);
    }

    renderSchedulerUI();
    document.getElementById('schedulerModal').classList.remove('hidden');

    // Subscribe to changes if not aggregate (or even if aggregate, but maybe limited?)
    // For now, let's subscribe only if specific partner to avoid too many listeners or complex logic
    if (!isAggregate && partnerId !== 'unknown') {
        subscribeToChanges(partnerId);
    }
}

function syncMovesFromDevices() {
    moves = {};
    currentDevices.forEach(device => {
        if (device.appointment_proposal && device.kov_vizsg) {
            const originDate = device.kov_vizsg.replace(/\./g, '-');
            moves[originDate] = device.appointment_proposal;
        }
    });
}

function subscribeToChanges(partnerId) {
    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = db.collection('partners').doc(partnerId).collection('devices')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const deviceData = change.doc.data();
                deviceData.id = change.doc.id;
                
                // Update currentDevices
                const index = currentDevices.findIndex(d => d.id === deviceData.id);
                if (index !== -1) {
                    const existing = currentDevices[index];
                    // Replace with new data but preserve locally derived fields
                    currentDevices[index] = {
                        ...deviceData,
                        kov_vizsg: existing.kov_vizsg,
                        partnerName: existing.partnerName
                    };
                } else {
                    currentDevices.push(deviceData);
                }
            });
            
            syncMovesFromDevices();
            renderSchedulerUI();
        });
}

function renderSchedulerUI() {
    const modal = document.getElementById('schedulerModal');
    
    const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június",
        "Július", "Augusztus", "Szeptember", "Október", "November", "December"
    ];

    modal.innerHTML = `
        <div class="bg-gray-900 border border-blue-800 rounded-lg p-4 w-11/12 h-[95vh] flex flex-col shadow-2xl relative">
            <div class="flex flex-col md:flex-row justify-between items-center mb-2 border-b border-gray-700 pb-2 gap-6">
                <div class="min-w-[200px] text-center md:text-left">
                    <h2 class="text-xl font-bold text-white">Időpont egyeztetés</h2>
                    <p class="text-blue-400 text-sm">${partnerNameStr}</p>
                    <p class="text-gray-500 text-xs mt-1">
                        ${isEjkUserGlobal ? 'EJK Nézet' : 'Partner Nézet'} 
                        ${isAggregateGlobal ? '(Összesített - Csak olvasás)' : ''}
                    </p>
                    ${isEjkUserGlobal ? `
                    <div class="mt-2 flex gap-3 text-xs text-gray-300">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="filterK" class="form-checkbox h-3 w-3 text-blue-500 rounded focus:ring-0" ${showK ? 'checked' : ''}>
                            <span class="ml-1">K (Gerőly/Szadlon)</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="filterB" class="form-checkbox h-3 w-3 text-blue-500 rounded focus:ring-0" ${showB ? 'checked' : ''}>
                            <span class="ml-1">B (Nagy/Bagyinszki)</span>
                        </label>
                    </div>
                    ` : ''}
                </div>

                <!-- Parking Zone -->
                <div id="parkingZone" class="w-full md:w-1/2 bg-gray-800/80 border-2 border-dashed border-gray-600 rounded-lg p-1 min-h-[50px] flex flex-wrap gap-1 items-center justify-center transition-colors drop-zone overflow-y-auto max-h-[80px]" data-zone="parking">
                    <div class="text-gray-500 text-[10px] font-bold mr-2 select-none pointer-events-none">
                        <i class="fas fa-clipboard mr-1"></i>Átmeneti tároló
                    </div>
                    ${generateParkingContent()}
                </div>

                <button id="closeScheduler" class="text-gray-400 hover:text-white text-2xl self-end md:self-center">&times;</button>
            </div>

            <div class="flex justify-between items-center mb-2">
                <button id="prevMonth" class="btn btn-sm btn-secondary py-1 px-2 text-xs"><i class="fas fa-chevron-left"></i> Előző</button>
                <h3 class="text-lg font-bold text-white">${currentYear}. ${monthNames[currentMonth]}</h3>
                <button id="nextMonth" class="btn btn-sm btn-secondary py-1 px-2 text-xs">Következő <i class="fas fa-chevron-right"></i></button>
            </div>

            <div class="flex-grow overflow-hidden bg-gray-800 rounded-lg p-2 flex flex-col">
                <div class="grid grid-cols-7 gap-1 mb-1">
                    ${['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map(day => 
                        `<div class="text-center font-bold text-gray-400 text-xs py-1">${day}</div>`
                    ).join('')}
                </div>
                <div class="grid grid-cols-7 gap-1 flex-grow h-0 overflow-y-auto">
                    ${generateCalendarGrid()}
                </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center">
                <div class="text-xs text-gray-400 flex gap-3">
                    <div class="flex items-center"><span class="inline-block w-2 h-2 bg-blue-600 rounded-full mr-1"></span> Eredeti</div>
                    <div class="flex items-center"><span class="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1"></span> Partner Tervezett</div>
                    <div class="flex items-center"><span class="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span> EJK Tervezett</div>
                    <div class="flex items-center"><span class="inline-block w-2 h-2 bg-green-700 rounded-full mr-1"></span> Elfogadva</div>
                </div>
                <!-- Future: Save button -->
            </div>
        </div>
    `;

    // Event Listeners
    document.getElementById('closeScheduler').addEventListener('click', () => {
        document.getElementById('schedulerModal').classList.add('hidden');
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    });

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderSchedulerUI();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderSchedulerUI();
    });

    if (isEjkUserGlobal) {
        document.getElementById('filterK').addEventListener('change', (e) => {
            showK = e.target.checked;
            renderSchedulerUI();
        });

        document.getElementById('filterB').addEventListener('change', (e) => {
            showB = e.target.checked;
            renderSchedulerUI();
        });
    }

    if (!isAggregateGlobal) {
        addDragAndDropListeners();
    }
}

function generateParkingContent() {
    let html = '';
    parkingEvents.forEach(originDate => {
        const devices = currentDevices.filter(d => d.kov_vizsg && d.kov_vizsg.replace(/\./g, '-') === originDate);
        
        if (isEjkUserGlobal) {
            const kDevices = devices.filter(d => isK(d));
            const bDevices = devices.filter(d => !isK(d));

            const renderParkingBrick = (devs, type) => {
                if (devs.length === 0) return '';
                return `
                    <div class="bg-blue-600 text-white text-[10px] p-1 rounded cursor-move draggable-event shadow-sm flex items-center justify-between gap-2 min-w-[80px]" draggable="${!isAggregateGlobal}" data-origin-date="${originDate}" data-from-parking="true">
                        <span>${originDate}</span>
                        <div class="flex items-center">
                            <span class="font-bold">${devs.length}</span>
                            <span class="ml-1 pl-1 border-l border-white/30 font-bold">${type}</span>
                        </div>
                    </div>
                `;
            };

            if (showK) html += renderParkingBrick(kDevices, 'K');
            if (showB) html += renderParkingBrick(bDevices, 'B');
        } else {
            // Original View for non-EJK
             html += `
                <div class="bg-blue-600 text-white text-[10px] p-1 rounded cursor-move draggable-event shadow-sm flex items-center gap-1" draggable="${!isAggregateGlobal}" data-origin-date="${originDate}" data-from-parking="true">
                    <span>${originDate}</span>
                    <span class="font-bold bg-blue-800 px-1 rounded-full">${devices.length}</span>
                </div>
            `;
        }
    });
    return html;
}

function generateCalendarGrid() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Adjust for Monday start (Monday=1, Sunday=7)
    let startDay = firstDay === 0 ? 6 : firstDay - 1;

    let html = '';

    // Empty cells for previous month
    for (let i = 0; i < startDay; i++) {
        html += `<div class="bg-gray-800/50 border border-gray-700 rounded p-1 min-h-[60px]"></div>`;
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const events = getEventsForDate(dateStr);
        
        let clickAction = '';
        if (isAggregateGlobal) {
            clickAction = `onclick="showBreakdownModal('${dateStr}')"`;
        }
        
        html += `
            <div class="bg-gray-700/50 border border-gray-600 rounded p-1 min-h-[60px] relative hover:bg-gray-700 transition-colors drop-zone flex flex-col cursor-pointer" data-date="${dateStr}" ${clickAction}>
                <span class="text-gray-400 font-bold text-xs mb-1">${day}</span>
                <div class="space-y-1 flex-grow">
                    ${events}
                </div>
            </div>
        `;
    }

    return html;
}

function getEventsForDate(dateStr) {
    let html = '';
    
    // 1. Check for original expirations on this date
    const expiringDevices = currentDevices.filter(d => {
        if (!d.kov_vizsg) return false;
        // Handle YYYY.MM.DD format
        const dDate = d.kov_vizsg.replace(/\./g, '-');
        return dDate === dateStr;
    });

    if (expiringDevices.length > 0) {
        if (isEjkUserGlobal) {
            // Split into K and B
            const kDevices = expiringDevices.filter(d => isK(d));
            const bDevices = expiringDevices.filter(d => !isK(d));

            const renderBrick = (devices, type) => {
                if (devices.length === 0) return '';
                
                if (moves[dateStr] || parkingEvents.has(dateStr)) {
                    let title = "Átmeneti tárolóban";
                    if (moves[dateStr]) {
                        title = `Áthelyezve ide: ${moves[dateStr].targetDate}`;
                    }
                    return `
                        <div class="bg-blue-900/30 text-blue-500 text-xs p-1 rounded border border-blue-900/50 line-through opacity-50 cursor-not-allowed mb-1 flex justify-between items-center" title="${title}">
                            <span>${devices.length} db lejárat</span>
                            <span class="font-bold border-l border-blue-500/30 pl-1 ml-1">${type}</span>
                        </div>
                    `;
                } else {
                    return `
                        <div class="bg-blue-600 text-white text-xs p-1 rounded cursor-move draggable-event shadow-sm mb-1 flex justify-between items-center" draggable="${!isAggregateGlobal}" data-origin-date="${dateStr}">
                            <span>${devices.length} db lejárat</span>
                            <span class="font-bold border-l border-white/30 pl-1 ml-1">${type}</span>
                        </div>
                    `;
                }
            };

            if (showK) html += renderBrick(kDevices, 'K');
            if (showB) html += renderBrick(bDevices, 'B');
        } else {
            // Original View for non-EJK
            if (moves[dateStr] || parkingEvents.has(dateStr)) {
                let title = "Átmeneti tárolóban";
                if (moves[dateStr]) {
                    title = `Áthelyezve ide: ${moves[dateStr].targetDate}`;
                }
                html += `
                    <div class="bg-blue-900/30 text-blue-500 text-xs p-1 rounded border border-blue-900/50 line-through opacity-50 cursor-not-allowed" title="${title}">
                        ${expiringDevices.length} db lejárat
                    </div>
                `;
            } else {
                html += `
                    <div class="bg-blue-600 text-white text-xs p-1 rounded cursor-move draggable-event shadow-sm" draggable="${!isAggregateGlobal}" data-origin-date="${dateStr}">
                        ${expiringDevices.length} db lejárat
                    </div>
                `;
            }
        }
    }

    // 2. Check for PROPOSED moves TO this date
    // Find any key in 'moves' where value.targetDate === dateStr
    const movedFromDates = Object.keys(moves).filter(originDate => moves[originDate].targetDate === dateStr);
    
    movedFromDates.forEach(originDate => {
        const move = moves[originDate];
        const allMovedDevices = currentDevices.filter(d => d.kov_vizsg && d.kov_vizsg.replace(/\./g, '-') === originDate);
        
        if (isEjkUserGlobal) {
            const kMoved = allMovedDevices.filter(d => isK(d));
            const bMoved = allMovedDevices.filter(d => !isK(d));

            const renderMovedBrick = (devices, type) => {
                if (devices.length === 0) return '';

                let bgClass = 'bg-yellow-600 border-yellow-400';
                let label = 'Partner Tervezett';
                
                if (move.status === 'accepted') {
                    bgClass = 'bg-green-700 border-green-500';
                    label = 'Elfogadva';
                } else if (move.initiator === 'EJK') {
                    bgClass = 'bg-green-500 border-green-300';
                    label = 'EJK Tervezett';
                }

                let clickAction = `onclick="handleClickOnMove('${originDate}', event)"`;
                let dragAttrs = '';
                let cursorClass = 'cursor-pointer';

                if (isAggregateGlobal) {
                    clickAction = ''; 
                } else {
                    dragAttrs = `draggable="true" data-origin-date="${originDate}"`;
                    cursorClass += ' draggable-event cursor-move';
                }

                return `
                    <div class="${bgClass} text-white text-xs p-1 rounded border shadow-sm ${cursorClass} mb-1 flex justify-between items-center" title="Eredeti dátum: ${originDate} (${label})" ${clickAction} ${dragAttrs}>
                        <span>${devices.length} db (${label})</span>
                        <span class="font-bold border-l border-white/30 pl-1 ml-1">${type}</span>
                    </div>
                `;
            };

            if (showK) html += renderMovedBrick(kMoved, 'K');
            if (showB) html += renderMovedBrick(bMoved, 'B');
        } else {
             // Original View for non-EJK
            let bgClass = 'bg-yellow-600 border-yellow-400';
            let label = 'Partner Tervezett';
            
            if (move.status === 'accepted') {
                bgClass = 'bg-green-700 border-green-500';
                label = 'Elfogadva';
            } else if (move.initiator === 'EJK') {
                bgClass = 'bg-green-500 border-green-300';
                label = 'EJK Tervezett';
            }

            let clickAction = `onclick="handleClickOnMove('${originDate}', event)"`;
            let dragAttrs = '';
            let cursorClass = 'cursor-pointer';

            if (isAggregateGlobal) {
                clickAction = ''; 
            } else {
                dragAttrs = `draggable="true" data-origin-date="${originDate}"`;
                cursorClass += ' draggable-event cursor-move';
            }

            html += `
                <div class="${bgClass} text-white text-xs p-1 rounded border shadow-sm ${cursorClass}" title="Eredeti dátum: ${originDate} (${label})" ${clickAction} ${dragAttrs}>
                    ${allMovedDevices.length} db (${label})
                </div>
            `;
        }
    });

    return html;
}

function addDragAndDropListeners() {
    const draggables = document.querySelectorAll('.draggable-event');
    const dropZones = document.querySelectorAll('.drop-zone');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.originDate);
            e.target.classList.add('opacity-50');
        });

        draggable.addEventListener('dragend', (e) => {
            e.target.classList.remove('opacity-50');
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            if (zone.dataset.zone === 'parking') {
                zone.classList.add('bg-blue-900/50', 'border-blue-500');
            } else {
                zone.classList.add('bg-gray-600');
            }
        });

        zone.addEventListener('dragleave', (e) => {
            if (zone.dataset.zone === 'parking') {
                zone.classList.remove('bg-blue-900/50', 'border-blue-500');
            } else {
                zone.classList.remove('bg-gray-600');
            }
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (zone.dataset.zone === 'parking') {
                zone.classList.remove('bg-blue-900/50', 'border-blue-500');
            } else {
                zone.classList.remove('bg-gray-600');
            }
            
            const originDate = e.dataTransfer.getData('text/plain');
            
            if (zone.dataset.zone === 'parking') {
                // Dropped into Parking Zone
                handlePark(originDate);
            } else {
                // Dropped onto a Date
                const targetDate = zone.dataset.date;
                if (originDate && targetDate && originDate !== targetDate) {
                    handleMove(originDate, targetDate);
                }
            }
        });
    });
}

function handlePark(originDate) {
    // If it was previously moved to a date, remove that move
    if (moves[originDate]) {
        deleteMove(originDate);
    }
    // Add to parking
    parkingEvents.add(originDate);
    renderSchedulerUI();
}

function handleMove(originDate, targetDate) {
    // Remove from parking if it was there
    if (parkingEvents.has(originDate)) {
        parkingEvents.delete(originDate);
    }
    
    // Save Move
    saveMove(originDate, {
        targetDate: targetDate,
        initiator: isEjkUserGlobal ? 'EJK' : 'ENY',
        status: 'pending'
    });
}

// Global function to handle clicks on moves (Reset or Accept)
window.handleClickOnMove = function(originDate, event) {
    if (event) event.stopPropagation();
    
    const move = moves[originDate];
    if (!move) return;

    const myRole = isEjkUserGlobal ? 'EJK' : 'ENY';

    if (move.status === 'accepted') {
        if (confirm('Biztosan törölni szeretné ezt az egyeztetett időpontot?')) {
            deleteMove(originDate);
        }
    } else {
        // Pending
        if (move.initiator === myRole) {
            // My own move -> Delete/Reset
            deleteMove(originDate);
        } else {
            // Other's move -> Accept
            if (confirm('Elfogadja ezt a javasolt időpontot?')) {
                saveMove(originDate, { ...move, status: 'accepted' });
            }
        }
    }
};

window.showBreakdownModal = function(dateStr) {
    if (!isAggregateGlobal) return;

    // Find devices expiring on this date (Original)
    const expiringDevices = currentDevices.filter(d => d.kov_vizsg && d.kov_vizsg.replace(/\./g, '-') === dateStr);
    
    // Find devices moved TO this date
    const movedDevices = currentDevices.filter(d => {
        if (!d.kov_vizsg) return false;
        const originDate = d.kov_vizsg.replace(/\./g, '-');
        return moves[originDate] && moves[originDate].targetDate === dateStr;
    });

    const allDevices = [...expiringDevices, ...movedDevices];
    
    // Group by Partner
    const breakdown = {};
    allDevices.forEach(d => {
        const partner = d.partnerName || 'Ismeretlen';
        if (!breakdown[partner]) breakdown[partner] = 0;
        breakdown[partner]++;
    });

    // Render Modal
    const modalHtml = `
        <div id="breakdownModal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]">
            <div class="bg-gray-800 border border-gray-600 rounded-lg p-6 w-96 shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-4">Részletek: ${dateStr}</h3>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${Object.entries(breakdown).map(([partner, count]) => `
                        <div class="flex justify-between items-center bg-gray-700 p-2 rounded">
                            <span class="text-gray-300 text-sm">${partner}</span>
                            <span class="font-bold text-white">${count} db</span>
                        </div>
                    `).join('')}
                    ${Object.keys(breakdown).length === 0 ? '<p class="text-gray-500 text-center">Nincs eszköz erre a napra.</p>' : ''}
                </div>
                <div class="mt-4 text-right">
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('breakdownModal').remove()">Bezárás</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Persistence Functions
async function saveMove(originDate, moveData) {
    // Find all devices with this originDate
    const devicesToUpdate = currentDevices.filter(d => d.kov_vizsg && d.kov_vizsg.replace(/\./g, '-') === originDate);
    
    const batch = db.batch();
    devicesToUpdate.forEach(device => {
        if (device.id) {
            const ref = db.collection('partners').doc(currentPartnerId).collection('devices').doc(device.id);
            batch.update(ref, { appointment_proposal: moveData });
        }
    });

    try {
        await batch.commit();
        // Local update will happen via listener, but for responsiveness we can update local state too
        // However, since we have a listener, let's rely on that for consistency if possible.
        // But for "All Partners" view (if we allowed editing there, which we don't), we'd need local update.
        // Since editing is only in specific view where we have listener, we are good.
    } catch (error) {
        console.error("Error saving move:", error);
        alert("Hiba történt a mentés során.");
    }
}

async function deleteMove(originDate) {
    const devicesToUpdate = currentDevices.filter(d => d.kov_vizsg && d.kov_vizsg.replace(/\./g, '-') === originDate);
    
    const batch = db.batch();
    devicesToUpdate.forEach(device => {
        if (device.id) {
            const ref = db.collection('partners').doc(currentPartnerId).collection('devices').doc(device.id);
            batch.update(ref, { appointment_proposal: firebase.firestore.FieldValue.delete() });
        }
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error deleting move:", error);
        alert("Hiba történt a törlés során.");
    }
}
