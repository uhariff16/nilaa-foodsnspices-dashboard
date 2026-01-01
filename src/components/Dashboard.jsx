
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import SummaryCards, { Card } from './SummaryCards';
import Charts from './Charts';
import ItemAnalysis from './ItemAnalysis';
import CustomerAnalysis from './CustomerAnalysis';
import ProductionDashboard from './ProductionDashboard';
import ProcurementDashboard from './ProcurementDashboard';
import StockDashboard from './StockDashboard';
import TransactionTable from './TransactionTable';
import SalesSummaryTable from './SalesSummaryTable';

import { RefreshCw, RotateCw, Download, LayoutDashboard, Package, Users, Settings, Receipt, Wallet, Search, List, BarChart2, Factory, DollarSign, CreditCard, ShoppingCart, Activity, Moon, Sun, Upload, Filter, ShoppingBag, Layers, IndianRupee, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png'; // Import logo

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];



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
    return 'var(--text-primary)';
};

const Dashboard = (props) => {
    const { data, onReset, onRefresh } = props;
    const { logout } = useAuth();
    // Persist active tab to restore after refresh
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('dashboard_active_tab');
        const allowed = ['overview', 'sales', 'expenses', 'items', 'customers', 'production', 'procurement'];
        return allowed.includes(saved) ? saved : 'overview';
    });

    // Theme State
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    // Toggle Theme Effect
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Update local storage when tab changes
    useEffect(() => {
        localStorage.setItem('dashboard_active_tab', activeTab);
    }, [activeTab]);

    const [salesViewMode, setSalesViewMode] = useState('summary'); // 'summary' | 'item'
    const [expenseSearch, setExpenseSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = React.useState('Overall');
    const [selectedYear, setSelectedYear] = React.useState('2025');

    // State for tooltips
    const [hoveredCard, setHoveredCard] = useState(null);

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



        // Helper to extract Month Year

        const getMonthYear = (dateStr) => {
            if (!dateStr) return null;
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length >= 3) {
                    const year = parts[0];
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    if (monthNames[monthIndex]) {
                        return monthNames[monthIndex] + ' ' + year;
                    }
                }
            } else if (dateStr.includes(' ')) {
                const parts = dateStr.split(' ');
                if (parts.length >= 3) {
                    return parts[1] + ' ' + parts[2];
                }
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
                    if (monthNames[monthIndex]) {
                        tMonthYear = monthNames[monthIndex] + ' ' + year;
                    }
                }
            } else if (t.parsedDate.includes(' ')) {
                // Support Space format if any
                const parts = t.parsedDate.split(' ');
                if (parts.length >= 3) {
                    tMonthYear = parts[1] + ' ' + parts[2];
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

    // Count Unique Invoices
    const uniqueInvoices = new Set(salesTransactions.map(t => t.invoiceNo).filter(Boolean));
    // Fallback: If no invoice numbers detected, use transaction count (legacy behavior)
    const salesCount = uniqueInvoices.size > 0 ? uniqueInvoices.size : salesTransactions.length;

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
                            if (monthNames[monthIndex]) {
                                iMonthYear = monthNames[monthIndex] + ' ' + year;
                            }
                        }
                    } else if (item.parsedDate.includes(' ')) {
                        const parts = item.parsedDate.split(' ');
                        if (parts.length >= 3) {
                            iMonthYear = parts[1] + ' ' + parts[2];
                        }
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
                            if (monthNames[monthIndex]) {
                                cMonthYear = monthNames[monthIndex] + ' ' + year;
                            }
                        }
                    } else if (cust.parsedDate.includes(' ')) {
                        const parts = cust.parsedDate.split(' ');
                        if (parts.length >= 3) {
                            cMonthYear = parts[1] + ' ' + parts[2];
                        }
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
                        const sheetName = ("Items - " + month).substring(0, 31);
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    }

                    const monthCust = aggregateByName(getCustomersForMonth(month));
                    if (monthCust.length > 0) {
                        const ws = XLSX.utils.json_to_sheet(monthCust.map(({ name, revenue, profit }) => ({
                            "Customer Name": name, "Revenue": revenue, "Profit": profit
                        })));
                        const sheetName = ("Cust - " + month).substring(0, 31);
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    }
                }
            });

            // 3. Customers Sheet
            if (data.customers && data.customers.length > 0) {
                const wsCustomers = XLSX.utils.json_to_sheet(data.customers);
                XLSX.utils.book_append_sheet(wb, wsCustomers, "Top Customers (All Time)");
            }

            XLSX.writeFile(wb, "Report_" + selectedMonth.replace(' ', '_') + ".xlsx");
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
            // Strict Year Filtering for Overall View
            const yearFiltered = itemsToFilter.filter(item => {
                if (!item.parsedDate) return false;
                return item.parsedDate.includes(selectedYear); // Simple check as parsedDate normally contains YYYY
            });
            result = aggregateByName(yearFiltered);
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
                        if (monthNames[monthIndex]) {
                            iMonthYear = monthNames[monthIndex] + ' ' + year;
                        }
                    }
                } else if (item.parsedDate.includes(' ')) {
                    const parts = item.parsedDate.split(' ');
                    if (parts.length >= 3) {
                        iMonthYear = parts[1] + ' ' + parts[2];
                    }
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
    }, [data.items, selectedMonth, filteredTransactions, selectedYear]);

    const filteredCustomers = React.useMemo(() => {
        let custToFilter = data.customers || [];
        let result = [];

        if (selectedMonth === 'Overall') {
            // Strict Year Filtering for Overall View
            const yearFiltered = custToFilter.filter(cust => {
                if (!cust.parsedDate) return false;
                return cust.parsedDate.includes(selectedYear);
            });
            result = aggregateByName(yearFiltered);
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
                        if (monthNames[monthIndex]) {
                            cMonthYear = monthNames[monthIndex] + ' ' + year;
                        }
                    }
                } else if (cust.parsedDate.includes(' ')) {
                    const parts = cust.parsedDate.split(' ');
                    if (parts.length >= 3) {
                        cMonthYear = parts[1] + ' ' + parts[2];
                    }
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
    }, [data.customers, selectedMonth, filteredTransactions, selectedYear]);


    // Calculate Last Updated Dates Separately
    // Material Flow Stats Calculation
    const materialStats = React.useMemo(() => {
        let procKG = 0;
        let prodKG = 0;
        let salesQty = 0;
        let rawOpenStockKG = 0;
        let processedOpenStockKG = 0;
        let openStockDetails = [];

        // 1. Procurement (Stock In)
        if (props.productionData?.stockIn) {
            let targetPrefix = selectedYear;
            if (selectedMonth !== 'Overall') {
                const [selMonth, selYear] = selectedMonth.split(' ');
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                targetPrefix = selYear + '-' + monthMap[selMonth]; // string concat fix
            }

            props.productionData.stockIn.forEach(item => {
                if (item.date && item.date.startsWith(targetPrefix)) {
                    const itemName = (item.material || item.item || '').trim().toUpperCase();
                    // Check if it is Opening Stock
                    if (itemName.startsWith('OS') || itemName.includes('OPENING') || itemName.includes('B/F')) {
                        // Classify as Processed or Raw
                        const weight = parseFloat(item.weight || 0);
                        if (itemName.includes('PASTE') || itemName.includes('PEELED')) {
                            processedOpenStockKG += weight;
                            openStockDetails.push({ name: itemName, weight, type: 'Processed' });
                        } else {
                            rawOpenStockKG += weight;
                            openStockDetails.push({ name: itemName, weight, type: 'Raw' });
                        }
                    } else {
                        // Regular Procurement
                        procKG += parseFloat(item.weight || 0);
                    }
                }
            });

            // 2. Production (Output)
            props.productionData.postProduction.forEach(item => {
                if (item.date && item.date.startsWith(targetPrefix)) {
                    prodKG += parseFloat(item.weight || 0);
                }
            });
        }

        // 3. Sales Qty (from filteredItems which is already filtered by date)
        filteredItems.forEach(item => {
            salesQty += parseFloat(item.qty || 0);
        });

        return {
            procurement: procKG,
            production: prodKG,
            sales: salesQty,
            rawOpeningStock: rawOpenStockKG,
            processedOpeningStock: processedOpenStockKG,
            openingStockDetails: openStockDetails.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'Raw' ? -1 : 1; // Raw first
                return b.weight - a.weight; // Then by weight descending
            })
        };
    }, [props.productionData, filteredItems, selectedMonth, selectedYear]);

    const lastUpdatedInfo = React.useMemo(() => {
        let maxSales = '';
        let maxProd = '';

        // Helper to compare dates/timestamps
        const updateMax = (currentMax, candidate, candidateTimestamp) => {
            // Prefer timestamp if available for precision
            const val = candidateTimestamp || candidate;
            if (!val) return currentMax;
            if (!currentMax) return val;
            return val > currentMax ? val : currentMax;
        };

        // 1. Check Sales/Expenses
        filteredTransactions.forEach(t => {
            maxSales = updateMax(maxSales, t.parsedDate, t.createdAt);
        });

        // 2. Check Production (Stock In + Pre + Post)
        if (props.productionData) {
            // Define filter prefix based on selection
            let targetPrefix = selectedYear;
            if (selectedMonth !== 'Overall') {
                const [selMonth, selYear] = selectedMonth.split(' ');
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                targetPrefix = selYear + '-' + monthMap[selMonth];
            }

            const checkItems = (items) => {
                if (!items) return;
                items.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        maxProd = updateMax(maxProd, item.date, item.createdAt);
                    }
                });
            };

            checkItems(props.productionData.stockIn);
            checkItems(props.productionData.preProduction);
            checkItems(props.productionData.postProduction);
        }

        return { sales: maxSales, production: maxProd };
    }, [filteredTransactions, props.productionData, selectedMonth, selectedYear]);

    const formatLastUpdated = (dateStr) => {
        if (!dateStr) return 'No Data';
        // Handle ISO Timestamp (2025-10-25T14:30:00...)
        if (dateStr.includes('T')) {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj)) {
                return dateObj.toLocaleString('en-IN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                });
            }
        }

        // Handle YYYY-MM-DD
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    return (
        <div className="animate-fade-in">
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
                borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem'
            }}>
                {/* Debug Error Banner */}
                {props.debugError && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%',
                        background: '#ef4444', color: 'white', padding: '0.5rem',
                        textAlign: 'center', fontWeight: 'bold', zIndex: 9999
                    }}>
                        ⚠️ {props.debugError}
                    </div>
                )}

                {/* Left Side: Logo + Title + Report Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={logo} alt="Nilaa Foods" style={{ height: '120px', objectFit: 'contain' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', margin: 0, lineHeight: 1.2 }}>Nilaa Foods & Spices</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Executive Dashboard</p>
                        </div>

                        {/* Report Info & Dates - Moved Here */}
                        <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                {activeTab === 'production'
                                    ? selectedMonth + " Production Report"
                                    : selectedMonth + " Consolidated Report • " + filteredTransactions.length + " Transactions"
                                }
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                {lastUpdatedInfo.production && (
                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                        Stock & Prod Upd: {formatLastUpdated(lastUpdatedInfo.production)}
                                    </span>
                                )}
                                {lastUpdatedInfo.sales && (
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                                        Sales Upd: {formatLastUpdated(lastUpdatedInfo.sales)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Action Buttons */}
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

                        {/* Theme Toggle */}
                        <button
                            className="btn-primary"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                boxShadow: 'none'
                            }}
                            onClick={toggleTheme}
                            title={"Switch to " + (theme === 'dark' ? 'Light' : 'Dark') + " Mode"}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            {theme === 'dark' ? 'Light' : 'Dark'}
                        </button>

                        {/* Removed Add Files/Folder Buttons as per request */}
                    </div>

                    <button className="btn-primary" onClick={handleDownloadReport}>
                        <Download size={18} style={{ marginRight: '0.5rem' }} /> Download
                    </button>
                    <button className="btn-primary"
                        disabled={props.isSyncing}
                        style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none', opacity: props.isSyncing ? 0.7 : 1 }}
                        onClick={async () => {
                            if (props.onSync) {
                                await props.onSync();
                            }
                        }}
                    >
                        <RefreshCw size={18} style={{ marginRight: '0.5rem', animation: props.isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                        {props.isSyncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none' }} onClick={() => {
                        // Force a hard reload to ensure new files (which change the import.meta.glob manifest) are detected
                        const url = new URL(window.location.href);
                        url.searchParams.set('refresh', new Date().getTime());
                        window.location.href = url.toString();
                    }}>
                        <RotateCw size={18} style={{ marginRight: '0.5rem' }} /> Refresh
                    </button>
                    <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none' }} onClick={onReset}>
                        <RefreshCw size={18} style={{ marginRight: '0.5rem' }} /> Reset
                    </button>
                    <button className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', boxShadow: 'none' }} onClick={logout}>
                        <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
                    </button>
                </div>
            </header >

            {/* Year Selectors */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                {['2025', '2026'].map(year => (
                    <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        style={{
                            background: selectedYear === year ? 'var(--accent-primary)' : 'var(--glass-highlight)',
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

            {/* Month Selectors (All 12 Months) */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {['Overall', ...["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => m + ' ' + selectedYear)].map(month => (
                    <button
                        key={month}
                        onClick={() => setSelectedMonth(month)}
                        style={{
                            background: selectedMonth === month ? '#3b82f6' : 'var(--glass-highlight)',
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
                        {month === 'Overall' ? 'Overall' : month.replace(selectedYear, "'" + selectedYear.slice(-2))}
                    </button >
                ))}
            </div >

            {/* Navigation Tabs */}
            <div className="custom-scrollbar" style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
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
                    onClick={() => setActiveTab('stock')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'stock' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'stock' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'stock' ? 600 : 400
                    }}
                >
                    <Layers size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Stock
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
                <button
                    onClick={() => setActiveTab('procurement')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'procurement' ? '#3b82f6' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'procurement' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'procurement' ? 600 : 400
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ShoppingCart size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Procurement
                    </div>
                </button>
            </div >

            {/* Content */}

            {
                activeTab === 'overview' && (
                    <>
                        <SummaryCards
                            data={filteredTransactions}
                            manualExpenses={manualExpenses}
                        />

                        {/* Material Flow Analysis Section */}
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', position: 'relative', zIndex: 20 }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={20} color="#3b82f6" />
                                Material Flow & Efficiency Analysis
                            </h3>
                            <div className="responsive-grid-4" style={{ marginBottom: '1.5rem' }}>
                                {/* Opening Stock Card (Raw & Processed) */}
                                <div
                                    style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)', position: 'relative', cursor: 'help' }}
                                    onMouseEnter={() => setHoveredCard('openingStock')}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    {hoveredCard === 'openingStock' && materialStats.openingStockDetails?.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '0',
                                            width: '100%',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            zIndex: 1000,
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                            marginTop: '0.5rem',
                                            fontSize: '0.75rem'
                                        }}>
                                            <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>Detailed Breakdown</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                {materialStats.openingStockDetails.map((item, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '12px 1fr auto',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.25rem 0'
                                                    }}>
                                                        <div style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            background: item.type === 'Raw' ? '#22d3ee' : '#f472b6'
                                                        }} />
                                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.name.replace(/^OS\s*-\s*/i, '')}
                                                        </span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'right' }}>
                                                            {item.weight.toLocaleString()} <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>kg</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Opening Stock</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#22d3ee', fontWeight: 500 }}>Raw</span>
                                            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#22d3ee' }}>
                                                {materialStats.rawOpeningStock.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>kg</span>
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--glass-highlight)', paddingTop: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 500 }}>Processed</span>
                                            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f472b6' }}>
                                                {materialStats.processedOpeningStock.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>kg</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Procurement Card */}
                                <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Procurement</p>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>
                                        {materialStats.procurement.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Fresh Input</p>
                                </div>

                                {/* Production Card (Includes Processed OS) */}
                                <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Production</p>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3b82f6' }}>
                                        {(materialStats.production + materialStats.processedOpeningStock).toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        Output <span style={{ color: '#8b5cf6', fontSize: '0.75rem' }}>(+ {materialStats.processedOpeningStock.toLocaleString()} OS)</span>
                                    </p>
                                </div>

                                {/* Sales Volume Card */}
                                <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Sales Volume</p>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>
                                        {materialStats.sales.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>qty/kg</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Sold to Customers</p>
                                </div>
                            </div>

                            {/* Efficiency Bar Check */}
                            {materialStats.procurement > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        <span>Procurement to Production Conversion</span>
                                        <span>{((materialStats.production / materialStats.procurement) * 100).toFixed(1)}% Yield</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: Math.min((materialStats.production / materialStats.procurement) * 100, 100) + '%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #f59e0b, #3b82f6)',
                                            borderRadius: '4px'
                                        }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Charts
                            transactions={filteredTransactions}
                            selectedMonth={selectedMonth}
                        />
                    </>
                )
            }

            {
                activeTab === 'sales' && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Sales Transactions</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--glass-highlight)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                                <button
                                    onClick={() => setSalesViewMode('summary')}
                                    style={{
                                        background: (salesViewMode === 'summary' || salesViewMode === 'daily') ? 'var(--glass-border)' : 'transparent',
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
                                        background: salesViewMode === 'item' ? 'var(--glass-border)' : 'transparent',
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

                        <div className="responsive-grid-3" style={{ marginBottom: '2rem' }}>
                            <Card title="Total Sales" value={salesRevenue} icon={IndianRupee} color="16, 185, 129" type="sales" />

                            {/* Merged Avg Order + Daily Avg Sales */}
                            {(() => {
                                // Calculate Days
                                let days = 30; // Default
                                if (selectedMonth !== 'Overall') {
                                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    const [mStr, yStr] = selectedMonth.split(' ');
                                    const mIdx = monthNames.indexOf(mStr);
                                    const y = parseInt(yStr);
                                    // Get days in month
                                    const daysInMonth = new Date(y, mIdx + 1, 0).getDate();

                                    // If current month, use days passed?
                                    const now = new Date();
                                    if (now.getFullYear() === y && now.getMonth() === mIdx) {
                                        days = now.getDate();
                                    } else {
                                        days = daysInMonth;
                                    }
                                } else {
                                    // Overall: Crude approximation or sum of all days in available data?
                                    // For now, let's just use 365 or not show it.
                                    // Actually user likely wants it for monthly view.
                                    days = 1; // Avoid division by zero
                                }

                                const dailyAvg = salesRevenue / (days || 1);

                                return (
                                    <Card
                                        title="Daily Average Sales"
                                        value={dailyAvg}
                                        subtext={"Avg Order Value: " + formatCurrency(avgOrderValue)}
                                        icon={BarChart2}
                                        color="59, 130, 246"
                                    />
                                );
                            })()}

                            {/* Merged Invoice Count + Range */}
                            {(() => {
                                // Calculate Min/Max Invoice
                                const invoiceNos = salesTransactions
                                    .map(t => t.invoiceNo)
                                    .filter(val => val !== undefined && val !== null && String(val).trim() !== '');

                                invoiceNos.sort((a, b) => {
                                    const numA = parseFloat(String(a).replace(/\D/g, ''));
                                    const numB = parseFloat(String(b).replace(/\D/g, ''));
                                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                    return String(a).localeCompare(String(b));
                                });

                                const minInv = invoiceNos.length > 0 ? invoiceNos[0] : '-';
                                const maxInv = invoiceNos.length > 0 ? invoiceNos[invoiceNos.length - 1] : '-';

                                return (
                                    <Card
                                        title="Total Invoices"
                                        value={salesCount}
                                        subtext={"Range: " + minInv + " - " + maxInv}
                                        icon={List}
                                        color="245, 158, 11"
                                        isCurrency={false}
                                    />
                                );
                            })()}
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
                    <div className="animate-fade-in responsive-sidebar-layout">
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
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            width: '250px'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Expense Metrics */}
                            <div className="responsive-grid-3" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Recorded (Files)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getValueColor(recordedExpenses, 'expense') }}>{formatCurrency(recordedExpenses)}</div>
                                </div>
                                <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Manual (Salary/Daily)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalManual)}</div>
                                </div>
                                <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Outflow</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getValueColor(grandTotalExpenses, 'expense') }}>{formatCurrency(grandTotalExpenses)}</div>
                                </div>
                            </div>
                            <div className="glass-panel" style={{
                                background: 'var(--glass-highlight)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '1rem',
                                overflow: 'hidden',
                                display: 'flex', flexDirection: 'column',
                                height: '500px' // Fixed height for scrolling
                            }}>
                                <div style={{
                                    padding: '1rem',
                                    background: 'var(--bg-primary)',
                                    borderBottom: '1px solid var(--glass-border)',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    display: 'flex', justifyContent: 'space-between'
                                }}>
                                    <span>Expense Summary (Item Wise)</span>
                                    <span style={{ fontSize: '0.75rem', background: 'var(--glass-border)', padding: '0.1rem 0.5rem', borderRadius: '0.25rem', color: 'var(--text-secondary)' }}>
                                        {Object.keys(
                                            expenseTransactions.reduce((acc, t) => {
                                                const k = t.originalDesc || 'Uncategorized';
                                                acc[k] = 1;
                                                return acc;
                                            }, {})
                                        ).length} Items
                                    </span>
                                </div>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 80px 120px', padding: '0.75rem',
                                    borderBottom: '1px solid var(--glass-border)',
                                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'
                                }}>
                                    <div>Description</div>
                                    <div style={{ textAlign: 'center' }}>Count</div>
                                    <div style={{ textAlign: 'right' }}>Total Amount</div>
                                </div>
                                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                                    {(() => {
                                        // Inline Aggregation Logic
                                        const summary = {};
                                        expenseTransactions.forEach(t => {
                                            const key = t.originalDesc || 'Uncategorized';
                                            if (!summary[key]) {
                                                summary[key] = { name: key, total: 0, count: 0 };
                                            }
                                            summary[key].total += Math.abs(t.parsedAmount);
                                            summary[key].count += 1;
                                        });
                                        const sortedItems = Object.values(summary).sort((a, b) => b.total - a.total);

                                        if (sortedItems.length === 0) {
                                            return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses found.</div>;
                                        }

                                        return sortedItems.map((item, i) => (
                                            <div key={i} style={{
                                                display: 'grid', gridTemplateColumns: '1fr 80px 120px', padding: '0.75rem',
                                                borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem', alignItems: 'center',
                                                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                                            }}>
                                                <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                                    {item.name}
                                                </div>
                                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                    {item.count}
                                                </div>
                                                <div style={{ textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
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
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--glass-highlight)', borderRadius: '0.5rem', padding: '0.75rem' }}>
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
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', width: '100%', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        Other Daily Expenses
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--glass-highlight)', borderRadius: '0.5rem', padding: '0.75rem' }}>
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
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', width: '100%', outline: 'none' }}
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
            {activeTab === 'stock' && <StockDashboard productionData={props.productionData} salesData={data.items} procurementData={props.summaryData} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
            {activeTab === 'production' && <ProductionDashboard data={props.productionData} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
            {
                activeTab === 'procurement' && (
                    <ProcurementDashboard
                        stockIn={props.productionData?.stockIn || []}
                        purchases={props.purchaseData || []}
                        summaryData={props.summaryData || []}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                    />
                )
            }

        </div >
    );
};

export default Dashboard;
