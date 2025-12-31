import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\AntiGravity\\POS reports\\12_Dec 2025\\Purchases_01_12_2025_to_27_12_2025.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assume first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON array of arrays (header: 1)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    console.log(`Sheet: ${sheetName}`);
    console.log("Printing first 10 rows:");

    for (let i = 0; i < Math.min(data.length, 10); i++) {
        console.log(`Row ${i}:`, JSON.stringify(data[i]));
    }

} catch (e) {
    console.error("Error reading file:", e);
}
