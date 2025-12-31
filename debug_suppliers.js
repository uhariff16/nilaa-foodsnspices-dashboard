import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Parse function for check
const parse = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Simple extraction based on previous parser logic
    let startRow = -1;
    let colMap = { supplier: -1, remarks: -1, amount: -1 };

    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
        const row = jsonData[i];
        if (row) {
            const rowStr = row.map(c => String(c).toLowerCase());
            if (rowStr.includes('supplier') && (rowStr.includes('total amount') || rowStr.includes('amount'))) {
                startRow = i + 1;
                rowStr.forEach((cell, idx) => {
                    if (cell.includes('supplier')) colMap.supplier = idx;
                    if (cell.includes('remarks')) colMap.remarks = idx;
                    if (cell.includes('amount')) colMap.amount = idx;
                });
                break;
            }
        }
    }

    if (startRow === -1) return [];

    const records = [];
    for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;
        const supplier = colMap.supplier > -1 ? row[colMap.supplier] : '';
        const remarks = colMap.remarks > -1 ? row[colMap.remarks] : '';
        const amount = colMap.amount > -1 ? row[colMap.amount] : 0;
        if (amount && supplier) {
            records.push({ supplier, remarks, amount });
        }
    }
    return records;
};

// Scan directory
const scanDir = 'c:/AntiGravity/src/data';
const results = {};

const walk = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walk(filePath);
        } else if (file.includes('Purchases')) {
            const data = parse(filePath);
            data.forEach(r => {
                const key = `${r.supplier} | ${r.remarks}`;
                results[key] = (results[key] || 0) + 1;
            });
        }
    });
};

try {
    walk(scanDir);
    console.log("Unique Suppliers & Remarks found:");
    Object.keys(results).forEach(k => console.log(k));
} catch (e) {
    console.error(e);
}
