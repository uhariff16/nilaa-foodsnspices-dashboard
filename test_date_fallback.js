
const normalizeDate = (dateVal) => {
    if (!dateVal) return null;

    console.log(`Testing: "${dateVal}" (${typeof dateVal})`);

    // 1. Excel Serial Number
    if (typeof dateVal === 'number') {
        if (dateVal < 36526) return null; // Filter dates before 2000
        const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
    }

    const dateStr = String(dateVal).trim();

    // 2. Handle DD-MM-YYYY
    const dmyRegex = /^(\d{1,2})[-/.\s_](\d{1,2})[-/.\s_](\d{2,4})$/;
    const match = dateStr.match(dmyRegex);
    if (match) {
        const d = match[1].padStart(2, '0');
        const m = match[2].padStart(2, '0');
        let y = match[3];
        if (y.length === 2) y = '20' + y;
        console.log(`Matched DMY: ${y}-${m}-${d}`);
        return `${y}-${m}-${d}`;
    }

    // 3. Handle DD-MMM-YY (e.g. 01-Dec-25)
    // Regex in parser: /^\d{1,2}[-/.\s_][a-zA-Z]{3}[-/.\s_]\d{2,4}$/
    if (/^\d{1,2}[-/.\s_][a-zA-Z]{3}[-/.\s_]\d{2,4}$/.test(dateStr)) {
        const parts = dateStr.split(/[-/.\s_]+/);
        const d = parts[0];
        const mStr = parts[1];
        let yStr = parts[2];
        if (yStr.length === 2) yStr = '20' + yStr;

        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const m = monthMap[mStr.toLowerCase().substring(0, 3)];
        console.log(`Matched DD-MMM-YY: ${yStr}-${m}-${d.padStart(2, '0')}`);
        if (m) return `${yStr}-${m}-${d.padStart(2, '0')}`;
    }

    // 4. ISO Fallback
    const attempt = new Date(dateStr);
    if (!isNaN(attempt)) return attempt.toISOString().split('T')[0];
    return null;
};

// Tests
normalizeDate("1-Jan-26");
normalizeDate("01-Jan-26");
normalizeDate("Jan-26"); // Excel might show "Jan-26" but mean 1-Jan-26? The screenshot shows "1-Jan-26" explicitly in the cell.
normalizeDate(46022); // Approximate excel serial for 2026?
