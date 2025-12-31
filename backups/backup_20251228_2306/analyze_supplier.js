import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const run = async () => {
    const filePath = 'C:/AntiGravity/POS reports/Supplier_Balances.xlsx';
    console.log("Reading:", filePath);
    try {
        const buffer = await readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`\n--- SHEET: ${sheetName} ---`);
            console.log("First 5 rows:");
            console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));
        });
    } catch (e) {
        console.error("Error:", e.message);
    }
};

run();
