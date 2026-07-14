const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const normalizeDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        if (dateVal < 36526) return null;
        const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
    }

    let dateStr = String(dateVal).trim();
    const dmyRegex = /^(\d{1,2})[-/.\s_](\d{1,2})[-/.\s_](\d{2,4})$/;
    const match = dateStr.match(dmyRegex);

    if (match) {
        const d = match[1];
        const m = match[2];
        let y = match[3];
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    if (/^\d{1,2}[-/.\s_][a-zA-Z]{3}[-/.\s_]\d{2,4}$/.test(dateStr)) {
        const parts = dateStr.split(/[-/.\s_]+/);
        const d = parts[0];
        const mStr = parts[1];
        let yStr = parts[2];
        if (yStr.length === 2) yStr = '20' + yStr;

        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const m = monthMap[mStr.toLowerCase().substring(0, 3)];
        if (m) return `${yStr}-${m}-${d.padStart(2, '0')}`;
    }

    const attempt = new Date(dateStr);
    if (!isNaN(attempt)) {
        return attempt.toISOString().split('T')[0];
    }
    return null;
};

function processFile(filePath) {
    const transactions = [];
    try {
        const workbook = XLSX.readFile(filePath);
        
        let masterFileDate = null;
        const nameWithoutExt = path.basename(filePath).replace(/\.[^/.]+$/, "");
        const fileNameClean = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12', january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

        let match = fileNameClean.match(/(\d{1,2}\s+\d{1,2}\s+\d{4})/);
        if (match) {
            masterFileDate = normalizeDate(match[0]);
        } else {
            const words = fileNameClean.split(/\s+/).filter(w => w.length > 0);
            for (let i = 0; i < words.length - 1; i++) {
                const w = words[i];
                const next = words[i + 1];
                if (monthMap[w] && /^\d{2,4}$/.test(next)) {
                    let year = next;
                    if (year.length === 2) year = '20' + year;
                    masterFileDate = `${year}-${monthMap[w]}-01`;
                    break;
                }
                if (/^\d{2,4}$/.test(w) && monthMap[next]) {
                    let year = w;
                    if (year.length === 2) year = '20' + year;
                    masterFileDate = `${year}-${monthMap[next]}-01`;
                    break;
                }
            }
        }

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (!jsonData || jsonData.length === 0) return;

            const firstRows = jsonData.slice(0, 5).map(row => JSON.stringify(row).toLowerCase());
            const contentString = firstRows.join(' ');
            const headerRow = jsonData[0];

            let sheetSpecificDate = null;
            jsonData.slice(0, 5).forEach(row => {
                const cellVal = (String(row[0] || '') + " " + String(row[1] || '')).toLowerCase();
                if (cellVal.includes('date') || cellVal.includes('period') || cellVal.includes('month')) {
                    let match = cellVal.match(/(\d{1,2}[-/\s][a-zA-Z]+[-/\s]\d{2,4})/);
                    if (match) sheetSpecificDate = normalizeDate(match[0]);
                }
            });

            const effectiveDate = sheetSpecificDate || masterFileDate;

            if ((contentString.includes('particulars') || contentString.includes('description')) && contentString.includes('amount') && !contentString.includes('supplier')) {
                let amountColIdx = -1;
                let partColIdx = -1;
                let dateColIdx = -1;

                headerRow.forEach((cell, idx) => {
                    const str = String(cell).toLowerCase().trim();
                    if (str.includes('amount')) amountColIdx = idx;
                    if (str.includes('particulars') || str.includes('description')) partColIdx = idx;
                    if (str.includes('date')) dateColIdx = idx;
                });
                if (amountColIdx === -1) amountColIdx = 7;

                let currentInvDate = null;

                jsonData.slice(1).forEach((row, index) => {
                    if (!row || row.length === 0) return;
                    const colParticulars = String(row[partColIdx] || '').trim();
                    const valStr = colParticulars.toLowerCase();

                    if (/^inv-/i.test(valStr)) {
                        const dateMatch = valStr.match(/date\s*[:.-]\s*([\w-]+)/i);
                        if (dateMatch) {
                            currentInvDate = normalizeDate(dateMatch[1]);
                        }
                        return;
                    }

                    if (row[amountColIdx] !== undefined) {
                        const amount = parseFloat(String(row[amountColIdx]).replace(/,/g, ''));
                        if (!isNaN(amount) && amount !== 0) {
                            let finalDate = currentInvDate || effectiveDate;
                            if (dateColIdx !== -1 && row[dateColIdx]) finalDate = normalizeDate(row[dateColIdx]);

                            if (finalDate) {
                                transactions.push({
                                    date: finalDate,
                                    amount: amount,
                                    desc: colParticulars
                                });
                            }
                        }
                    }
                });
            }
        });
    } catch (e) {
        // ignore
    }
    return transactions;
}

const dataDir = 'c:\\AntiGravity\\src_backup_2026_01_04\\data';
const subdirs = fs.readdirSync(dataDir);
const allTxns = [];

subdirs.forEach(sub => {
    const fullPath = path.join(dataDir, sub);
    if (fs.statSync(fullPath).isDirectory()) {
        const files = fs.readdirSync(fullPath);
        files.forEach(f => {
            if (f.endsWith('.xlsx')) {
                const txns = processFile(path.join(fullPath, f));
                txns.forEach(t => {
                    allTxns.push({
                        ...t,
                        sourceFile: `${sub}/${f}`
                    });
                });
            }
        });
    }
});

const aprilTxns = allTxns.filter(t => t.date && t.date.includes('-04-'));
console.log(`Parsed April transactions count: ${aprilTxns.length}`);
if (aprilTxns.length > 0) {
    const groups = {};
    aprilTxns.forEach(t => {
        groups[t.sourceFile] = (groups[t.sourceFile] || 0) + t.amount;
    });
    console.log("April transactions grouped by Source File:", groups);
    
    // Sample transactions
    console.log("Sample April transactions (first 10):", aprilTxns.slice(0, 10));
}
