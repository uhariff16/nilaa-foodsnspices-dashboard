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

        const decItems = prodData.stockIn.filter(i => i.date && i.date.startsWith('2025-12'));
        const filterOS = (items) => items.filter(item => {
            const mat = String(item.material).toUpperCase();
            return !(mat.startsWith('OS') || mat.includes('OPENING') || mat.includes('B/F'));
        });
        const cleanItems = filterOS(decItems);

        console.log(`Checking 'Other' Items for Dec 2025...`);

        const others = cleanItems.filter(i => {
            const mat = String(i.material).toLowerCase();
            return !mat.includes('ginger') && !mat.includes('garlic');
        });

        if (others.length === 0) {
            console.log("No Other Items found.");
        } else {
            console.log(`--- OTHER ITEMS (Sum: ${others.reduce((a, b) => a + b.weight, 0)}) ---`);
            others.forEach(i => console.log(`${i.date} | ${i.material} | ${i.weight}`));
        }

    } catch (e) {
        console.error(e);
    }
};

run();
