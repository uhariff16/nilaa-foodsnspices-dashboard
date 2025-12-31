import * as XLSX from 'xlsx';

export const parseExcelFile = (files) => {
    return new Promise(async (resolve, reject) => {
        const mergedData = {
            transactions: [],
            items: [],
            customers: []
        };

        try {
            // Helper to read a single file
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

            // Helper to normalize date to YYYY-MM-DD
            const normalizeDate = (dateVal) => {
                if (!dateVal) return null;

                // If already Excel serial number
                if (typeof dateVal === 'number') {
                    // Sanity check: data before 2000 is likely noise/index numbers
                    if (dateVal < 36526) return null;

                    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
                }

                let dateStr = String(dateVal).trim();



                // Handle DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MM YYYY, DD_MM_YYYY
                // Delimiters: - / . space _
                const dmyRegex = /^(\d{1,2})[-/.\s_](\d{1,2})[-/.\s_](\d{2,4})$/;
                const match = dateStr.match(dmyRegex);

                if (match) {
                    const d = match[1];
                    const m = match[2];
                    let y = match[3];
                    if (y.length === 2) y = '20' + y;
                    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }

                // Handle DD-MMM-YY (e.g., 01-Nov-25, 01 Nov 2025)
                if (/^\d{1,2}[-/.\s_][a-zA-Z]{3}[-/.\s_]\d{2,4}$/.test(dateStr)) {
                    const parts = dateStr.split(/[-/.\s_]+/);
                    const d = parts[0];
                    const mStr = parts[1];
                    let yStr = parts[2];
                    if (yStr.length === 2) yStr = '20' + yStr;

                    const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
                    const m = monthMap[mStr.toLowerCase().substring(0, 3)];
                    if (m) return `${yStr}-${m}-${d.padStart(2, '0')}`;
                }

                // Basic ISO fallback
                const attempt = new Date(dateStr);
                if (!isNaN(attempt)) {
                    return attempt.toISOString().split('T')[0];
                }

                return null;
            };

            for (const file of files) {
                const workbook = await readFile(file);

                // --- PASS 1: DATE DISCOVERY ---
                // Goal: Find the best "Master Date" for this file by looking at:
                // 1. Filename
                // 2. ANY sheet that might contain a date

                let masterFileDate = null;

                // 1. Check Filename
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                const fileNameClean = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();
                const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12', january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

                // Regex 1: DD MM YYYY
                let match = fileNameClean.match(/(\d{1,2}\s+\d{1,2}\s+\d{4})/);
                if (match) {
                    masterFileDate = normalizeDate(match[0]);
                } else {
                    // Regex 2: Month Year or Year Month
                    const words = fileNameClean.split(/\s+/).filter(w => w.length > 0);
                    for (let i = 0; i < words.length - 1; i++) {
                        const w = words[i];
                        const next = words[i + 1];
                        if (monthMap[w] && /^\d{2,4}$/.test(next)) {
                            let year = next;
                            if (year.length === 2) year = '20' + year;
                            masterFileDate = `${year}-${monthMap[w]}-01`;
                            break;
                        }
                        if (/^\d{2,4}$/.test(w) && monthMap[next]) {
                            let year = w;
                            if (year.length === 2) year = '20' + year;
                            masterFileDate = `${year}-${monthMap[next]}-01`;
                            break;
                        }
                    }
                }

                // 2. Check Sheets (Pass 1)
                if (!masterFileDate) {
                    for (const sheetName of workbook.SheetNames) {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        if (!jsonData || jsonData.length === 0) continue;

                        // Scan first 100 rows for Date headers or Date lines in report
                        const rowsToScan = jsonData.slice(0, 100);

                        rowsToScan.forEach(row => {
                            if (masterFileDate) return;

                            const cellVal = (String(row[0] || '') + " " + String(row[1] || '')).toLowerCase();

                            // Specific check for "Date :" pattern which is common in Tally/ERP reports
                            // e.g. "Date : 1-Nov-2025" or "Date: 01-11-2025"
                            if (cellVal.includes('date') || cellVal.includes('period') || cellVal.includes('month')) {
                                let match = cellVal.match(/(\d{1,2}[-/\s][a-zA-Z]+[-/\s]\d{2,4})/);
                                if (match) {
                                    masterFileDate = normalizeDate(match[0]);
                                } else {
                                    // Check for "Date : DD-MM-YYYY" specifically
                                    let dateColonMatch = cellVal.match(/date\s*[:|-]\s*(\d{1,2}[-/\s\.]\w+[-/\s\.]\d{2,4})/i);
                                    if (dateColonMatch) {
                                        masterFileDate = normalizeDate(dateColonMatch[1]);
                                    } else {
                                        // Text Search Algorithm
                                        const cleanCell = cellVal.replace(/[^a-z0-9\s]/g, ' ');
                                        const words = cleanCell.split(/\s+/);
                                        for (let i = 0; i < words.length - 1; i++) {
                                            const w = words[i];
                                            const next = words[i + 1];
                                            if (monthMap[w] && /^\d{2,4}$/.test(next)) {
                                                let year = next;
                                                if (year.length === 2) year = '20' + year;
                                                masterFileDate = `${year}-${monthMap[w]}-01`;
                                                break;
                                            }
                                            if (/^\d{2,4}$/.test(w) && monthMap[next]) {
                                                let year = w;
                                                if (year.length === 2) year = '20' + year;
                                                masterFileDate = `${year}-${monthMap[next]}-01`;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        });

                        // Check Sheet Name
                        if (!masterFileDate) {
                            const sheetNameClean = sheetName.replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();
                            let match = sheetNameClean.match(/(\d{1,2}\s+\d{1,2}\s+\d{4})/);
                            if (match) {
                                masterFileDate = normalizeDate(match[0]);
                            } else {
                                const words = sheetNameClean.split(/\s+/).filter(w => w.length > 0);
                                for (let i = 0; i < words.length - 1; i++) {
                                    const w = words[i];
                                    const next = words[i + 1];
                                    if (monthMap[w] && /^\d{2,4}$/.test(next)) {
                                        let year = next;
                                        if (year.length === 2) year = '20' + year;
                                        masterFileDate = `${year}-${monthMap[w]}-01`;
                                        break;
                                    }
                                    if (/^\d{2,4}$/.test(w) && monthMap[next]) {
                                        let year = w;
                                        if (year.length === 2) year = '20' + year;
                                        masterFileDate = `${year}-${monthMap[next]}-01`;
                                        break;
                                    }
                                }
                            }
                        }

                        if (masterFileDate) break; // Found a date, stop scanning sheets
                    }
                }

                // --- PASS 2: DATA EXTRACTION ---
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (!jsonData || jsonData.length === 0) return;

                    // Detect File Type
                    const firstRows = jsonData.slice(0, 5).map(row => JSON.stringify(row).toLowerCase());
                    const contentString = firstRows.join(' ');
                    const headerRow = jsonData[0];

                    if (!headerRow) return;

                    // 1. Determine Date for this specific sheet
                    // Priority: Sheet Specific -> Master File Date
                    let sheetSpecificDate = null;

                    // (Reuse local detection logic just in case a sheet OVERRIDES the master date)
                    jsonData.slice(0, 5).forEach(row => {
                        const cellVal = (String(row[0] || '') + " " + String(row[1] || '')).toLowerCase();
                        if (cellVal.includes('date') || cellVal.includes('period') || cellVal.includes('month')) {
                            let match = cellVal.match(/(\d{1,2}[-/\s][a-zA-Z]+[-/\s]\d{2,4})/);
                            if (match) sheetSpecificDate = normalizeDate(match[0]);
                            else {
                                const cleanCell = cellVal.replace(/[^a-z0-9\s]/g, ' ');
                                const words = cleanCell.split(/\s+/);
                                for (let i = 0; i < words.length - 1; i++) {
                                    const w = words[i];
                                    const next = words[i + 1];
                                    if (monthMap[w] && /^\d{2,4}$/.test(next)) {
                                        let year = next;
                                        if (year.length === 2) year = '20' + year;
                                        sheetSpecificDate = `${year}-${monthMap[w]}-01`;
                                        break;
                                    }
                                    if (/^\d{2,4}$/.test(w) && monthMap[next]) {
                                        let year = w;
                                        if (year.length === 2) year = '20' + year;
                                        sheetSpecificDate = `${year}-${monthMap[next]}-01`;
                                        break;
                                    }
                                }
                            }
                        }
                    });

                    // If still no sheet specific date, check sheet name
                    if (!sheetSpecificDate) {
                        const sheetNameClean = sheetName.replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();
                        let match = sheetNameClean.match(/(\d{1,2}\s+\d{1,2}\s+\d{4})/);
                        if (match) sheetSpecificDate = normalizeDate(match[0]);
                        else {
                            const words = sheetNameClean.split(/\s+/).filter(w => w.length > 0);
                            for (let i = 0; i < words.length - 1; i++) {
                                const w = words[i];
                                const next = words[i + 1];
                                if (monthMap[w] && /^\d{2,4}$/.test(next)) {
                                    let year = next;
                                    if (year.length === 2) year = '20' + year;
                                    sheetSpecificDate = `${year}-${monthMap[w]}-01`;
                                    break;
                                }
                                if (/^\d{2,4}$/.test(w) && monthMap[next]) {
                                    let year = w;
                                    if (year.length === 2) year = '20' + year;
                                    sheetSpecificDate = `${year}-${monthMap[next]}-01`;
                                    break;
                                }
                            }
                        }
                    }

                    // FINAL DECISION FOR THIS SHEET
                    const effectiveDate = sheetSpecificDate || masterFileDate;

                    // --- TYPE 1: ITEMWISE PROFIT ---
                    if (contentString.includes('item name') && contentString.includes('qty. sold')) {
                        const itemIdx = headerRow.findIndex(h => /item name/i.test(h));
                        const qtyIdx = headerRow.findIndex(h => /qty/i.test(h));
                        const profitIdx = headerRow.findIndex(h => /profit|margin/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));

                        if (itemIdx !== -1) {
                            jsonData.slice(1).forEach((row, rIdx) => {
                                if (!row) return;
                                const name = row[itemIdx];
                                if (name) {
                                    const parsedDate = (dateIdx !== -1 ? normalizeDate(row[dateIdx]) : null) || effectiveDate;
                                    mergedData.items.push({
                                        id: `item-${name}-${parsedDate}-${rIdx}-${sheetName}`, // Unique ID
                                        name: name,
                                        qty: parseFloat(String(row[qtyIdx] || 0).replace(/,/g, '')),
                                        revenue: parseFloat(String(row[amountIdx] || 0).replace(/,/g, '')),
                                        profit: parseFloat(String(row[profitIdx] || 0).replace(/,/g, '')),
                                        parsedDate: parsedDate
                                    });
                                }
                            });
                        }
                    }
                    // --- TYPE 2: CUSTOMERWISE PROFIT ---
                    else if (contentString.includes('customer name') && contentString.includes('profit/margin')) {
                        const nameIdx = headerRow.findIndex(h => /customer name/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                        const profitIdx = headerRow.findIndex(h => /profit|margin/i.test(h));
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));

                        if (nameIdx !== -1) {
                            jsonData.slice(1).forEach((row, rIdx) => {
                                if (!row) return;
                                const name = row[nameIdx];
                                if (name) {
                                    const parsedDate = (dateIdx !== -1 ? normalizeDate(row[dateIdx]) : null) || effectiveDate;
                                    mergedData.customers.push({
                                        id: `cust-${name}-${parsedDate}-${rIdx}-${sheetName}`, // Unique ID
                                        name: name,
                                        revenue: parseFloat(String(row[amountIdx] || 0).replace(/,/g, '')),
                                        profit: parseFloat(String(row[profitIdx] || 0).replace(/,/g, '')),
                                        parsedDate: parsedDate
                                    });
                                }
                            });
                        }
                    }
                    // --- TYPE 3: SALES SUMMARY (Invoicewise) ---
                    else if (contentString.includes('particulars') && contentString.includes('amount')) {
                        let currentDate = null;
                        let currentInvoiceNo = null;

                        // Dynamic Column Detection
                        // Scan first 10 rows to find the "Amount" column index
                        let amountColIdx = 7; // Default fallback

                        for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
                            const rowStr = JSON.stringify(jsonData[r] || []).toLowerCase();
                            if (rowStr.includes('amount')) {
                                const foundIdx = jsonData[r].findIndex(cell => String(cell).toLowerCase().includes('amount'));
                                if (foundIdx !== -1) {
                                    amountColIdx = foundIdx;
                                    break;
                                }
                            }
                        }

                        jsonData.forEach((row, index) => {
                            if (!row || row.length === 0) return;
                            const particulars = String(row[1] || '');

                            // Check for Header row (e.g. "INV-1165 Date : 01-Dec-25 Client : ...")
                            // Robust regex to capture INV-XXXX and Date
                            if (particulars.includes('INV-') || particulars.includes('Date :')) {
                                // Extract Invoice No
                                const invMatch = particulars.match(/(INV-[\w-]+)/i);
                                if (invMatch) currentInvoiceNo = invMatch[1];

                                // Extract Date
                                const dateMatch = particulars.match(/Date\s*:\s*([\d-]+-[a-zA-Z]+-[\d]+)/);
                                if (dateMatch) {
                                    currentDate = normalizeDate(dateMatch[1]);
                                }
                            }

                            // Check for Transaction row
                            // Ensure we have a date (either row specific or file level)
                            if ((currentDate || effectiveDate) && row[amountColIdx] !== undefined) {
                                const desc = particulars.toLowerCase();
                                if (desc.includes('total') || desc.includes('sub total') || desc.includes('round off') || desc === '') return;

                                const amount = parseFloat(String(row[amountColIdx]).replace(/,/g, ''));
                                if (!isNaN(amount) && amount > 0) {
                                    const tDate = currentDate || effectiveDate;
                                    mergedData.transactions.push({
                                        id: `txn-${tDate}-${amount}-${row[1]}-${index}`, // Unique ID
                                        parsedDate: tDate,
                                        parsedAmount: amount,
                                        parsedType: 'Sales',
                                        originalDesc: row[1] || 'Item',
                                        invoiceNo: currentInvoiceNo // Attach captured Invoice No
                                    });
                                }
                            }
                        });
                    }
                    // --- TYPE 4: PURCHASES ---
                    else if (contentString.includes('supplier') && (contentString.includes('total amount') || contentString.includes('total'))) {
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /total amount/i.test(h));
                        const supplierIdx = headerRow.findIndex(h => /supplier/i.test(h));

                        if (dateIdx !== -1 && amountIdx !== -1) {
                            jsonData.slice(1).forEach((row, index) => {
                                if (!row || !row[dateIdx]) return;
                                const supplier = row[supplierIdx] ? String(row[supplierIdx]).toLowerCase() : '';
                                const dateStr = String(row[dateIdx]).toLowerCase();
                                if (supplier.includes('total') || supplier === '' || dateStr.includes('total')) return;

                                const amount = parseFloat(String(row[amountIdx]).replace(/,/g, ''));
                                if (!isNaN(amount) && amount > 0) {
                                    const pDate = normalizeDate(row[dateIdx]);
                                    mergedData.transactions.push({
                                        id: `pur-${pDate}-${amount}-${supplier}-${index}`, // Unique ID
                                        parsedDate: pDate,
                                        parsedAmount: amount,
                                        parsedType: 'Expense',
                                        originalDesc: row[supplierIdx] || 'Purchase'
                                    });
                                }
                            });
                        }
                    }
                    // --- TYPE 5: POS EXPENSES REPORT (e.g. Expenses_01_11_2025...) ---
                    else if (contentString.includes('paid to') && contentString.includes('paid by') && contentString.includes('amount')) {
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                        const typeIdx = headerRow.findIndex(h => /type/i.test(h));
                        const paidToIdx = headerRow.findIndex(h => /paid to/i.test(h));

                        if (dateIdx !== -1 && amountIdx !== -1) {
                            jsonData.slice(1).forEach((row, index) => {
                                if (!row) return;

                                // Skip total rows if any
                                const dateStr = String(row[dateIdx] || '').toLowerCase();
                                if (dateStr.includes('total')) return;

                                const amount = parseFloat(String(row[amountIdx] || 0).replace(/,/g, ''));
                                if (!isNaN(amount) && amount > 0) {
                                    const eDate = normalizeDate(row[dateIdx]);
                                    const desc = (row[typeIdx] || '') + (row[paidToIdx] ? ` - ${row[paidToIdx]}` : '');
                                    mergedData.transactions.push({
                                        id: `exp-${eDate}-${amount}-${desc}-${index}`, // Unique ID
                                        parsedDate: eDate,
                                        parsedAmount: amount,
                                        parsedType: 'Expense',
                                        originalDesc: desc
                                    });
                                }
                            });
                        }
                    }

                }); // end sheets loop

                // --- PASS 3: BACKFILL UNDATED ITEMS/CUSTOMERS ---
                // If Item/Customer sheets had no date, but Transactions did, use the Transaction Date.

                // 1. Find the most common date/month in transactions
                const dateCounts = {};
                mergedData.transactions.forEach(t => {
                    if (t.parsedDate) {
                        // Group by Month (YYYY-MM)
                        const monthKey = t.parsedDate.substring(0, 7) + '-01'; // 2025-11-01
                        dateCounts[monthKey] = (dateCounts[monthKey] || 0) + 1;
                    }
                });

                let inferredDate = null;
                let maxCount = 0;
                Object.entries(dateCounts).forEach(([date, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        inferredDate = date;
                    }
                });

                // 2. Apply Inferred Date to undated items/customers
                if (inferredDate) {
                    mergedData.items.forEach(item => {
                        if (!item.parsedDate) item.parsedDate = inferredDate;
                    });
                    mergedData.customers.forEach(cust => {
                        if (!cust.parsedDate) cust.parsedDate = inferredDate;
                    });
                }
            } // end for files

            resolve(mergedData);

        } catch (error) {
            reject(error);
        }
    });
};
