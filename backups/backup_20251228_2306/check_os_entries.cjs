const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:/AntiGravity/Production/Daily Stocks & Production.xlsx';

function analyze() {
    if (!fs.existsSync(filePath)) {
        console.log("File not found:", filePath);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    console.log("All Sheet Names:", workbook.SheetNames);

    // Look for 'Daily' or 'Stock'
    let targetSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('daily'));
    if (!targetSheet) targetSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('stock'));
    if (!targetSheet) targetSheet = workbook.SheetNames[0];

    // If 'Summary' is selected and there's another sheet, try the other one
    if (targetSheet === 'Summary' && workbook.SheetNames.length > 1) {
        targetSheet = workbook.SheetNames[1]; // Often Summary is first
    }

    console.log(`Using Sheet: '${targetSheet}'`);

    const sheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`Rows: ${data.length}`);

    const osEntries = [];
    data.forEach(row => {
        const keys = Object.keys(row);
        const matKey = keys.find(k => k.toLowerCase().includes('material') || k.toLowerCase().includes('item'));
        const dateKey = keys.find(k => k.toLowerCase().includes('date'));
        const weightKey = keys.find(k => k.toLowerCase().includes('weight') || k.toLowerCase().includes('kgs') || k.toLowerCase().includes('qty'));

        if (matKey && row[matKey]) {
            const mat = row[matKey].toString();
            if (mat.toUpperCase().startsWith('OS') || mat.toLowerCase().includes('opening')) {
                // Ensure we capture valid weight
                let weight = row[weightKey];
                if (weight === undefined) weight = 0;

                osEntries.push({
                    date: row[dateKey], // Might be excel serial date
                    material: mat,
                    weight: weight
                });
            }
        }
    });

    console.log("\nFound OS Entries:");
    if (osEntries.length === 0) {
        console.log("No OS entries found. Dumping first 5 rows to debug keys:");
        console.log(data.slice(0, 5));
    } else {
        console.table(osEntries.slice(0, 20)); // Limit output
    }
}

analyze();
