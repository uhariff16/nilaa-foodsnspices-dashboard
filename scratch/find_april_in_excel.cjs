const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const normalizeDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
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
    return null;
};

function searchFileForApril(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (!jsonData || jsonData.length === 0) continue;
            
            // Search every cell for dates or April indicators
            for (let r = 0; r < jsonData.length; r++) {
                const row = jsonData[r];
                if (!row) continue;
                for (let c = 0; c < row.length; c++) {
                    const val = row[c];
                    if (val) {
                        const str = String(val).toLowerCase();
                        if (str.includes('date')) {
                            // Match date formats
                            const dateMatch = str.match(/date\s*[:.-]\s*([\w-]+)/i);
                            if (dateMatch) {
                                const parsed = normalizeDate(dateMatch[1]);
                                if (parsed && parsed.includes('-04-')) {
                                    console.log(`FOUND APRIL DATE in ${filePath} at Row ${r}, Col ${c}: ${str} -> parsed as ${parsed}`);
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        // ignore
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                walk(fullPath);
            }
        } else {
            if (file.endsWith('.xlsx')) {
                searchFileForApril(fullPath);
            }
        }
    });
}

console.log("Searching all Excel files for cells parsing to April...");
walk('c:\\AntiGravity\\src_backup_2026_01_04\\data');
walk('c:\\AntiGravity\\src\\data');
