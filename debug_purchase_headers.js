import { parsePurchaseFile } from './src/utils/purchaseParser.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const run = async () => {
    try {
        const filePath = 'c:\\AntiGravity\\src\\data\\POS reports\\12_Dec 2025\\Purchases_01_12_2025_to_27_12_2025.xlsx';
        const buffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        console.log("Headers in Purchase File:");
        console.log(jsonData[0]);
        console.log("First 3 rows:");
        console.log(jsonData.slice(1, 4));

    } catch (e) {
        console.error(e);
    }
};

run();
