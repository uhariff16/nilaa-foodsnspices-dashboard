import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Adjust path as needed
const filePath = 'c:\\AntiGravity\\src\\data\\12_Dec 2025\\Invoicewise_Sale_Summary_01_12_2025_to_30_12_2025.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Inspecting ${filePath}`);
    console.log(`Sheet: ${sheetName}`);
    console.log('------------------------------------------------');

    // Print first 10 rows
    jsonData.slice(0, 10).forEach((row, index) => {
        console.log(`Row ${index}:`, JSON.stringify(row));
    });

} catch (err) {
    console.error('Error:', err);
}
