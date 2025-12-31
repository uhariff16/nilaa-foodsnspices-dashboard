import * as XLSX from 'xlsx';
import * as fs from 'fs';

const analyze = (path) => {
    console.log(`Analyzing: ${path}`);
    try {
        const buffer = fs.readFileSync(path);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log("Headers:", JSON.stringify(jsonData[0]));
        console.log("First 5 rows:", JSON.stringify(jsonData.slice(1, 6), null, 2));
    } catch (e) {
        console.error(e.message);
    }
    console.log('---');
};

analyze('C:/AntiGravity/POS reports/Invoicewise_Sale_Summary_01_09_2025_to_30_09_2025.xlsx');
analyze('C:/AntiGravity/POS reports/Purchases_01_09_2025_to_30_09_2025.xlsx');
