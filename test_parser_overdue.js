import * as XLSX from 'xlsx';
import { parseExcelFile } from './src/utils/excelParser.js';

const data = [
  ['SNo.', 'Status', 'Type', 'Invoice No.', 'Date', 'Customer Name', 'Contact No.', 'Address', 'GSTIN', 'Place of Supply', 'Total Amount', 'Due Date', 'Created On'],
  [1, 'OVERDUE (0 days) Non GST', '', 'INV-2157', '08-Mar-26', 'MASJID NEAR MRL', '7200676455', 'PANANGUDI', '', 'Tamil Nadu', 255.00, '08-Mar-26', '08-Mar-26'],
  [2, 'OVERDUE (0 days) Non GST', '', 'INV-2156', '08-Mar-26', 'THOPPI VAPPA RESTAURANT', '8012408348', 'TRICHY', '', 'Tamil Nadu', 10870.00, '08-Mar-26', '08-Mar-26'],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Overdue");

// Mock File API for Node.js
class MockFile {
  constructor(data, name, type) {
    this.name = name;
  }
}
globalThis.File = MockFile;

globalThis.FileReader = class {
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.onload({ target: { result: XLSX.write(wb, { type: 'buffer' }) } });
    }, 10);
  }
};

(async () => {
    try {
        const file = new MockFile([], "test_overdue.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        const result = await parseExcelFile([file]);
        console.log("Parsed Receivables Count:", result.receivables.length);
        if(result.receivables.length > 0) {
            console.log("First record:", JSON.stringify(result.receivables[0], null, 2));
        } else {
            console.log("Debug Logs:", result.debugLog);
        }
    } catch (err) {
        console.error("Test Error:", err);
    }
})();
