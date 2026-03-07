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
                    if (isNaN(dateObj)) return null;

                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
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

                // 3. Handle DD-MMM-YY (e.g. 01-Dec-25 or 1-Mar-26)
                const dmmmRegex = /^(\d{1,2})[-/.\s_]([a-zA-Z]{3})[-/.\s_](\d{2,4})$/;
                const dmmmMatch = dateStr.match(dmmmRegex);
                if (dmmmMatch) {
                    const d = dmmmMatch[1].padStart(2, '0');
                    const mStr = dmmmMatch[2].toLowerCase();
                    let yStr = dmmmMatch[3];
                    if (yStr.length === 2) yStr = '20' + yStr;

                    const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
                    const m = monthMap[mStr.substring(0, 3)];
                    if (m) return `${yStr}-${m}-${d}`;
                }

                // 4. ISO Fallback
                const attempt = new Date(dateStr);
                if (!isNaN(attempt)) {
                    const y = attempt.getFullYear();
                    const m = String(attempt.getMonth() + 1).padStart(2, '0');
                    const d = String(attempt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
                return null;
            };

            const generateUUID = (str) => {
                // Simple deterministic UUID-like hash (MD5-ish but simple for browsers)
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash |= 0;
                }
                const base = Math.abs(hash).toString(16).padEnd(32, '0');
                return `${base.slice(0, 8)}-${base.slice(8, 12)}-4${base.slice(12, 15)}-a${base.slice(15, 18)}-${base.slice(18, 30)}`;
            };

            for (const file of files) {
                const workbook = await readFile(file);
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                    let startRow = -1;
                    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                        const row = jsonData[i];
                        if (row && row.filter(cell => cell && String(cell).toLowerCase().includes('weight')).length >= 2) {
                            startRow = i + 1;
                            break;
                        }
                    }

                    if (startRow === -1) return;

                    let stockInIdx = -1, preProdIdx = -1, postProdIndices = [];
                    const headerRow = jsonData[startRow - 1];
                    const weightIndices = [];
                    headerRow.forEach((cell, idx) => {
                        if (cell && String(cell).toLowerCase().includes('weight')) weightIndices.push(idx);
                    });

                    if (weightIndices.length >= 2) {
                        stockInIdx = weightIndices[0] - 2;
                        preProdIdx = weightIndices[1] - 2;
                        postProdIndices = weightIndices.slice(2).map(idx => idx - 2);
                    } else {
                        stockInIdx = 0; preProdIdx = 4; postProdIndices = [8];
                    }

                    for (let i = startRow; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row) continue;

                        // Identify the primary date for this row (shared across sections usually)
                        const primaryDate = normalizeDate(row[stockInIdx]) || normalizeDate(row[preProdIdx]);

                        // Section 1: Stock In
                        if (row[stockInIdx] !== undefined) {
                            const date = normalizeDate(row[stockInIdx]) || primaryDate;
                            const mat = row[stockInIdx + 1];
                            const weight = parseFloat(row[stockInIdx + 2] || 0);
                            if (date && mat && weight > 0) {
                                productionData.stockIn.push({
                                    id: generateUUID(`stk-${date}-${mat}-${i}-${sheetName}`),
                                    date, material: mat, weight,
                                    source_sheet: sheetName, source_file: file.name
                                });
                            }
                        }

                        // Section 2: Pre-Production
                        if (row[preProdIdx] !== undefined) {
                            const date = normalizeDate(row[preProdIdx]) || primaryDate;
                            const mat = row[preProdIdx + 1];
                            const weight = parseFloat(row[preProdIdx + 2] || 0);
                            if (date && mat && weight > 0) {
                                productionData.preProduction.push({
                                    id: generateUUID(`pre-${date}-${mat}-${i}-${sheetName}`),
                                    date, material: mat, weight,
                                    source_sheet: sheetName, source_file: file.name
                                });
                            }
                        }

                        // Section 3: Multiple Post-Production
                        postProdIndices.forEach((idx, stageIdx) => {
                            if (row[idx] !== undefined || row[idx + 1] !== undefined) {
                                const date = normalizeDate(row[idx]) || primaryDate;
                                const mat = row[idx + 1];
                                const weight = parseFloat(row[idx + 2] || 0);
                                if (date && mat && weight > 0) {
                                    productionData.postProduction.push({
                                        id: generateUUID(`post-${stageIdx}-${date}-${mat}-${i}-${sheetName}`),
                                        date, material: mat, weight, stage: stageIdx,
                                        source_sheet: sheetName, source_file: file.name
                                    });
                                }
                            }
                        });
                    }
                });
            }
            resolve({ ...productionData, debugLog });
        } catch (error) {
            reject(error);
        }
    });
};
