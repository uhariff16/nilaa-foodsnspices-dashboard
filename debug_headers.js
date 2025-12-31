import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\AntiGravity\\Production\\Daily Stocks & Production.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    console.log("Searching for Daily Log sheets...");

    for (const sheetName of workbook.SheetNames) {
        // Skip Summary
        if (sheetName.toLowerCase().includes('summary')) continue;

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i];
            if (row && row.some(cell => String(cell).toLowerCase().includes('date'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex !== -1) {
            console.log(`\n--- Found Daily Log Sheet: ${sheetName} ---`);
            console.log("Header Row:", JSON.stringify(data[headerRowIndex]));
            console.log("First Data Row:", JSON.stringify(data[headerRowIndex + 1]));
            console.log("Second Data Row:", JSON.stringify(data[headerRowIndex + 2]));
            break; // Stop after finding one valid sheet
        }
    }

} catch (e) {
    console.error("Error reading file:", e);
}
