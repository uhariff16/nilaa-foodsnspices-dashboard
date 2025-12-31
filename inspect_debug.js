import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = 'c:/AntiGravity/src/data/12_Dec 2025/Purchases_01_12_2025_to_27_12_2025.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("Sheet Name:", sheetName);
    console.log("First 5 rows:");
    for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
        console.log(`Row ${i}:`, jsonData[i]);
    }
} catch (error) {
    console.error("Error reading file:", error);
}
