import * as XLSX from 'xlsx';

// Sample data
const data = [
    { Date: '2023-01-01', Category: 'Sales', Amount: 5000, Type: 'Income' },
    { Date: '2023-01-05', Category: 'Rent', Amount: 1200, Type: 'Expense' },
    { Date: '2023-01-10', Category: 'Consulting', Amount: 3000, Type: 'Income' },
    { Date: '2023-01-15', Category: 'Utilities', Amount: 200, Type: 'Expense' },
    { Date: '2023-01-20', Category: 'Product Sales', Amount: 4500, Type: 'Income' },
    { Date: '2023-01-25', Category: 'Server Costs', Amount: 500, Type: 'Expense' },
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Financials");

XLSX.writeFile(workbook, "sample_financials.xlsx");
console.log("Created sample_financials.xlsx");
