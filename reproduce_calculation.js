
// Mocking the logic found in TimeAttendance.jsx

function getDecimalHours(val) {
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
}

function formatTimeFromDec(decHours) {
    if (decHours === null) return '-';
    const h = Math.floor(decHours);
    const m = Math.round((decHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Logic from parseAttendanceData
function testParseLogic(rowShifts) {
    let totalWorkHours = 0;
    const shifts = [];

    // Simulating indices pointing to values
    // rowShifts is array of {in: val, out: val}

    rowShifts.forEach(shift => {
        const inH = getDecimalHours(shift.in);
        const outH = getDecimalHours(shift.out);

        console.log(`Processing Shift: In=${shift.in} (${inH}), Out=${shift.out} (${outH})`);

        if (inH !== null && outH !== null) {
            let diff = outH - inH;
            if (diff < 0) diff += 24;
            console.log(`Diff: ${diff}`);
            totalWorkHours += diff;
            shifts.push({ in: formatTimeFromDec(inH), out: formatTimeFromDec(outH) });
        } else {
            shifts.push({ in: '-', out: '-' });
        }
    });

    const breakMins = 0; // Screenshot says 0
    totalWorkHours = Math.max(0, totalWorkHours - (breakMins / 60));

    console.log("Total Work Hours (Parse):", totalWorkHours);
    return totalWorkHours;
}

// Logic from ManualEntryModal
function testManualLogic(formDataShifts) {
    const getDec = (time) => {
        if (!time) return null;
        const [h, m] = time.split(':').map(Number);
        return h + (m / 60);
    };

    let totalH = 0;
    const breakMins = 0;

    formDataShifts.forEach(s => {
        const inD = getDec(s.in);
        const outD = getDec(s.out);

        console.log(`Manual Shift: In=${s.in} (${inD}), Out=${s.out} (${outD})`);

        if (inD !== null && outD !== null) {
            let diff = outD - inD;
            if (diff < 0) diff += 24;
            console.log(`Diff: ${diff}`);
            totalH += diff;
        }
    });

    totalH = Math.max(0, totalH - (breakMins / 60));
    console.log("Total Work Hours (Manual):", totalH);
    return totalH;
}

// Test Case 1: Strings "09:15", "14:00"
console.log("--- Test Case 1: Strings ---");
const shifts1 = [
    { in: "09:15", out: "14:00" },
    { in: "16:15", out: "21:30" }
];
testParseLogic(shifts1);
testManualLogic(shifts1);

// Test Case 2: Numbers (Excel fraction)
// 9:15 = 9.25/24 = 0.38541666
// 14:00 = 14/24 = 0.58333333
console.log("\n--- Test Case 2: Numbers ---");
const shifts2 = [
    { in: 0.385416666, out: 0.583333333 }, // Shift 1
    { in: 0.677083333, out: 0.895833333 }  // Shift 2 (16:15 - 21:30)
];
testParseLogic(shifts2);
// Manual logic assumes strings, so skipped for manual
