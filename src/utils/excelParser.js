import * as XLSX from 'xlsx';

export const parseExcelFile = (files) => {
    return new Promise(async (resolve, reject) => {
        const mergedData = {
            transactions: [],
            items: [],
            customers: []
        };
        const debugLog = [];

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
                    if (dateVal < 36526) return null;
                    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
                }

                let dateStr = String(dateVal).trim();
                const dmyRegex = /^(\d{1,2})[-/.\s_](\d{1,2})[-/.\s_](\d{2,4})$/;
                const match = dateStr.match(dmyRegex);

                if (match) {
                    const d = match[1];
                    const m = match[2];
                    let y = match[3];
                    if (y.length === 2) y = '20' + y;
                    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }

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

                const attempt = new Date(dateStr);
                if (!isNaN(attempt)) {
                    return attempt.toISOString().split('T')[0];
                }
                return null;
            };

            for (const file of files) {
                debugLog.push(`Processing file: ${file.name}`);
                const workbook = await readFile(file);

                // --- PASS 1: DATE DISCOVERY ---
                let masterFileDate = null;
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                const fileNameClean = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();
                const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12', january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

                let match = fileNameClean.match(/(\d{1,2}\s+\d{1,2}\s+\d{4})/);
                if (match) {
                    masterFileDate = normalizeDate(match[0]);
                } else {
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
                debugLog.push(`Detected Filename Date: ${masterFileDate}`);

                // 2. Check Sheets (Pass 1)
                if (!masterFileDate) {
                    for (const sheetName of workbook.SheetNames) {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        if (!jsonData || jsonData.length === 0) continue;

                        const rowsToScan = jsonData.slice(0, 100);
                        rowsToScan.forEach(row => {
                            if (masterFileDate) return;
                            const cellVal = (String(row[0] || '') + " " + String(row[1] || '')).toLowerCase();
                            if (cellVal.includes('date') || cellVal.includes('period') || cellVal.includes('month')) {
                                let match = cellVal.match(/(\d{1,2}[-/\s][a-zA-Z]+[-/\s]\d{2,4})/);
                                if (match) {
                                    masterFileDate = normalizeDate(match[0]);
                                } else {
                                    let dateColonMatch = cellVal.match(/date\s*[:|-]\s*(\d{1,2}[-/\s\.]\w+[-/\s\.]\d{2,4})/i);
                                    if (dateColonMatch) masterFileDate = normalizeDate(dateColonMatch[1]);
                                }
                            }
                        });
                        if (masterFileDate) break;
                    }
                    debugLog.push(`Detected Sheet Date: ${masterFileDate}`);
                }

                // --- PASS 2: DATA EXTRACTION ---
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (!jsonData || jsonData.length === 0) return;

                    const firstRows = jsonData.slice(0, 5).map(row => JSON.stringify(row).toLowerCase());
                    const contentString = firstRows.join(' ');
                    const headerRow = jsonData[0];

                    if (!headerRow) {
                        debugLog.push(`Skipping sheet ${sheetName}: No header row found.`);
                        return;
                    }

                    let sheetSpecificDate = null;
                    jsonData.slice(0, 5).forEach(row => {
                        const cellVal = (String(row[0] || '') + " " + String(row[1] || '')).toLowerCase();
                        if (cellVal.includes('date') || cellVal.includes('period') || cellVal.includes('month')) {
                            let match = cellVal.match(/(\d{1,2}[-/\s][a-zA-Z]+[-/\s]\d{2,4})/);
                            if (match) sheetSpecificDate = normalizeDate(match[0]);
                        }
                    });

                    // FINAL DECISION FOR THIS SHEET
                    const effectiveDate = sheetSpecificDate || masterFileDate;
                    debugLog.push(`Sheet: ${sheetName}. EffectiveDate: ${effectiveDate}. Content: ${contentString.substring(0, 50)}...`);

                    // --- TYPE 1: ITEMWISE PROFIT ---
                    if (contentString.includes('item name') && contentString.includes('qty. sold')) {
                        debugLog.push("Matched Type 1 (Itemwise Profit)");
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
                    else if (contentString.includes('customer') && (contentString.includes('profit') || contentString.includes('margin'))) {
                        debugLog.push("Matched Type 2 (Customerwise Profit)");
                        const nameIdx = headerRow.findIndex(h => /customer name/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                        const profitIdx = headerRow.findIndex(h => /profit|margin/i.test(h));
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));

                        if (nameIdx !== -1) {
                            jsonData.slice(1).forEach((row, rIdx) => {
                                if (!row) return;
                                const name = row[nameIdx];
                                if (name && String(name).toLowerCase() !== 'total') {
                                    const parsedDate = (dateIdx !== -1 ? normalizeDate(row[dateIdx]) : null) || effectiveDate;
                                    const amount = parseFloat(String(row[amountIdx] || 0).replace(/,/g, ''));
                                    const profit = parseFloat(String(row[profitIdx] || 0).replace(/,/g, ''));

                                    // Push to TRANSACTIONS so it gets saved to DB
                                    mergedData.transactions.push({
                                        id: `cust-${name}-${parsedDate}-${rIdx}-${sheetName}`,
                                        parsedDate: parsedDate,
                                        parsedAmount: amount,
                                        parsedProfit: profit,
                                        parsedType: 'ProfitSummary', // [CHANGED] Specific type to avoid double counting
                                        parsedQty: 1,
                                        originalDesc: 'Customer Monthly Summary',
                                        customerName: String(name).trim().toUpperCase(),
                                        invoiceNo: `SUMMARY-${parsedDate}-${rIdx}`
                                    });

                                    // [NEW] Push to Customers Array for Dashboard Analysis
                                    mergedData.customers.push({
                                        id: `cust-master-${name}-${parsedDate}-${rIdx}`,
                                        name: String(name).trim().toUpperCase(),
                                        revenue: amount,
                                        profit: profit,
                                        parsedDate: parsedDate,
                                        source: 'ProfitFile'
                                    });
                                }
                            });
                        }
                    }


                    // --- TYPE 3: SALES SUMMARY (Invoicewise) ---
                    else if ((contentString.includes('particulars') || contentString.includes('description')) && contentString.includes('amount')) {
                        debugLog.push("Matched Type 3 (Sales Summary)");
                        let headerRowIdx = -1;
                        let amountColIdx = -1;
                        let partColIdx = -1;
                        let qtyColIdx = -1;
                        let dateColIdx = -1;

                        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                            const row = jsonData[i] || [];
                            const rowStr = JSON.stringify(row).toLowerCase();
                            if (rowStr.includes('amount')) {
                                headerRowIdx = i;
                                row.forEach((cell, idx) => {
                                    const str = String(cell).toLowerCase();
                                    if (str.includes('amount')) amountColIdx = idx;
                                    if (str.includes('particulars') || str.includes('description')) partColIdx = idx;
                                    if (str.includes('quantity') || str.includes('qty')) qtyColIdx = idx;
                                    if (str.includes('date')) dateColIdx = idx;
                                });
                                break;
                            }
                        }

                        if (headerRowIdx === -1) headerRowIdx = 0;
                        if (amountColIdx === -1) amountColIdx = 7;
                        if (partColIdx === -1) partColIdx = 1;

                        // [NEW] Find Customer Column - Enhanced Detection
                        let custColIdx = -1;
                        headerRow.forEach((cell, idx) => {
                            const str = String(cell).toLowerCase().trim();
                            if (str.includes('party') || str.includes('customer') || str.includes('billed to') || str.includes('ledger') || str.includes('buyer') || str === 'name') {
                                custColIdx = idx;
                            }
                        });


                        debugLog.push(`Headers: Row=${headerRowIdx}, Particulars=${partColIdx}, Amount=${amountColIdx}, Qty=${qtyColIdx}, Customer=${custColIdx}`);

                        let currentDate = null;
                        let currentInvoiceNo = null;
                        let currentCustomer = null;
                        let currentInvDate = null;
                        let extractedCount = 0;

                        jsonData.slice(headerRowIdx + 1).forEach((row, index) => {
                            if (!row || row.length === 0) return;

                            const colParticulars = String(row[partColIdx] || '').trim();

                            // Debug: Log first few rows
                            if (index < 5) debugLog.push(`Row ${index}: val="${colParticulars}"`);

                            const valStr = colParticulars.toLowerCase();

                            // 1. Detect Header Row: "INV-1165 ... Client : HOTEL BISMI"
                            if (/^inv-/i.test(valStr)) {
                                debugLog.push(`Found Header Row: ${valStr}`);

                                // Extract Client Name
                                const clientMatch = valStr.match(/(?:client|party|customer)\s*[:.-]\s*(.+)$/i);
                                if (clientMatch) {
                                    currentCustomer = clientMatch[1].trim();
                                    if (currentCustomer.match(/date\s*:/i)) {
                                        currentCustomer = currentCustomer.split(/date\s*:/i)[0].trim();
                                    }
                                    debugLog.push(`Captured Customer: ${currentCustomer}`);
                                }

                                // Extract Date "Date : 01-Dec-25"
                                const dateMatch = valStr.match(/date\s*[:.-]\s*([\w-]+)/i);
                                if (dateMatch) {
                                    currentInvDate = normalizeDate(dateMatch[1]);
                                    debugLog.push(`Captured Date: ${dateMatch[1]} -> ${currentInvDate}`);
                                }

                                // Extract Invoice No
                                const invMatch = valStr.match(/(inv-\d+)/i);
                                if (invMatch) {
                                    currentInvoiceNo = invMatch[1];
                                }
                                return;
                            }

                            // 2. Process Item Row
                            if (row[amountColIdx] !== undefined) {
                                const desc = colParticulars.toLowerCase();
                                if (desc.includes('total') || desc === '') return;

                                const amount = parseFloat(String(row[amountColIdx]).replace(/,/g, ''));

                                if (!isNaN(amount) && amount > 0) {
                                    let finalDate = currentInvDate || currentDate || masterFileDate;
                                    if (dateColIdx !== -1 && row[dateColIdx]) finalDate = normalizeDate(row[dateColIdx]);

                                    let qty = 1;
                                    if (qtyColIdx !== -1 && row[qtyColIdx]) qty = parseFloat(String(row[qtyColIdx]).replace(/,/g, '')) || 1;

                                    if (finalDate) {
                                        mergedData.transactions.push({
                                            id: `txn-${finalDate}-${amount}-${index}`,
                                            parsedDate: finalDate, // DB Column: date
                                            parsedAmount: amount, // DB Column: amount
                                            parsedQty: qty, // DB Column: quantity
                                            parsedType: 'Sales', // DB Column: payment_mode
                                            originalDesc: colParticulars || 'Item', // DB Column: item_name
                                            // Priority: 1. Stateful Customer (Header), 2. Column Customer
                                            customerName: currentCustomer || ((custColIdx !== -1 && row[custColIdx]) ? String(row[custColIdx]).trim() : null),
                                            invoiceNo: currentInvoiceNo || `INV-MISSING-${index}` // DB Column: invoice_no
                                        });
                                        extractedCount++;
                                    } else {
                                        if (extractedCount === 0) debugLog.push(`Type 3: Row skipped due to missing date. Row: ${valStr}`);
                                    }
                                }
                            }
                        });
                        debugLog.push(`Type 3: Extracted ${extractedCount} transactions.`);
                    }
                    // --- TYPE 4: PURCHASES ---
                    else if (contentString.includes('supplier') && (contentString.includes('total amount') || contentString.includes('total'))) {
                        debugLog.push("Matched Type 4 (Purchases)");
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /total amount/i.test(h));
                        const supplierIdx = headerRow.findIndex(h => /supplier/i.test(h));
                        const itemIdx = headerRow.findIndex(h => /item|product|material|particulars|description/i.test(h));

                        if (dateIdx !== -1 && amountIdx !== -1) {
                            jsonData.slice(1).forEach((row, index) => {
                                if (!row) return;

                                const supplier = row[supplierIdx] ? String(row[supplierIdx]).toLowerCase() : '';
                                if (supplier.includes('total') || supplier === '') return;

                                const amount = parseFloat(String(row[amountIdx]).replace(/,/g, ''));
                                if (!isNaN(amount) && amount > 0) {
                                    const pDate = (row[dateIdx] ? normalizeDate(row[dateIdx]) : null) || masterFileDate;
                                    if (!pDate) return;

                                    let desc = row[supplierIdx] || 'Purchase';
                                    if (itemIdx !== -1 && row[itemIdx]) desc = `${row[itemIdx]} - ${desc}`;

                                    mergedData.transactions.push({
                                        id: `pur-${pDate}-${amount}-${supplier}-${index}`, // Unique ID
                                        parsedDate: pDate,
                                        parsedAmount: amount,
                                        parsedType: 'Expense',
                                        originalDesc: desc
                                    });
                                }
                            });
                        }
                    }
                    // --- TYPE 5: POS EXPENSES REPORT ---
                    else if (contentString.includes('paid to') && contentString.includes('paid by') && contentString.includes('amount')) {
                        debugLog.push("Matched Type 5 (Expenses)");
                        const dateIdx = headerRow.findIndex(h => /date/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /amount/i.test(h));
                        const typeIdx = headerRow.findIndex(h => /type/i.test(h));
                        const paidToIdx = headerRow.findIndex(h => /paid to/i.test(h));

                        if (dateIdx !== -1 && amountIdx !== -1) {
                            jsonData.slice(1).forEach((row, index) => {
                                if (!row) return;
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
                    // --- TYPE 6: BILLWISE PURCHASE SUMMARY ---
                    else if (((contentString.includes('unit price') && contentString.includes('quantity')) || (contentString.includes('particulars') && contentString.includes('amount') && contentString.includes('supplier'))) && !contentString.includes('client') && !contentString.includes('sale')) {
                        debugLog.push("Matched Type 6 (Billwise Purchase Summary)");
                        const partIdx = headerRow.findIndex(h => /particulars/i.test(h));
                        const qtyIdx = headerRow.findIndex(h => /quantity|qty/i.test(h));
                        const amountIdx = headerRow.findIndex(h => /amount/i.test(h));

                        if (partIdx !== -1) {
                            let currentSupplier = null;
                            let currentDate = null;
                            let currentBillNo = null;
                            debugLog.push(`Indices: Particulars=${partIdx}, Qty=${qtyIdx}, Amount=${amountIdx}`);

                            jsonData.slice(1).forEach((row, index) => {
                                if (!row || row.length === 0) return;
                                const colPart = String(row[partIdx] || '').trim();
                                if (!colPart) return;

                                // 1. Header Row Detection
                                const lowerPart = colPart.toLowerCase();
                                const isHeaderRow = lowerPart.includes('date') && lowerPart.includes('supplier');

                                if (isHeaderRow) {
                                    // Extract Supplier
                                    const supMatch = colPart.match(/supplier\s*[:.-]?\s*(.+)$/i);
                                    if (supMatch) currentSupplier = supMatch[1].trim();

                                    // Extract Date
                                    const dateMatch = colPart.match(/date\s*[:.-]?\s*([\w-]+)/i);
                                    if (dateMatch) currentDate = normalizeDate(dateMatch[1]);

                                    // Extract Bill No: "P-194 Date" -> "P-194"
                                    const billPart = colPart.split(/date/i)[0].trim();
                                    if (billPart && billPart.length > 0) currentBillNo = billPart;

                                    debugLog.push(`Header Row ${index}: Bill=${currentBillNo}, Date=${currentDate}, Sup=${currentSupplier}`);
                                    return;
                                }

                                // 2. Item Row Detection
                                if (!currentDate) return;

                                let qty = 0;
                                if (qtyIdx !== -1) {
                                    // Clean "50" or "50.00" or "50 kg"
                                    const rawQty = String(row[qtyIdx] || 0).replace(/,/g, '').replace(/[^\d.]/g, '');
                                    qty = parseFloat(rawQty);
                                }

                                const rawAmount = String(row[amountIdx] || 0).replace(/,/g, '');
                                const amount = parseFloat(rawAmount);

                                const isTotal = colPart.toLowerCase() === 'total';
                                if (!isTotal && (qty > 0 || amount > 0)) {
                                    const desc = colPart;

                                    mergedData.transactions.push({
                                        id: `pur-bill-${currentDate}-${amount}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                                        parsedDate: currentDate,
                                        parsedAmount: amount,
                                        parsedQty: qty || 0,
                                        parsedType: 'Expense',
                                        originalDesc: desc,
                                        customerName: currentSupplier,
                                        invoiceNo: currentBillNo,
                                        remarks: currentSupplier
                                    });
                                }
                            });
                        }
                    }
                    else {
                        debugLog.push(`NO MATCH (Skipped). Content: ${contentString.substring(0, 50)}...`);
                    }

                }); // end sheets loop

                // --- PASS 3 (Backfill) ---
                // 1. Find the most common date/month in transactions
                const dateCounts = {};
                mergedData.transactions.forEach(t => {
                    if (t.parsedDate) {
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
                if (inferredDate) {
                    mergedData.items.forEach(item => {
                        if (!item.parsedDate) item.parsedDate = inferredDate;
                    });
                    mergedData.customers.forEach(cust => {
                        if (!cust.parsedDate) cust.parsedDate = inferredDate;
                    });
                }
            } // end for files

            resolve({ ...mergedData, debugLog }); // Include Logs

        } catch (error) {
            reject(error);
        }
    });
};
