import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const filePath = 'C:/AntiGravity/NFS_Sales&Expences-2025.xlsx';
console.log("Reading file:", filePath);

try {
    const buffer = await readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log("Sheet Names:", workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        console.log("\n--- SHEET:", sheetName, "---");
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Log first 5 rows to see structure
        console.log("First 5 rows:");
        console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));
    });

} catch (err) {
    console.error("Error reading file:", err);
}
