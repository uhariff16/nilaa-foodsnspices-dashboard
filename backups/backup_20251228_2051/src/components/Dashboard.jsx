import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import SummaryCards, { Card } from './SummaryCards';
import Charts from './Charts';
import ItemAnalysis from './ItemAnalysis';
import CustomerAnalysis from './CustomerAnalysis';
import TransactionTable from './TransactionTable';
import SalesSummaryTable from './SalesSummaryTable';

import ProductionDashboard from './ProductionDashboard';
import { RefreshCw, RotateCw, Download, LayoutDashboard, Package, Users, Settings, Receipt, Wallet, Search, List, BarChart2, Factory, DollarSign, CreditCard, ShoppingCart } from 'lucide-react';

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem',
            color: active ? '#3b82f6' : 'var(--text-secondary)',
            fontWeight: active ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}
    >
        <Icon size={18} />
        {label}
    </button>
);

const getValueColor = (value, type) => {
    if (value < 0) return '#ef4444'; // Always Red for negative numbers
    if (type === 'expense') return '#f59e0b'; // Orange for positive Expenses
    if (type === 'sales') return '#10b981';   // Green for Sales
    if (value > 0) return '#10b981'; // Green for positive Profit
    return 'white';
};

const Dashboard = (props) => {
    const { data, onReset, onRefresh } = props;
    // Persist active tab to restore after refresh
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('dashboard_active_tab');
        const allowed = ['overview', 'sales', 'expenses', 'items', 'customers', 'production'];
        return allowed.includes(saved) ? saved : 'overview';
    });

    // Update local storage when tab changes
    useEffect(() => {
        localStorage.setItem('dashboard_active_tab', activeTab);
    }, [activeTab]);

    const [salesViewMode, setSalesViewMode] = useState('summary'); // 'summary' | 'item'
    const [expenseSearch, setExpenseSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = React.useState('Overall');
    const [selectedYear, setSelectedYear] = React.useState('2025');

    // Robust initialization
    const [manualExpenses, setManualExpenses] = useState(() => {
        try {
            const saved = localStorage.getItem('manualExpenses');
            return saved ? JSON.parse(saved) : { salary: '', daily: '' };
        } catch (e) {
            console.warn("Failed to parse saved expenses", e);
            return { salary: '', daily: '' };
        }
    });

    // Persist manual expenses
    useEffect(() => {
        localStorage.setItem('manualExpenses', JSON.stringify(manualExpenses));
    }, [manualExpenses]);

    // ... (rest of filtering logic) ...

    // 1. Extract Unique Months
    const availableMonths = React.useMemo(() => {
        const months = new Set(['Overall']);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Helper to extract Month Year

        const getMonthYear = (dateStr) => {
            if (!dateStr) return null;
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length >= 3) {
                    const year = parts[0];
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    if (monthNames[monthIndex]) return `${monthNames[monthIndex]} ${year}`;
                }
            } else if (dateStr.includes(' ')) {
                const parts = dateStr.split(' ');
                if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
            }
            return null;
        };

        (data.transactions || []).forEach(t => {
            const my = getMonthYear(t.parsedDate);
            if (my) months.add(my);
        });

        // Add Production Months
        if (props.productionData) {
            (props.productionData.stockIn || []).forEach(item => {
                const my = getMonthYear(item.date);
                if (my) months.add(my);
            });
            (props.productionData.preProduction || []).forEach(item => {
                const my = getMonthYear(item.date);
                if (my) months.add(my);
            });
            (props.productionData.postProduction || []).forEach(item => {
                const my = getMonthYear(item.date);
                if (my) months.add(my);
            });
        }

        // Sort months chronologically
        const monthOrder = { "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11 };

        return Array.from(months).sort((a, b) => {
            if (a === 'Overall') return -1;
            if (b === 'Overall') return 1;

            const [mA, yA] = a.split(' ');
            const [mB, yB] = b.split(' ');

            if (yA !== yB) return yA - yB;
            return monthOrder[mA] - monthOrder[mB];
        });
    }, [data.transactions, props.productionData]);

    // 2. Filter Data based on Month (and converting selection back to check format match)
    const filteredTransactions = React.useMemo(() => {
        if (!data.transactions) return [];

        return data.transactions.filter(t => {
            if (!t.parsedDate) return false;

            // 1. Year Check
            // We want to verify the year matches regardless of month selection
            // (Wait: If I select 'Dec 2025', it implies 2025. But if I selected Year 2026, and somehow 'Dec 2025' was stuck selected...
            // Actually, the UI logic clears/filters 'Dec 2025' button if Year 2026 is picked. 
            // But 'Overall' persists.

            // To be safe: ALWAYS enforce the selectedYear.
            if (!t.parsedDate.startsWith(selectedYear)) return false;

            // 2. Month Check
            if (selectedMonth === 'Overall') return true;

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // Re-construct the Month Year from the transaction to match selectedMonth
            let tMonthYear = '';
            if (t.parsedDate.includes('-')) {
                const parts = t.parsedDate.split('-');
                if (parts.length >= 3) {
                    const year = parts[0];
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    if (monthNames[monthIndex]) tMonthYear = `${monthNames[monthIndex]} ${year}`;
                }
            }

            return tMonthYear === selectedMonth;
        });
    }, [data.transactions, selectedMonth, selectedYear]);


    // Derived Data for Tabs (using filteredTransactions)
    const salesTransactions = filteredTransactions.filter(t => String(t.parsedType).toLowerCase().includes('sale'));
    const expenseTransactions = filteredTransactions
        .filter(t => String(t.parsedType).toLowerCase().includes('expense'))
        .filter(t => {
            if (!expenseSearch) return true;
            const searchLower = expenseSearch.toLowerCase();
            return (t.originalDesc || '').toLowerCase().includes(searchLower) ||
                (t.parsedDate || '').toLowerCase().includes(searchLower);
        });

    // Metric Calculations
    const salesRevenue = salesTransactions.reduce((sum, t) => sum + (parseFloat(t.parsedAmount) || 0), 0);
    const salesCount = salesTransactions.length;
    const avgOrderValue = salesCount > 0 ? salesRevenue / salesCount : 0;

    const recordedExpenses = expenseTransactions.reduce((sum, t) => sum + (parseFloat(t.parsedAmount) || 0), 0);
    const manualSalaryCalc = parseFloat(manualExpenses.salary) || 0;
    const manualDailyCalc = parseFloat(manualExpenses.daily) || 0;
    const totalManual = manualSalaryCalc + manualDailyCalc;
    const grandTotalExpenses = recordedExpenses + totalManual;

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    // Aggregation Helper
    const aggregateByName = (list) => {
        const map = {};
        list.forEach(item => {
            const name = (item.name || 'Unknown').trim();
            if (!map[name]) {
                map[name] = { ...item, qty: 0, revenue: 0, profit: 0, count: 0 };
            }
            map[name].qty += (item.qty || 0);
            map[name].revenue += (item.revenue || 0);
            map[name].profit += (item.profit || 0);
            map[name].count += 1;
        });
        return Object.values(map);
    };

    const handleDownloadReport = () => {
        try {
            const wb = XLSX.utils.book_new();

            // 1. Overview Sheet (Filtered)
            let sales = 0; let parsedExpenses = 0;
            filteredTransactions.forEach(t => {
                const type = String(t.parsedType || '').toLowerCase();
                if (type.includes('sale')) sales += t.parsedAmount || 0;
                else parsedExpenses += t.parsedAmount || 0;
            });

            const manualSalary = parseFloat(manualExpenses.salary) || 0;
            const manualDaily = parseFloat(manualExpenses.daily) || 0;
            const totalExpenses = parsedExpenses + manualSalary + manualDaily;
            const netProfit = sales - totalExpenses;

            const overviewData = [
                ["Metric", "Value"],
                ["Period", selectedMonth],
                ["Total Sales", sales],
                ["Total Expenses", totalExpenses],
                ["  - Parsed Expenses", parsedExpenses],
                ["  - Staff Salary (Est)", manualSalary],
                ["  - Other Daily (Est)", manualDaily],
                ["Net Profit", netProfit],
                ["Profit Margin", sales > 0 ? (netProfit / sales * 100).toFixed(2) + "%" : "0%"]
            ];
            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            XLSX.utils.book_append_sheet(wb, wsOverview, "Financial Overview");

            // Helper to get items for a specific month
            const getItemsForMonth = (month) => {
                if (month === 'Overall') return data.items || [];
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return (data.items || []).filter(item => {
                    if (!item.parsedDate) return true;
                    let iMonthYear = '';
                    if (item.parsedDate.includes('-')) {
                        const parts = item.parsedDate.split('-');
                        if (parts.length >= 3) {
                            const year = parts[0];
                            const monthIndex = parseInt(parts[1], 10) - 1;
                            if (monthNames[monthIndex]) iMonthYear = `${monthNames[monthIndex]} ${year}`;
                        }
                    } else if (item.parsedDate.includes(' ')) {
                        const parts = item.parsedDate.split(' ');
                        if (parts.length >= 3) iMonthYear = `${parts[1]} ${parts[2]}`;
                    }
                    return iMonthYear === month;
                });
            };

            const getCustomersForMonth = (month) => {
                if (month === 'Overall') return data.customers || [];
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return (data.customers || []).filter(cust => {
                    if (!cust.parsedDate) return true;
                    let cMonthYear = '';
                    if (cust.parsedDate.includes('-')) {
                        const parts = cust.parsedDate.split('-');
                        if (parts.length >= 3) {
                            const year = parts[0];
                            const monthIndex = parseInt(parts[1], 10) - 1;
                            if (monthNames[monthIndex]) cMonthYear = `${monthNames[monthIndex]} ${year}`;
                        }
                    } else if (cust.parsedDate.includes(' ')) {
                        const parts = cust.parsedDate.split(' ');
                        if (parts.length >= 3) cMonthYear = `${parts[1]} ${parts[2]}`;
                    }
                    return cMonthYear === month;
                });
            };

            // 2. Export Strategy:
            // If "Overall" selected -> Export Overall Summary + Separate Sheets for Each Month
            // If Specific Month selected -> Export Only That Month

            const monthsToExport = selectedMonth === 'Overall' ? availableMonths : [selectedMonth];

            monthsToExport.forEach(month => {
                if (month === 'Overall') {
                    // Export Aggregated Overall
                    const aggregatedItems = aggregateByName(data.items || []);
                    if (aggregatedItems.length > 0) {
                        const ws = XLSX.utils.json_to_sheet(aggregatedItems.map(({ name, qty, revenue, profit }) => ({
                            "Item Name": name, "Qty Sold": qty, "Revenue": revenue, "Profit": profit
                        })));
                        XLSX.utils.book_append_sheet(wb, ws, "Items (Overall)");
                    }
                    const aggregatedCust = aggregateByName(data.customers || []);
                    if (aggregatedCust.length > 0) {
                        const ws = XLSX.utils.json_to_sheet(aggregatedCust.map(({ name, revenue, profit }) => ({
                            "Customer Name": name, "Revenue": revenue, "Profit": profit
                        })));
                        XLSX.utils.book_append_sheet(wb, ws, "Customers (Overall)");
                    }
                } else {
                    // Export Specific Month
                    const monthItems = aggregateByName(getItemsForMonth(month));
                    if (monthItems.length > 0) {
                        const ws = XLSX.utils.json_to_sheet(monthItems.map(({ name, qty, revenue, profit }) => ({
                            "Item Name": name, "Qty Sold": qty, "Revenue": revenue, "Profit": profit
                        })));
                        // Sheet name max length 31 chars
                        const sheetName = `Items - ${month}`.substring(0, 31);
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    }

                    const monthCust = aggregateByName(getCustomersForMonth(month));
                    if (monthCust.length > 0) {
                        const ws = XLSX.utils.json_to_sheet(monthCust.map(({ name, revenue, profit }) => ({
                            "Customer Name": name, "Revenue": revenue, "Profit": profit
                        })));
                        const sheetName = `Cust - ${month}`.substring(0, 31);
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    }
                }
            });

            // 3. Customers Sheet
            if (data.customers && data.customers.length > 0) {
                const wsCustomers = XLSX.utils.json_to_sheet(data.customers);
                XLSX.utils.book_append_sheet(wb, wsCustomers, "Top Customers (All Time)");
            }

            XLSX.writeFile(wb, `Report_${selectedMonth.replace(' ', '_')}.xlsx`);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to download report. See console for details.");
        }
    };

    // 3. Filter Items and Customers
    const filteredItems = React.useMemo(() => {
        let itemsToFilter = data.items || [];
        let result = [];

        if (selectedMonth === 'Overall') {
            result = aggregateByName(itemsToFilter);
        } else {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const strictFiltered = itemsToFilter.filter(item => {
                if (!item.parsedDate) return false;
                let iMonthYear = '';
                if (item.parsedDate.includes('-')) {
                    const parts = item.parsedDate.split('-');
                    if (parts.length >= 3) {
                        const year = parts[0];
                        const monthIndex = parseInt(parts[1], 10) - 1;
                        if (monthNames[monthIndex]) iMonthYear = `${monthNames[monthIndex]} ${year}`;
                    }
                } else if (item.parsedDate.includes(' ')) {
                    const parts = item.parsedDate.split(' ');
                    if (parts.length >= 3) iMonthYear = `${parts[1]} ${parts[2]}`;
                }
                return iMonthYear === selectedMonth;
            });
            result = aggregateByName(strictFiltered);
        }

        // Fallback: If no items found for month, aggregate from Transactions (Revenue/Qty only)
        if (result.length === 0 && selectedMonth !== 'Overall' && filteredTransactions.length > 0) {
            console.log("Using Fallback Item Aggregation from Transactions");
            const salesTx = filteredTransactions.filter(t => String(t.parsedType).toLowerCase().includes('sale'));
            const fallbackMap = {};
            salesTx.forEach(t => {
                const name = (t.originalDesc || 'Unknown Item').trim();
                if (!fallbackMap[name]) fallbackMap[name] = { name, qty: 0, revenue: 0, profit: 0, count: 0 };
                fallbackMap[name].revenue += (t.parsedAmount || 0);
                fallbackMap[name].count += 1;
                // Estimate Qty as count if unknown? Or just 1. Using 1 per tx as basic proxy.
                fallbackMap[name].qty += 1;
            });
            result = Object.values(fallbackMap);
        }

        return result;
    }, [data.items, selectedMonth, filteredTransactions]);

    const filteredCustomers = React.useMemo(() => {
        let custToFilter = data.customers || [];
        let result = [];

        if (selectedMonth === 'Overall') {
            result = aggregateByName(custToFilter);
        } else {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const strictFiltered = custToFilter.filter(cust => {
                if (!cust.parsedDate) return false;
                let cMonthYear = '';
                if (cust.parsedDate.includes('-')) {
                    const parts = cust.parsedDate.split('-');
                    if (parts.length >= 3) {
                        const year = parts[0];
                        const monthIndex = parseInt(parts[1], 10) - 1;
                        if (monthNames[monthIndex]) cMonthYear = `${monthNames[monthIndex]} ${year}`;
                    }
                } else if (cust.parsedDate.includes(' ')) {
                    const parts = cust.parsedDate.split(' ');
                    if (parts.length >= 3) cMonthYear = `${parts[1]} ${parts[2]}`;
                }
                return cMonthYear === selectedMonth;
            });
            result = aggregateByName(strictFiltered);
        }

        // Fallback: Use Transactions if Master List filtering failed
        if (result.length === 0 && selectedMonth !== 'Overall' && filteredTransactions.length > 0) {
            // We have the Master Customer List (without dates) in 'custToFilter' (or data.customers)
            // We have dated Transactions in 'filteredTransactions'
            // Let's try to match Transaction Descriptions to Customer Names
            // Optimization: Convert valid names to array for iteration
            const validCustomerList = (data.customers || []).map(c => ({
                name: c.name,
                lowerName: (c.name || '').trim().toLowerCase(),
                profit: c.profit,
                revenue: c.revenue
            })).filter(c => c.name && c.name !== 'Unknown');



            const fallbackMap = {}; // Restored missing variable

            filteredTransactions.forEach(t => {
                if (!String(t.parsedType).toLowerCase().includes('sale')) return;

                const desc = (t.originalDesc || '').trim();
                const descLower = desc.toLowerCase();

                // Relaxed Matching: Check if transaction description CONTAINS the customer name
                // Try exact match first implicitly by containing, but we need to find the record.
                const matchedRecord = validCustomerList.find(c => descLower.includes(c.lowerName));

                // If found, aggregate
                if (matchedRecord) {
                    const matchedName = matchedRecord.name;
                    if (!fallbackMap[matchedName]) fallbackMap[matchedName] = { name: matchedName, revenue: 0, profit: 0 };
                    fallbackMap[matchedName].revenue += (t.parsedAmount || 0);

                    // Estimate Profit using overall margin from master record
                    if (matchedRecord.revenue > 0) {
                        const margin = matchedRecord.profit / matchedRecord.revenue;
                        fallbackMap[matchedName].profit += (t.parsedAmount || 0) * margin;
                    }
                }
            });

            result = Object.values(fallbackMap);
        }

        return result;
    }, [data.customers, selectedMonth, filteredTransactions]);


    return (
        <div className="animate-fade-in">
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
                borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <img src="/logo.png" alt="Nilaa Foods" style={{ height: '120px', objectFit: 'contain' }} />
                        <div>
                            <h1 style={{ fontSize: '1.5rem', margin: 0, lineHeight: 1.2 }}>Nilaa Foods & Spices</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Executive Dashboard</p>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {activeTab === 'production'
                            ? `${selectedMonth} Production Report`
                            : `${selectedMonth} Consolidated Report • ${filteredTransactions.length} Transactions`
                        }
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* Hidden Inputs for Adding Data */}
                        <input
                            type="file"
                            id="add-files"
                            multiple
                            accept=".xlsx, .xls"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                if (e.target.files.length > 0) {
                                    const files = Array.from(e.target.files);

                                    // 1. Try Sales/Excel
                                    if (props.onAppendData) {
                                        try {
                                            const { parseExcelFile } = await import('../utils/excelParser');
                                            const newData = await parseExcelFile(files);
                                            if (newData.transactions.length > 0 || newData.items.length > 0) {
                                                props.onAppendData(newData);
                                            }
                                        } catch (err) { console.warn("Skipped Sales Parse", err); }
                                    }

                                    // 2. Try Production
                                    if (props.onProductionData) {
                                        try {
                                            const { parseProductionFile } = await import('../utils/productionParser');
                                            const pData = await parseProductionFile(files);
                                            if (pData.stockIn.length > 0 || pData.preProduction.length > 0) {
                                                props.onProductionData(pData);
                                                // Auto-switch via notification or just let user see it? 
                                                // Assuming if they upload generic files they are in "setup" mode.
                                            }
                                        } catch (err) { console.warn("Skipped Prod Parse", err); }
                                    }
                                }
                            }}
                        />
                        <input
                            type="file"
                            id="add-folder"
                            webkitdirectory=""
                            directory=""
                            multiple
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                if (e.target.files.length > 0) {
                                    const files = Array.from(e.target.files);

                                    // 1. Try Sales/Excel
                                    if (props.onAppendData) {
                                        try {
                                            const { parseExcelFile } = await import('../utils/excelParser');
                                            const newData = await parseExcelFile(files);
                                            if (newData.transactions.length > 0 || newData.items.length > 0) {
                                                props.onAppendData(newData);
                                            }
                                        } catch (err) { console.warn("Skipped Sales Parse", err); }
                                    }

                                    // 2. Try Production
                                    if (props.onProductionData) {
                                        try {
                                            const { parseProductionFile } = await import('../utils/productionParser');
                                            const pData = await parseProductionFile(files);
                                            if (pData.stockIn.length > 0 || pData.preProduction.length > 0) {
                                                props.onProductionData(pData);
                                            }
                                        } catch (err) { console.warn("Skipped Prod Parse", err); }
                                    }
                                }
                            }}
                        />
                        {/* Removed separate Production Input */}

                        <button className="btn-primary" onClick={() => document.getElementById('add-files').click()}>
                            + Add Files
                        </button>
                        <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }} onClick={() => document.getElementById('add-folder').click()}>
                            + Add Folder
                        </button>
                        {/* Removed + Prod. Data Button */}
                    </div>

                    <button className="btn-primary" onClick={handleDownloadReport}>
                        <Download size={18} style={{ marginRight: '0.5rem' }} /> Download
                    </button>
                    <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none' }} onClick={() => {
                        // Force a full page reload to ensure Vite/System picks up NEW files from the file system
                        // A soft refresh (loadData) is insufficient for finding newly added
                        if (window.confirm("Reload data from src/data folder? This will reload the page.")) {
                            window.location.reload();
                        }
                    }}>
                        <RotateCw size={18} style={{ marginRight: '0.5rem' }} /> Refresh
                    </button>
                    <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none' }} onClick={onReset}>
                        <RefreshCw size={18} style={{ marginRight: '0.5rem' }} /> Reset
                    </button>
                </div>
            </header >

            {/* Year Selectors */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                {['2025', '2026', '2027'].map(year => (
                    <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        style={{
                            background: selectedYear === year ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                            color: selectedYear === year ? 'white' : 'var(--text-secondary)',
                            border: '1px solid var(--glass-border)',
                            padding: '0.4rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: selectedYear === year ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        {year}
                    </button>
                ))}
            </div>

            {/* Month Selectors (Filtered by Year) */}
            {
                availableMonths.length > 1 && (
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {availableMonths.filter(m => m === 'Overall' || m.endsWith(selectedYear)).map(month => (
                            <button
                                key={month}
                                onClick={() => setSelectedMonth(month)}
                                style={{
                                    background: selectedMonth === month ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                    color: selectedMonth === month ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--glass-border)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '2rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s',
                                    fontWeight: selectedMonth === month ? '600' : '400'
                                }}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                )
            }

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'overview' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'overview' ? 600 : 400
                    }}
                >
                    <LayoutDashboard size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'sales' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'sales' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'sales' ? 600 : 400
                    }}
                >
                    <DollarSign size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Sales
                </button>

                <button
                    onClick={() => setActiveTab('expenses')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'expenses' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'expenses' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'expenses' ? 600 : 400
                    }}
                >
                    <CreditCard size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Expenses
                </button>
                <button
                    onClick={() => setActiveTab('items')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'items' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'items' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'items' ? 600 : 400
                    }}
                >
                    <Package size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Item Analysis
                </button>
                <button
                    onClick={() => setActiveTab('customers')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'customers' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'customers' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'customers' ? 600 : 400
                    }}
                >
                    <Users size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Customers
                </button>
                <button
                    onClick={() => setActiveTab('production')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'production' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'production' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'production' ? 600 : 400
                    }}
                >
                    <Factory size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Production
                </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <>
                    <SummaryCards
                        data={filteredTransactions}
                        manualExpenses={manualExpenses}
                    />
                    <Charts
                        transactions={filteredTransactions}
                        selectedMonth={selectedMonth}
                    />
                </>
            )}

            {activeTab === 'sales' && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>Sales Transactions</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                            <button
                                onClick={() => setSalesViewMode('summary')}
                                style={{
                                    background: (salesViewMode === 'summary' || salesViewMode === 'daily') ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    border: 'none',
                                    color: (salesViewMode === 'summary' || salesViewMode === 'daily') ? 'white' : 'var(--text-secondary)',
                                    padding: '0.5rem 1rem', borderRadius: '0.25rem',
                                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s'
                                }}
                            >
                                <BarChart2 size={14} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                Daily
                            </button>
                            <button
                                onClick={() => setSalesViewMode('item')}
                                style={{
                                    background: salesViewMode === 'item' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    border: 'none',
                                    color: salesViewMode === 'item' ? 'white' : 'var(--text-secondary)',
                                    padding: '0.5rem 1rem', borderRadius: '0.25rem',
                                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s'
                                }}
                            >
                                <Package size={14} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                Item Wise
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                        <Card title="Total Sales" value={salesRevenue} icon={DollarSign} color="16, 185, 129" type="sales" />
                        <Card title="Avg Order Value" value={avgOrderValue} icon={BarChart2} color="59, 130, 246" />
                        <Card title="Transactions" value={salesCount} icon={List} color="245, 158, 11" />
                    </div>
                    <SalesSummaryTable
                        transactions={salesTransactions}
                        groupBy={salesViewMode === 'item' ? 'item' : 'date'}
                    />
                </div>
            )
            }

            {
                activeTab === 'expenses' && (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h2 style={{ margin: 0 }}>Expense Records</h2>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Filter expenses..."
                                        value={expenseSearch}
                                        onChange={(e) => setExpenseSearch(e.target.value)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--glass-border)',
                                            padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                                            borderRadius: '0.5rem',
                                            color: 'white',
                                            outline: 'none',
                                            width: '250px'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Expense Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Recorded (Files)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getValueColor(recordedExpenses, 'expense') }}>{formatCurrency(recordedExpenses)}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Manual (Salary/Daily)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalManual)}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Outflow</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getValueColor(grandTotalExpenses, 'expense') }}>{formatCurrency(grandTotalExpenses)}</div>
                                </div>
                            </div>
                            <TransactionTable transactions={expenseTransactions} type="Expense" />
                        </div>

                        {/* Manual Adjustments Panel */}
                        <div>
                            <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '2rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <Settings size={20} /> Manual Adjustments
                                </h3>
                                {/* ... (Manual Expense inputs remain same) */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        Staff Salary (Monthly)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>₹</span>
                                        <input
                                            type="text"
                                            value={manualExpenses.salary}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setManualExpenses({ ...manualExpenses, salary: val });
                                                }
                                            }}
                                            placeholder="0.00"
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', width: '100%', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        Other Daily Expenses
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>₹</span>
                                        <input
                                            type="text"
                                            value={manualExpenses.daily}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setManualExpenses({ ...manualExpenses, daily: val });
                                                }
                                            }}
                                            placeholder="0.00"
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', width: '100%', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>
                                        These values will be added to your Total Expenses calculation immediately.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        localStorage.setItem('manualExpenses', JSON.stringify(manualExpenses));
                                        alert("Settings Saved Successfully!");
                                    }}
                                    className="btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {activeTab === 'items' && <ItemAnalysis data={filteredItems} />}
            {activeTab === 'customers' && <CustomerAnalysis data={filteredCustomers} />}
            {activeTab === 'production' && <ProductionDashboard data={props.productionData} selectedMonth={selectedMonth} />}

        </div >
    );
};

export default Dashboard;
