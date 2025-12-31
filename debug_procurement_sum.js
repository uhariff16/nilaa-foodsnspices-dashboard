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
        // Use the file we copied to src/data
        const prodPath = 'c:\\AntiGravity\\src\\data\\Production\\Daily Stocks & Production.xlsx';
        const prodData = await parseProductionFile([new MockFile(prodPath)]);

        // Filter for December 2025
        const decItems = prodData.stockIn.filter(i => i.date && i.date.startsWith('2025-12'));

        console.log(`Total Dec 2025 Items: ${decItems.length}`);

        // Helper filter from ProcurementDashboard
        const filterOS = (items) => items.filter(item => {
            const mat = String(item.material).toUpperCase();
            return !(mat.startsWith('OS') || mat.includes('OPENING') || mat.includes('B/F'));
        });

        const cleanItems = filterOS(decItems);
        console.log(`After OS Filter: ${cleanItems.length}`);

        // Ginger Audit
        const gingerItems = cleanItems.filter(i =>
            String(i.material).toLowerCase().includes('ginger') &&
            !String(i.material).toLowerCase().includes('garlic')
        );
        console.log(`\n--- GINGER ITEMS (Sum: ${gingerItems.reduce((a, b) => a + b.weight, 0)}) ---`);
        gingerItems.forEach(i => console.log(`${i.date} | ${i.material} | ${i.weight} | Src: ${i.source}`));

        // Garlic Audit
        const garlicItems = cleanItems.filter(i =>
            String(i.material).toLowerCase().includes('garlic') &&
            !String(i.material).toLowerCase().includes('ginger')
        );
        console.log(`\n--- GARLIC ITEMS (Sum: ${garlicItems.reduce((a, b) => a + b.weight, 0)}) ---`);
        garlicItems.forEach(i => console.log(`${i.date} | ${i.material} | ${i.weight} | Src: ${i.source}`));

    } catch (e) {
        console.error(e);
    }
};

run();
