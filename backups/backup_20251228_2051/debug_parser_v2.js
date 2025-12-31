import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

const run = async () => {
    const filePath = 'C:/AntiGravity/NFS_Sales&Expences-2025.xlsx';
    console.log("Reading:", filePath);
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
        // console.log("Header:", headerRow);

        let detected = false;

        // TYPE 5 Check (Expenses)
        if (contentString.includes('expences') && contentString.includes('sales')) {
            console.log("  -> MATCHED TYPE 5 (Sales & Expences)");
            detected = true;
            const dateIdx = headerRow.findIndex(h => /date/i.test(h));
            const expIdx = headerRow.findIndex(h => /expences/i.test(h));
            const descIdx = headerRow.findIndex(h => /description|particulars/i.test(h));

            console.log(`  -> Indices: Date=${dateIdx}, Exp=${expIdx}, Desc=${descIdx}`);

            if (expIdx !== -1) {
                let count = 0;
                jsonData.slice(1).forEach((row, rIdx) => {
                    // Log first few rows to debug
                    if (rIdx < 3) console.log(`    Row ${rIdx}:`, row);

                    if (!row) return;
                    const amount = parseFloat(String(row[expIdx] || 0).replace(/,/g, ''));

                    if (!isNaN(amount) && amount > 0) {
                        count++;
                        mergedData.transactions.push({
                            parsedDate: row[dateIdx] || sheetName,
                            parsedAmount: amount,
                            parsedType: 'Expense',
                            originalDesc: row[descIdx] || 'Operational Expense'
                        });
                    }
                });
                console.log(`  -> Extracted ${count} expenses.`);
            }
        } else {
            console.log("  -> No match.");
        }
    });

    console.log("\nTOTAL TRANSACTIONS EXTRACTED:", mergedData.transactions.length);
    console.log("TOTAL EXPENSE VALUE:", mergedData.transactions.reduce((acc, t) => acc + t.parsedAmount, 0));
};

run();
