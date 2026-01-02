
const mockData = [
    ["Daily Stock & Production", null, "Jan-26"],
    [null, null, null, null, null],
    [null, null, null, null, "Pre-Production", null, null, "Post-Production"], // Row 2
    ["Date", "Material", "Weight(Kgs)", null, "Date", "Material", "Weight(Kgs)", null, "Date", "Material", "Weight(Kgs)"], // Row 3
    ["1-Jan-26", "OS - Ginger...", 8.8, null, "1-Jan-26", "OS - Broken...", 34.5, null, "1-Jan-26", "Garlic...", 16] // Row 4 (Data)
];

function detectIndices(jsonData) {
    let stockInIdx = -1;
    let preProdIdx = -1;
    let postProdIdx = -1;
    let startRow = -1;

    // 1. Find Header Row (StartRow)
    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
        const row = jsonData[i];
        if (row && row.some(cell => String(cell).toLowerCase().includes('weight'))) {
            startRow = i + 1; // Data starts after this

            // 2. Strategy: Weight Column Detection
            const weightIndices = [];
            row.forEach((cell, idx) => {
                if (String(cell).toLowerCase().includes('weight')) {
                    weightIndices.push(idx);
                }
            });

            console.log(`Found Weight Indices: ${weightIndices}`);

            if (weightIndices.length >= 3) {
                // Assume standard layout: Date, Material, Weight
                // So Date is Weight - 2
                stockInIdx = weightIndices[0] - 2;
                preProdIdx = weightIndices[1] - 2;
                postProdIdx = weightIndices[2] - 2;
                console.log("Strategy: Weight Columns Used");
            }
            break;
        }
    }

    if (stockInIdx === -1) {
        // Fallback to old logic (Section Headers)
        console.log("Strategy: Fallback to Section Headers");
        // ... old logic ...
    }

    return { stockInIdx, preProdIdx, postProdIdx, startRow };
}

const result = detectIndices(mockData);
console.log("Result:", result);

// Verify specific column calculation
const preProdCol = result.preProdIdx; // Should be 4
const rowData = mockData[4]; // Data Row
console.log("PreProd Data:", rowData[preProdCol], rowData[preProdCol + 1], rowData[preProdCol + 2]);
