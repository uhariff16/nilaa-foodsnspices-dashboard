
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

import { RefreshCw, RotateCw, Download, LayoutDashboard, Package, Users, Settings, Receipt, Wallet, Search, List, BarChart2, Factory, DollarSign, CreditCard, ShoppingCart, Activity, Moon, Sun, Upload, Filter, ShoppingBag, Layers, IndianRupee, LogOut, Calculator, Leaf, Tag, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CostSimulator from './CostSimulator'; // [NEW]
import logo from '../assets/logo.png'; // Import logo
import MobileDashboard from './mobile/MobileDashboard';
import { supabase } from '../lib/supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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
    const { logout, isAdmin } = useAuth();
    // Default to Overview tab (per user request)
    const [activeTab, setActiveTab] = useState('overview');

    // Theme State
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileLayoutEnabled, setMobileLayoutEnabled] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        // Fetch Mobile Setting
        const fetchMobileSetting = async () => {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'mobile_layout_enabled').single();
            if (data) setMobileLayoutEnabled(data.value === 'true');
        };
        fetchMobileSetting();

        // Realtime Subscription
        const channel = supabase
            .channel('public:system_settings')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings', filter: 'key=eq.mobile_layout_enabled' }, (payload) => {
                setMobileLayoutEnabled(payload.new.value === 'true');
            })
            .subscribe();

        return () => {
            window.removeEventListener('resize', handleResize);
            supabase.removeChannel(channel);
        };
    }, []);

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

    // Default to Current Date
    const [selectedMonth, setSelectedMonth] = React.useState(() => {
        const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const d = new Date();
        return `${m[d.getMonth()]} ${d.getFullYear()}`;
    });
    const [selectedYear, setSelectedYear] = React.useState(() => String(new Date().getFullYear()));

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

    // Sorting State for Expenses
    const [expenseSort, setExpenseSort] = React.useState({ key: 'total', direction: 'desc' });
    const [expenseListView, setExpenseListView] = React.useState('compact'); // 'compact' or 'detailed'
    const [selectedExpenseCategory, setSelectedExpenseCategory] = React.useState(null); // [NEW] Filter State


    // Persist manual expenses
    useEffect(() => {
        localStorage.setItem('manualExpenses', JSON.stringify(manualExpenses));
    }, [manualExpenses]);

    // --- Mobile View Render ---


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
    // [FIX] Separate Granular Sales from Summary Rows to prevent double counting
    const allSalesTransactions = filteredTransactions.filter(t => String(t.parsedType).toLowerCase().includes('sale'));

    // Identify Summary Rows (usually Type='Sales Summary' or similar)
    // We assume anything NOT 'Sales Summary' (and is 'Sales') is a granular row.

    // [FIX] New Priority: "Invoice Total" rows from parser
    const invoiceTotalRows = filteredTransactions.filter(t => t.parsedType === 'Invoice Total');

    const salesAppearsGranular = allSalesTransactions.filter(t => {
        const type = String(t.parsedType || '').toLowerCase();
        const desc = String(t.originalDesc || '').toLowerCase();

        // Exclude explicit Summary Blocks
        if (type === 'sales summary' || type === 'profitsummary' || type === 'invoice total') return false;

        // Exclude Row-level summaries/junk
        const keywordsToExclude = ['subtotal', 'sub total', 'taxable', 'net amount', 'gross amount', 'round off', 'rounded off', 'roundoff', 'gst', 'total'];

        const isCreditNote = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || desc.includes('cn');
        if (isCreditNote) return true;

        if (keywordsToExclude.some(k => desc.includes(k))) return false;

        return true;
    });

    const salesSummaryRows = allSalesTransactions.filter(t => {
        const type = String(t.parsedType || '').toLowerCase();
        return type === 'sales summary';
    });

    // Strategy Logic:
    // [FIX] Per-Invoice Aggregation Strategy
    // Instead of choosing "All Totals" vs "All Granular" (which fails if some totals are missing),
    // we now group by Invoice Number and choose the best available data for EACH invoice.

    const salesTransactions = React.useMemo(() => {
        const totals = invoiceTotalRows;
        const granular = salesAppearsGranular;

        // Fallback: If no invoiced data at all, use Sales Summaries (Legacy)
        if (totals.length === 0 && granular.length === 0) {
            return salesSummaryRows;
        }

        // Grouping
        const invoiceMap = new Map(); // Key -> { totals: [], granular: [] }

        // Helper to get key
        const getKey = (t) => {
            if (!t.invoiceNo) return 'NO_INVOICE_' + t.id;
            return String(t.invoiceNo).trim().toUpperCase();
        };

        // 1. Add Granular
        granular.forEach(t => {
            const k = getKey(t);
            if (!invoiceMap.has(k)) invoiceMap.set(k, { totals: [], granular: [] });
            invoiceMap.get(k).granular.push(t);
        });

        // 2. Add Totals
        totals.forEach(t => {
            const k = getKey(t);
            if (!invoiceMap.has(k)) invoiceMap.set(k, { totals: [], granular: [] });
            invoiceMap.get(k).totals.push(t);
        });

        // 3. Select Best Rows
        let selectedRows = [];
        invoiceMap.forEach((group, key) => {
            if (group.totals.length > 0) {
                // If we have explicit Total rows, use them.
                // [FIX] Deduplicate: If multiple Total rows exist (e.g. revisions), pick the LATEST one.
                if (group.totals.length === 1) {
                    selectedRows.push(group.totals[0]);
                } else {
                    // Sort by createdAt descending (if available), else by ID or assumed order
                    const sorted = [...group.totals].sort((a, b) => {
                        const tA = new Date(a.createdAt || 0).getTime();
                        const tB = new Date(b.createdAt || 0).getTime();
                        return tB - tA;
                    });
                    selectedRows.push(sorted[0]);
                }
            } else {
                // Otherwise sum the granular items
                selectedRows.push(...group.granular);
            }
        });

        // 4. Deduplicate (Final Safety - should be redundant now for Totals, but good for items)
        const uniqueMap = new Map();
        selectedRows.forEach(t => {
            const key = t.id || `${t.invoiceNo}-${t.parsedDate}-${t.parsedAmount}-${t.originalDesc}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, t);
            }
        });
        return Array.from(uniqueMap.values());

    }, [invoiceTotalRows, salesAppearsGranular, salesSummaryRows]);

    // Metric Calculations
    const salesRevenue = salesTransactions.reduce((sum, t) => {
        const amt = parseFloat(t.parsedAmount) || 0;
        const desc = String(t.originalDesc || '').toLowerCase();
        const inv = String(t.invoiceNo || '').toLowerCase();

        // Check for Return/Credit Note indicators
        // [ADJUSTMENT] User's Expected Total (356,886.80) implies Gross Sum (ignoring CN deduction)
        // or Credit Notes are not present/should be added.
        // We will sum everything as positive to match potential Excel SUM(Amount) behavior.
        /* 
        const isReturn = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || 
            inv.startsWith('cn-') || inv.includes('credit note');

        if (isReturn) {
            return sum - Math.abs(amt);
        }
        */
        return sum + Math.abs(amt);
    }, 0);

    const expenseTransactions = filteredTransactions
        .filter(t => String(t.parsedType).toLowerCase().includes('expense') || t.parsedType === 'Purchase')
        .filter(t => {
            if (!expenseSearch) return true;
            const searchLower = expenseSearch.toLowerCase();
            return (t.originalDesc || '').toLowerCase().includes(searchLower) ||
                (t.parsedDate || '').toLowerCase().includes(searchLower);
        });

    // Count Unique Invoices
    const uniqueInvoices = new Set(salesTransactions.map(t => t.invoiceNo).filter(Boolean));
    // Fallback: If no invoice numbers detected, use transaction count (legacy behavior)
    const salesCount = uniqueInvoices.size > 0 ? uniqueInvoices.size : salesTransactions.length;

    const avgOrderValue = salesCount > 0 ? salesRevenue / salesCount : 0;

    // Split Expenses Calculation
    let rawMaterialExpenses = 0;
    let salaryExpenses = 0;
    let packagingExpenses = 0;
    let otherExpenses = 0;
    let waterExpenses = 0;
    let billsAndRentExpenses = 0;
    let marketingExpenses = 0; // [NEW] Track Marketing

    // Keywords for categorization
    const materialKeywords = ['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'POONDU', 'DESI 3A', 'DESI 4A'];
    const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE', 'DRIVER', 'BATA', 'ADVANCE', 'BONUS', 'OT', 'OVERTIME', 'STAFF', 'COOK'];
    const packagingKeywords = ['POUCH', 'BOX', 'LABEL', 'PACKING', 'PACKAGING', 'ALUMINIUM', 'FOIL', 'COVER', 'TAPE', 'CARRY BAG', 'STICKER'];
    const waterKeywords = ['WATER', 'CAN WATER', 'WATER CAN'];
    const billsKeywords = ['RENT', 'EB BILL', 'ELECTRICITY', 'POWER', 'INTERNET', 'WIFI', 'BROADBAND', 'PHONE', 'RECHARGE', 'BILL'];
    const marketingKeywords = ['AD', 'PROMO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'MARKETING', 'ADS', 'CAMPAIGN']; // [NEW]

    const recordedExpenses = expenseTransactions.reduce((sum, t) => {
        const amount = parseFloat(t.parsedAmount) || 0;
        const nameUpper = (t.originalDesc || t.name || '').toUpperCase();

        // [FIX] Expanded Logic to match MaterialStats
        const hasPBill = t.invoiceNo && String(t.invoiceNo).trim().toUpperCase().startsWith('P-');
        const isMaterial = (t.parsedType === 'Purchase') || hasPBill || materialKeywords.some(keyword => nameUpper.includes(keyword));
        const isWater = waterKeywords.some(k => nameUpper.includes(k));
        const isBill = billsKeywords.some(k => nameUpper.includes(k));
        const isMarketing = marketingKeywords.some(k => nameUpper.includes(k)); // [NEW]

        // [FIX] Exclude ESSENTIAL and OTHER EXP items from Material (force to Other)
        const isEssential = nameUpper.includes('ESSENTIAL');
        const isExplicitOther = nameUpper.includes('OTHER EXP'); // [FIX]

        // Categorize
        if (isMaterial && !isEssential && !isExplicitOther) {
            rawMaterialExpenses += amount;
        } else if (isWater) {
            // Water is now considered a Raw Material but tracked separately for display
            rawMaterialExpenses += amount;
            waterExpenses += amount;
        } else if (labourKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('OTHER EXP')) {
            salaryExpenses += amount;
        } else if (packagingKeywords.some(k => nameUpper.includes(k))) {
            packagingExpenses += amount;
        } else if (isBill) {
            billsAndRentExpenses += amount;
        } else if (isMarketing && !isEssential && !nameUpper.includes('INVOICE DISCOUNT')) { // [FIX] Exclude Essential & Discount from Marketing
            marketingExpenses += amount;
        } else {
            otherExpenses += amount;
        }

        return sum + amount;
    }, 0);
    const manualSalaryCalc = parseFloat(manualExpenses.salary) || 0;
    const manualDailyCalc = parseFloat(manualExpenses.daily) || 0;

    // Add Manual Components to their respective categories
    const finalSalaryExpenses = salaryExpenses + manualSalaryCalc;
    // Note: Manual Daily is still added to 'Other'. User might want a 'Manual Bills' field later?
    // For now, let's assume 'Daily' is miscellaneous, so it stays in 'Other'.
    const finalOtherExpenses = otherExpenses + manualDailyCalc;

    const totalManual = manualSalaryCalc + manualDailyCalc;
    const grandTotalExpenses = recordedExpenses + totalManual;

    // [NEW] Prepare Chart Data
    const expenseChartData = [
        { name: 'Raw Material', value: rawMaterialExpenses, color: '#f97316' }, // Orange
        { name: 'Salary & Wages', value: finalSalaryExpenses, color: '#3b82f6' }, // Blue
        { name: 'Packaging', value: packagingExpenses, color: '#ec4899' }, // Pink
        { name: 'Bills & Rent', value: billsAndRentExpenses, color: '#0ea5e9' }, // Cyan
        { name: 'Marketing', value: marketingExpenses, color: '#eab308' }, // Yellow [NEW]
        { name: 'Other Expenses', value: finalOtherExpenses, color: '#a855f7' }, // Purple
    ].filter(item => item.value > 0);

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

    // 3. Process Customers (Dynamic Aggregation from Transactions)
    const aggregatedCustomers = React.useMemo(() => {
        const custMap = {};

        // Aggregate from Filtered Transactions
        filteredTransactions.forEach(t => {
            if (t.parsedType === 'Sales' && t.customerName) {
                // Determine Customer Name (clean it up)
                const name = t.customerName.trim();
                // Skip generic counters if needed, but for now capture all
                if (!custMap[name]) {
                    custMap[name] = { name: name, revenue: 0, profit: 0, count: 0 };
                }
                custMap[name].revenue += t.parsedAmount;
                // [NEW] Accumulate Profit if available in DB
                custMap[name].profit += (t.profit || 0);
                custMap[name].count++;
            }
        });

        // Convert Map to Array
        let dynamicCustomers = Object.values(custMap);

        // Fallback: If no dynamic names found (old data?), try to use the legacy customers array if populated
        if (dynamicCustomers.length === 0 && data.customers && data.customers.length > 0) {
            return data.customers.filter(c => {
                if (!c.parsedDate) return false;
                if (!c.parsedDate.startsWith(selectedYear)) return false;
                // Simple matching for month
                if (selectedMonth === 'Overall') return true;
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const [y, m, d] = c.parsedDate.split('-');
                // Parsing depends on format, but assuming DB standard YYYY-MM-DD
                if (!m) return false;
                const my = `${monthNames[parseInt(m) - 1]} ${y}`;
                return my === selectedMonth;
            });
        }

        return dynamicCustomers.sort((a, b) => b.revenue - a.revenue);

    }, [filteredTransactions, data.customers, selectedMonth, selectedYear]);

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
                fallbackMap[name].qty += (t.parsedQty || 1);
            });
            result = Object.values(fallbackMap);
        }

        return result;
    }, [data.items, selectedMonth, filteredTransactions, selectedYear]);

    const filteredCustomers = React.useMemo(() => {
        let custToFilter = data.customers || [];
        console.log("DEBUG: All Customers Count:", custToFilter.length);
        if (custToFilter.length > 0) console.log("DEBUG: Sample Customer:", custToFilter[0]);

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


        // New: Aggregation Maps
        const procurementMap = {};
        const productionMap = {};

        // 1. Procurement (Stock In)
        let totalMaterialCost = 0;
        let totalLabourCost = 0;
        let totalOverheadCost = 0;

        if (props.productionData?.stockIn) {
            let targetPrefix = selectedYear;
            if (selectedMonth !== 'Overall') {
                const [selMonth, selYear] = selectedMonth.split(' ');
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                targetPrefix = selYear + '-' + monthMap[selMonth];
            }

            props.productionData.stockIn.forEach(item => {
                if (item.date && item.date.startsWith(targetPrefix)) {
                    const itemName = (item.material || item.item || '').trim().toUpperCase();
                    const weight = parseFloat(item.weight || 0);

                    // Check if it is Opening Stock
                    if (itemName.startsWith('OS') || itemName.includes('OPENING') || itemName.includes('B/F')) {
                        if (itemName.includes('PASTE') || itemName.includes('PEELED')) {
                            processedOpenStockKG += weight;
                        } else {
                            rawOpenStockKG += weight;
                        }
                        // Clean up OS name for display
                        const cleanName = itemName.replace(/OS\s*[:|-]?\s*/i, '').trim();
                        openStockDetails.push({ name: cleanName, weight, type: itemName.includes('PASTE') ? 'Processed' : 'Raw' });
                    } else {
                        // Regular Procurement
                        procKG += weight;
                        // Aggregate for details
                        if (!procurementMap[itemName]) procurementMap[itemName] = 0;
                        procurementMap[itemName] += weight;
                    }
                }
            });

            // 2. Production (Output)
            props.productionData.postProduction.forEach(item => {
                if (item.date && item.date.startsWith(targetPrefix)) {
                    const weight = parseFloat(item.weight || 0);
                    prodKG += weight;

                    const matName = (item.material || 'Production').trim();
                    if (!productionMap[matName]) productionMap[matName] = 0;
                    productionMap[matName] += weight;
                }
            });
        }

        // 3. Sales Qty (from filteredItems which is already filtered by date)
        const salesDetails = [];
        filteredItems.forEach(item => {
            const qty = parseFloat(item.qty || 0);
            if (qty > 0) {
                salesQty += qty;
                salesDetails.push({ name: item.name, weight: qty });
            }

        });

        // Cost Calculation (Iterate over filteredTransactions to get Expenses)
        // Cost Calculation (Iterate over filteredTransactions to get Expenses)
        let totalSummaryProfit = 0;
        let totalInvoiceSales = 0;
        let granularMaterial = 0;
        let granularLabour = 0;
        let granularOverhead = 0;
        let hasSummary = false;

        filteredTransactions.forEach(item => {
            const type = item.parsedType;
            if (type === 'ProfitSummary') {
                hasSummary = true;
                totalSummaryProfit += parseFloat(item.profit || item.parsedProfit || 0);
            }
            else if (['Sales', 'Sales Summary'].includes(type) || (type && String(type).toLowerCase().includes('sale') && type !== 'ProfitSummary')) {
                // Accumulate Invoice Sales for Consistency Calculation
                totalInvoiceSales += parseFloat(item.parsedAmount || 0);
            }
            else if (type === 'Expense' || type === 'Purchase') {
                const amount = parseFloat(item.parsedAmount || 0);
                const nameUpper = (item.originalDesc || item.name || '').toUpperCase();

                // 1. Material Cost (Whitelist)
                const materialKeywords = ['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'POONDU', 'DESI 3A', 'DESI 4A'];
                const hasPBill = item.invoiceNo && String(item.invoiceNo).trim().toUpperCase().startsWith('P-');
                const isMaterial = (type === 'Purchase') || hasPBill || materialKeywords.some(keyword => nameUpper.includes(keyword));
                const isEssential = nameUpper.includes('ESSENTIAL');

                // 2. Direct Labour (Keywords)
                const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE'];
                const isLabour = labourKeywords.some(keyword => nameUpper.includes(keyword));

                if (isMaterial && !isEssential) {
                    granularMaterial += amount;
                } else if (isLabour) {
                    granularLabour += amount;
                } else {
                    // 3. Overhead (Everything else)
                    granularOverhead += amount;
                }
            }
        });

        // [FIX] Priority Logic: If Summary COGS exists, it represents the TRUE Total Cost.
        // We assume Granular Labour/Overhead are explicit and correct, so the remainder of COGS is Material.

        // [FIX] Priority Logic: Align with Overview Tab.
        // Total Cost = Total Invoice Sales (from Type 3) - Total Profit (from Type 2).

        let finalMaterialCost = granularMaterial;
        let finalLabourCost = granularLabour;
        let finalOverheadCost = granularOverhead;
        let finalTotalCost = granularMaterial + granularLabour + granularOverhead;

        // [FIX] Priority Logic: Removed Derived Cost. 
        // User wants Total Cost to match the "Expenses" tab (Actual Summed Expenses).
        // Therefore, we trust granularMaterial + granularLabour + granularOverhead.

        // Note: If Profit Summary provides COGS, we are IGNORING it in favor of Granular Expenses as per user request.
        // Unless we want to ADD it? But user said "Expense Tab is Correct" (2.48L). 
        // Expense Tab contains Purchases (Material) + Expenses. So Sum is correct.

        // Helper to convert map to sorted array

        // Helper to convert map to sorted array
        const toSortedArray = (map) => {
            return Object.entries(map)
                .map(([name, weight]) => ({ name, weight }))
                .sort((a, b) => b.weight - a.weight);
        };

        return {
            procurement: procKG,
            production: prodKG,
            sales: salesQty,
            rawOpeningStock: rawOpenStockKG,
            processedOpeningStock: processedOpenStockKG,
            openingStockDetails: openStockDetails.sort((a, b) => b.weight - a.weight),
            materialCost: finalMaterialCost,
            labourCost: finalLabourCost,
            overheadCost: finalOverheadCost,
            totalProductionCost: finalTotalCost,
            procurementDetails: toSortedArray(procurementMap),
            productionDetails: toSortedArray(productionMap),
            salesDetails: salesDetails.sort((a, b) => b.weight - a.weight)
        };
    }, [props.productionData, filteredItems, selectedMonth, selectedYear]);

    // [NEW] Calculate Today's Sales (Live)
    const todaySales = React.useMemo(() => {
        if (!data.transactions) return 0;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

        return data.transactions.reduce((sum, t) => {
            if (t.parsedDate === todayStr && String(t.parsedType).toLowerCase().includes('sale')) {
                return sum + (t.parsedAmount || 0);
            }
            return sum;
        }, 0);
    }, [data.transactions]);

    // [NEW] Previous Month Stats for Simulator Defaults
    // [NEW] Previous Month Stats for Simulator Defaults
    const previousMonthStats = React.useMemo(() => {
        let referenceMonth = selectedMonth;

        // Handling "Overall" or unselected state: Default to the latest available month
        if (!referenceMonth || referenceMonth === 'Overall') {
            if (availableMonths && availableMonths.length > 1) {
                referenceMonth = availableMonths[availableMonths.length - 1];
            } else {
                return null;
            }
        }

        const [curMonth, curYear] = referenceMonth.split(' ');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let mIndex = monthNames.indexOf(curMonth);

        // Safety check
        if (mIndex === -1) return null;

        let totalOutput = 0;
        let totalLabour = 0;
        let totalBills = 0;
        let totalOther = 0;
        let totalPackaging = 0;
        let monthLabels = [];

        // Loop for last 2 months
        for (let i = 1; i <= 2; i++) {
            let prevMIndex = mIndex - i;
            let prevYear = parseInt(curYear);

            while (prevMIndex < 0) {
                prevMIndex += 12;
                prevYear -= 1;
            }

            const monthName = monthNames[prevMIndex];
            const prevMonthStr = `${monthName} ${prevYear}`;
            monthLabels.push(prevMonthStr);

            // Target Prefix for Production Data (YYYY-MM)
            const prevMonthNum = String(prevMIndex + 1).padStart(2, '0');
            const targetPrefix = `${prevYear}-${prevMonthNum}`;

            // 1. Calculate Output (Production)
            if (props.productionData?.postProduction) {
                props.productionData.postProduction.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        totalOutput += parseFloat(item.weight || 0);
                    }
                });
            }

            // 1.1 Calculate Sales Volume (Fallback if Production Logs Missing)
            let monthSalesQty = 0;
            if (data.transactions) {
                data.transactions.forEach(t => {
                    if (t.parsedDate && t.parsedDate.startsWith(targetPrefix)) {
                        const type = t.parsedType;
                        // Check for Sales
                        if (type && String(type).toLowerCase().includes('sale')) {
                            monthSalesQty += parseFloat(t.parsedQty || 0);
                        }

                        // 2. Calculate Expenses
                        if (type && (String(type).toLowerCase().includes('expense') || String(type) === 'Purchase')) {
                            const amount = parseFloat(t.parsedAmount || 0);
                            const nameUpper = (t.originalDesc || t.name || '').toUpperCase();

                            // [FIX] Expanded Keywords for Better Detection
                            const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE', 'DRIVER', 'BATA', 'ADVANCE', 'BONUS', 'OT', 'OVERTIME', 'STAFF', 'COOK'];
                            const isLabour = labourKeywords.some(k => nameUpper.includes(k));

                            const materialKeywords = ['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'POONDU', 'DESI 3A', 'DESI 4A'];
                            const isMaterial = materialKeywords.some(k => nameUpper.includes(k));

                            const packagingKeywords = ['POUCH', 'BOX', 'LABEL', 'PACKING', 'PACKAGING', 'ALUMINIUM', 'FOIL', 'COVER', 'TAPE', 'CARRY BAG', 'STICKER'];
                            const isPackaging = packagingKeywords.some(k => nameUpper.includes(k));

                            const billsKeywords = ['RENT', 'EB BILL', 'ELECTRICITY', 'POWER', 'INTERNET', 'WIFI', 'BROADBAND', 'PHONE', 'RECHARGE', 'BILL'];
                            const isBills = billsKeywords.some(k => nameUpper.includes(k));

                            if (isLabour) totalLabour += amount;
                            else if (isMaterial) { /* Skip Material in Op Cost */ }
                            else if (isPackaging) totalPackaging += amount;
                            else if (isBills) totalBills += amount;
                            else totalOther += amount;
                        }
                    }
                });
            }

            // Use fallback if production output is suspicious (e.g. less than 10% of sales or just 0)
            // Actually, for Per Kg Cost, if I sold it I must have produced it.
            // So Effective Output = Max(Production, Sales)
            totalOutput = Math.max(totalOutput, monthSalesQty);
        }

        // reverse labels to show chronological order (e.g. Nov, Dec)
        const combinedMonths = monthLabels.reverse().join(" & ");

        // Calculate Per Kg
        const labourPerKg = totalOutput > 0 ? totalLabour / totalOutput : 0;
        const billsPerKg = totalOutput > 0 ? totalBills / totalOutput : 0;
        const otherPerKg = totalOutput > 0 ? totalOther / totalOutput : 0;
        const packagingPerKg = totalOutput > 0 ? totalPackaging / totalOutput : 0;

        const avgMonthlyBills = totalBills / 2;
        const avgMonthlyOther = totalOther / 2;
        const avgMonthlyLabour = totalLabour / 2;

        return {
            month: `2-Month Avg (${combinedMonths})`,
            labourPerKg,
            billsPerKg,
            otherPerKg,
            packagingPerKg,
            avgMonthlyBills, // Fixed Cap
            avgMonthlyOther,  // Fixed Cap
            avgMonthlyLabour // Fixed Cap
        };
    }, [selectedMonth, data.transactions, props.productionData, availableMonths]);

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

    // --- Mobile View Render (Safe Position: After all Hooks) ---
    if (isMobile && mobileLayoutEnabled) {
        return (
            <MobileDashboard
                data={data}
                filteredTransactions={filteredTransactions} // [NEW] Pass pre-filtered data
                filteredCustomers={filteredCustomers} // [NEW] Sync Top Customer Logic
                selectedMonth={selectedMonth} // [NEW] Pass context
                selectedYear={selectedYear} // [NEW] Pass context
                productionData={props.productionData}
                receivables={data.receivables}
                manualExpenses={manualExpenses}
                previousMonthStats={previousMonthStats} // [NEW] For Cost Simulator
                onSwitchToDesktop={() => setMobileLayoutEnabled(false)} // [NEW] Ext Desktop View
            />
        );
    }

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
                    {props.isAdmin && (
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
                    )}
                    <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none' }} onClick={() => {
                        // Force a hard reload to ensure new files (which change the import.meta.glob manifest) are detected
                        const url = new URL(window.location.href);
                        url.searchParams.set('refresh', new Date().getTime());
                        window.location.href = url.toString();
                    }}>
                        <RotateCw size={18} style={{ marginRight: '0.5rem' }} /> Refresh
                    </button>

                    {props.isAdmin && (
                        <button
                            className="btn-primary"
                            style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--glass-border)', color: 'var(--accent-primary)', boxShadow: 'none' }}
                            onClick={() => window.location.href = '/admin'}
                        >
                            <Settings size={18} style={{ marginRight: '0.5rem' }} /> Admin
                        </button>
                    )}
                    <button className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--glass-border)', color: 'var(--danger)', boxShadow: 'none' }} onClick={logout}>
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
                            background: selectedMonth === month ? 'var(--accent-primary)' : 'var(--glass-highlight)',
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
            <div className="custom-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '2rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
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
                        color: activeTab === 'sales' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'sales' ? '2px solid var(--accent-primary)' : '2px solid transparent',
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
                        color: activeTab === 'expenses' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'expenses' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'expenses' ? 600 : 400
                    }}
                >
                    <CreditCard size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Expenses
                </button>

                <button
                    onClick={() => setActiveTab('procurement')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'procurement' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'procurement' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'procurement' ? 600 : 400
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ShoppingCart size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Procurement
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab('stock')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'stock' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'stock' ? '2px solid var(--accent-primary)' : '2px solid transparent',
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
                        color: activeTab === 'production' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'production' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'production' ? 600 : 400
                    }}
                >
                    <Factory size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Production
                </button>

                <button
                    onClick={() => setActiveTab('customers')}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem 0',
                        color: activeTab === 'customers' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'customers' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'customers' ? 600 : 400
                    }}
                >
                    <Users size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                    Customers
                </button>



                {/* [NEW] Simulator Tab - Highlighted */}
                <button
                    onClick={() => setActiveTab('simulator')}
                    style={{
                        background: activeTab === 'simulator' ? 'var(--accent-primary)' : 'var(--glass-highlight)',
                        border: '1px solid var(--glass-border)',
                        padding: '0.5rem 1rem',
                        color: activeTab === 'simulator' ? 'white' : 'var(--text-primary)',
                        borderRadius: '0.5rem',
                        cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Calculator size={18} />
                    Simulator
                </button>
            </div >

            {/* Content */}

            {
                activeTab === 'overview' && (
                    <>
                        <SummaryCards
                            data={filteredTransactions}
                            manualExpenses={manualExpenses}
                            overrideSales={salesRevenue}
                            overrideInvoiceCount={salesCount}
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
                                <div
                                    style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)', position: 'relative', cursor: 'help' }}
                                    onMouseEnter={() => setHoveredCard('procurement')}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    {/* Hover Tooltip - Styled exactly like Opening Stock */}
                                    {hoveredCard === 'procurement' && materialStats.procurementDetails && materialStats.procurementDetails.length > 0 && (
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
                                                {materialStats.procurementDetails.slice(0, 8).map((item, idx) => (
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
                                                            background: '#f59e0b' // Amber for Procurement
                                                        }} />
                                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.name}
                                                        </span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'right' }}>
                                                            {item.weight.toLocaleString()} <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>kg</span>
                                                        </span>
                                                    </div>
                                                ))}
                                                {materialStats.procurementDetails.length > 8 && (
                                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                                        + {materialStats.procurementDetails.length - 8} others
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Procurement</p>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>
                                        {materialStats.procurement.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Fresh Input</p>
                                </div>

                                {/* Production Card (Includes Processed OS) */}
                                <div
                                    style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)', position: 'relative', cursor: 'help' }}
                                    onMouseEnter={() => setHoveredCard('production')}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    {/* Hover Tooltip - Styled exactly like Opening Stock */}
                                    {hoveredCard === 'production' && materialStats.productionDetails && materialStats.productionDetails.length > 0 && (
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
                                                {materialStats.productionDetails.slice(0, 8).map((item, idx) => (
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
                                                            background: '#3b82f6' // Blue for Production
                                                        }} />
                                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.name}
                                                        </span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'right' }}>
                                                            {item.weight.toLocaleString()} <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>kg</span>
                                                        </span>
                                                    </div>
                                                ))}
                                                {materialStats.productionDetails.length > 8 && (
                                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                                        + {materialStats.productionDetails.length - 8} others
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Production</p>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3b82f6' }}>
                                        {(materialStats.production + materialStats.processedOpeningStock).toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        Output <span style={{ color: '#8b5cf6', fontSize: '0.75rem' }}>(+ {materialStats.processedOpeningStock.toLocaleString()} OS)</span>
                                    </p>
                                </div>

                                {/* Sales Volume Card */}
                                <div
                                    className="group relative"
                                    style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-highlight)', position: 'relative', cursor: 'help' }}
                                    onMouseEnter={() => setHoveredCard('sales')}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    {/* Hover Tooltip */}
                                    {hoveredCard === 'sales' && materialStats.salesDetails && materialStats.salesDetails.length > 0 && (
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
                                            <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>Sales Breakdown (Live)</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                {materialStats.salesDetails.slice(0, 8).map((item, idx) => {
                                                    const nameUpper = (item.name || '').toUpperCase();
                                                    const isProcessed = nameUpper.includes('PASTE') || nameUpper.includes('PEELED');
                                                    const dotColor = isProcessed ? '#f472b6' : '#22d3ee';
                                                    console.log(`SalesItem: ${item.name} | Processed: ${isProcessed} | Color: ${dotColor}`);
                                                    return (
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
                                                                background: dotColor
                                                            }} />
                                                            <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {item.name}
                                                            </span>
                                                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'right' }}>
                                                                {item.weight.toLocaleString()} <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>qty</span>
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                                {materialStats.salesDetails.length > 8 && (
                                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                                        + {materialStats.salesDetails.length - 8} others
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

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


                        <div className="responsive-grid-4" style={{ marginBottom: '2rem' }}>
                            {/* [NEW] Today's Sales Card */}
                            <Card
                                title="Today's Total Sales"
                                value={todaySales}
                                icon={TrendingUp}
                                color="16, 185, 129"
                                type="sales"
                                subtext={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            />

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

                            {/* Total Outflow & Distribution Chart [MOVED UP] */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                {/* Left: Total Summary */}
                                <div style={{
                                    flex: '1 1 300px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    padding: '2rem',
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.1), 0 4px 6px -2px rgba(239, 68, 68, 0.05)',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ color: '#fca5a5', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Total Outflow</div>
                                            <div style={{ fontSize: '0.875rem', color: 'rgba(252, 165, 165, 0.8)' }}>Aggregated Expenses</div>
                                        </div>
                                        <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            <IndianRupee size={24} color="#ef4444" />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', lineHeight: 1 }}>{formatCurrency(grandTotalExpenses)}</div>
                                    <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#fca5a5' }}>
                                        {expenseChartData.length} Categories Tracked
                                    </div>
                                </div>

                                {/* Right: Distribution Chart */}
                                <div style={{
                                    flex: '1 1 300px',
                                    background: 'var(--glass-highlight)',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--glass-border)',
                                    height: '220px',
                                    position: 'relative'
                                }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expenseChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                                label={({ cx, x, y, name, percent }) => (
                                                    <text x={x} y={y} fill="var(--text-secondary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '10px', fontWeight: 500 }}>
                                                        {`${name} ${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                )}
                                                labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1 }}
                                            >
                                                {expenseChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => formatCurrency(value)}
                                                contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text Overlay */}
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        textAlign: 'center', pointerEvents: 'none'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expenses</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Distribution</div>
                                    </div>
                                </div>
                            </div>

                            {/* Expense Metrics [MOVED DOWN] */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                {/* Raw Material & Water Combined Box */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Material' ? null : 'Material')}
                                    style={{
                                        background: selectedExpenseCategory === 'Material' ? 'rgba(249, 115, 22, 0.15)' : 'var(--glass-highlight)',
                                        borderRadius: '0.5rem',
                                        border: `1px solid ${selectedExpenseCategory === 'Material' ? '#f97316' : 'rgba(249, 115, 22, 0.2)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Header */}
                                    <div style={{ padding: '1rem 1rem 0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Raw Materials</div>
                                        <Leaf size={16} color="#f97316" />
                                    </div>

                                    {/* Content Split */}
                                    <div style={{ display: 'flex', borderTop: '1px solid rgba(249, 115, 22, 0.1)' }}>
                                        {/* Core Material */}
                                        <div style={{ flex: 1, padding: '0.75rem 1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.25rem' }}>Core Material</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>
                                                {formatCurrency(rawMaterialExpenses - waterExpenses)}
                                            </div>
                                        </div>

                                        {/* Water (Separator Line) */}
                                        <div style={{ width: '1px', background: 'rgba(249, 115, 22, 0.1)' }}></div>

                                        {/* Water */}
                                        <div style={{ flex: 1, padding: '0.75rem 1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '0.25rem' }}>Water</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa' }}>
                                                {formatCurrency(waterExpenses)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Salary + Manual Salary */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Labour' ? null : 'Labour')}
                                    style={{
                                        background: selectedExpenseCategory === 'Labour' ? 'rgba(59, 130, 246, 0.15)' : 'var(--glass-highlight)',
                                        padding: '1rem', borderRadius: '0.5rem',
                                        border: `1px solid ${selectedExpenseCategory === 'Labour' ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Salary & Wages</div>
                                        <Users size={16} color="#3b82f6" />
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(finalSalaryExpenses)}</div>
                                    {manualSalaryCalc > 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Includes {formatCurrency(manualSalaryCalc)} Manual
                                        </div>
                                    )}
                                </div>

                                {/* Packaging Materials */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Packaging' ? null : 'Packaging')}
                                    style={{
                                        background: selectedExpenseCategory === 'Packaging' ? 'rgba(236, 72, 153, 0.15)' : 'var(--glass-highlight)',
                                        padding: '1rem', borderRadius: '0.5rem',
                                        border: `1px solid ${selectedExpenseCategory === 'Packaging' ? '#ec4899' : 'rgba(236, 72, 153, 0.2)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Packaging</div>
                                        <Package size={16} color="#ec4899" />
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ec4899' }}>{formatCurrency(packagingExpenses)}</div>
                                </div>

                                {/* Bills & Rent [NEW] */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Bills' ? null : 'Bills')}
                                    style={{
                                        background: selectedExpenseCategory === 'Bills' ? 'rgba(14, 165, 233, 0.15)' : 'var(--glass-highlight)',
                                        padding: '1rem', borderRadius: '0.5rem',
                                        border: `1px solid ${selectedExpenseCategory === 'Bills' ? '#0ea5e9' : 'rgba(14, 165, 233, 0.2)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Bills & Rent</div>
                                        <Wallet size={16} color="#0ea5e9" />
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0ea5e9' }}>{formatCurrency(billsAndRentExpenses)}</div>
                                </div>

                                {/* Marketing Expenses [NEW] */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Marketing' ? null : 'Marketing')}
                                    style={{
                                        background: selectedExpenseCategory === 'Marketing' ? 'rgba(234, 179, 8, 0.15)' : 'var(--glass-highlight)',
                                        padding: '1rem', borderRadius: '0.5rem',
                                        border: `1px solid ${selectedExpenseCategory === 'Marketing' ? '#eab308' : 'rgba(234, 179, 8, 0.2)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Marketing</div>
                                        <TrendingUp size={16} color="#eab308" />
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308' }}>{formatCurrency(marketingExpenses)}</div>
                                </div>

                                {/* Other Expenses */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Other' ? null : 'Other')}
                                    style={{
                                        background: selectedExpenseCategory === 'Other' ? 'rgba(168, 85, 247, 0.15)' : 'var(--glass-highlight)',
                                        padding: '1rem', borderRadius: '0.5rem',
                                        border: `1px solid ${selectedExpenseCategory === 'Other' ? '#a855f7' : 'rgba(168, 85, 247, 0.2)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Other Expenses</div>
                                        <Tag size={16} color="#a855f7" />
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a855f7' }}>{formatCurrency(finalOtherExpenses)}</div>
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
                                    {selectedExpenseCategory && (
                                        <button
                                            onClick={() => setSelectedExpenseCategory(null)}
                                            style={{
                                                fontSize: '0.75rem',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid var(--glass-border)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.25rem'
                                            }}
                                        >
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }}></span>
                                            Filter: {selectedExpenseCategory} ✕
                                        </button>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--glass-border)', padding: '0.2rem', borderRadius: '0.5rem' }}>
                                            <button
                                                onClick={() => setExpenseListView('detailed')}
                                                style={{
                                                    background: expenseListView === 'detailed' ? '#3b82f6' : 'transparent',
                                                    border: 'none', color: expenseListView === 'detailed' ? '#fff' : 'var(--text-secondary)',
                                                    padding: '0.25rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                                                }}
                                            >
                                                Detailed
                                            </button>
                                            <button
                                                onClick={() => setExpenseListView('compact')}
                                                style={{
                                                    background: expenseListView === 'compact' ? '#3b82f6' : 'transparent',
                                                    border: 'none', color: expenseListView === 'compact' ? '#fff' : 'var(--text-secondary)',
                                                    padding: '0.25rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                                                }}
                                            >
                                                Compact
                                            </button>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--glass-border)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', color: 'var(--text-secondary)' }}>
                                            {Object.keys(
                                                expenseTransactions.reduce((acc, t) => {
                                                    const k = t.originalDesc || 'Uncategorized';
                                                    acc[k] = 1;
                                                    return acc;
                                                }, {})
                                            ).length} Items
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: expenseListView === 'detailed' ? 'minmax(200px, 1.5fr) minmax(130px, 1fr) 100px minmax(140px, 1fr)' : 'minmax(250px, 2fr) 100px 120px', padding: '0.75rem',
                                    borderBottom: '1px solid var(--glass-border)',
                                    fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase'
                                }}>
                                    {expenseListView === 'detailed' ? (
                                        <>
                                            <div onClick={() => setExpenseSort(p => ({ key: 'type', direction: p.key === 'type' && p.direction === 'asc' ? 'desc' : 'asc' }))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                Item / Category {expenseSort.key === 'type' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                            <div onClick={() => setExpenseSort(p => ({ key: 'count', direction: p.key === 'count' && p.direction === 'desc' ? 'asc' : 'desc' }))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                Stats {expenseSort.key === 'count' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                            <div style={{ cursor: 'pointer' }} onClick={() => setExpenseSort(p => ({ key: 'total', direction: p.key === 'total' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                                Impact
                                            </div>
                                            <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setExpenseSort(p => ({ key: 'total', direction: p.key === 'total' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                                Total {expenseSort.key === 'total' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div onClick={() => setExpenseSort(p => ({ key: 'type', direction: p.key === 'type' && p.direction === 'asc' ? 'desc' : 'asc' }))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                Item Name {expenseSort.key === 'type' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                            <div onClick={() => setExpenseSort(p => ({ key: 'count', direction: p.key === 'count' && p.direction === 'desc' ? 'asc' : 'desc' }))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                Count {expenseSort.key === 'count' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                            <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setExpenseSort(p => ({ key: 'total', direction: p.key === 'total' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                                Total {expenseSort.key === 'total' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                                    {(() => {
                                        // Inline Aggregation Logic
                                        const summary = {};
                                        let grandTotal = 0;

                                        expenseTransactions.forEach(t => {
                                            const amount = Math.abs(t.parsedAmount || 0);
                                            grandTotal += amount;

                                            const key = t.originalDesc || 'Uncategorized';
                                            if (!summary[key]) {
                                                // Split Logic: "Type - Receiver"
                                                const parts = key.split(' - ');
                                                const type = parts[0];
                                                const receiver = parts.length > 1 ? parts.slice(1).join(' - ') : '-';

                                                // Categorization for Badges
                                                let category = 'Other';
                                                let badgeColor = 'var(--text-secondary)';
                                                let badgeBg = 'var(--glass-border)';

                                                const nameUpper = key.toUpperCase();
                                                const materialKeywords = ['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'PURCHASE', 'POONDU', 'DESI 3A', 'DESI 4A'];
                                                const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE', 'DRIVER', 'BATA', 'ADVANCE', 'BONUS', 'OT', 'OVERTIME', 'STAFF', 'COOK'];
                                                const packagingKeywords = ['POUCH', 'BOX', 'LABEL', 'PACKING', 'PACKAGING', 'ALUMINIUM', 'FOIL', 'COVER', 'TAPE'];
                                                const waterKeywords = ['WATER', 'CAN WATER', 'WATER CAN'];
                                                const billsKeywords = ['RENT', 'EB BILL', 'ELECTRICITY', 'POWER', 'INTERNET', 'WIFI', 'BROADBAND', 'PHONE', 'RECHARGE', 'BILL'];
                                                const marketingKeywords = ['AD', 'PROMO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'MARKETING', 'ADS', 'CAMPAIGN']; // [NEW]

                                                if (materialKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('OTHER EXP')) { category = 'Material'; badgeColor = '#f97316'; badgeBg = 'rgba(249, 115, 22, 0.1)'; }
                                                else if (waterKeywords.some(k => nameUpper.includes(k))) { category = 'Water'; badgeColor = '#06b6d4'; badgeBg = 'rgba(6, 182, 212, 0.1)'; }
                                                else if (labourKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('OTHER EXP')) { category = 'Labour'; badgeColor = '#3b82f6'; badgeBg = 'rgba(59, 130, 246, 0.1)'; }
                                                else if (packagingKeywords.some(k => nameUpper.includes(k))) { category = 'Packaging'; badgeColor = '#ec4899'; badgeBg = 'rgba(236, 72, 153, 0.1)'; }
                                                else if (billsKeywords.some(k => nameUpper.includes(k))) { category = 'Bills'; badgeColor = '#8b5cf6'; badgeBg = 'rgba(139, 92, 246, 0.1)'; }
                                                else if (marketingKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('ESSENTIAL') && !nameUpper.includes('INVOICE DISCOUNT')) { category = 'Marketing'; badgeColor = '#eab308'; badgeBg = 'rgba(234, 179, 8, 0.1)'; } // [FIX]

                                                summary[key] = {
                                                    name: key, type, receiver, category, badgeColor, badgeBg,
                                                    total: 0, count: 0, latestDate: ''
                                                };
                                            }

                                            summary[key].total += amount;
                                            summary[key].count += 1;

                                            // Track Latest Date
                                            if (t.parsedDate) {
                                                if (!summary[key].latestDate || t.parsedDate > summary[key].latestDate) {
                                                    summary[key].latestDate = t.parsedDate;
                                                }
                                            }
                                        });

                                        let sortedItems = Object.values(summary);

                                        // Sorting Logic
                                        sortedItems.sort((a, b) => {
                                            let valA = a[expenseSort.key];
                                            let valB = b[expenseSort.key];

                                            // Special handling for derived metrics
                                            if (expenseSort.key === 'avg') {
                                                valA = a.total / a.count;
                                                valB = b.total / b.count;
                                            }

                                            // Case insensitive for strings
                                            if (typeof valA === 'string') valA = valA.toLowerCase();
                                            if (typeof valB === 'string') valB = valB.toLowerCase();

                                            if (valA < valB) return expenseSort.direction === 'asc' ? -1 : 1;
                                            if (valA > valB) return expenseSort.direction === 'asc' ? 1 : -1;
                                            return 0;
                                        });

                                        // 2. Filter by Selected Category
                                        if (selectedExpenseCategory) {
                                            sortedItems = sortedItems.filter(item => {
                                                // Handle "Water" as part of Material visually if needed, but strictly it's a category
                                                if (selectedExpenseCategory === 'Material') return item.category === 'Material' || item.category === 'Water';
                                                return item.category === selectedExpenseCategory;
                                            });
                                        }

                                        if (sortedItems.length === 0) {
                                            return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses found.</div>;
                                        }

                                        return sortedItems.map((item, i) => {
                                            const avgCost = item.total / item.count;
                                            const contribution = (item.total / grandTotal) * 100;

                                            if (expenseListView === 'compact') {
                                                return (
                                                    <div key={i} style={{
                                                        display: 'grid', gridTemplateColumns: 'minmax(250px, 2fr) 100px 120px', padding: '0.75rem',
                                                        borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem', alignItems: 'center',
                                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                                                    }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                                                {item.name}
                                                            </div>
                                                            {item.receiver !== '-' && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                    Paid to: {item.receiver}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                            {item.count}
                                                        </div>
                                                        <div style={{ textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                                                            {formatCurrency(item.total)}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={i} style={{
                                                    display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(130px, 1fr) 100px minmax(140px, 1fr)', padding: '1rem',
                                                    borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem', alignItems: 'center',
                                                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                                                }}>
                                                    {/* Item & Category */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <div style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                                            {item.type}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{
                                                                fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem',
                                                                background: item.badgeBg, color: item.badgeColor, fontWeight: 600
                                                            }}>
                                                                {item.category.toUpperCase()}
                                                            </span>
                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={item.receiver}>
                                                                {item.receiver !== '-' ? item.receiver : ''}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Stats (Count & Avg) */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                            {item.count} txns
                                                        </span>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                                            Avg: {formatCurrency(avgCost)}
                                                        </span>
                                                    </div>

                                                    {/* Contribution Bar */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingRight: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            <span>Impact</span>
                                                            <span>{contribution.toFixed(1)}%</span>
                                                        </div>
                                                        <div style={{ width: '100%', height: '4px', background: 'var(--glass-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${contribution}%`, height: '100%', background: item.badgeColor, borderRadius: '2px' }} />
                                                        </div>
                                                    </div>

                                                    {/* Total & Recency */}
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '1rem' }}>
                                                            {formatCurrency(item.total)}
                                                        </div>
                                                        {item.latestDate && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                                                Last: {formatLastUpdated(item.latestDate)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div >
                )
            }




            {activeTab === 'items' && <ItemAnalysis data={filteredItems} />}
            {
                activeTab === 'customers' && (
                    <CustomerAnalysis data={filteredCustomers} receivables={props.data?.receivables || []} />
                )
            } {activeTab === 'stock' && <StockDashboard productionData={props.productionData} salesData={filteredItems} procurementData={props.summaryData} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
            {activeTab === 'production' && <ProductionDashboard data={props.productionData} selectedMonth={selectedMonth} selectedYear={selectedYear} isAdmin={isAdmin} />}
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

            {/* [NEW] Simulator Tab Content */}
            {
                activeTab === 'simulator' && (
                    <CostSimulator
                        previousMonthStats={previousMonthStats}
                        selectedMonth={selectedMonth}
                    />
                )
            }

        </div >
    );
};

export default Dashboard;
