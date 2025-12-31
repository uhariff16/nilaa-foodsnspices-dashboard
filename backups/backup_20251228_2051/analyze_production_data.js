import * as XLSX from 'xlsx';
import fs from 'fs';

const FILE_PATH = 'C:/AntiGravity/Production/Daily Stocks & Production.xlsx';

try {
    const fileBuffer = fs.readFileSync(FILE_PATH);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const targetSheet = "Nov 2025";
    // Check if sheet exists, otherwise pick the first monthly-looking one
    let sheetName = targetSheet;
    if (!workbook.Sheets[sheetName]) {
        sheetName = workbook.SheetNames.find(n => n.includes('2025')) || workbook.SheetNames[0];
    }

    console.log(`Inspecting Sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Get first 20 rows to be safe
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: null });
    const preview = data.slice(0, 20);

    console.log(JSON.stringify(preview, null, 2));

} catch (error) {
    console.error("Error:", error.message);
}
