import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const run = async () => {
    try {
        const filePath = 'G:/My Drive/Insvesmets/Nila Foods & Spices/NFS_Data_Sync/2026/02_Feb26/Expenses_01_02_2026_to_28_02_2026.xlsx';
        console.log("Reading:", filePath);
        const buffer = await readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let uniqueTypes = new Set();
        let samples = {};

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (!jsonData || jsonData.length === 0) return;

            const headerRow = jsonData[0];
            const typeIdx = headerRow.findIndex(h => /type/i.test(h));
            const paidToIdx = headerRow.findIndex(h => /paid to/i.test(h));

            if (typeIdx !== -1) {
                jsonData.slice(1).forEach(row => {
                    const type = String(row[typeIdx] || '').trim();
                    if (type) {
                        uniqueTypes.add(type);
                        if (!samples[type]) samples[type] = [];
                        if (samples[type].length < 3) samples[type].push(row[paidToIdx]);
                    }
                });
            }
        });

        console.log("\nUNIQUE TYPES FOUND:");
        Array.from(uniqueTypes).sort().forEach(type => {
            console.log(`- ${type} (Samples: ${samples[type].join(', ')})`);
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
};

run();
