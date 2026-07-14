const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\AntiGravity\\src_backup_2026_01_04\\data\\10_Oct 2025\\Invoicewise_Sale_Summary_01_10_2025_to_31_10_2025.xlsx';
console.log(`Parsing file: ${filePath}`);
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("First 30 rows of Excel sheet matching keywords:");
jsonData.slice(0, 80).forEach((row, idx) => {
    const rowStr = JSON.stringify(row);
    if (rowStr && (rowStr.toLowerCase().includes('inv-') || rowStr.toLowerCase().includes('date') || rowStr.toLowerCase().includes('particulars'))) {
        console.log(`Row ${idx}: ${rowStr}`);
    }
});
