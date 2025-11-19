
// Mock data
const devices = [
    { id: 1, vizsg_idopont: '2023.01.01', kov_vizsg: '2024.01.01' },
    { id: 2, vizsg_idopont: '2023/02/01', kov_vizsg: '2024/02/01' },
    { id: 3, vizsg_idopont: '2023-03-01', kov_vizsg: '2024-03-01' },
    { id: 4, vizsg_idopont: '2023.04.01', kov_vizsg: '2024.04.01' }
];

// Logic from partner.js
const normalizeDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.replace(/[\/\-]/g, '.');
};

function filterDevices(devices, filters) {
    let filteredDevices = [...devices];

    if (filters.vizsg_idopont) {
        const filterDate = normalizeDate(filters.vizsg_idopont);
        filteredDevices = filteredDevices.filter(d => normalizeDate(d.vizsg_idopont).includes(filterDate));
    }
    if (filters.kov_vizsg) {
        const filterDate = normalizeDate(filters.kov_vizsg);
        filteredDevices = filteredDevices.filter(d => normalizeDate(d.kov_vizsg).includes(filterDate));
    }
    return filteredDevices;
}

// Test Cases
console.log('--- Verification Tests ---');

// Test 1: Filter by dot format matching dot format
let result = filterDevices(devices, { vizsg_idopont: '2023.01.01' });
console.log(`Test 1 (Dot -> Dot): Found ${result.length} devices. Expected 1. ID: ${result[0]?.id}`);
if (result.length === 1 && result[0].id === 1) console.log('PASS'); else console.log('FAIL');

// Test 2: Filter by dot format matching slash format
result = filterDevices(devices, { vizsg_idopont: '2023.02.01' });
console.log(`Test 2 (Dot -> Slash): Found ${result.length} devices. Expected 1. ID: ${result[0]?.id}`);
if (result.length === 1 && result[0].id === 2) console.log('PASS'); else console.log('FAIL');

// Test 3: Filter by dot format matching dash format
result = filterDevices(devices, { vizsg_idopont: '2023.03.01' });
console.log(`Test 3 (Dot -> Dash): Found ${result.length} devices. Expected 1. ID: ${result[0]?.id}`);
if (result.length === 1 && result[0].id === 3) console.log('PASS'); else console.log('FAIL');

// Test 4: Filter by slash format matching dot format (Input normalization check)
result = filterDevices(devices, { vizsg_idopont: '2023/04/01' });
console.log(`Test 4 (Slash -> Dot): Found ${result.length} devices. Expected 1. ID: ${result[0]?.id}`);
if (result.length === 1 && result[0].id === 4) console.log('PASS'); else console.log('FAIL');

// Test 5: Partial match (Year only)
result = filterDevices(devices, { vizsg_idopont: '2023' });
console.log(`Test 5 (Partial Year): Found ${result.length} devices. Expected 4.`);
if (result.length === 4) console.log('PASS'); else console.log('FAIL');

