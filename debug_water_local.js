import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const run = async () => {
    const filePath = 'C:/AntiGravity/POS reports/November 2025/Expenses_01_11_2025_to_30_11_2025.xlsx';
    console.log("Reading:", filePath);
    try {
        const buffer = await readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const waterTxns = [];
        let total = 0;

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!jsonData || jsonData.length === 0) return;

            const firstRows = jsonData.slice(0, 5).map(row => JSON.stringify(row).toLowerCase());
            const contentString = firstRows.join(' ');
            const headerRow = jsonData[0];

            if (!headerRow) return;

            if (contentString.includes('paid to') && contentString.includes('paid by') && contentString.includes('amount')) {
                const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                const typeIdx = headerRow.findIndex(h => /type/i.test(h));
                const paidToIdx = headerRow.findIndex(h => /paid to/i.test(h));

                if (amountIdx !== -1) {
                    jsonData.slice(1).forEach(row => {
                        if (!row) return;

                        const amount = parseFloat(String(row[amountIdx] || 0).replace(/,/g, ''));
                        const desc = String((row[typeIdx] || '') + ' ' + (row[paidToIdx] || '')).toUpperCase();

                        if (!isNaN(amount) && amount > 0) {
                            if (desc.includes('WATER')) {
                                total += amount;
                                waterTxns.push({ amount, desc });
                            }
                        }
                    });
                }
            }
        });

        console.log(`\nWATER TRANSACTIONS:`);
        waterTxns.forEach(t => console.log(`- ${t.amount} | ${t.desc}`));
        console.log(`TOTAL WATER SUM: ${total}`);

    } catch (e) {
        console.error("Error:", e.message);
    }
};

run();
