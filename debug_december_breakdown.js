import { parseProductionFile } from './src/utils/productionParser.js';
import fs from 'fs';
import path from 'path';

class MockFile {
    constructor(filePath) {
        this.path = filePath;
        this.name = path.basename(filePath);
    }
}

global.FileReader = class FileReader {
    readAsArrayBuffer(file) {
        const buffer = fs.readFileSync(file.path);
        const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        this.onload({ target: { result: ab } });
    }
};

const run = async () => {
    try {
        const prodPath = 'c:\\AntiGravity\\src\\data\\Production\\Daily Stocks & Production.xlsx';
        const prodData = await parseProductionFile([new MockFile(prodPath)]);

        const stockIn = prodData.stockIn;
        // Filter for December 2025
        const decItems = stockIn.filter(i => i.date && i.date.startsWith('2025-12'));

        console.log(`Total December Items: ${decItems.length}`);

        let gingerSum = 0;
        let garlicSum = 0;
        let excludedSum = 0;

        console.log("\n--- DETAILED BREAKDOWN ---");
        console.log("Date | Material (Raw) | Weight | Action");
        console.log("---------------------------------------");

        decItems.forEach(item => {
            const rawName = String(item.material || '').trim();
            const upperName = rawName.toUpperCase();

            // Current Filter Logic
            const isOS = upperName.startsWith('OS') || upperName.startsWith('OPENING') || upperName.includes('B/F');

            const action = isOS ? "EXCLUDED" : "INCLUDED";
            const weight = parseFloat(item.weight) || 0;

            if (isOS) {
                excludedSum += weight;
            } else {
                if (upperName.includes('GINGER') && !upperName.includes('GARLIC')) {
                    gingerSum += weight;
                } else if (upperName.includes('GARLIC') && !upperName.includes('GINGER')) {
                    garlicSum += weight;
                }
            }

            // Print distinct items or significant ones
            console.log(`${item.date} | "${rawName}" | ${weight.toFixed(2)} | ${action}`);
        });

        console.log("\n--- SUMMARY FOR DEC 2025 ---");
        console.log(`Calculated Ginger Sum (Included): ${gingerSum.toFixed(2)}`);
        console.log(`Calculated Garlic Sum (Included): ${garlicSum.toFixed(2)}`);
        console.log(`Total Excluded (OS/Opening): ${excludedSum.toFixed(2)}`);

    } catch (e) {
        console.error(e);
    }
};

run();
