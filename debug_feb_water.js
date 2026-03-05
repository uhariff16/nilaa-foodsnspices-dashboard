import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const run = async () => {
    try {
        const filesToParse = [
            'G:/My Drive/Insvesmets/Nila Foods & Spices/NFS_Data_Sync/2026/02_Feb26/Expenses_01_02_2026_to_28_02_2026.xlsx',
            'G:/My Drive/Insvesmets/Nila Foods & Spices/NFS_Data_Sync/2026/02_Feb26/Billwise_Purchase_Summary_01_02_2026_to_28_02_2026.xlsx'
        ];

        let allTransactions = [];

        for (const filePath of filesToParse) {
            console.log("Reading:", filePath);
            const buffer = await readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (!jsonData || jsonData.length === 0) return;

                const firstRows = jsonData.slice(0, 5).map(row => JSON.stringify(row).toLowerCase());
                const contentString = firstRows.join(' ');
                const headerRow = jsonData[0];

                if (contentString.includes('paid to') && contentString.includes('paid by') && contentString.includes('amount')) {
                    const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                    const typeIdx = headerRow.findIndex(h => /type/i.test(h));
                    const paidToIdx = headerRow.findIndex(h => /paid to/i.test(h));
                    const dateIdx = headerRow.findIndex(h => /date/i.test(h));

                    if (amountIdx !== -1) {
                        jsonData.slice(1).forEach(row => {
                            if (!row) return;
                            const amount = parseFloat(String(row[amountIdx] || 0).replace(/,/g, ''));
                            if (!isNaN(amount) && amount > 0) {
                                allTransactions.push({
                                    date: row[dateIdx],
                                    amount,
                                    desc: String(row[typeIdx] || '') + ' - ' + String(row[paidToIdx] || ''),
                                    type: 'Expense',
                                    source: 'POS Expenses'
                                });
                            }
                        });
                    }
                }
            });
        }

        const waterKeywords = ['WATER', 'CAN WATER', 'WATER CAN'];
        let totalWater = 0;

        console.log("\nALL 200 EXPENSES IN FEB:");
        let collidedDates = {};
        allTransactions.forEach(t => {
            if (t.amount === 200) {
                console.log(`- Date: ${t.date} | Desc: ${t.desc}`);
                if (!collidedDates[t.date]) collidedDates[t.date] = [];
                collidedDates[t.date].push(t.desc);
            }
        });

        console.log("\nCOLLISIONS:");
        Object.entries(collidedDates).forEach(([date, descs]) => {
            if (descs.length > 1) {
                console.log(`Date: ${date} has multiple 200-rupee expenses:`, descs);
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
};

run();
