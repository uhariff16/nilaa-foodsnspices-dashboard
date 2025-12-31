import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = 'c:/AntiGravity/src/data/12_Dec 2025/Supplierwise_Purchase_Summary_01_02_2025_to_30_12_2025.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log(`Sheet Name: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    // Get headers (row 1 typically, or try to detect)
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Print first 5 rows to see structure
    console.log("First 5 rows:");
    json.slice(0, 5).forEach((row, i) => console.log(`Row ${i}:`, row));

} catch (e) {
    console.error(e);
}
