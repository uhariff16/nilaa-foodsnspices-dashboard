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
                if (typeof dateVal === 'number') {
                    // Sanity check: Excel serial 25569 is 1970-01-01.
                    // If the number is small (e.g. < 30000), it's likely an index (1, 2, 3...) or garbled data, not a modern date.
                    // 40000 is roughly 2009. Let's filter out anything excessively old.
                    if (dateVal < 36526) return null; // Filter dates before 2000-01-01

                    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
                }
                const dateStr = String(dateVal).trim();
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
