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
        const decItems = stockIn.filter(i => i.date && i.date.startsWith('2025-12'));

        const materials = new Set();
        decItems.forEach(i => materials.add(i.material));

        console.log("Unique Material Names in Dec 2025 StockIn:");
        materials.forEach(m => console.log(`"${m}"`));

    } catch (e) {
        console.error(e);
    }
};

run();
