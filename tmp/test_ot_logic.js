
const getSpecialDayType = (dateStr, holidays = []) => {
    if (!dateStr) return 'none';
    const date = new Date(dateStr);
    const day = date.getDay();
    const isSunday = day === 0;
    const isHoliday = Array.isArray(holidays) && holidays.includes(dateStr);

    if (isHoliday) return 'holiday';
    if (isSunday) return 'sunday';
    return 'none';
};

const isSpecialDay = (dateStr, holidays = []) => getSpecialDayType(dateStr, holidays) !== 'none';

// Simulation from ManualEntryModal handleSubmit
function calculateWages(date, shifts, breakMins, rate, config) {
    let totalH = 0;
    shifts.forEach(s => {
        // Mock getDecimalHours
        const inH = parseFloat(s.in.split(':')[0]) + (parseFloat(s.in.split(':')[1]) / 60);
        const outH = parseFloat(s.out.split(':')[0]) + (parseFloat(s.out.split(':')[1]) / 60);
        let diff = outH - inH;
        if (diff < 0) diff += 24;
        totalH += diff;
    });

    totalH = Math.max(0, totalH - (breakMins / 60));
    const isSpecial = isSpecialDay(date, config.national_holidays);
    const regH = isSpecial ? 0 : Math.min(totalH, config.standard_daily_hours);
    const otH = isSpecial ? totalH : Math.max(0, totalH - config.standard_daily_hours);
    const wage = (regH * rate) + (otH * rate * config.ot_multiplier);

    return { totalH, regH, otH, wage };
}

// Test Configuration
const config = {
    standard_daily_hours: 8,
    ot_multiplier: 1.5,
    national_holidays: ['2026-04-03']
};

// Test 1: Regular Monday (2026-03-30) - 10 hours
const monResult = calculateWages('2026-03-30', [{in: '08:00', out: '18:00'}], 0, 100, config);
console.log('Monday Result:', monResult);
if (monResult.regH !== 8 || monResult.otH !== 2 || monResult.wage !== (8*100 + 2*100*1.5)) {
    throw new Error('Monday calculation failed');
}

// Test 2: Sunday (2026-03-29) - 4 hours
// Should be 100% OT
const sunResult = calculateWages('2026-03-29', [{in: '09:00', out: '13:00'}], 0, 100, config);
console.log('Sunday Result:', sunResult);
if (sunResult.regH !== 0 || sunResult.otH !== 4 || sunResult.wage !== (4*100*1.5)) {
    throw new Error('Sunday calculation failed');
}

// Test 3: Holiday (2026-04-03) - 5 hours
// Should be 100% OT
const holResult = calculateWages('2026-04-03', [{in: '10:00', out: '15:00'}], 0, 100, config);
console.log('Holiday Result:', holResult);
if (holResult.regH !== 0 || holResult.otH !== 5 || holResult.wage !== (5*100*1.5)) {
    throw new Error('Holiday calculation failed');
}

console.log('All tests passed!');
