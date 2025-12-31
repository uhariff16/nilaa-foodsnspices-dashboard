import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Helper to normalize date (simplified)
const normalizeDate = (v) => v ? String(v) : null;

const parse = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const materials = new Set();

    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Scan for "Stock In" structure (col 0=Date, col 1=Material, col 2=Weight)
        // We look for rows where col 1 is non-empty and col 2 is a number
        jsonData.forEach(row => {
            if (row.length < 3) return;
            // Check if it looks like stock in
            // Heuristic: Col 1 is string, Col 2 is number
            const mat = row[1];
            const weight = row[2];

            if (typeof mat === 'string' && !isNaN(parseFloat(weight))) {
                // Exclude headers
                if (mat.toLowerCase().includes('material') || mat.toLowerCase().includes('particulars')) return;
                // Exclude totals
                if (mat.toLowerCase().includes('total')) return;

                materials.add(mat);
            }
        });
    });

    return Array.from(materials);
};

// Scan directory
const scanDir = 'c:/AntiGravity/src/data';
const allMaterials = new Set();

const walk = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.xlsx')) {
            try {
                const mats = parse(filePath);
                mats.forEach(m => allMaterials.add(m));
            } catch (err) {
                // ignore
            }
        }
    });
};

try {
    walk(scanDir);
    console.log("Materials found:");
    Array.from(allMaterials).forEach(m => console.log(m));
} catch (e) {
    console.error(e);
}
