import * as XLSX from 'xlsx';

const data = [
  ['SNo.', 'Status', 'Type', 'Invoice No.', 'Date', 'Customer Name', 'Contact No.', 'Address', 'GSTIN', 'Place of Supply', 'Total Amount', 'Due Date', 'Created On'],
  [1, 'OVERDUE (0 days) Non GST', '', 'INV-2157', '08-Mar-26', 'MASJID NEAR MRL', '7200676455', 'PANANGUDI', '', 'Tamil Nadu', 255.00, '08-Mar-26', '08-Mar-26'],
  [2, 'OVERDUE (0 days) Non GST', '', 'INV-2156', '08-Mar-26', 'THOPPI VAPPA RESTAURANT', '8012408348', 'TRICHY', '', 'Tamil Nadu', 10870.00, '08-Mar-26', '08-Mar-26'],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Overdue");

XLSX.writeFile(wb, "test_overdue.xlsx");
console.log("Created test_overdue.xlsx");
