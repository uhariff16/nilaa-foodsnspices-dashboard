import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';

const filePath = 'c:\\AntiGravity\\src\\data\\12_Dec 2025\\Customer_Receivables.xlsx';

if (fs.existsSync(filePath)) {
    try {
        const workbook = readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const datasheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(datasheet, { header: 1 });
        
        console.log('Headers from sheet:', jsonData[0]);
        console.log('Sample Row 1:', jsonData[1]);
        console.log('Sample Row 2:', jsonData[2]);
    } catch (e) {
        console.error('Error reading file:', e);
    }
} else {
    console.log('File not found:', filePath);
}
