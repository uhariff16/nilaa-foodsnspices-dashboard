import * as XLSX from 'xlsx';

export const parsePurchaseFile = (files) => {
    return new Promise(async (resolve, reject) => {
        const purchases = [];

        try {
            const readFile = (file) => {
                return new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        res(workbook);
                    };
                    reader.onerror = rej;
                    reader.readAsArrayBuffer(file);
                });
            };

            const normalizeDate = (dateVal) => {
                if (!dateVal) return null;
                if (typeof dateVal === 'number') {
                    if (dateVal < 36526) return null; // Filter dates before 2000
                    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
                }
                const dateStr = String(dateVal).trim();
                // Handle "02-Dec-25" format commonly found in these files
                const attempt = new Date(dateStr);
                if (!isNaN(attempt)) {
                    // Adjust for local vs UTC if needed, but usually simple date parse is enough for current use
                    // To ensure YYYY-MM-DD
                    const offset = attempt.getTimezoneOffset();
                    const adjusted = new Date(attempt.getTime() - (offset * 60 * 1000));
                    return adjusted.toISOString().split('T')[0];
                }
                return null;
            };

            for (const file of files) {
                // strict check for filename to avoid parsing other reports as purchases
                if (!file.name.toLowerCase().includes('purchases')) continue;

                const workbook = await readFile(file);
                // Usually the first sheet has the data
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                // Find header row (look for "Supplier" or "Total Amount")
                let startRow = -1;
                let colMap = { date: -1, supplier: -1, amount: -1, remarks: -1 };

                for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                    const row = jsonData[i];
                    if (row) {
                        const rowStr = row.map(c => String(c).toLowerCase());
                        if (rowStr.includes('supplier') && rowStr.includes('total amount')) {
                            startRow = i + 1;
                            rowStr.forEach((cell, idx) => {
                                if (cell.includes('date')) colMap.date = idx;
                                if (cell.includes('supplier')) colMap.supplier = idx;
                                if (cell.includes('total amount')) colMap.amount = idx;
                                if (cell.includes('remarks')) colMap.remarks = idx;
                            });
                            break;
                        }
                    }
                }

                if (startRow === -1) continue;

                for (let i = startRow; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row) continue;

                    // Helper to clean amount string "3,400.00" -> 3400.00
                    const parseAmount = (val) => {
                        if (typeof val === 'number') return val;
                        if (!val) return 0;
                        return parseFloat(String(val).replace(/,/g, ''));
                    };

                    // Basic validation: needs valid date and supplier or valid amount
                    const date = colMap.date > -1 ? normalizeDate(row[colMap.date]) : null;
                    const supplier = colMap.supplier > -1 ? row[colMap.supplier] : 'Unknown';
                    const amount = colMap.amount > -1 ? parseAmount(row[colMap.amount]) : 0;
                    const remarks = colMap.remarks > -1 ? row[colMap.remarks] : '';

                    if (date && amount > 0) {
                        purchases.push({
                            date,
                            supplier,
                            amount,
                            remarks,
                            source: file.name
                        });
                    }
                }
            }

            resolve(purchases);

        } catch (error) {
            reject(error);
        }
    });
};
