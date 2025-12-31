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
                // Excel Serial Date
                if (typeof dateVal === 'number') {
                    if (dateVal < 36526) return null;
                    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
                }

                const dateStr = String(dateVal).trim();

                // Handle DD-MMM-YY or DD-MMM-YYYY (e.g., 02-Dec-25) manual parsing
                // This is safer than new Date() which varies by browser/locale for this format
                const parts = dateStr.split(/[-/ ]/);
                if (parts.length === 3) {
                    const monthMap = {
                        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
                    };

                    let day, monthStr, year;

                    // Assume DD-MMM-YY or similar. Try to find the alpha month.
                    const part0IsNum = !isNaN(parts[0]);
                    const part1IsNum = !isNaN(parts[1]);

                    if (part0IsNum && !part1IsNum) {
                        day = parseInt(parts[0], 10);
                        monthStr = parts[1].toLowerCase();
                        year = parseInt(parts[2], 10);
                    } else if (part1IsNum && !part0IsNum) {
                        // MMM-DD-YY? Unlikely but possible
                        monthStr = parts[0].toLowerCase();
                        day = parseInt(parts[1], 10);
                        year = parseInt(parts[2], 10);
                    }

                    if (monthMap.hasOwnProperty(monthStr)) {
                        const month = monthMap[monthStr];
                        // Handle 2 digit year
                        if (year < 100) year += 2000;

                        const d = new Date(year, month, day);
                        // Adjust for timezone offset to keep strict YYYY-MM-DD
                        const offset = d.getTimezoneOffset();
                        const adjusted = new Date(d.getTime() - (offset * 60 * 1000));
                        return adjusted.toISOString().split('T')[0];
                    }
                }

                // Fallback for standard ISO or other formats
                const attempt = new Date(dateStr);
                if (!isNaN(attempt)) {
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
                        const rowStr = row.map(c => String(c).toLowerCase().trim());
                        // Use substring match for flexibility
                        const hasSupplier = rowStr.some(c => c.includes('supplier'));
                        const hasAmount = rowStr.some(c => c.includes('total amount') || c === 'amount');

                        if (hasSupplier && hasAmount) {
                            startRow = i + 1;
                            rowStr.forEach((cell, idx) => {
                                if (cell.includes('date')) colMap.date = idx;
                                if (cell.includes('supplier')) colMap.supplier = idx;
                                if (cell.includes('total amount') || cell === 'amount') colMap.amount = idx;
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
                            id: `pur-${date}-${amount}-${supplier.replace(/[^a-z0-9]/gi, '')}`,
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
