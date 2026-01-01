import * as XLSX from 'xlsx';

export const parseProductionFile = (files) => {
    return new Promise(async (resolve, reject) => {
        const productionData = {
            stockIn: [],
            preProduction: [],
            postProduction: []
        };

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
                const workbook = await readFile(file);

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    // Use a more inclusive parsing strategy:
                    // Only skip if the sheet is visibly empty or totally irrelevant
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                    // Find the start row by looking for "Weight" or "Material" keywords
                    // This creates a dynamic header detection rather than assuming sheet name
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

                    if (startRow === -1) return; // Skip sheets without recognizable headers

                    for (let i = startRow; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row) continue;

                        // Section 1: Stock In (Cols 0-2)
                        if (row[0] && row[1]) {
                            const date = normalizeDate(row[0]);
                            const mat = row[1];
                            const weight = parseFloat(row[2] || 0);
                            if (date && mat && weight > 0) {
                                productionData.stockIn.push({
                                    id: `stk-${date}-${mat.replace(/[^a-z0-9]/gi, '')}-${weight}`,
                                    date, material: mat, weight, source: sheetName
                                });
                            }
                        }

                        // Section 2: Pre-Production (Cols 4-6)
                        if (row[4] && row[5]) {
                            const date = normalizeDate(row[4]);
                            const mat = row[5];
                            const weight = parseFloat(row[6] || 0);
                            if (date && mat && weight > 0) {
                                productionData.preProduction.push({
                                    id: `pre-${date}-${mat.replace(/[^a-z0-9]/gi, '')}-${weight}`,
                                    date, material: mat, weight, source: sheetName
                                });
                            }
                        }

                        // Section 3: Post-Production (Cols 8-10)
                        if (row[8] && row[9]) {
                            const date = normalizeDate(row[8]);
                            const mat = row[9];
                            const weight = parseFloat(row[10] || 0);
                            if (date && mat && weight > 0) {
                                productionData.postProduction.push({
                                    id: `post-${date}-${mat.replace(/[^a-z0-9]/gi, '')}-${weight}`,
                                    date, material: mat, weight, source: sheetName
                                });
                            }
                        }
                    }
                });
            }

            resolve(productionData);

        } catch (error) {
            reject(error);
        }
    });
};
