import * as XLSX from 'xlsx';

export const parseProductionFile = (files) => {
    return new Promise(async (resolve, reject) => {
        const productionData = {
            stockIn: [],
            preProduction: [],
            postProduction: []
        };
        const debugLog = [];

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

                // 1. Excel Serial Number
                if (typeof dateVal === 'number') {
                    if (dateVal < 36526) return null; // Filter dates before 2000
                    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
                }

                const dateStr = String(dateVal).trim();

                // 2. Handle DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
                const dmyRegex = /^(\d{1,2})[-/.\s_](\d{1,2})[-/.\s_](\d{2,4})$/;
                const match = dateStr.match(dmyRegex);
                if (match) {
                    const d = match[1].padStart(2, '0');
                    const m = match[2].padStart(2, '0');
                    let y = match[3];
                    if (y.length === 2) y = '20' + y;
                    return `${y}-${m}-${d}`;
                }

                // 3. Handle DD-MMM-YY (e.g. 01-Dec-25)
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

                // 4. ISO Fallback
                const attempt = new Date(dateStr);
                if (!isNaN(attempt)) return attempt.toISOString().split('T')[0];
                return null;
            };

            for (const file of files) {
                debugLog.push(`Processing file: ${file.name}`);
                const workbook = await readFile(file);

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                    // Find the start row by looking for "Weight" or "Material" keywords
                    let startRow = -1;
                    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                        const row = jsonData[i];
                        if (row && row.some(cell => {
                            const str = String(cell).toLowerCase();
                            return str.includes('weight') || str.includes('material') || str.includes('particulars');
                        })) {
                            startRow = i + 1; // Data starts after header
                            break;
                        }
                    }

                    if (startRow === -1) {
                        debugLog.push(`Skipping sheet ${sheetName}: Could not find 'Weight'/'Material' header row.`);
                        return; // Skip sheets without recognizable headers
                    }

                    debugLog.push(`Sheet: ${sheetName}. StartRow: ${startRow}`);

                    // Dynamic Column Detection
                    let stockInIdx = -1;
                    let preProdIdx = -1;
                    let postProdIdx = -1;

                    // Strategy 1: "Weight" Column Detection (Most Robust for this layout)
                    // If we found the start ROW based on "Weight" or "Material", let's inspect that row for multiple "Weight" headers
                    if (startRow > 0) {
                        const headerRow = jsonData[startRow - 1];
                        const weightIndices = [];
                        headerRow.forEach((cell, idx) => {
                            if (cell && String(cell).toLowerCase().includes('weight')) {
                                weightIndices.push(idx);
                            }
                        });

                        if (weightIndices.length >= 3) {
                            // Assume simplified layout: Date | Material | Weight
                            debugLog.push(`Strategy 1 (Weight Cols) Success: Found indices ${weightIndices.join(',')}`);
                            stockInIdx = weightIndices[0] - 2;
                            preProdIdx = weightIndices[1] - 2;
                            postProdIdx = weightIndices[2] - 2;
                        }
                    }

                    // Strategy 2: Section Headers (Fallback)
                    if (stockInIdx === -1) {
                        let headersFound = false;
                        // Scan backwards from startRow to find Section Headers (Stock-in, Pre-Production, etc.)
                        for (let r = startRow - 1; r >= Math.max(0, startRow - 5); r--) {
                            const hRow = jsonData[r];
                            if (!hRow) continue;

                            hRow.forEach((cell, idx) => {
                                const str = String(cell).toLowerCase().replace(/[^a-z]/g, '');

                                if (str.includes('stockin')) { stockInIdx = idx; headersFound = true; }
                                if (str.includes('preproduction')) { preProdIdx = idx; headersFound = true; }
                                if (str.includes('postproduction')) { postProdIdx = idx; headersFound = true; }
                            });

                            if (headersFound) break;
                        }

                        // Fallbacks
                        if (stockInIdx === -1) stockInIdx = 0;
                        if (preProdIdx === -1) preProdIdx = 4;
                        if (postProdIdx === -1) postProdIdx = 8;

                        debugLog.push(`Strategy 2 (Headers/Fallback): StockIn: ${stockInIdx}, PreProd: ${preProdIdx}, PostProd: ${postProdIdx}`);
                    }

                    debugLog.push(`Indices -> StockIn: ${stockInIdx}, PreProd: ${preProdIdx}, PostProd: ${postProdIdx}`);

                    let counts = { s: 0, pre: 0, post: 0, fail: 0 };

                    for (let i = startRow; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row) continue;

                        // Section 1: Stock In
                        if (row[stockInIdx] !== undefined) {
                            const date = normalizeDate(row[stockInIdx]);
                            const mat = row[stockInIdx + 1];
                            const weight = parseFloat(row[stockInIdx + 2] || 0);
                            if (date && mat && weight > 0) {
                                productionData.stockIn.push({
                                    id: `stk-${date}-${mat.replace(/[^a-z0-9]/gi, '')}-${weight}`,
                                    date, material: mat, weight,
                                    source_sheet: sheetName,
                                    source_file: file.name
                                });
                                counts.s++;
                            }
                        }

                        // Section 2: Pre-Production
                        if (row[preProdIdx] !== undefined) {
                            const date = normalizeDate(row[preProdIdx]);
                            const mat = row[preProdIdx + 1];
                            const weight = parseFloat(row[preProdIdx + 2] || 0);

                            // Debug failure for first few rows
                            if (!date && counts.pre === 0 && counts.fail < 3) {
                                debugLog.push(`PreProd Fail Row ${i}: RawDate: ${row[preProdIdx]} -> Norm: ${date}. Mat: ${mat}`);
                                counts.fail++;
                            }

                            if (date && mat && weight > 0) {
                                productionData.preProduction.push({
                                    id: `pre-${date}-${mat.replace(/[^a-z0-9]/gi, '')}-${weight}`,
                                    date, material: mat, weight,
                                    source_sheet: sheetName,
                                    source_file: file.name
                                });
                                counts.pre++;
                            }
                        }

                        // Section 3: Post-Production
                        if (row[postProdIdx] !== undefined) {
                            const date = normalizeDate(row[postProdIdx]);
                            const mat = row[postProdIdx + 1];
                            const weight = parseFloat(row[postProdIdx + 2] || 0);
                            if (date && mat && weight > 0) {
                                productionData.postProduction.push({
                                    id: `post-${date}-${mat.replace(/[^a-z0-9]/gi, '')}-${weight}`,
                                    date, material: mat, weight,
                                    source_sheet: sheetName,
                                    source_file: file.name
                                });
                                counts.post++;
                            }
                        }
                    }
                    debugLog.push(`Sheet Result: StockIn=${counts.s}, PreProd=${counts.pre}, PostProd=${counts.post}`);
                });
            }

            resolve({ ...productionData, debugLog });

        } catch (error) {
            reject(error);
        }
    });
};
