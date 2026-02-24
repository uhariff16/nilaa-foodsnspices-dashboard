
const getDecimalHours = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
        return val.getHours() + (val.getMinutes() / 60);
    }
    if (typeof val === 'number') {
        const fraction = val - Math.floor(val);
        return fraction * 24;
    }
    if (typeof val === 'string') {
        const parts = val.trim().split(':');
        if (parts.length >= 2) {
            let h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (val.toLowerCase().includes('pm') && h < 12) h += 12;
            if (val.toLowerCase().includes('am') && h === 12) h = 0;
            return h + (m / 60);
        }
    }
    return null;
};

const formatTimeFromDec = (decHours) => {
    if (decHours === null) return '-';
    const h = Math.floor(decHours);
    const m = Math.round((decHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const manualEntryGetDec = (time) => {
    if (!time) return null;
    // Simulate the exact line in ManualEntryModal
    const [h, m] = time.split(':').map(Number);
    return h + (m / 60);
};

console.log("--- Testing Parser Logic ---");
const testInputs = ["09:15", "14:00", "16:15", "21:30", "9:15", "09:15 AM", "2:00 PM"];
testInputs.forEach(t => {
    const d = getDecimalHours(t);
    console.log(`Input: "${t}", Dec: ${d}`);
});

console.log("\n--- Testing Manual Entry Logic ---");
const manualInputs = ["09:15", "14:00", "16:15", "21:30", "09:15:00"]; // Input type=time gives HH:mm, sometimes HH:mm:ss if step set
manualInputs.forEach(t => {
    try {
        const d = manualEntryGetDec(t);
        console.log(`Input: "${t}", Dec: ${d}`);
    } catch (e) {
        console.error(`Input: "${t}", Error: ${e.message}`);
    }
});

console.log("\n--- Testing Scenario from Screenshot ---");
// Shift 1: 09:15 - 14:00
// Shift 2: 16:15 - 21:30
let totalH = 0;
const shifts = [
    { in: "09:15", out: "14:00" },
    { in: "16:15", out: "21:30" }
];

shifts.forEach(s => {
    const inD = manualEntryGetDec(s.in);
    const outD = manualEntryGetDec(s.out);
    console.log(`Shift: ${s.in} -> ${s.out} | Dec: ${inD} -> ${outD}`);
    if (inD !== null && outD !== null) {
        let diff = outD - inD;
        if (diff < 0) diff += 24;
        totalH += diff;
    }
});
console.log(`Total Hours: ${totalH}`);
