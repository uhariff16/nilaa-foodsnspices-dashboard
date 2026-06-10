
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import SummaryCards, { Card } from './SummaryCards';
import Charts from './Charts';
import ItemAnalysis from './ItemAnalysis';
import ProductionDashboard from './ProductionDashboard';
import TimeAttendance from './TimeAttendance';
import ProcurementDashboard from './ProcurementDashboard';
import StockDashboard from './StockDashboard';
import TransactionTable from './TransactionTable';
import SalesSummaryTable from './SalesSummaryTable';


import { RefreshCw, RotateCw, Download, LayoutDashboard, Package, Users, User, Settings, Receipt, Wallet, Search, List, BarChart2, Factory, DollarSign, CreditCard, ShoppingCart, Activity, Moon, Sun, Upload, Filter, ShoppingBag, Layers, IndianRupee, LogOut, Calculator, Leaf, Tag, TrendingUp, TrendingDown, Clock, Target, Check, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CostSimulator from './CostSimulator'; // [NEW]
import YearlyAnalysis from './YearlyAnalysis';
import logo from '../assets/logo.png'; // Import logo
import MobileDashboard from './mobile/MobileDashboard';
import { supabase } from '../lib/supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import CustomerInsights from './CustomerInsights';
import InvestmentsDashboard from './InvestmentsDashboard';

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
    const { data, onReset, onRefresh, loading } = props;
    const { logout, user, role, isAdmin, canAccessAttendance, hasPermission } = useAuth();
    const navigate = useNavigate();
    // Default to Overview tab (per user request)
    const [activeTab, setActiveTab] = useState('overview');

    // Theme Context
    const { theme, toggleTheme } = useTheme();

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [mobileLayoutEnabled, setMobileLayoutEnabled] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
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

    // Removed local theme effect since ThemeContext handles it

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

    const [expenseSort, setExpenseSort] = React.useState({ key: 'total', direction: 'desc' });
    const [expenseListView, setExpenseListView] = React.useState('compact'); // 'compact' or 'detailed'
    const [selectedExpenseCategory, setSelectedExpenseCategory] = React.useState(null); // [NEW] Filter State

    const [invoiceSearch, setInvoiceSearch] = useState(''); // [NEW] Search invoices
    const [invoiceSort, setInvoiceSort] = useState('date_desc'); // [NEW] Sort invoices

    const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null); // [NEW] Modal State for Sales Returns / Invoices

    // [NEW] Invoice Discounts State
    const [invoiceDiscounts, setInvoiceDiscounts] = useState([]);
    const [discountForm, setDiscountForm] = useState({ invoice_no: '', discount_amount: '', discount_date: new Date().toISOString().split('T')[0], remarks: '' });
    const [discountLoading, setDiscountLoading] = useState(false);

    // Fetch Discounts
    useEffect(() => {
        const fetchDiscounts = async () => {
            try {
                const { data, error } = await supabase.from('invoice_discounts').select('*').order('created_at', { ascending: false });
                if (!error && data) setInvoiceDiscounts(data);
            } catch(e) { console.error('Error fetching discounts:', e); }
        };
        fetchDiscounts();
        
        const channel = supabase.channel('public:invoice_discounts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_discounts' }, () => {
                fetchDiscounts();
            }).subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, []);



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

    // [NEW] Identify Returns early for cross-referencing, explicitly ignoring orphaned MISSING data
    const salesReturns = React.useMemo(() => {
        return filteredTransactions.filter(t => 
            t.parsedType === 'Sales Return' && 
            !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
        );
    }, [filteredTransactions]);


    // Derived Data for Tabs (using filteredTransactions)
    // [FIX] Separate Granular Sales from Summary Rows to prevent double counting.
    // Explicitly filter out MISSING invoices to keep data consistent with expected verified totals.
    const allSalesTransactions = filteredTransactions.filter(t => 
        String(t.parsedType).toLowerCase().includes('sale') &&
        !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
    );

    // Identify Summary Rows (usually Type='Sales Summary' or similar)
    // We assume anything NOT 'Sales Summary' (and is 'Sales') is a granular row.

    // [FIX] New Priority: "Invoice Total" rows from parser
    const invoiceTotalRows = filteredTransactions.filter(t => 
        t.parsedType === 'Invoice Total' &&
        !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
    );

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
    // Simply use the granular sales rows. The previous logic of trying to match Totals
    // caused double counting for invoices without explicit numbers (INV-MISSING).
    // The filter for MISSING is now applied upstream to `allSalesTransactions`.
    const { physicalSalesTransactions, serviceRevenue } = React.useMemo(() => {
        const physical = [];
        let sRev = 0;
        const itemMaster = props.data?.itemMaster || [];

        salesAppearsGranular.forEach(t => {
            const nameUpper = (t.originalDesc || t.name || '').toUpperCase().trim();
            const matchedMaster = itemMaster.find(im => {
                const masterName = String(im.name).toUpperCase().trim();
                return nameUpper === masterName || nameUpper.includes(masterName);
            });

            if (matchedMaster && matchedMaster.category === 'Charges') {
                sRev += parseFloat(t.parsedAmount || 0);
            } else {
                physical.push(t);
            }
        });
        return { physicalSalesTransactions: physical, serviceRevenue: sRev };
    }, [salesAppearsGranular, props.data?.itemMaster]);

    const salesTransactions = salesAppearsGranular;
    // Metric Calculations
    const grossSalesRevenue = salesTransactions.reduce((sum, t) => {
        const amt = parseFloat(t.parsedAmount) || 0;
        return sum + Math.abs(amt);
    }, 0);

    const totalReturns = salesReturns.reduce((sum, t) => sum + (parseFloat(t.parsedAmount) || 0), 0);

    // [NEW] Calculate Total Discounts for the selected period
    const filteredDiscounts = React.useMemo(() => {
        return invoiceDiscounts.filter(d => {
            if (!d.discount_date) return false;
            if (!d.discount_date.startsWith(selectedYear)) return false;
            if (selectedMonth === 'Overall') return true;
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const [mStr, yStr] = selectedMonth.split(' ');
            const mIdx = monthNames.indexOf(mStr);
            if (mIdx === -1) return false;
            const targetPrefix = `${yStr}-${String(mIdx + 1).padStart(2, '0')}`;
            return d.discount_date.startsWith(targetPrefix);
        });
    }, [invoiceDiscounts, selectedMonth, selectedYear]);

    const totalDiscounts = filteredDiscounts.reduce((sum, d) => sum + parseFloat(d.discount_amount || 0), 0);
    const salesRevenue = grossSalesRevenue - totalReturns - totalDiscounts;

    // [NEW] Calculate matched invoice data for the discount form
    const matchedInvoiceData = React.useMemo(() => {
        if (!discountForm.invoice_no) return null;
        const input = String(discountForm.invoice_no).trim().toUpperCase();
        
        // Exact match
        let match = (data.transactions || []).find(t => 
            String(t.invoiceNo || '').trim().toUpperCase() === input &&
            t.parsedType !== 'Sales Return' && t.parsedType !== 'Invoice Total'
        );

        // Flexible matching (e.g. user types "2208" but it's "INV-2208" in DB)
        if (!match && /^\d+$/.test(input)) {
            match = (data.transactions || []).find(t => {
                const rowInv = String(t.invoiceNo || '').trim().toUpperCase();
                return (rowInv === `INV-${input}` || rowInv === `INV${input}` || rowInv.endsWith(`-${input}`)) &&
                       t.parsedType !== 'Sales Return' && t.parsedType !== 'Invoice Total';
            });
        }

        if (match) {
            return {
                customerName: match.customerName ? String(match.customerName).toUpperCase() : 'Unknown Customer',
                fullInvoiceNo: match.invoiceNo
            };
        }
        return null;
    }, [discountForm.invoice_no, data.transactions]);

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
    const marketingKeywords = ['PROMO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'MARKETING', 'ADS', 'CAMPAIGN', 'ADVERTISEMENT']; // Removed 'AD' to avoid collisions

    const recordedExpenses = expenseTransactions.reduce((sum, t) => {
        const amount = parseFloat(t.parsedAmount) || 0;
        const nameUpper = (t.originalDesc || t.name || '').toUpperCase();

        // [FIX] Extract Expense Type from name (Pattern: "TYPE - PAID TO")
        const typePart = nameUpper.split(' - ')[0].trim();

        const isWaterType = typePart === 'WATER CANE' || waterKeywords.some(k => nameUpper.includes(k));
        const isLabourType = ['SALARY', 'WAGES', 'SALARY ADVANCE'].includes(typePart) || (labourKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('OTHER EXP'));
        const isPackagingType = typePart === 'PACKING MATERIALS' || packagingKeywords.some(k => nameUpper.includes(k));
        const isBillType = ['BILLS', 'RENT'].includes(typePart) || billsKeywords.some(k => nameUpper.includes(k));
        const isMarketingType = marketingKeywords.some(k => nameUpper.includes(k));

        // [FIX] Expanded Logic to match MaterialStats
        const hasPBill = t.invoiceNo && String(t.invoiceNo).trim().toUpperCase().startsWith('P-');
        const isMaterial = (t.parsedType === 'Purchase') || hasPBill || materialKeywords.some(keyword => nameUpper.includes(keyword));

        // [FIX] Exclude ESSENTIAL and OTHER EXP items from Material (force to Other)
        const isEssential = nameUpper.includes('ESSENTIAL') || typePart === 'ESSENTIAL ITEMS';
        const isExplicitOther = nameUpper.includes('OTHER EXP') || typePart === 'OTHER EXP'; // [FIX]

        // Categorize (Water first to ensure it's tracked even if labeled as purchase)
        if (isWaterType) {
            rawMaterialExpenses += amount;
            waterExpenses += amount;
        } else if (isMaterial && !isEssential && !isExplicitOther) {
            rawMaterialExpenses += amount;
        } else if (isLabourType) {
            salaryExpenses += amount;
        } else if (isPackagingType) {
            packagingExpenses += amount;
        } else if (isBillType) {
            billsAndRentExpenses += amount;
        } else if (isMarketingType && !isEssential && !isExplicitOther && !nameUpper.includes('INVOICE DISCOUNT')) { // [FIX] Exclude Essential & Other Exp from Marketing
            marketingExpenses += amount;
        } else {
            otherExpenses += amount;
        }

        return sum + amount;
    }, 0);
    // [NEW] Calculate Attendance Salary from Supabase
    const attendancePayroll = (data.attendance || []).reduce((sum, record) => {
        // Filter by selected period if not 'Overall'
        if (selectedMonth !== 'Overall') {
            const [m, y] = selectedMonth.split(' ');
            const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const targetPrefix = y + '-' + monthMap[m];
            if (!record.date.startsWith(targetPrefix)) return sum;
        }
        return sum + (parseFloat(record.daily_wage) || 0);
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
            const returnsAmt = filteredTransactions
                .filter(t => t.parsedType === 'Sales Return')
                .reduce((s, t) => s + (t.parsedAmount || 0), 0);

            let grossSales = 0; let parsedExpenses = 0;
            filteredTransactions.forEach(t => {
                const type = String(t.parsedType || '').toLowerCase();
                const invNo = String(t.invoiceNo || '').toUpperCase();
                
                // Skip missing/orphaned invoices entirely for sales consistency
                if ((type.includes('sale') || type.includes('invoice total')) && invNo.includes('MISSING')) return;

                if (type === 'sales return' || type === 'invoice total') return; // Skip returns and totals for raw addition 

                // [FIX] Use the same logic as dashboard revenue
                if (type.includes('sale')) grossSales += t.parsedAmount || 0;
                else parsedExpenses += t.parsedAmount || 0;
            });

            // Adjust sales with returns
            const netSales = grossSales - returnsAmt;

            const manualSalary = parseFloat(manualExpenses.salary) || 0;
            const manualDaily = parseFloat(manualExpenses.daily) || 0;
            const attendPay = (data.attendance || []).filter(r => {
                if (selectedMonth === 'Overall') return true;
                const [m, y] = selectedMonth.split(' ');
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                return r.date.startsWith(y + '-' + monthMap[m]);
            }).reduce((s, r) => s + (parseFloat(r.daily_wage) || 0), 0);

            const totalExpenses = parsedExpenses + manualSalary + manualDaily;
            const netProfit = sales - totalExpenses;

            const overviewData = [
                ["Metric", "Value"],
                ["Period", selectedMonth],
                ["Gross Sales", grossSales],
                ["Sales Returns", returnsAmt],
                ["Net Sales (Total)", netSales],
                ["Total Expenses", totalExpenses],
                ["  - Parsed Expenses", parsedExpenses],
                ["  - Staff Salary (Est)", manualSalary],
                ["  - Other Daily (Est)", manualDaily],
                ["  - Attendance Payroll (For Ref)", attendPay], // [FIX] Kept as reference only
                ["Net Profit", netSales - totalExpenses],
                ["Profit Margin", netSales > 0 ? ((netSales - totalExpenses) / netSales * 100).toFixed(2) + "%" : "0%"]
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

        // [NEW] Identify items that were returned (spoiled) via Invoice Lookup
        const returnedItemsMap = {};
        if (salesReturns.length > 0) {
            salesReturns.forEach(ret => {
                const invNo = String(ret.invoiceNo || '').trim().toUpperCase();
                if (!invNo) return;

                // Find ORGINAL items in the full transaction list matching this invoice
                // Important: Look at all transactions, not just filtered ones, to find historical matches
                const originalTxns = (data.transactions || []).filter(t => 
                    String(t.invoiceNo || '').trim().toUpperCase() === invNo &&
                    t.parsedType !== 'Sales Return' &&
                    t.parsedType !== 'Invoice Total'
                );

                originalTxns.forEach(t => {
                    const name = (t.originalDesc || 'Unknown Item').trim();
                    const qty = parseFloat(t.parsedQty || 0);
                    if (!returnedItemsMap[name]) returnedItemsMap[name] = 0;
                    returnedItemsMap[name] += qty;
                });
            });
        }

        if (selectedMonth === 'Overall') {
            const yearFiltered = itemsToFilter.filter(item => {
                if (!item.parsedDate) return false;
                return item.parsedDate.includes(selectedYear);
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

        // Fallback: If no items found for month, aggregate from Transactions
        if (result.length === 0 && selectedMonth !== 'Overall' && filteredTransactions.length > 0) {
            const salesTx = filteredTransactions.filter(t => 
                String(t.parsedType).toLowerCase().includes('sale') && 
                t.parsedType !== 'Sales Return' &&
                !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
            );
            const fallbackMap = {};
            salesTx.forEach(t => {
                const name = (t.originalDesc || 'Unknown Item').trim();
                if (!fallbackMap[name]) fallbackMap[name] = { name, qty: 0, revenue: 0, profit: 0, count: 0 };
                fallbackMap[name].revenue += (t.parsedAmount || 0);
                fallbackMap[name].count += 1;
                fallbackMap[name].qty += (t.parsedQty || 1);
            });
            result = Object.values(fallbackMap);
        }

        // [FIX] Apply Deductions for Returned (Spoiled) Items
        return result.map(item => {
            const returnedQty = returnedItemsMap[item.name] || 0;
            return {
                ...item,
                qty: Math.max(0, item.qty - returnedQty),
                revenue: Math.max(0, item.revenue - (returnedQty * (item.revenue / item.qty || 0))) // Pro-rata revenue reduction if needed
            };
        }).filter(item => item.qty > 0 || item.revenue > 0);

    }, [data.items, data.transactions, selectedMonth, filteredTransactions, selectedYear, salesReturns]);



    // Calculate Last Updated Dates Separately
    // Material Flow Stats Calculation
    const materialStats = React.useMemo(() => {
        let procKG = 0;
        let prodKG = 0;
        let salesQty = 0;
        let rawOpenStockKG = 0;
        let processedOpenStockKG = 0;
        let openStockDetails = [];
        let inputKG = 0; // [NEW] Define at top level of memo


        // New: Aggregation Maps
        const procurementMap = {};
        const productionInputMap = {}; // [NEW] Track all inputs
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

            // [FIX] Opening Stock Aggregation Logic
            // In 'Overall' view, summing all monthly opening stocks leads to inflated values.
            // We should only take the opening stock from the EARLIEST month available in that year.
            let earliestOSMonth = null;
            if (selectedMonth === 'Overall') {
                const osEntries = props.productionData.stockIn.filter(item => {
                    const itemName = (item.material || item.item || '').trim().toUpperCase();
                    return item.date && item.date.startsWith(targetPrefix) &&
                        (itemName.startsWith('OS') || itemName.includes('OPENING') || itemName.includes('B/F'));
                });
                if (osEntries.length > 0) {
                    // Sort by date to find the earliest month
                    const sortedOS = osEntries.sort((a, b) => a.date.localeCompare(b.date));
                    earliestOSMonth = sortedOS[0].date.substring(0, 7); // YYYY-MM
                }
            }

            props.productionData.stockIn.forEach(item => {
                const itemName = (item.material || item.item || '').trim().toUpperCase();
                const weight = parseFloat(item.weight || 0);
                const itemMonth = item.date?.substring(0, 7);

                if (item.date && item.date.startsWith(targetPrefix)) {
                    // Check if it is Opening Stock
                    if (itemName.startsWith('OS') || itemName.includes('OPENING') || itemName.includes('B/F')) {
                        // Skip if we are in 'Overall' view and this is not from the earliest month or if we have no earliest month logic
                        if (selectedMonth === 'Overall' && itemMonth !== earliestOSMonth) return;

                        const isProcessed = itemName.includes('PASTE') || itemName.includes('PEELED');
                        if (isProcessed) {
                            processedOpenStockKG += weight;
                        } else {
                            rawOpenStockKG += weight;
                        }
                        // Clean up OS name for display
                        const cleanName = itemName.replace(/OS\s*[:|-]?\s*/i, '').trim();
                        openStockDetails.push({ name: cleanName, weight, type: isProcessed ? 'Processed' : 'Raw' });
                    } else {
                        // Regular Procurement
                        procKG += weight;
                        // Aggregate for details
                        if (!procurementMap[itemName]) procurementMap[itemName] = 0;
                        procurementMap[itemName] += weight;
                    }
                }
            });

            // 1.1 Production Input (Total Work Basis)
            if (props.productionData.preProduction) {
                props.productionData.preProduction.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        const weight = parseFloat(item.weight || 0);
                        inputKG += weight;

                        const matName = (item.material || 'Production Input').trim();
                        if (!productionInputMap[matName]) productionInputMap[matName] = 0;
                        productionInputMap[matName] += weight;
                    }
                });
            }

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
        const itemMasterLookup = props.data?.itemMaster || [];

        filteredItems.forEach(item => {
            const qty = parseFloat(item.qty || 0);
            if (qty > 0) {
                const nameUpper = (item.name || '').toUpperCase().trim();
                const matchedMaster = itemMasterLookup.find(im => {
                    const masterName = String(im.name).toUpperCase().trim();
                    return nameUpper === masterName || nameUpper.includes(masterName);
                });

                if (matchedMaster && matchedMaster.category === 'Charges') {
                    // Exclude from physical sales volume
                } else {
                    salesQty += qty;
                    salesDetails.push({ name: item.name, weight: qty });
                }
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
                const nameUpper = (item.originalDesc || item.name || '').toUpperCase().trim();

                // 1. Item Master Lookup (System Driven)
                const itemMaster = props.data?.itemMaster || [];
                const matchedMaster = itemMaster.find(im => {
                    const masterName = String(im.name).toUpperCase().trim();
                    return nameUpper === masterName || nameUpper.includes(masterName);
                });

                // 2. Legacy Keywords & Rules (Fallback)
                const materialKeywords = ['GINGER', 'GARLIC', 'ONION', 'SMALL ONION', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'POONDU', 'DESI 3A', 'DESI 4A'];
                const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE'];

                const hasPBill = item.invoiceNo && String(item.invoiceNo).trim().toUpperCase().startsWith('P-');
                const isEssential = nameUpper.includes('ESSENTIAL');

                let isMaterial = (type === 'Purchase') || hasPBill;
                let isLabour = labourKeywords.some(keyword => nameUpper.includes(keyword));
                let isOverhead = false;

                if (matchedMaster) {
                    if (matchedMaster.category === 'Raw Material' || matchedMaster.category === 'Processed Item') {
                        isMaterial = true;
                    } else if (matchedMaster.category === 'Overhead') {
                        isOverhead = true;
                        isMaterial = false; // Override if explicitly marked as Overhead
                    }
                } else {
                    // Fallback to keywords
                    if (materialKeywords.some(keyword => nameUpper.includes(keyword))) isMaterial = true;
                }

                if (isLabour) {
                    granularLabour += amount;
                } else if (isMaterial && !isEssential && !isOverhead) {
                    granularMaterial += amount;
                } else {
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
            productionInput: inputKG, // [NEW]
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
            productionInputDetails: toSortedArray(productionInputMap), // [NEW] Track detailed inputs
            productionDetails: toSortedArray(productionMap),
            salesDetails: salesDetails.sort((a, b) => b.weight - a.weight)
        };
    }, [props.productionData, filteredItems, selectedMonth, selectedYear]);

    // [NEW] Calculate Today's Sales (Live)
    const todaySales = React.useMemo(() => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

        return salesTransactions
            .filter(t => t.parsedDate === todayStr)
            .reduce((sum, t) => sum + Math.abs(t.parsedAmount || 0), 0);
    }, [salesTransactions]);

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

    // Time & Attendance View (Removed: Now standalone)

    // --- Mobile View Render (Safe Position: After all Hooks) ---
    if (isMobile && mobileLayoutEnabled) {
        return (
            <MobileDashboard
                data={data}
                filteredTransactions={filteredTransactions} // [NEW] Pass pre-filtered data
                selectedMonth={selectedMonth} // [NEW] Pass context
                selectedYear={selectedYear} // [NEW] Pass context
                productionData={props.productionData}
                manualExpenses={manualExpenses}
                previousMonthStats={previousMonthStats} // [NEW] For Cost Simulator
                onSwitchToDesktop={() => setMobileLayoutEnabled(false)} // [NEW] Ext Desktop View
            />
        );
    }

    return (
        <>
            {/* Loading Overlay */}
            {loading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <div className="loading-text">NILAA FOODS - LOADING DATA</div>
                </div>
            )}
            <div className="animate-fade-in" style={{ position: 'relative', minHeight: '100vh' }}>

            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
                borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem'
            }}>
                {/* Debug Error Banner */}
                {props.debugError && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%',
                        background: '#ef4444', color: 'var(--text-primary)', padding: '0.5rem',
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

                        {/* [NEW] Time & Attendance standalone navigation */}
                        {canAccessAttendance && (
                            <button
                                className="btn-primary"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    boxShadow: 'none'
                                }}
                                onClick={() => navigate('/attendance')}
                            >
                                <Clock size={18} />
                                Time & Attendance
                            </button>
                        )}

                        {/* Removed Add Files/Folder Buttons as per request */}
                    </div>

                    <button className="btn-primary" onClick={handleDownloadReport}>
                        <Download size={18} style={{ marginRight: '0.5rem' }} /> Download
                    </button>
                    {props.isAdmin && (
                        <button className="btn-primary"
                            disabled={props.isSyncing}
                            style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'none', opacity: props.isSyncing ? 0.7 : 1 }}
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
                    <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'none' }} onClick={() => {
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
                            onClick={() => navigate('/admin')}
                        >
                            <Settings size={18} style={{ marginRight: '0.5rem' }} /> Admin
                        </button>
                    )}

                    {/* User Profile Display */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.4rem 1rem',
                        background: 'var(--glass-highlight)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '1rem',
                        backdropFilter: 'blur(10px)',
                        marginLeft: '0.5rem'
                    }}>
                        <div style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgb(59, 130, 246)'
                        }}>
                            <User size={20} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                {user?.email?.split('@')[0] || 'User'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                {role || 'Staff'}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            title="Logout"
                            style={{
                                marginLeft: '0.5rem',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
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
            <div className="custom-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '2rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {hasPermission('dashboard.overview') && (
                    <button
                        onClick={() => setActiveTab('overview')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'overview' ? 600 : 400
                        }}
                    >
                        <LayoutDashboard size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Overview
                    </button>
                )}
                {hasPermission('dashboard.sales') && (
                    <button
                        onClick={() => setActiveTab('sales')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'sales' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'sales' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'sales' ? 600 : 400
                        }}
                    >
                        <DollarSign size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Sales
                    </button>
                )}
                {hasPermission('dashboard.expenses') && (
                    <button
                        onClick={() => setActiveTab('expenses')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'expenses' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'expenses' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'expenses' ? 600 : 400
                        }}
                    >
                        <CreditCard size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Expenses
                    </button>
                )}
                {hasPermission('dashboard.procurement') && (
                    <button
                        onClick={() => setActiveTab('procurement')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
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
                )}
                {hasPermission('dashboard.stock') && (
                    <button
                        onClick={() => setActiveTab('stock')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'stock' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'stock' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'stock' ? 600 : 400
                        }}
                    >
                        <Layers size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Stock
                    </button>
                )}
                {hasPermission('dashboard.production') && (
                    <button
                        onClick={() => setActiveTab('production')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'production' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'production' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'production' ? 600 : 400
                        }}
                    >
                        <Factory size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Production
                    </button>
                )}
                {hasPermission('dashboard.insights') && (
                    <button
                        onClick={() => setActiveTab('insights')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'insights' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'insights' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'insights' ? 600 : 400
                        }}
                    >
                        <Users size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Customer
                    </button>
                )}
                {hasPermission('dashboard.simulator') && (
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
                )}
                {hasPermission('dashboard.ytd') && (
                    <button
                        onClick={() => setActiveTab('ytd')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'ytd' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'ytd' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'ytd' ? 600 : 400
                        }}
                    >
                        <TrendingUp size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        YTD Analysis
                    </button>
                )}
                {hasPermission('dashboard.profitHub') && (
                    <button
                        onClick={() => setActiveTab('profitHub')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'profitHub' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'profitHub' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'profitHub' ? 600 : 400
                        }}
                    >
                        <Target size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Profit Hub
                    </button>
                )}
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('investments')}
                        style={{
                            background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',
                            color: activeTab === 'investments' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'investments' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'investments' ? 600 : 400
                        }}
                    >
                        <Briefcase size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                        Investments
                    </button>
                )}
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
                            totalReturns={totalReturns}
                            serviceRevenue={serviceRevenue}
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
                            {materialStats.productionInput > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        <span>Production Efficiency (Input vs Paste/Peeled)</span>
                                        <span>{((materialStats.production / materialStats.productionInput) * 100).toFixed(1)}% Yield</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: Math.min((materialStats.production / materialStats.productionInput) * 100, 100) + '%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                            borderRadius: '4px'
                                        }}></div>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                                        * Based on material inputs vs finished products (Pastes & Peeled).
                                    </p>
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
                                <button
                                    onClick={() => setSalesViewMode('invoices')}
                                    style={{
                                        background: salesViewMode === 'invoices' ? 'var(--glass-border)' : 'transparent',
                                        border: 'none',
                                        color: salesViewMode === 'invoices' ? 'white' : 'var(--text-secondary)',
                                        padding: '0.5rem 1rem', borderRadius: '0.25rem',
                                        cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s'
                                    }}
                                >
                                    <List size={14} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                    Invoices
                                </button>
                                <button
                                    onClick={() => setSalesViewMode('returns')}
                                    style={{
                                        background: salesViewMode === 'returns' ? 'var(--glass-border)' : 'transparent',
                                        border: 'none',
                                        color: salesViewMode === 'returns' ? 'white' : 'var(--text-secondary)',
                                        padding: '0.5rem 1rem', borderRadius: '0.25rem',
                                        cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s'
                                    }}
                                >
                                    <TrendingDown size={14} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                    Returns
                                </button>
                                <button
                                    onClick={() => setSalesViewMode('discounts')}
                                    style={{
                                        background: salesViewMode === 'discounts' ? 'var(--glass-border)' : 'transparent',
                                        border: 'none',
                                        color: salesViewMode === 'discounts' ? 'white' : 'var(--text-secondary)',
                                        padding: '0.5rem 1rem', borderRadius: '0.25rem',
                                        cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s'
                                    }}
                                >
                                    <Tag size={14} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                    Discounts
                                </button>
                            </div>
                        </div>


                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            {/* [NEW] Today's Sales Card */}
                            <Card
                                title="Today's Total Sales"
                                value={todaySales}
                                icon={TrendingUp}
                                color="16, 185, 129"
                                type="sales"
                                subtext={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            />

                            <Card 
                                title="Total Sales (Net)" 
                                value={salesRevenue} 
                                icon={IndianRupee} 
                                color="16, 185, 129" 
                                type="sales" 
                                subtext={serviceRevenue > 0 ? `Includes ${formatCurrency(serviceRevenue)} from Charges` : undefined}
                            />

                            <Card title="Total Sales Returns" value={totalReturns} icon={TrendingDown} color="239, 68, 68" type="return" />

                            <Card title="Total Discounts" value={totalDiscounts} icon={Tag} color="234, 179, 8" type="expense" />

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


                        {(salesViewMode === 'summary' || salesViewMode === 'item' || salesViewMode === 'daily') && (
                            <SalesSummaryTable
                                transactions={salesViewMode === 'item' ? physicalSalesTransactions : salesTransactions}
                                groupBy={salesViewMode === 'item' ? 'item' : 'date'}
                            />
                        )}

                        {salesViewMode === 'invoices' && (
                            <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>All Invoices</h3>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Search invoice or customer..." 
                                            value={invoiceSearch}
                                            onChange={(e) => setInvoiceSearch(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minWidth: '250px' }}
                                        />
                                        <select 
                                            value={invoiceSort} 
                                            onChange={(e) => setInvoiceSort(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="date_desc">Newest First</option>
                                            <option value="date_asc">Oldest First</option>
                                            <option value="amount_desc">Amount (High to Low)</option>
                                            <option value="amount_asc">Amount (Low to High)</option>
                                        </select>
                                    </div>
                                </div>
                                {salesTransactions.length > 0 ? (
                                    <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                                                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 500 }}>Date</th>
                                                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 500 }}>Invoice No</th>
                                                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 500 }}>Customer</th>
                                                    <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 500 }}>Total Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const uniqueInvoices = new Map();
                                                    salesTransactions.forEach(t => {
                                                        if(!t.invoiceNo) return;
                                                        const key = String(t.invoiceNo).trim().toUpperCase();
                                                        if (!uniqueInvoices.has(key)) {
                                                            uniqueInvoices.set(key, {
                                                                invoiceNo: key,
                                                                parsedDate: t.parsedDate,
                                                                customerName: t.customerName,
                                                                parsedAmount: 0
                                                            });
                                                        }
                                                        uniqueInvoices.get(key).parsedAmount += (t.parsedAmount || 0);
                                                    });
                                                    
                                                    return Array.from(uniqueInvoices.values()).filter(inv => {
                                                        if(!invoiceSearch) return true;
                                                        const s = invoiceSearch.toLowerCase();
                                                        return (inv.invoiceNo || '').toLowerCase().includes(s) || (inv.customerName || '').toLowerCase().includes(s);
                                                    }).sort((a,b) => {
                                                        if (invoiceSort === 'date_desc') return new Date(b.parsedDate) - new Date(a.parsedDate);
                                                        if (invoiceSort === 'date_asc') return new Date(a.parsedDate) - new Date(b.parsedDate);
                                                        if (invoiceSort === 'amount_desc') return b.parsedAmount - a.parsedAmount;
                                                        if (invoiceSort === 'amount_asc') return a.parsedAmount - b.parsedAmount;
                                                        return 0;
                                                    }).map((inv, i) => {
                                                        const originalTxns = (data.transactions || []).filter(t => 
                                                            String(t.invoiceNo || '').trim().toUpperCase() === inv.invoiceNo &&
                                                            t.parsedType !== 'Sales Return' &&
                                                            t.parsedType !== 'Invoice Total'
                                                        );
                                                        return (
                                                            <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{inv.parsedDate}</td>
                                                                <td 
                                                                    style={{ padding: '1rem', fontWeight: 600, color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                                                                    onClick={() => setSelectedInvoiceDetails({ invoiceNo: inv.invoiceNo, amount: inv.parsedAmount, items: originalTxns, isReturn: false })}
                                                                    title="Click to view details"
                                                                >{inv.invoiceNo}</td>
                                                                <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{inv.customerName ? String(inv.customerName).toUpperCase() : '-'}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                                                                    {formatCurrency(inv.parsedAmount)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No invoices found for this period.
                                    </div>
                                )}
                            </div>
                        )}

                        {salesViewMode === 'returns' && (
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Detailed Sales Returns</h3>
                                {salesReturns.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Invoice No</th>
                                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Customer</th>
                                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Returned Item</th>
                                                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Amount Returned</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {salesReturns.map((ret, i) => {
                                                    // Map to original item by doing lookback
                                                    const originalTxns = (data.transactions || []).filter(t => 
                                                        String(t.invoiceNo || '').trim().toUpperCase() === String(ret.invoiceNo || '').trim().toUpperCase() &&
                                                        t.parsedType !== 'Sales Return' &&
                                                        t.parsedType !== 'Invoice Total'
                                                    );
                                                    const resolvedItem = originalTxns.length === 1 
                                                        ? originalTxns[0].originalDesc 
                                                        : (originalTxns.length > 1 ? 'Multiple Items / Partial' : 'Unknown Item');
                                                    
                                                    return (
                                                        <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                            <td style={{ padding: '0.75rem' }}>{ret.parsedDate}</td>
                                                            <td 
                                                                style={{ padding: '0.75rem', fontWeight: 500, color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                                                                onClick={() => setSelectedInvoiceDetails({ invoiceNo: ret.invoiceNo, amount: ret.parsedAmount, items: originalTxns, isReturn: true })}
                                                                title="Click to view original invoice items"
                                                            >{ret.invoiceNo}</td>
                                                            <td style={{ padding: '0.75rem' }}>{ret.customerName ? String(ret.customerName).toUpperCase() : '-'}</td>
                                                            <td style={{ padding: '0.75rem' }}>{resolvedItem}</td>
                                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                                                                {formatCurrency(ret.parsedAmount)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No sales returns found for this period.
                                    </div>
                                )}
                            </div>
                        )}

                        {salesViewMode === 'discounts' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--glass-border)' }}>
                                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <Tag size={18} color="#eab308" />
                                        Apply Invoice Discount
                                    </h3>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if(!discountForm.invoice_no || !discountForm.discount_amount) return;
                                        setDiscountLoading(true);
                                        const newDiscount = {
                                            invoice_no: discountForm.invoice_no,
                                            discount_amount: parseFloat(discountForm.discount_amount),
                                            discount_date: discountForm.discount_date,
                                            remarks: discountForm.remarks
                                        };
                                        const { data: newRow, error } = await supabase.from('invoice_discounts').insert([newDiscount]).select('*');
                                        if(!error && newRow && newRow.length > 0) {
                                            setInvoiceDiscounts(prev => [newRow[0], ...prev]);
                                            setDiscountForm({ invoice_no: '', discount_amount: '', discount_date: new Date().toISOString().split('T')[0], remarks: '' });
                                        } else {
                                            alert("Failed to save discount: " + error.message);
                                        }
                                        setDiscountLoading(false);
                                    }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Invoice No *</label>
                                            <input type="text" required value={discountForm.invoice_no} onChange={(e) => setDiscountForm({...discountForm, invoice_no: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.5rem' }} placeholder="e.g. INV-100" />
                                            {discountForm.invoice_no && (
                                                <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {matchedInvoiceData ? (
                                                        <>
                                                            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                                                                <Check size={14} />
                                                                Customer: {matchedInvoiceData.customerName}
                                                            </div>
                                                            {String(matchedInvoiceData.fullInvoiceNo).toUpperCase() !== String(discountForm.invoice_no).trim().toUpperCase() && (
                                                                <div 
                                                                    onClick={() => setDiscountForm({...discountForm, invoice_no: matchedInvoiceData.fullInvoiceNo})}
                                                                    style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', fontStyle: 'italic', display: 'inline-block' }}
                                                                    title="Click to use full invoice number"
                                                                >
                                                                    Apply full number: {matchedInvoiceData.fullInvoiceNo}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>Customer not found</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Discount Amount (₹) *</label>
                                            <input type="number" required min="0" step="0.01" value={discountForm.discount_amount} onChange={(e) => setDiscountForm({...discountForm, discount_amount: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.5rem' }} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</label>
                                            <input type="date" required value={discountForm.discount_date} onChange={(e) => setDiscountForm({...discountForm, discount_date: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.5rem' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Remarks (Optional)</label>
                                            <input type="text" value={discountForm.remarks} onChange={(e) => setDiscountForm({...discountForm, remarks: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.5rem' }} placeholder="Reason for discount" />
                                        </div>
                                        <button type="submit" disabled={discountLoading} style={{ background: '#eab308', color: '#111827', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', height: '42px' }}>
                                            {discountLoading ? 'Applying...' : 'Apply Discount'}
                                        </button>
                                    </form>
                                </div>

                                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Applied Discounts (Active Period)</h3>
                                    {filteredDiscounts.length > 0 ? (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Invoice No</th>
                                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Customer</th>
                                                        <th style={{ textAlign: 'right', padding: '0.75rem' }}>Discount Amount</th>
                                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Remarks</th>
                                                        <th style={{ textAlign: 'right', padding: '0.75rem' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredDiscounts.map((d, i) => {
                                                        const invNoMatch = String(d.invoice_no).trim().toUpperCase();
                                                        const pastTxns = (data.transactions || []).filter(t => 
                                                            String(t.invoiceNo || '').trim().toUpperCase() === invNoMatch &&
                                                            t.parsedType !== 'Sales Return' && t.parsedType !== 'Invoice Total'
                                                        );
                                                        const custFound = pastTxns.find(t => t.customerName);
                                                        const resolvedCust = custFound ? String(custFound.customerName).toUpperCase() : '-';
                                                        return (
                                                        <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                            <td style={{ padding: '0.75rem' }}>{d.discount_date}</td>
                                                            <td style={{ padding: '0.75rem', fontWeight: 500, color: '#3b82f6' }}>{d.invoice_no}</td>
                                                            <td style={{ padding: '0.75rem' }}>{resolvedCust}</td>
                                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#eab308', fontWeight: 500 }}>
                                                                {formatCurrency(d.discount_amount)}
                                                            </td>
                                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{d.remarks || '-'}</td>
                                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                                <button onClick={async () => {
                                                                    if(window.confirm('Remove this discount?')) {
                                                                        const { error } = await supabase.from('invoice_discounts').delete().eq('id', d.id);
                                                                        if (!error) {
                                                                            setInvoiceDiscounts(prev => prev.filter(item => item.id !== d.id));
                                                                        }
                                                                    }
                                                                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            No discounts applied for this period.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: '1.5rem', 
                                marginBottom: '1.5rem' 
                            }}>
                                {/* Left: Total Summary */}
                                <div style={{
                                    flex: '1 1 300px',
                                    background: 'var(--glass-highlight)',
                                    padding: '2rem',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--danger)',
                                    boxShadow: '0 4px 6px -2px rgba(239, 68, 68, 0.05)',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--danger)', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Total Outflow</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Aggregated Expenses</div>
                                        </div>
                                        <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            <IndianRupee size={24} color="#ef4444" />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 'bold', color: 'var(--danger)', lineHeight: 1 }}>{formatCurrency(grandTotalExpenses)}</div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {expenseChartData.length} Categories Tracked
                                    </div>
                                    <div style={{
                                        marginTop: '1.5rem',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        width: '100%',
                                        gap: isMobile ? '0.75rem' : '1rem',
                                        borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                                        paddingTop: '1.25rem'
                                    }}>
                                        <div style={{ background: 'rgba(249, 115, 22, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Raw Materials</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f97316' }}>{formatCurrency(rawMaterialExpenses)}</div>
                                        </div>
                                        <div style={{ flex: 1, background: 'rgba(168, 85, 247, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>All Other Expenses</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#a855f7' }}>{formatCurrency(grandTotalExpenses - rawMaterialExpenses)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Distribution Chart */}
                                <div style={{
                                    flex: '1 1 300px',
                                    background: 'var(--glass-highlight)',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--glass-border)',
                                    minHeight: '250px',
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
                                                contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: 'none', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                                itemStyle={{ color: 'var(--text-primary)' }}
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
                                display: 'flex',
                                flexWrap: 'nowrap',
                                overflowX: 'auto',
                                paddingBottom: '0.5rem',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                {/* Raw Material & Water Combined Box */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Material' ? null : 'Material')}
                                    style={{
                                        flex: '1 1 auto',
                                        minWidth: 'max-content',
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
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Core Material</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>
                                                {formatCurrency(rawMaterialExpenses - waterExpenses)}
                                            </div>
                                        </div>

                                        {/* Water (Separator Line) */}
                                        <div style={{ width: '1px', background: 'rgba(249, 115, 22, 0.1)' }}></div>

                                        {/* Water */}
                                        <div style={{ flex: 1, padding: '0.75rem 1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Water</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                                {formatCurrency(waterExpenses)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Salary + Manual Salary */}
                                <div
                                    onClick={() => setSelectedExpenseCategory(prev => prev === 'Labour' ? null : 'Labour')}
                                    style={{
                                        flex: '1 1 auto',
                                        minWidth: 'max-content',
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
                                        flex: '1 1 auto',
                                        minWidth: 'max-content',
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
                                        flex: '1 1 auto',
                                        minWidth: 'max-content',
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
                                        flex: '1 1 auto',
                                        minWidth: 'max-content',
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
                                        flex: '1 1 auto',
                                        minWidth: 'max-content',
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
                                                background: 'var(--glass-highlight)',
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
                                                onClick={() => {
                                                    setExpenseListView('datewise');
                                                    setExpenseSort({ key: 'date', direction: 'desc' });
                                                }}
                                                style={{
                                                    background: expenseListView === 'datewise' ? '#3b82f6' : 'transparent',
                                                    border: 'none', color: expenseListView === 'datewise' ? '#fff' : 'var(--text-secondary)',
                                                    padding: '0.25rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                                                }}
                                            >
                                                Datewise
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setExpenseListView('detailed');
                                                    if (expenseSort.key === 'date') setExpenseSort({ key: 'total', direction: 'desc' });
                                                }}
                                                style={{
                                                    background: expenseListView === 'detailed' ? '#3b82f6' : 'transparent',
                                                    border: 'none', color: expenseListView === 'detailed' ? '#fff' : 'var(--text-secondary)',
                                                    padding: '0.25rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                                                }}
                                            >
                                                Detailed
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setExpenseListView('compact');
                                                    if (expenseSort.key === 'date') setExpenseSort({ key: 'total', direction: 'desc' });
                                                }}
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
                                    display: 'grid', gridTemplateColumns: expenseListView === 'datewise' ? '120px minmax(200px, 2fr) 120px' : (expenseListView === 'detailed' ? 'minmax(200px, 1.5fr) minmax(130px, 1fr) 100px minmax(140px, 1fr)' : 'minmax(250px, 2fr) 100px 120px'), padding: '0.75rem',
                                    borderBottom: '1px solid var(--glass-border)',
                                    fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase'
                                }}>
                                    {expenseListView === 'datewise' ? (
                                        <>
                                            <div onClick={() => setExpenseSort(p => ({ key: 'date', direction: p.key === 'date' && p.direction === 'desc' ? 'asc' : 'desc' }))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                Date {expenseSort.key === 'date' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                            <div onClick={() => setExpenseSort(p => ({ key: 'type', direction: p.key === 'type' && p.direction === 'asc' ? 'desc' : 'asc' }))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                Expense Details {expenseSort.key === 'type' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                            <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setExpenseSort(p => ({ key: 'total', direction: p.key === 'total' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                                Amount {expenseSort.key === 'total' && (expenseSort.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                        </>
                                    ) : expenseListView === 'detailed' ? (
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
                                            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setExpenseSort(p => ({ key: 'count', direction: p.key === 'count' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
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
                                        const getCategoryInfo = (keyName) => {
                                            const nameUpper = keyName.toUpperCase();
                                            const typePart = nameUpper.split(' - ')[0].trim();
                                            
                                            const materialKeywords = ['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'PURCHASE', 'POONDU', 'DESI 3A', 'DESI 4A'];
                                            const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE', 'DRIVER', 'BATA', 'ADVANCE', 'BONUS', 'OT', 'OVERTIME', 'STAFF', 'COOK'];
                                            const packagingKeywords = ['POUCH', 'BOX', 'LABEL', 'PACKING', 'PACKAGING', 'ALUMINIUM', 'FOIL', 'COVER', 'TAPE', 'CARRY BAG', 'STICKER'];
                                            const waterKeywords = ['WATER', 'CAN WATER', 'WATER CAN'];
                                            const billsKeywords = ['RENT', 'EB BILL', 'ELECTRICITY', 'POWER', 'INTERNET', 'WIFI', 'BROADBAND', 'PHONE', 'RECHARGE', 'BILL'];
                                            const marketingKeywords = ['PROMO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'MARKETING', 'ADS', 'CAMPAIGN', 'ADVERTISEMENT'];

                                            const isWaterType = typePart === 'WATER CANE' || waterKeywords.some(k => nameUpper.includes(k));
                                            const isLabourType = ['SALARY', 'WAGES', 'SALARY ADVANCE'].includes(typePart) || (labourKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('OTHER EXP'));
                                            const isPackagingType = typePart === 'PACKING MATERIALS' || packagingKeywords.some(k => nameUpper.includes(k));
                                            const isBillType = ['BILLS', 'RENT'].includes(typePart) || billsKeywords.some(k => nameUpper.includes(k));
                                            const isMarketingType = marketingKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('ESSENTIAL') && !nameUpper.includes('INVOICE DISCOUNT');
                                            const isExplicitOther = nameUpper.includes('OTHER EXP') || typePart === 'OTHER EXP';

                                            let category = 'Other';
                                            let badgeColor = 'var(--text-secondary)';
                                            let badgeBg = 'var(--glass-border)';

                                            if (isWaterType) { category = 'Water'; badgeColor = '#06b6d4'; badgeBg = 'rgba(6, 182, 212, 0.1)'; }
                                            else if (materialKeywords.some(k => nameUpper.includes(k)) && !nameUpper.includes('OTHER EXP') && typePart !== 'ESSENTIAL ITEMS') { category = 'Material'; badgeColor = '#f97316'; badgeBg = 'rgba(249, 115, 22, 0.1)'; }
                                            else if (isLabourType) { category = 'Labour'; badgeColor = '#3b82f6'; badgeBg = 'rgba(59, 130, 246, 0.1)'; }
                                            else if (isPackagingType) { category = 'Packaging'; badgeColor = '#ec4899'; badgeBg = 'rgba(236, 72, 153, 0.1)'; }
                                            else if (isBillType) { category = 'Bills'; badgeColor = '#8b5cf6'; badgeBg = 'rgba(139, 92, 246, 0.1)'; }
                                            else if (isMarketingType && !isExplicitOther) { category = 'Marketing'; badgeColor = '#eab308'; badgeBg = 'rgba(234, 179, 8, 0.1)'; }
                                            
                                            return { category, badgeColor, badgeBg };
                                        };

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

                                                const catInfo = getCategoryInfo(key);

                                                summary[key] = {
                                                    name: key, type, receiver, category: catInfo.category, badgeColor: catInfo.badgeColor, badgeBg: catInfo.badgeBg,
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

                                        if (expenseListView === 'datewise') {
                                            let datewiseItems = [...expenseTransactions];
                                            
                                            // Apply Category Filter
                                            if (selectedExpenseCategory) {
                                                datewiseItems = datewiseItems.filter(t => {
                                                    const key = t.originalDesc || 'Uncategorized';
                                                    const catInfo = getCategoryInfo(key);
                                                    if (selectedExpenseCategory === 'Material') return catInfo.category === 'Material' || catInfo.category === 'Water';
                                                    return catInfo.category === selectedExpenseCategory;
                                                });
                                            }

                                            // Sort transactions
                                            datewiseItems.sort((a, b) => {
                                                if (expenseSort.key === 'date') {
                                                    const dA = a.parsedDate || '';
                                                    const dB = b.parsedDate || '';
                                                    return expenseSort.direction === 'asc' ? dA.localeCompare(dB) : dB.localeCompare(dA);
                                                }
                                                if (expenseSort.key === 'amount' || expenseSort.key === 'total') {
                                                    const amtA = Math.abs(a.parsedAmount || 0);
                                                    const amtB = Math.abs(b.parsedAmount || 0);
                                                    return expenseSort.direction === 'asc' ? amtA - amtB : amtB - amtA;
                                                }
                                                const nA = (a.originalDesc || '').toLowerCase();
                                                const nB = (b.originalDesc || '').toLowerCase();
                                                return expenseSort.direction === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
                                            });

                                            if (datewiseItems.length === 0) {
                                                return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions found.</div>;
                                            }

                                            // Format Date Helper
                                            const formatDateStr = (dateStr) => {
                                                if (!dateStr) return 'Unknown Date';
                                                try {
                                                    const d = new Date(dateStr);
                                                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                                } catch(e) { return dateStr; }
                                            };

                                            return datewiseItems.map((t, i) => {
                                                const key = t.originalDesc || 'Uncategorized';
                                                const amount = Math.abs(t.parsedAmount || 0);
                                                const catInfo = getCategoryInfo(key);
                                                
                                                const parts = key.split(' - ');
                                                const type = parts[0];
                                                const receiver = parts.length > 1 ? parts.slice(1).join(' - ') : '-';

                                                return (
                                                    <div key={i} style={{
                                                        display: 'grid', 
                                                        gridTemplateColumns: isMobile ? '80px 1fr 100px' : '120px minmax(200px, 2fr) 120px', 
                                                        padding: '0.75rem',
                                                        borderBottom: '1px solid var(--glass-border)', fontSize: isMobile ? '0.75rem' : '0.875rem', alignItems: 'center',
                                                        background: i % 2 === 0 ? 'transparent' : 'var(--glass-highlight)'
                                                    }}>
                                                        <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                            {formatDateStr(t.parsedDate)}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={key}>
                                                                {type}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{
                                                                    fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '0.25rem',
                                                                    background: catInfo.badgeBg, color: catInfo.badgeColor, fontWeight: 600
                                                                }}>
                                                                    {catInfo.category.toUpperCase()}
                                                                </span>
                                                                {receiver !== '-' && (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paid to: {receiver}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>
                                                            {formatCurrency(amount)}
                                                        </div>
                                                    </div>
                                                );
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
                                                        display: 'grid', 
                                                        gridTemplateColumns: isMobile ? '1fr 60px 90px' : 'minmax(250px, 2fr) 100px 120px', 
                                                        padding: '0.75rem',
                                                        borderBottom: '1px solid var(--glass-border)', fontSize: isMobile ? '0.75rem' : '0.875rem', alignItems: 'center',
                                                        background: i % 2 === 0 ? 'transparent' : 'var(--glass-highlight)'
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
                                                        <div style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 500 }}>
                                                            {formatCurrency(item.total)}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={i} style={{
                                                    display: 'grid', 
                                                    gridTemplateColumns: isMobile ? '1fr 90px' : 'minmax(200px, 1.5fr) minmax(130px, 1fr) 100px minmax(140px, 1fr)', 
                                                    padding: '1rem',
                                                    borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem', alignItems: 'center',
                                                    background: i % 2 === 0 ? 'transparent' : 'var(--glass-highlight)',
                                                    gap: isMobile ? '0.5rem' : '0'
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
                                                        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '1rem' }}>
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





            {activeTab === 'stock' && <StockDashboard productionData={props.productionData} salesData={filteredItems} procurementData={props.summaryData} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
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

            {activeTab === 'insights' && <CustomerInsights selectedMonth={selectedMonth} />}

            {
                activeTab === 'simulator' && (
                    <CostSimulator
                        previousMonthStats={previousMonthStats}
                        selectedMonth={selectedMonth}
                    />
                )
            }

            {/* [NEW] YTD Analysis */}
            {
                activeTab === 'ytd' && (isAdmin || hasPermission('dashboard.ytd')) && (
                    <YearlyAnalysis
                        selectedYear={selectedYear}
                        transactions={data?.transactions || []}
                        productionData={props.productionData}
                        invoiceDiscounts={invoiceDiscounts}
                        forceTab="performance"
                    />
                )
            }

            {/* [NEW] Profit Hub */}
            {
                activeTab === 'profitHub' && (isAdmin || hasPermission('dashboard.profitHub')) && (
                    <YearlyAnalysis
                        selectedYear={selectedYear}
                        transactions={data?.transactions || []}
                        productionData={props.productionData}
                        invoiceDiscounts={invoiceDiscounts}
                        forceTab="profitHub"
                    />
                )
            }

            {/* [NEW] Investments Dashboard */}
            {
                activeTab === 'investments' && isAdmin && (
                    <InvestmentsDashboard isAdmin={isAdmin} />
                )
            }

            {selectedInvoiceDetails && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedInvoiceDetails(null)}>
                    <div className="glass-panel" style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--glass-border)', maxWidth: '600px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Original Invoice Details: {selectedInvoiceDetails.invoiceNo}</h3>
                            <button onClick={() => setSelectedInvoiceDetails(null)} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.25rem', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>&times;</button>
                        </div>
                        
                        <div style={{ marginBottom: '1rem', fontSize: '1rem', color: selectedInvoiceDetails.isReturn ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                            {selectedInvoiceDetails.isReturn ? 'Total Returned Amount: ' : 'Total Invoice Amount: '} {formatCurrency(selectedInvoiceDetails.amount)}
                        </div>
                        
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>{selectedInvoiceDetails.isReturn ? 'Because Excel does not explicitly specify which quantities were returned, here are the original items sold on this invoice for your reference:' : 'Here are the individual items parsed from this invoice:'}</p>
                        
                        <div style={{ overflowX: 'auto', flex: 1, minHeight: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Item</th>
                                        <th style={{ textAlign: 'right', padding: '0.75rem' }}>Qty</th>
                                        <th style={{ textAlign: 'right', padding: '0.75rem' }}>Original Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoiceDetails.items.length > 0 ? selectedInvoiceDetails.items.map((it, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{it.originalDesc || it.name}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)' }}>{it.parsedQty || '1'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)' }}>{formatCurrency(it.parsedAmount)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No original items found in ledger for this invoice.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '2rem', textAlign: 'right', flexShrink: 0 }}>
                            <button onClick={() => setSelectedInvoiceDetails(null)} style={{ background: 'var(--glass-highlight)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div >
        </>
    );
};


export default Dashboard;
