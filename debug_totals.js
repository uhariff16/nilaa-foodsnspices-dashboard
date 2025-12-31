import { parseProductionFile } from './src/utils/productionParser.js';
import { parsePurchaseFile } from './src/utils/purchaseParser.js';
import fs from 'fs';
import path from 'path';

// Mock File object for node environment
class MockFile {
    constructor(filePath) {
        this.path = filePath;
        this.name = path.basename(filePath);
    }
}

// Mock FileReader for node
global.FileReader = class FileReader {
    readAsArrayBuffer(file) {
        const buffer = fs.readFileSync(file.path);
        // Convert to ArrayBuffer
        const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        this.onload({ target: { result: ab } });
    }
};

const run = async () => {
    try {
        const prodPath = 'c:\\AntiGravity\\src\\data\\Production\\Daily Stocks & Production.xlsx';
        const purchPath = 'c:\\AntiGravity\\src\\data\\POS reports\\12_Dec 2025\\Purchases_01_12_2025_to_27_12_2025.xlsx';

        console.log("Checking Production File...");
        const prodData = await parseProductionFile([new MockFile(prodPath)]);

        console.log("Stock In Items with 'Total' in name:");
        const badProd = prodData.stockIn.filter(i => String(i.material).toLowerCase().includes('total'));
        console.log(badProd);

        console.log("\nChecking Purchase File...");
        const purchData = await parsePurchaseFile([new MockFile(purchPath)]);

        console.log("Purchase Items with 'Total' in supplier:");
        const badPurch = purchData.filter(i => String(i.supplier).toLowerCase().includes('total'));
        console.log(badPurch);

    } catch (e) {
        console.error(e);
    }
};

run();
