import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const run = async () => {
    const filePath = 'C:/AntiGravity/POS reports/Expenses_01_11_2025_to_30_11_2025.xlsx';
    console.log("Reading:", filePath);
    try {
        const buffer = await readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const mergedData = { transactions: [] };

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!jsonData || jsonData.length === 0) return;

            const firstRows = jsonData.slice(0, 5).map(row => JSON.stringify(row).toLowerCase());
            const contentString = firstRows.join(' ');
            const headerRow = jsonData[0];

            if (!headerRow) return;

            console.log(`\nChecking Sheet: ${sheetName}`);
            // console.log("Content String Sample:", contentString.substring(0, 100));

            // --- TYPE 6 TEST ---
            // Expected Headers: S.No., Date, Type, Amount, Paid To, Paid By...
            if (contentString.includes('paid to') && contentString.includes('paid by') && contentString.includes('amount')) {
                console.log("  -> MATCHED POS EXPENSES FORMAT");

                const dateIdx = headerRow.findIndex(h => /date/i.test(h));
                const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                // Using 'Type' column for description, maybe append 'Paid To'
                const typeIdx = headerRow.findIndex(h => /type/i.test(h));
                const paidToIdx = headerRow.findIndex(h => /paid to/i.test(h));

                console.log(`  -> Indices: Date=${dateIdx}, Amount=${amountIdx}, Type=${typeIdx}, PaidTo=${paidToIdx}`);

                if (dateIdx !== -1 && amountIdx !== -1) {
                    let count = 0;
                    jsonData.slice(1).forEach(row => {
                        if (!row) return;

                        // Skip total rows check
                        const dateStr = String(row[dateIdx] || '').toLowerCase();
                        if (dateStr.includes('total')) return;

                        const amount = parseFloat(String(row[amountIdx] || 0).replace(/,/g, ''));

                        if (!isNaN(amount) && amount > 0) {
                            count++;
                            mergedData.transactions.push({
                                parsedDate: row[dateIdx],
                                parsedAmount: amount,
                                parsedType: 'Expense',
                                originalDesc: (row[typeIdx] || '') + (row[paidToIdx] ? ` - ${row[paidToIdx]}` : '')
                            });
                        }
                    });
                    console.log(`  -> Extracted ${count} transactions.`);
                }
            } else {
                console.log("  -> No match.");
            }
        });

        console.log("\nTOTAL TRANSACTIONS:", mergedData.transactions.length);
        console.log("FIRST 3 TRANSACTIONS:", mergedData.transactions.slice(0, 3));

    } catch (e) {
        console.error("Error:", e.message);
    }
};

run();
