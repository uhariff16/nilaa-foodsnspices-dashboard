const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const getPackWeight = (desc) => {
    if (!desc) return 1;
    const d = desc.toUpperCase();
    const match = d.match(/(\d+(?:\.\d+)?)\s*(KG|GM|GMS|G|ML|L)/);
    if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2];
        if (unit.startsWith('K') || unit === 'L') return val;
        if (unit.startsWith('G') || unit.startsWith('M')) return val / 1000;
    }
    return 1;
};

function processFile(filePath) {
    let rev = 0;
    let vol = 0;
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Match Type 3 structure
        const headerRow = jsonData[0];
        if (!headerRow) return { rev: 0, vol: 0 };
        
        const headerStr = JSON.stringify(headerRow).toLowerCase();
        if ((headerStr.includes('particulars') || headerStr.includes('description')) && headerStr.includes('amount')) {
            const partColIdx = headerRow.findIndex(h => /particulars|description/i.test(h));
            const qtyColIdx = headerRow.findIndex(h => /quantity|qty/i.test(h));
            
            let amountColIdx = -1;
            let bestAmountScore = -1;
            headerRow.forEach((cell, idx) => {
                const str = String(cell).toLowerCase().trim();
                if (str.includes('amount')) {
                    let score = 0;
                    if (str.includes('taxable')) score += 10;
                    else if (str.includes('net')) score += 10;
                    else if (str.includes('total')) score += 5;
                    else score += 1;
                    if (str.includes('cgst') || str.includes('sgst') || str.includes('igst') || str.includes('tax')) {
                        score = -10;
                    }
                    if (score > bestAmountScore) {
                        bestAmountScore = score;
                        amountColIdx = idx;
                    }
                }
            });
            if (amountColIdx === -1) amountColIdx = 7;
            
            jsonData.slice(1).forEach(row => {
                if (!row) return;
                const desc = String(row[partColIdx] || '').toLowerCase().trim();
                if (!desc || desc.startsWith('inv-') || desc.includes('total')) return;
                
                const amount = parseFloat(String(row[amountColIdx] || 0).replace(/,/g, ''));
                let qty = 1;
                if (qtyColIdx !== -1 && row[qtyColIdx]) {
                    qty = parseFloat(String(row[qtyColIdx]).replace(/,/g, '')) || 1;
                }
                if (!isNaN(amount) && amount > 0) {
                    rev += amount;
                    vol += qty * getPackWeight(desc);
                }
            });
        }
    } catch (e) {
        // ignore
    }
    return { rev, vol };
}

const dataDir = 'c:\\AntiGravity\\src_backup_2026_01_04\\data';
const subdirs = fs.readdirSync(dataDir);
subdirs.forEach(sub => {
    const fullPath = path.join(dataDir, sub);
    if (fs.statSync(fullPath).isDirectory()) {
        let folderRev = 0;
        let folderVol = 0;
        const files = fs.readdirSync(fullPath);
        files.forEach(f => {
            if (f.endsWith('.xlsx') && f.toLowerCase().includes('sale')) {
                const { rev, vol } = processFile(path.join(fullPath, f));
                folderRev += rev;
                folderVol += vol;
            }
        });
        if (folderRev > 0) {
            console.log(`Folder: ${sub}`);
            console.log(`  Calculated Revenue: ₹${folderRev.toLocaleString()}`);
            console.log(`  Calculated Volume: ${folderVol.toLocaleString()} kg`);
        }
    }
});
