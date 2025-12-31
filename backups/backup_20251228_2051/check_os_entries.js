
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'C:/AntiGravity/Production/Daily Stocks & Production.xlsx';

function analyze() {
    if (!fs.existsSync(filePath)) {
        console.log("File not found:", filePath);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    console.log("Sheets:", workbook.SheetNames);

    // Assuming first sheet or specific sheet? 
    // Usually 'Daily Stocks'
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('stock')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Analyzing ${data.length} rows in sheet '${sheetName}'...`);

    const materials = new Set();
    const osEntries = [];

    data.forEach(row => {
        // Material column check
        // Keys might vary, let's dump first row keys
        const keys = Object.keys(row);
        const matKey = keys.find(k => k.toLowerCase().includes('material') || k.toLowerCase().includes('item'));
        const dateKey = keys.find(k => k.toLowerCase().includes('date'));
        const weightKey = keys.find(k => k.toLowerCase().includes('weight') || k.toLowerCase().includes('qty') || k.toLowerCase().includes('quantity'));

        if (matKey && row[matKey]) {
            const mat = row[matKey].toString();
            materials.add(mat);

            if (mat.toUpperCase().startsWith('OS') || mat.toLowerCase().includes('opening')) {
                osEntries.push({
                    date: row[dateKey],
                    material: mat,
                    weight: row[weightKey]
                });
            }
        }
    });

    console.log("\nAll Unique Materials:");
    console.log([...materials].sort());

    console.log("\nPotential Opening Stock Entries (starts with OS or includes Opening):");
    console.table(osEntries);
}

analyze();
