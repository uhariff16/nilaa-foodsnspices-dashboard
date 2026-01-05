import * as XLSX from 'xlsx';

export const parseSummaryFile = (fileUrl) => {
    return fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const records = [];
            let currentSupplier = 'Unknown';

            // Start from row 1 (index 1) assuming row 0 is headers
            // Based on debug output: col 1 is Particulars, col 2 is Bill No, col 3 is Date...
            // Row structure: [S.No, Particulars, Bill No, Date, Qty, Unit Price, Disc, Tax, Cess, Amount]

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const particulars = row[1];
                const billNo = row[2];
                const dateRaw = row[3];
                const qtyRaw = row[4];
                const amountRaw = row[9]; // Index 9 usually based on debug output

                if (!particulars) continue;

                // Heuristic: If Bill No is missing, it's likely a Supplier Header
                if (!billNo && !dateRaw) {
                    // It's a supplier header (or footer total)
                    // Check if exclude specifics
                    if (particulars.toLowerCase().includes('total')) continue;
                    currentSupplier = particulars.trim();
                } else {
                    // It's a transaction row (Variety)
                    // Ensure it is not a sub-header (looks like 'Old Ginger' is the variety)

                    const variety = particulars.trim();
                    const qty = parseFloat(String(qtyRaw).replace(/,/g, '')) || 0;
                    const amount = parseFloat(String(amountRaw).replace(/,/g, '')) || 0;

                    // Basic date parsing (DD-MMM-YY)
                    // "01-May-25"
                    let date = null;
                    if (typeof dateRaw === 'string') {
                        const parts = dateRaw.split('-');
                        if (parts.length === 3) {
                            const m = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
                            const month = m[parts[1]] || '01';
                            date = `20${parts[2]}-${month}-${parts[0]}`; // 25 -> 2025
                        }
                    }

                    if (amount > 0 || qty > 0) {
                        records.push({
                            id: `sum-${i}-${variety}-${amount}`, // Unique ID
                            supplier: currentSupplier,
                            variety: variety,
                            billNo: billNo,
                            date: date,
                            quantity: qty,
                            amount: amount,
                            type: 'summary_item'
                        });
                    }
                }
            }
            return records;
        });
};
