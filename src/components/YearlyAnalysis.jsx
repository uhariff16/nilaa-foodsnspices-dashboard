import React, { useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart, Line, Cell, LineChart, PieChart, Pie } from 'recharts';
import { Calendar, TrendingUp, DollarSign, Activity, Wheat, Target, AlertTriangle, CheckCircle, Info, ArrowUpRight, ArrowDownRight, Settings, Eye, EyeOff, ChevronDown, ChevronUp, Factory, Users, Plus, Trash2, Wallet, Shield, ShoppingCart, Truck, IndianRupee, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val || 0);
};

const normalizeName = (name) => {
    if (!name) return "";
    let n = name.toUpperCase()
        .replace(/^NFS\s+/, '') // Remove NFS prefix
        .replace(/\b(G\s*(?:&|AND)\s*G)\b/g, 'GINGER GARLIC') // Handle G & G -> GINGER GARLIC
        .replace(/\s+/g, ' ')   // Normalize internal spacing
        .replace(/\(.*\)/g, '') // Remove everything in parentheses
        .replace(/\b\d+\s*(KG|G|GM|GMS|ML|L|PKT|PACKET|PACK|BOX|PCS|PC|G)\b/g, '') // Expanded units
        .replace(/\b(WITHOUT|PACKET|PKT|BOTTLE|JAR|TIN|PACK|PACKS)\b/g, '') // Specific keywords to ignore
        .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
        .trim();
    // Sort words to handle "GARLIC PEELED" vs "PEELED GARLIC"
    return n.split(/\s+/).filter(Boolean).sort().join(" ");
};

const getPackWeight = (desc) => {
    if (!desc) return 1;
    const d = desc.toUpperCase();
    const match = d.match(/(\d+(?:\.\d+)?)\s*(KG|GM|GMS|G|ML|L)/);
    if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2];
        if (unit.startsWith('K') || unit === 'L') return val;
        if (unit.startsWith('G') || unit.startsWith('M')) return val / 1000;
    }
    return 1; // Default to 1kg if no unit found (bulk/loose/standard)
};

const BLACKLIST_ITEMS = ['TOTAL', 'GRAND TOTAL', 'WAGES', 'SALARY', 'EXPENSE', 'RENT', 'BILL', 'TAX', 'GST', 'PROFIT', 'SUMMARY'];

const YearlyAnalysis = ({ selectedYear, transactions = [], productionData = {}, purchaseData = [], summaryData = [], invoiceDiscounts = [], forceTab = null }) => {
    const { hasPermission } = useAuth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Dashboard View Settings
    const [viewSettings, setViewSettings] = React.useState(() => {
        try {
            const saved = localStorage.getItem('ytd_view_settings_v2');
            return saved ? JSON.parse(saved) : {
                // KPIs
                showTotalRev: true,
                showTotalExp: true,
                showNetProfit: true,
                showYtdProd: true,

                // Performance
                showQuarterly: true,
                showRecommendations: true,

                // Charts
                showFinancialTrends: true,
                showGrowthTrends: true,
                showUnitEconomics: true,
                showExpenseComp: true,
                showProdYield: true,

                // Tables
                showEfficiencyBench: true,
                showItemAnalysis: true
            };
        } catch (e) {
            return {
                showTotalRev: true, showTotalExp: true, showNetProfit: true, showYtdProd: true,
                showQuarterly: true, showRecommendations: true, showFinancialTrends: true,
                showGrowthTrends: true, showUnitEconomics: true, showExpenseComp: true,
                showProdYield: true, showEfficiencyBench: true, showItemAnalysis: true
            };
        }
    });

    const [showSettingsDropdown, setShowSettingsDropdown] = React.useState(false);
    const [analysisViewMode, setAnalysisViewMode] = React.useState('monthly'); // 'monthly' | 'yearly'
    const [selectedAnalysisMonth, setSelectedAnalysisMonth] = React.useState(''); // e.g., 'Jan'

    const [profitStakeholders, setProfitStakeholders] = React.useState([]);
    const [profitPayouts, setProfitPayouts] = React.useState([]);
    const [profitReservePct, setProfitReservePct] = React.useState(0);
    const [profitMonthlySettings, setProfitMonthlySettings] = React.useState([]);
    const [totalInvestedCapital, setTotalInvestedCapital] = React.useState(0);
    const [partnerInvestmentsMap, setPartnerInvestmentsMap] = React.useState({});
    const [isProfitLoading, setIsProfitLoading] = React.useState(false);
    const [activeAnalysisSubTab, setActiveAnalysisSubTab] = React.useState(forceTab || 'performance'); // 'performance' | 'profitHub'
    const [isTableMissing, setIsTableMissing] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
    const [ledgerSearchQuery, setLedgerSearchQuery] = React.useState('');
    const [ledgerCurrentPage, setLedgerCurrentPage] = React.useState(1);

    React.useEffect(() => {
        setLedgerSearchQuery('');
        setLedgerCurrentPage(1);
    }, [selectedYear]);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        if (forceTab) setActiveAnalysisSubTab(forceTab);
    }, [forceTab]);

    const fetchProfitHubData = async () => {
        setIsProfitLoading(true);
        setIsTableMissing(false);
        try {
            const [stkRes, payRes, setRes, monthlyRes, invsRes] = await Promise.all([
                supabase.from('profit_stakeholders').select('*').order('created_at', { ascending: true }),
                supabase.from('profit_payouts').select('*').like('month_year', `%${selectedYear}%`),
                supabase.from('system_settings').select('value').eq('key', 'profit_reserve_percentage').maybeSingle(),
                supabase.from('profit_monthly_settings').select('*').like('month_year', `%${selectedYear}%`),
                supabase.from('partner_investments').select('amount, investment_date, stakeholder_id')
            ]);

            if (stkRes.error || payRes.error) {
                const err = stkRes.error || payRes.error;
                if (err.message.includes('schema cache') || err.message.includes('not found')) {
                    setIsTableMissing(true);
                }
            }

            if (!stkRes.error) setProfitStakeholders(stkRes.data || []);
            if (!payRes.error) setProfitPayouts(payRes.data || []);
            if (!setRes.error && setRes.data) setProfitReservePct(parseFloat(setRes.data.value) || 0);
            if (!monthlyRes?.error) setProfitMonthlySettings(monthlyRes?.data || []);
            
            if (!invsRes.error && invsRes.data) {
                const yearEnd = `${selectedYear}-12-31`;
                const filtered = invsRes.data.filter(i => i.investment_date <= yearEnd);
                const total = filtered.reduce((sum, i) => sum + Number(i.amount), 0);
                setTotalInvestedCapital(total);

                const map = {};
                filtered.forEach(i => {
                    if (i.stakeholder_id) {
                        map[i.stakeholder_id] = (map[i.stakeholder_id] || 0) + Number(i.amount);
                    }
                });
                setPartnerInvestmentsMap(map);
            }
        } catch (e) {
            console.error("Error fetching profit hub data:", e);
        } finally {
            setIsProfitLoading(false);
        }
    };

    const logProfitHubAction = async (action, details) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('profit_hub_logs').insert({
                user_id: user?.id,
                user_email: user?.email,
                action,
                details
            });
        } catch (err) {
            console.error("Audit log failed:", err);
        }
    };

    React.useEffect(() => {
        fetchProfitHubData();
    }, [selectedYear]);

    React.useEffect(() => {
        localStorage.setItem('ytd_view_settings_v2', JSON.stringify(viewSettings));
    }, [viewSettings]);

    // Fetch Simulator History for matching
    const [simHistory, setSimHistory] = React.useState({});

    React.useEffect(() => {
        const fetchSimulations = async () => {
            try {
                const [retailRes, wholesaleRes] = await Promise.all([
                    supabase.from('simulated_costs_retail').select('*').order('created_at', { ascending: true }),
                    supabase.from('simulated_costs_wholesale').select('*').order('created_at', { ascending: true })
                ]);

                if (!retailRes.error && !wholesaleRes.error) {
                    const history = {};

                    // Group by Month-Year and Item
                    const processSims = (data, channel) => {
                        (data || []).forEach(item => {
                            const date = new Date(item.created_at);
                            const mStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            const norm = normalizeName(item.item_name);
                            if (!history[mStr]) history[mStr] = { retail: {}, wholesale: {} };
                            history[mStr][channel][norm] = item;
                        });
                    };

                    processSims(retailRes.data, 'retail');
                    processSims(wholesaleRes.data, 'wholesale');

                    // Propagate simulations forward if no new ones exist in later months
                    // but ONLY within the same year of analysis to avoid showing futuristic knowledge
                    // Wait, user says "Simulator data should be according to the date. The same cost should not be shown for previous months."
                    // This means Feb shouldn't show March data. But March CAN show Feb data if no March simulation exists.

                    const months = Object.keys(history).sort();
                    if (months.length > 0) {
                        const firstMonth = months[0];
                        const lastMonth = months[months.length - 1];
                        // We'll calculate the "best available" for each month later in the render loop or pre-calculate
                    }

                    setSimHistory(history);
                }
            } catch (err) {
                console.error("Error fetching YTD simulations:", err);
            }
        };
        fetchSimulations();
    }, []);

    // Helper to get latest sim as of a specific month
    const getSimForMonth = (normName, targetMonthStr, channel, useAbsoluteLatest = false) => {
        const availableMonths = Object.keys(simHistory)
            .filter(m => useAbsoluteLatest ? true : m <= targetMonthStr)
            .sort((a, b) => b.localeCompare(a)); // Newest first

        for (const m of availableMonths) {
            if (simHistory[m][channel] && simHistory[m][channel][normName]) {
                return simHistory[m][channel][normName];
            }
        }
        return null;
    };

    const yearlyData = useMemo(() => {
        if (!selectedYear) return [];

        const aggregated = monthNames.map((month, index) => {
            const numMonth = String(index + 1).padStart(2, '0');
            const targetPrefix = `${selectedYear}-${numMonth}`; // e.g., "2025-01"

            let revenue = 0;
            let totalExpenses = 0;
            let labour = 0;
            let materialsCost = 0;
            let packaging = 0;
            let bills = 0;
            let marketing = 0;
            let other = 0;
            let itemProduction = {}; // { itemName: weight }
            let itemSalesData = {}; // { itemName: { revenue: 0, qty: 0 } }

            let salesKg = 0;
            let productionKgValue = 0; // Final Paste
            let productionInputKgValue = 0; // Raw Material Input (e.g., Peeled Garlic)
            let productionGingerInputKg = 0;
            let productionGarlicInputKg = 0;
            let purchasesKgValue = 0;  // Raw Material In

            // 1. Process Transactions (Revenue, Expenses, Sales Kg)
            const monthTxns = transactions ? transactions.filter(t => t.parsedDate && t.parsedDate.startsWith(targetPrefix)) : [];

            if (monthTxns.length > 0) {
                // --- SALES LOGIC ---
                const allSales = monthTxns.filter(t =>
                    String(t.parsedType).toLowerCase().includes('sale') &&
                    !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
                );
                const salesReturns = monthTxns.filter(t =>
                    t.parsedType === 'Sales Return' &&
                    !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
                );
                const invoiceTotalRows = monthTxns.filter(t =>
                    t.parsedType === 'Invoice Total' &&
                    !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
                );
                const salesSummaryRows = allSales.filter(t => String(t.parsedType || '').toLowerCase() === 'sales summary' && t.parsedType !== 'Sales Return');

                const salesAppearsGranular = allSales.filter(t => {
                    const type = String(t.parsedType || '').toLowerCase();
                    const desc = String(t.originalDesc || '').toLowerCase();
                    if (type === 'sales summary' || type === 'profitsummary' || type === 'invoice total' || type === 'sales return') return false;
                    const keywordsToExclude = ['subtotal', 'sub total', 'taxable', 'net amount', 'gross amount', 'round off', 'rounded off', 'roundoff', 'gst', 'total'];
                    const isCreditNote = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || desc.includes('cn');
                    if (isCreditNote) return true;
                    if (keywordsToExclude.some(k => desc.includes(k))) return false;
                    return true;
                });

                let selectedSalesRows = [];
                if (invoiceTotalRows.length === 0 && salesAppearsGranular.length === 0) {
                    selectedSalesRows = salesSummaryRows;
                } else {
                    // [FIX] MATCH DASHBOARD LOGIC: Use only granular sales items to prevent double-counting.
                    selectedSalesRows = salesAppearsGranular;
                }

                const uniqueSalesMap = new Map();
                selectedSalesRows.forEach(t => {
                    const key = t.id || `${t.invoiceNo}-${t.parsedDate}-${t.parsedAmount}-${t.originalDesc}`;
                    if (!uniqueSalesMap.has(key)) uniqueSalesMap.set(key, t);
                });
                const finalSales = Array.from(uniqueSalesMap.values());

                const grossRevenue = finalSales.reduce((acc, t) => acc + Math.abs(parseFloat(t.parsedAmount || 0)), 0);
                const returnRevenue = salesReturns.reduce((acc, t) => acc + Math.abs(parseFloat(t.parsedAmount || 0)), 0);

                // Calculate Discounts for this month
                const monthDiscounts = invoiceDiscounts.filter(d => d.discount_date && d.discount_date.startsWith(targetPrefix));
                const discountRevenue = monthDiscounts.reduce((acc, d) => acc + (parseFloat(d.discount_amount) || 0), 0);

                revenue = grossRevenue - returnRevenue - discountRevenue;

                // 5. Build Item Breakdown from ALL Granular Sales
                // [NEW] Identify items that were returned in this month via Invoice Lookup
                const returnedItemsMap = {};
                salesReturns.forEach(ret => {
                    const invNo = String(ret.invoiceNo || '').trim().toUpperCase();
                    if (!invNo) return;
                    const originalTxns = (transactions || []).filter(t =>
                        String(t.invoiceNo || '').trim().toUpperCase() === invNo &&
                        t.parsedType !== 'Sales Return' &&
                        t.parsedType !== 'Invoice Total'
                    );
                    originalTxns.forEach(t => {
                        const name = normalizeName(t.originalDesc || '');
                        const packWeight = getPackWeight(t.originalDesc || '');
                        const qtyWeight = parseFloat(t.parsedQty || 0) * packWeight;
                        if (!returnedItemsMap[name]) returnedItemsMap[name] = 0;
                        returnedItemsMap[name] += qtyWeight;
                    });
                });

                salesAppearsGranular.forEach(t => {
                    const amt = Math.abs(parseFloat(t.parsedAmount || 0));
                    const qty = parseFloat(t.parsedQty || 0);
                    const rawName = (t.originalDesc || 'Generic Item').trim().toUpperCase();

                    const isFinishedPaste = rawName.includes('PASTE') || rawName.includes('G & G') || rawName.includes('G&G') || rawName.includes('PEELED');
                    const isBlacklisted = BLACKLIST_ITEMS.some(b => rawName.includes(b)) ||
                        rawName === 'ITEM' || rawName === 'PRODUCT' ||
                        rawName === 'AMOUNT' || rawName === 'SUBTOTAL' || rawName === 'INVOICE TOTAL' || rawName === 'TOTAL' ||
                        !isFinishedPaste;

                    if (isBlacklisted) return;

                    const normName = normalizeName(rawName);
                    const packWeight = getPackWeight(rawName);
                    const totalWeightKg = qty * packWeight;

                    if (!itemSalesData[normName]) itemSalesData[normName] = { revenue: 0, weight: 0, minPrice: Infinity, maxPrice: -Infinity, originalNames: new Set() };
                    itemSalesData[normName].revenue += amt;
                    itemSalesData[normName].weight += totalWeightKg;
                    itemSalesData[normName].originalNames.add(rawName);

                    if (totalWeightKg > 0) {
                        const pricePerKg = amt / totalWeightKg;
                        if (pricePerKg > 0) {
                            itemSalesData[normName].minPrice = Math.min(itemSalesData[normName].minPrice, pricePerKg);
                            itemSalesData[normName].maxPrice = Math.max(itemSalesData[normName].maxPrice, pricePerKg);
                        }
                    }
                });

                // Apply Deductions to item breakdown and total sales volume
                Object.keys(itemSalesData).forEach(normName => {
                    const deduction = returnedItemsMap[normName] || 0;
                    if (deduction > 0) {
                        const originalWeight = itemSalesData[normName].weight;
                        const asp = originalWeight > 0 ? itemSalesData[normName].revenue / originalWeight : 0;
                        itemSalesData[normName].weight = Math.max(0, originalWeight - deduction);
                        itemSalesData[normName].revenue = Math.max(0, itemSalesData[normName].revenue - (deduction * asp));
                    }
                    salesKg += itemSalesData[normName].weight;
                });

                // --- EXPENSES LOGIC ---
                const expenses = monthTxns.filter(t => String(t.parsedType).toLowerCase().includes('expense') || t.parsedType === 'Purchase');

                expenses.forEach(t => {
                    const amount = parseFloat(t.parsedAmount || 0);
                    const nameUpper = (t.originalDesc || t.name || '').toUpperCase();

                    totalExpenses += amount;

                    const hasPBill = t.invoiceNo && String(t.invoiceNo).trim().toUpperCase().startsWith('P-');
                    const materialKeywords = ['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'POONDU', 'DESI 3A', 'DESI 4A'];
                    const isMaterial = (t.parsedType === 'Purchase') || hasPBill || materialKeywords.some(k => nameUpper.includes(k));
                    const waterKeywords = ['WATER', 'CAN WATER', 'WATER CAN'];
                    const isWater = waterKeywords.some(k => nameUpper.includes(k));
                    const labourKeywords = ['SALARY', 'LABOUR', 'WAGES', 'EMPLOYEE', 'DRIVER', 'BATA', 'ADVANCE', 'BONUS', 'OT', 'OVERTIME', 'STAFF', 'COOK'];
                    const isLabour = labourKeywords.some(k => nameUpper.includes(k));
                    const packagingKeywords = ['POUCH', 'BOX', 'LABEL', 'PACKING', 'PACKAGING', 'ALUMINIUM', 'FOIL', 'COVER', 'TAPE', 'CARRY BAG', 'STICKER'];
                    const isPackaging = packagingKeywords.some(k => nameUpper.includes(k));
                    const billsKeywords = ['RENT', 'EB BILL', 'ELECTRICITY', 'POWER', 'INTERNET', 'WIFI', 'BROADBAND', 'PHONE', 'RECHARGE', 'BILL'];
                    const isBills = billsKeywords.some(k => nameUpper.includes(k));
                    const marketingKeywords = ['AD', 'PROMO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'MARKETING', 'ADS', 'CAMPAIGN'];
                    const isMarketing = marketingKeywords.some(k => nameUpper.includes(k));
                    const isEssential = nameUpper.includes('ESSENTIAL');

                    if (isMaterial && !isEssential) {
                        materialsCost += amount;
                    } else if (isWater) {
                        materialsCost += amount;
                    } else if (isLabour && !nameUpper.includes('OTHER EXP')) {
                        labour += amount;
                    } else if (isPackaging) {
                        packaging += amount;
                    } else if (isBills) {
                        bills += amount;
                    } else if (isMarketing && !isEssential && !nameUpper.includes('INVOICE DISCOUNT')) {
                        marketing += amount;
                    } else {
                        other += amount;
                    }
                });
            }

            // 2. Process Production & Procurement Records
            if (productionData?.stockIn) {
                productionData.stockIn.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        const name = (item.material || item.item || '').trim().toUpperCase();
                        const isOS = name.startsWith('OS') || name.startsWith('O.S') || name.includes('OPENING') || name.includes('B/F');
                        if (!isOS) purchasesKgValue += parseFloat(item.weight || 0);
                    }
                });
            }
            if (productionData?.preProduction) {
                productionData.preProduction.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        const weight = parseFloat(item.weight || 0);
                        productionInputKgValue += weight;

                        const mat = String(item.material || '').toLowerCase();
                        if (mat.includes('ginger')) {
                            productionGingerInputKg += weight;
                        } else if (mat.includes('garlic')) {
                            productionGarlicInputKg += weight;
                        }
                    }
                });
            }
            if (productionData?.postProduction) {
                productionData.postProduction.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        const weight = parseFloat(item.weight || 0);
                        productionKgValue += weight;

                        const name = (item.material || item.item || 'Generic Product').trim().toUpperCase();
                        if (!itemProduction[name]) itemProduction[name] = 0;
                        itemProduction[name] += weight;
                    }
                });
            }

            const effectiveOutput = Math.max(productionKgValue, salesKg);
            const netProfit = revenue - totalExpenses;
            const costPerKg = effectiveOutput > 0 ? (totalExpenses / effectiveOutput) : 0;
            const revenuePerKg = effectiveOutput > 0 ? (revenue / effectiveOutput) : 0; // ASP
            const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
            const yieldPercent = productionInputKgValue > 0 ? (effectiveOutput / productionInputKgValue) * 100 : 0;

            return {
                name: month,
                fullName: `${month} ${selectedYear}`,
                revenue,
                expenses: totalExpenses,
                labour,
                materials: materialsCost,
                packaging,
                bills,
                marketing,
                other,
                salesKg,
                purchasesKg: purchasesKgValue,
                peeledKg: productionInputKgValue,
                gingerInputKg: productionGingerInputKg,
                garlicInputKg: productionGarlicInputKg,
                productionKg: effectiveOutput,
                itemBreakdown: (() => {
                    const breakdown = [];
                    const usedSalesKeys = new Set();

                    // --- MODIFIED COST ALLOCATION (Pass 1: Theoretical Total) ---
                    let totalTheoreticalCost = 0;
                    Object.entries(itemProduction).forEach(([originalName, weight]) => {
                        const normKey = normalizeName(originalName);
                        const simRetail = getSimForMonth(normKey, targetPrefix, 'retail');
                        const simWholesale = getSimForMonth(normKey, targetPrefix, 'wholesale');
                        const benchmarkUnitCost = simRetail ? simRetail.unit_cost : (simWholesale ? simWholesale.unit_cost : (totalExpenses / (productionKgValue || 1)));
                        totalTheoreticalCost += weight * benchmarkUnitCost;
                    });

                    // --- Pass 2: Allocate Actual Costs Based on Theoretical Ratios ---
                    Object.entries(itemProduction).forEach(([originalName, weight]) => {
                        const normKey = normalizeName(originalName);

                        // Get item-specific benchmark
                        const simRetail = getSimForMonth(normKey, targetPrefix, 'retail');
                        const simWholesale = getSimForMonth(normKey, targetPrefix, 'wholesale');
                        const benchmarkUnitCost = simRetail ? simRetail.unit_cost : (simWholesale ? simWholesale.unit_cost : (totalExpenses / (productionKgValue || 1)));

                        // Share of the "Spend" is now weighted by complexity (Benchmark * Weight)
                        const theoreticalItemTotal = weight * benchmarkUnitCost;
                        const expenseShare = totalTheoreticalCost > 0 ? theoreticalItemTotal / totalTheoreticalCost : 0;

                        const itemAllocatedTotal = expenseShare * totalExpenses;
                        const itemUnitCost = weight > 0 ? itemAllocatedTotal / weight : 0;

                        const sales = itemSalesData[normKey] || { revenue: 0, weight: 0, minPrice: Infinity, maxPrice: -Infinity };
                        usedSalesKeys.add(normKey);

                        const itemAsp = sales.weight > 0 ? sales.revenue / sales.weight : 0;
                        const itemProfitPerKg = itemAsp > 0 ? (itemAsp - itemUnitCost) : (0 - itemUnitCost);
                        const itemMargin = itemAsp > 0 ? (itemProfitPerKg / itemAsp) * 100 : 0;

                        breakdown.push({
                            name: originalName,
                            weight,
                            share: productionKgValue > 0 ? weight / productionKgValue : 0, // Keep production share for volume context
                            allocatedCost: itemAllocatedTotal,
                            materials: expenseShare * materialsCost,
                            labour: expenseShare * labour,
                            packaging: expenseShare * packaging,
                            bills: expenseShare * bills,
                            other: expenseShare * other,
                            marketing: expenseShare * marketing,
                            asp: itemAsp,
                            minPrice: sales.minPrice === Infinity ? 0 : sales.minPrice,
                            maxPrice: sales.maxPrice === -Infinity ? 0 : sales.maxPrice,
                            profitPerKg: itemProfitPerKg,
                            margin: itemMargin,
                            revenue: sales.revenue,
                            qty: sales.weight,
                            isProduct: true
                        });
                    });

                    // 2. Add Unmatched Sales (Traded items or items without production logs)
                    Object.entries(itemSalesData).forEach(([normKey, data]) => {
                        if (!usedSalesKeys.has(normKey) && data.revenue > 10) {
                            const name = Array.from(data.originalNames)[0];
                            const itemAsp = data.weight > 0 ? data.revenue / data.weight : 0;

                            const simRetail = getSimForMonth(normKey, targetPrefix, 'retail');
                            const simWholesale = getSimForMonth(normKey, targetPrefix, 'wholesale');
                            const benchmarkCost = simRetail ? simRetail.unit_cost : (simWholesale ? simWholesale.unit_cost : 0);

                            const itemProfitPerKg = itemAsp > 0 ? (itemAsp - benchmarkCost) : 0;
                            const itemMargin = itemAsp > 0 ? (itemProfitPerKg / itemAsp) * 100 : 0;

                            breakdown.push({
                                name: name,
                                weight: 0,
                                share: 0,
                                allocatedCost: 0,
                                materials: 0,
                                labour: 0,
                                packaging: 0,
                                bills: 0,
                                other: 0,
                                marketing: 0,
                                asp: itemAsp,
                                minPrice: data.minPrice === Infinity ? 0 : data.minPrice,
                                maxPrice: data.maxPrice === -Infinity ? 0 : data.maxPrice,
                                profitPerKg: itemProfitPerKg,
                                margin: itemMargin,
                                revenue: data.revenue,
                                qty: data.weight,
                                isProduct: false
                            });
                        }
                    });

                    return breakdown;
                })(),
                netProfit,
                margin,
                costPerKg,
                revenuePerKg,
                yieldPercent,
                isActive: revenue > 0 || totalExpenses > 0 || effectiveOutput > 0 || purchasesKgValue > 0 || productionInputKgValue > 0
            };
        });

        // Add MoM Growth and Unit Economics Trends
        return aggregated.map((curr, idx, arr) => {
            const prev = idx > 0 ? arr[idx - 1] : null;
            const hasPrev = prev && prev.isActive;

            return {
                ...curr,
                growth: {
                    revenue: hasPrev && prev.revenue > 0 ? ((curr.revenue - prev.revenue) / prev.revenue) * 100 : 0,
                    production: hasPrev && prev.productionKg > 0 ? ((curr.productionKg - prev.productionKg) / prev.productionKg) * 100 : 0,
                    profit: hasPrev && Math.abs(prev.netProfit) > 0 ? ((curr.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100 : 0
                }
            };
        });
    }, [selectedYear, transactions, productionData, invoiceDiscounts, simHistory]);

    const cumulativeAnalysis = useMemo(() => {
        if (!selectedYear) return { revenue: 0, expenses: 0, profit: 0, actualROI: 0, targetROI: 0, diffYears: 0, isOnTrack: false };

        const yearsToInclude = [];
        for (let y = 2025; y <= Number(selectedYear); y++) {
            yearsToInclude.push(String(y));
        }

        let totalRev = 0;
        let totalExp = 0;

        yearsToInclude.forEach(yr => {
            monthNames.forEach((month, index) => {
                const numMonth = String(index + 1).padStart(2, '0');
                const targetPrefix = `${yr}-${numMonth}`;

                // Skip Jan 2025 (inception is Feb 2025)
                if (yr === '2025' && numMonth === '01') return;

                const monthTxns = transactions ? transactions.filter(t => t.parsedDate && t.parsedDate.startsWith(targetPrefix)) : [];
                if (monthTxns.length === 0) return;

                // Gross Sales
                const allSales = monthTxns.filter(t =>
                    String(t.parsedType).toLowerCase().includes('sale') &&
                    !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
                );
                const salesReturns = monthTxns.filter(t =>
                    t.parsedType === 'Sales Return' &&
                    !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
                );
                const salesSummaryRows = allSales.filter(t => String(t.parsedType || '').toLowerCase() === 'sales summary' && t.parsedType !== 'Sales Return');
                const salesAppearsGranular = allSales.filter(t => {
                    const type = String(t.parsedType || '').toLowerCase();
                    const desc = String(t.originalDesc || '').toLowerCase();
                    if (type === 'sales summary' || type === 'profitsummary' || type === 'invoice total' || type === 'sales return') return false;
                    const keywordsToExclude = ['subtotal', 'sub total', 'taxable', 'net amount', 'gross amount', 'round off', 'rounded off', 'roundoff', 'gst', 'total'];
                    const isCreditNote = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || desc.includes('cn');
                    if (isCreditNote) return true;
                    if (keywordsToExclude.some(k => desc.includes(k))) return false;
                    return true;
                });

                let selectedSalesRows = [];
                if (monthTxns.filter(t => t.parsedType === 'Invoice Total').length === 0 && salesAppearsGranular.length === 0) {
                    selectedSalesRows = salesSummaryRows;
                } else {
                    selectedSalesRows = salesAppearsGranular;
                }

                const uniqueSalesMap = new Map();
                selectedSalesRows.forEach(t => {
                    const key = t.id || `${t.invoiceNo}-${t.parsedDate}-${t.parsedAmount}-${t.originalDesc}`;
                    if (!uniqueSalesMap.has(key)) uniqueSalesMap.set(key, t);
                });
                const finalSales = Array.from(uniqueSalesMap.values());
                const grossRevenue = finalSales.reduce((acc, t) => acc + Math.abs(parseFloat(t.parsedAmount || 0)), 0);
                const returnRevenue = salesReturns.reduce((acc, t) => acc + Math.abs(parseFloat(t.parsedAmount || 0)), 0);

                const monthDiscounts = invoiceDiscounts.filter(d => d.discount_date && d.discount_date.startsWith(targetPrefix));
                const discountRevenue = monthDiscounts.reduce((acc, d) => acc + (parseFloat(d.discount_amount) || 0), 0);

                totalRev += (grossRevenue - returnRevenue - discountRevenue);

                // Expenses
                const expenses = monthTxns.filter(t => String(t.parsedType).toLowerCase().includes('expense') || t.parsedType === 'Purchase');
                totalExp += expenses.reduce((acc, t) => acc + parseFloat(t.parsedAmount || 0), 0);
            });
        });

        const profit = totalRev - totalExp;
        const actualROI = totalInvestedCapital > 0 ? (profit / totalInvestedCapital * 100) : 0;
        
        // Target ROI based on diff years since Feb 2025
        const startMonth = new Date('2025-02-01');
        const endMonth = new Date(`${selectedYear}-12-31`);
        const diffTime = Math.abs(endMonth - startMonth);
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        const targetROI = diffYears * 15; // 15% annual target
        const isOnTrack = actualROI >= targetROI;

        return {
            revenue: totalRev,
            expenses: totalExp,
            profit,
            actualROI,
            targetROI,
            diffYears,
            isOnTrack
        };
    }, [selectedYear, transactions, invoiceDiscounts, totalInvestedCapital]);

    // Set default analysis month to the latest active month
    React.useEffect(() => {
        if (!selectedAnalysisMonth && yearlyData.length > 0) {
            const activeMonths = yearlyData.filter(d => d.isActive);
            if (activeMonths.length > 0) {
                setSelectedAnalysisMonth(activeMonths[activeMonths.length - 1].name);
            }
        }
    }, [yearlyData, selectedAnalysisMonth]);

    const quarterlyData = useMemo(() => {
        const quarters = [
            { name: 'Q1', months: ['Jan', 'Feb', 'Mar'] },
            { name: 'Q2', months: ['Apr', 'May', 'Jun'] },
            { name: 'Q3', months: ['Jul', 'Aug', 'Sep'] },
            { name: 'Q4', months: ['Oct', 'Nov', 'Dec'] }
        ];

        return quarters.map(q => {
            const months = yearlyData.filter(m => q.months.includes(m.name));
            const revenue = months.reduce((s, m) => s + m.revenue, 0);
            const expenses = months.reduce((s, m) => s + m.expenses, 0);
            const profit = revenue - expenses;
            const production = months.reduce((s, m) => s + m.productionKg, 0);

            return {
                name: q.name,
                revenue,
                expenses,
                profit,
                production,
                isActive: revenue > 0 || expenses > 0 || production > 0
            };
        });
    }, [yearlyData]);

    const totalStats = useMemo(() => {
        return yearlyData.reduce((acc, curr) => ({
            revenue: acc.revenue + curr.revenue,
            expenses: acc.expenses + curr.expenses,
            profit: acc.profit + curr.netProfit,
            production: acc.production + curr.productionKg,
            sales: acc.sales + curr.salesKg,
            purchases: acc.purchases + curr.purchasesKg,
            peeled: acc.peeled + curr.peeledKg
        }), { revenue: 0, expenses: 0, profit: 0, production: 0, sales: 0, purchases: 0, peeled: 0 });
    }, [yearlyData]);

    const bestMonth = useMemo(() => {
        const active = yearlyData.filter(d => d.isActive);
        if (active.length === 0) return null;
        return active.reduce((max, curr) => curr.netProfit > max.netProfit ? curr : max, active[0]);
    }, [yearlyData]);

    const recommendations = useMemo(() => {
        const recs = [];
        const activeMonths = yearlyData.filter(d => d.isActive);
        if (activeMonths.length < 1) return [];

        const currentMonth = activeMonths[activeMonths.length - 1];
        const prevMonth = activeMonths.length > 1 ? activeMonths[activeMonths.length - 2] : null;

        // 1. Yield Analysis (Input vs Output)
        if (currentMonth.yieldPercent > 0 && currentMonth.yieldPercent < 70) {
            recs.push({
                type: 'warning',
                title: 'Low Production Recovery',
                desc: `Recovery yield is at ${currentMonth.yieldPercent.toFixed(1)}% (Input: ${currentMonth.peeledKg.toLocaleString()}kg -> Output: ${currentMonth.productionKg.toLocaleString()}kg). Target is >70%. Check for peeling waste.`,
                icon: <AlertTriangle size={20} color="#f59e0b" />
            });
        } else if (currentMonth.yieldPercent >= 75) {
            recs.push({
                type: 'success',
                title: 'Excellent Yield Optimization',
                desc: `Great job! Production recovery is at ${currentMonth.yieldPercent.toFixed(1)}%. Production efficiency is high this month.`,
                icon: <CheckCircle size={20} color="#10b981" />
            });
        }

        // 2. Cost Analysis
        if (prevMonth && currentMonth.costPerKg > prevMonth.costPerKg * 1.1) {
            recs.push({
                type: 'danger',
                title: 'Rising Production Cost',
                desc: `Cost per kg increased by ${((currentMonth.costPerKg / prevMonth.costPerKg - 1) * 100).toFixed(1)}% compared to last month. Investigate spikes in raw material or labor expenses.`,
                icon: <TrendingUp size={20} color="#ef4444" />
            });
        }

        // 3. Margin Analysis
        if (currentMonth.margin < 15 && currentMonth.revenue > 0) {
            recs.push({
                type: 'warning',
                title: 'Thin Profit Margins',
                desc: `Profit margin is currently ${currentMonth.margin.toFixed(1)}%. Consider adjusting the Average Selling Price (ASP) or optimizing variable costs.`,
                icon: <Activity size={20} color="#f59e0b" />
            });
        }

        // 4. Sales/ASP Insight
        if (currentMonth.salesKg > 0) {
            const asp = currentMonth.revenue / currentMonth.salesKg;
            if (activeMonths.length > 3) {
                const avgAsp = activeMonths.slice(0, -1).reduce((s, m) => s + (m.revenue / (m.salesKg || 1)), 0) / (activeMonths.length - 1);
                if (asp < avgAsp * 0.9) {
                    recs.push({
                        type: 'info',
                        title: 'ASP Deviation Detected',
                        desc: `Average Selling Price (₹${asp.toFixed(0)}) is lower than recent trends. Check for increased discounts or product mix changes.`,
                        icon: <Info size={20} color="#3b82f6" />
                    });
                }
            }
        }

        return recs;
    }, [yearlyData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.25rem 0', color: entry.color, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                            <span>{entry.name}:</span>
                            <span style={{ fontWeight: 600 }}>
                                {entry.name?.includes('Kg') || entry.name?.includes('Production') || entry.name?.includes('Purchases') || entry.name?.includes('Input')
                                    ? entry.value.toLocaleString() + ' kg'
                                    : (entry.name?.includes('%') ? entry.value.toFixed(1) + '%' : formatCurrency(entry.value))}
                            </span>
                        </p>
                    ))}
                    {payload.find(p => p.name === 'Revenue') && payload.find(p => p.name === 'Expenses') && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>Net Profit:</span>
                            <span style={{ color: (payload[0]?.payload?.netProfit || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                {formatCurrency(payload[0]?.payload?.netProfit || 0)}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };
    const yearlyProcurementData = useMemo(() => {
        if (!purchaseData || purchaseData.length === 0) return {
            filteredPurchases: [],
            totalSpent: 0,
            totalWeight: 0,
            materialGroups: [],
            materialStats: {},
            supplierSummary: [],
            trendData: [],
            priceTrendData: [],
            varietyStats: []
        };

        // Filter purchases strictly for the selectedYear
        const yearPurchases = purchaseData.filter(item => {
            const dateStr = item.parsedDate || item.date || '';
            if (!dateStr.startsWith(selectedYear)) return false;

            const inv = String(item.invoiceNo || item.invoice_no || '').trim().toUpperCase();
            const desc = ((item.originalDesc || '') + ' ' + (item.supplier || '') + ' ' + (item.remarks || '')).toLowerCase();
            
            const isPurchaseKeyword = item.parsedType === 'Purchase' || 
                                     desc.includes('ginger') || 
                                     desc.includes('garlic') || 
                                     desc.includes('jayakodi') || 
                                     /\bdesi\b/.test(desc) || 
                                     desc.includes('naatu');
            
            if (inv.startsWith('P')) return true;
            
            const isExpense = desc.includes('exp') || desc.includes('marketing') || desc.includes('design');
            if (isExpense) return false;
            
            return isPurchaseKeyword;
        });

        // Group by Material
        const groups = { Ginger: 0, Garlic: 0, Others: 0 };
        const stats = {
            Ginger: { cost: 0, count: 0, invoices: new Set() },
            Garlic: { cost: 0, count: 0, invoices: new Set() },
            Others: { cost: 0, count: 0, invoices: new Set() }
        };

        yearPurchases.forEach((p, idx) => {
            const str = ((p.originalDesc || '') + ' ' + (p.supplier || '') + ' ' + (p.remarks || '')).toLowerCase();
            const amt = p.parsedAmount || p.amount || 0;
            const qty = p.parsedQty || p.quantity || 0;
            const inv = p.invoiceNo || p.invoice_no || `__NO_INV_${idx}`;

            let matched = false;
            if (str.includes('ginger') || str.includes('jayakodi')) {
                groups.Ginger += qty;
                stats.Ginger.cost += amt;
                stats.Ginger.invoices.add(inv);
                matched = true;
            } else if (str.includes('garlic') || str.includes('senthil') || str.includes('svg') || str.includes('pk') || str.includes('poondu') || /\bdesi\b/.test(str) || str.includes('naatu')) {
                groups.Garlic += qty;
                stats.Garlic.cost += amt;
                stats.Garlic.invoices.add(inv);
                matched = true;
            } else {
                groups.Others += qty;
                stats.Others.cost += amt;
                stats.Others.invoices.add(inv);
            }
        });

        const totalWeight = Object.values(groups).reduce((a, b) => a + b, 0);
        const totalSpent = yearPurchases.reduce((sum, i) => sum + (i.parsedAmount || i.amount || 0), 0);

        // Convert invoice sets to counts
        Object.keys(stats).forEach(k => {
            stats[k].count = stats[k].invoices.size;
        });

        // Prepare Material Groups list
        const materialGroups = Object.entries(groups)
            .map(([name, weight]) => ({ name, weight }))
            .filter(g => g.weight > 0 || stats[g.name].cost > 0)
            .sort((a, b) => b.weight - a.weight);

        // Supplier summary
        const suppliers = yearPurchases.reduce((acc, curr) => {
            const sName = (curr.customerName || curr.originalDesc || curr.supplier || 'Unknown').toUpperCase();
            if (!acc[sName]) acc[sName] = { amount: 0, count: 0 };
            acc[sName].amount += (curr.parsedAmount || curr.amount || 0);
            acc[sName].count += 1;
            return acc;
        }, {});
        const supplierSummary = Object.entries(suppliers).sort((a, b) => b[1].amount - a[1].amount);

        // Monthly trends
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthMap = {};
        months.forEach((m, idx) => {
            monthMap[idx] = { 
                name: m, 
                GingerQty: 0, GingerCost: 0, 
                GarlicQty: 0, GarlicCost: 0, 
                OthersQty: 0, OthersCost: 0,
                totalQty: 0, totalCost: 0
            };
        });

        yearPurchases.forEach(item => {
            const dateStr = item.parsedDate || item.date;
            if (!dateStr || typeof dateStr !== 'string') return;
            const parts = dateStr.split('-'); // YYYY-MM-DD
            if (parts.length >= 2) {
                const monthIdx = parseInt(parts[1], 10) - 1;
                if (monthIdx >= 0 && monthIdx < 12) {
                    const desc = ((item.originalDesc || '') + ' ' + (item.supplier || '') + ' ' + (item.remarks || '')).toLowerCase();
                    const qty = item.parsedQty || item.quantity || 0;
                    const amt = item.parsedAmount || item.amount || 0;

                    monthMap[monthIdx].totalQty += qty;
                    monthMap[monthIdx].totalCost += amt;

                    if (desc.includes('ginger') || desc.includes('jayakodi')) {
                        monthMap[monthIdx].GingerQty += qty;
                        monthMap[monthIdx].GingerCost += amt;
                    } else if (desc.includes('garlic') || desc.includes('senthil') || desc.includes('svg') || desc.includes('pk') || desc.includes('poondu') || /\bdesi\b/.test(desc) || desc.includes('naatu')) {
                        monthMap[monthIdx].GarlicQty += qty;
                        monthMap[monthIdx].GarlicCost += amt;
                    } else {
                        monthMap[monthIdx].OthersQty += qty;
                        monthMap[monthIdx].OthersCost += amt;
                    }
                }
            }
        });

        const trendData = Object.values(monthMap);

        // Calculate Monthly Price Trends (Avg price/kg = Cost / Qty)
        const priceTrendData = trendData.map(m => ({
            name: m.name,
            GingerPrice: m.GingerQty > 0 ? Math.round(m.GingerCost / m.GingerQty) : null,
            GarlicPrice: m.GarlicQty > 0 ? Math.round(m.GarlicCost / m.GarlicQty) : null
        }));

        // Variety summary
        let varietyStats = [];
        if (summaryData && summaryData.length > 0) {
            const varGroups = {};
            summaryData.forEach(d => {
                const dDate = d.date ? new Date(d.date) : null;
                if (!dDate) return;
                const dYear = dDate.getFullYear();
                if (String(dYear) !== String(selectedYear)) return;

                const vName = d.variety.toUpperCase();
                if (!varGroups[vName]) varGroups[vName] = { qty: 0, cost: 0 };
                varGroups[vName].qty += d.quantity || 0;
                varGroups[vName].cost += d.amount || 0;
            });
            varietyStats = Object.entries(varGroups)
                .map(([name, stats]) => ({
                    name,
                    qty: stats.qty,
                    avgPrice: stats.qty > 0 ? stats.cost / stats.qty : 0,
                    cost: stats.cost
                }))
                .sort((a, b) => b.qty - a.qty);
        }

        return {
            filteredPurchases: yearPurchases.sort((a, b) => (b.parsedDate || b.date || '').localeCompare(a.parsedDate || a.date || '')),
            totalSpent,
            totalWeight,
            materialGroups,
            materialStats: stats,
            supplierSummary,
            trendData,
            priceTrendData,
            varietyStats
        };
    }, [purchaseData, summaryData, selectedYear]);

    const currentRole = localStorage.getItem('user_role') || 'staff';
    const isAdmin = currentRole === 'admin';

    return (
        <div className="animate-fade-in" style={{ color: 'var(--text-primary)' }}>
            {!hasPermission('payouts') ? (
                <div className="glass-panel" style={{ padding: '6rem 2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', margin: '2rem 0' }}>
                    <Shield size={64} color="#ef4444" style={{ marginBottom: '2rem', opacity: 0.8 }} />
                    <h2 style={{ color: '#ef4444', marginBottom: '1.5rem', fontWeight: 800, fontSize: '2rem' }}>Global Access Required</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6, fontSize: '1.1rem' }}>
                        This module contains sensitive executive financial data, including YTD performance charts, margin analysis, and profit distribution records.
                        You require <strong>Global Access</strong> permissions to view this information.
                    </p>
                    <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Please contact a Master Admin if you believe this is an error.
                    </p>
                </div>
            ) : (
                <>
                    {/* Page Headings */}
                    {!forceTab ? (
                        <h1 style={{ margin: '0 0 1.5rem 0', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                            <TrendingUp size={isMobile ? 24 : 32} color="#3b82f6" /> YTD Performance Analysis
                        </h1>
                    ) : forceTab === 'profitHub' ? (
                        <h1 style={{ margin: '0 0 1.5rem 0', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                            <Wallet size={isMobile ? 24 : 32} color="#3b82f6" /> {isMobile ? 'Profit Hub' : 'Profit Command Center'}
                        </h1>
                    ) : null}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {!forceTab && (
                                <div className="glass-panel" style={{ display: 'inline-flex', padding: '0.25rem', borderRadius: '0.5rem', background: 'var(--glass-highlight)' }}>
                                    <button
                                        onClick={() => setActiveAnalysisSubTab('performance')}
                                        style={{
                                            padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer',
                                            background: activeAnalysisSubTab === 'performance' ? 'var(--accent-primary)' : 'transparent',
                                            color: activeAnalysisSubTab === 'performance' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}
                                    >
                                        <TrendingUp size={16} /> Performance
                                    </button>
                                    <button
                                        onClick={() => setActiveAnalysisSubTab('insights')}
                                        style={{
                                            padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer',
                                            background: activeAnalysisSubTab === 'insights' ? 'var(--accent-primary)' : 'transparent',
                                            color: activeAnalysisSubTab === 'insights' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}
                                    >
                                        <Info size={16} /> Insights
                                    </button>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
                                <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>YTD Profit</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: totalStats.profit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(totalStats.profit)}</span>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Margin</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b' }}>
                                        {totalStats.revenue > 0 ? (totalStats.profit / totalStats.revenue * 100).toFixed(1) + '%' : '0%'}
                                    </span>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ROI (Cumulative)</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: cumulativeAnalysis.profit >= 0 ? '#10b981' : '#ef4444' }}>
                                        {cumulativeAnalysis.actualROI.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {activeAnalysisSubTab === 'performance' && (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={24} color="#3b82f6" />
                                    Executive YTD Analysis - {selectedYear}
                                </h2>

                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                                        style={{
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <Settings size={16} />
                                        View Settings
                                        {showSettingsDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>

                                    {showSettingsDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '0.5rem',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.75rem',
                                            padding: '1rem',
                                            zIndex: 1000,
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                            minWidth: '220px'
                                        }}>
                                            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toggle Sections</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                                {/* KPIs */}
                                                <div>
                                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>KPI CARDS</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showTotalRev} onChange={() => setViewSettings({ ...viewSettings, showTotalRev: !viewSettings.showTotalRev })} /> Total YTD Revenue
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showTotalExp} onChange={() => setViewSettings({ ...viewSettings, showTotalExp: !viewSettings.showTotalExp })} /> Total YTD Expenses
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showNetProfit} onChange={() => setViewSettings({ ...viewSettings, showNetProfit: !viewSettings.showNetProfit })} /> Net YTD Profit
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showYtdProd} onChange={() => setViewSettings({ ...viewSettings, showYtdProd: !viewSettings.showYtdProd })} /> YTD Production
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Performance Options */}
                                                <div>
                                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>PERFORMANCE</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showQuarterly} onChange={() => setViewSettings({ ...viewSettings, showQuarterly: !viewSettings.showQuarterly })} /> Quarterly Summary
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showRecommendations} onChange={() => setViewSettings({ ...viewSettings, showRecommendations: !viewSettings.showRecommendations })} /> Strategic Recommendations
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Charts */}
                                                <div>
                                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CHARTS & TRENDS</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showFinancialTrends} onChange={() => setViewSettings({ ...viewSettings, showFinancialTrends: !viewSettings.showFinancialTrends })} /> Financial Trends
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showGrowthTrends} onChange={() => setViewSettings({ ...viewSettings, showGrowthTrends: !viewSettings.showGrowthTrends })} /> Growth Trends
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showUnitEconomics} onChange={() => setViewSettings({ ...viewSettings, showUnitEconomics: !viewSettings.showUnitEconomics })} /> Unit Economics
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showExpenseComp} onChange={() => setViewSettings({ ...viewSettings, showExpenseComp: !viewSettings.showExpenseComp })} /> Expense Composition
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showProdYield} onChange={() => setViewSettings({ ...viewSettings, showProdYield: !viewSettings.showProdYield })} /> Production & Yield
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Tables */}
                                                <div>
                                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TABLES</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showEfficiencyBench} onChange={() => setViewSettings({ ...viewSettings, showEfficiencyBench: !viewSettings.showEfficiencyBench })} /> Efficiency Benchmarks
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={viewSettings.showItemAnalysis} onChange={() => setViewSettings({ ...viewSettings, showItemAnalysis: !viewSettings.showItemAnalysis })} /> Itemized Cost Analysis
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {activeAnalysisSubTab === 'performance' && (
                        <>
                            {/* Executive ROI & Investment Analytics (Since Inception) */}
                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
                                            <TrendingUp size={22} color="#10b981" />
                                            Executive ROI & Investment Analytics (Since Inception)
                                        </h3>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Inception: Feb 2025 • Target: 15% Annualized ROI
                                        </p>
                                    </div>
                                    <div style={{
                                        padding: '0.35rem 0.85rem',
                                        borderRadius: '2rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        background: cumulativeAnalysis.isOnTrack ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                        color: cumulativeAnalysis.isOnTrack ? '#10b981' : '#f59e0b',
                                        border: `1px solid ${cumulativeAnalysis.isOnTrack ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                    }}>
                                        {cumulativeAnalysis.isOnTrack ? '✓ ON TRACK' : '⚠ BEHIND TARGET'}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '2rem' }}>
                                    {/* Cumulative KPI Area */}
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Invested Capital</span>
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.25rem 0', color: 'var(--text-primary)' }}>{formatCurrency(totalInvestedCapital)}</h3>
                                            </div>
                                            <div style={{ background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Cumulative Net Profit</span>
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.25rem 0', color: cumulativeAnalysis.profit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(cumulativeAnalysis.profit)}</h3>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cumulative ROI Percentage</span>
                                            <h1 style={{ fontSize: '3rem', fontWeight: '800', color: cumulativeAnalysis.profit >= 0 ? '#10b981' : '#ef4444', margin: '0.25rem 0' }}>
                                                {cumulativeAnalysis.actualROI.toFixed(1)}%
                                            </h1>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Annualized Target: {cumulativeAnalysis.targetROI.toFixed(1)}% ({cumulativeAnalysis.diffYears.toFixed(1)} Years)
                                            </span>
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                <span>Inception ROI Progress</span>
                                                <span>Target: {cumulativeAnalysis.targetROI.toFixed(1)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    width: `${Math.min(100, Math.max(0, cumulativeAnalysis.targetROI > 0 ? (cumulativeAnalysis.actualROI / cumulativeAnalysis.targetROI) * 100 : 0))}%`, 
                                                    height: '100%', 
                                                    background: cumulativeAnalysis.profit >= 0 ? 'linear-gradient(90deg, #10b981, #3b82f6)' : '#ef4444',
                                                    borderRadius: '4px',
                                                    transition: 'width 0.5s ease-out'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Partner-wise Breakdown Table */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Partner-wise Investment & Return Breakdown</h4>
                                        <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.1)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                                                        <th style={{ padding: '0.75rem' }}>Partner</th>
                                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Invested Capital</th>
                                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Profit Share</th>
                                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cumulative Return</th>
                                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Partner ROI</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {profitStakeholders.map((s, idx) => {
                                                        const cap = partnerInvestmentsMap[s.id] || 0;
                                                        const profitSharePct = Number(s.default_percent) || 0;
                                                        const partnerProfit = (profitSharePct / 100) * cumulativeAnalysis.profit;
                                                        const partnerROI = cap > 0 ? (partnerProfit / cap * 100) : 0;

                                                        return (
                                                            <tr key={idx} style={{ borderBottom: idx < profitStakeholders.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                                                                <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)' }}>{formatCurrency(cap)}</td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#3b82f6', fontWeight: 500 }}>{profitSharePct.toFixed(1)}%</td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right', color: partnerProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 500 }}>{formatCurrency(partnerProfit)}</td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right', color: partnerROI >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{partnerROI.toFixed(1)}%</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {profitStakeholders.length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No stakeholder data available.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quarterly Summary Section */}
                            {viewSettings.showQuarterly && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <Calendar size={18} color="#3b82f6" />
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Quarterly Performance</h3>
                                    </div>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                                        gap: isMobile ? '0.75rem' : '1.5rem' 
                                    }}>
                                        {quarterlyData.map(q => (
                                            <div key={q.name} className="glass-panel" style={{ padding: '1.25rem', opacity: q.isActive ? 1 : 0.5 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{q.name}</span>
                                                    {q.isActive && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '0.2rem 0.5rem',
                                                            background: q.profit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            color: q.profit >= 0 ? '#10b981' : '#ef4444',
                                                            borderRadius: '1rem',
                                                            border: `1px solid ${q.profit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                        }}>
                                                            {q.profit >= 0 ? 'Profitable' : 'Loss'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)' }}>Revenue:</span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(q.revenue)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)' }}>Profit:</span>
                                                        <span style={{ color: q.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{formatCurrency(q.profit)}</span>
                                                    </div>
                                                    <div style={{
                                                        marginTop: '0.5rem',
                                                        height: '4px',
                                                        background: 'var(--glass-border)',
                                                        borderRadius: '2px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: q.revenue > 0 ? `${Math.min((q.profit / q.revenue) * 100, 100)}%` : '0%',
                                                            background: '#10b981'
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Header Totals */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                                {viewSettings.showTotalRev && (
                                    <div className="glass-panel" style={{ padding: '1.25rem', flex: '1 1 min(100%, 250px)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <DollarSign size={14} /> Total YTD Revenue
                                        </p>
                                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#10b981' }}>{formatCurrency(totalStats.revenue)}</h3>
                                    </div>
                                )}
                                {viewSettings.showTotalExp && (
                                    <div className="glass-panel" style={{ padding: '1.25rem', flex: '1 1 min(100%, 250px)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Activity size={14} /> Total YTD Expenses
                                        </p>
                                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#ef4444' }}>{formatCurrency(totalStats.expenses)}</h3>
                                    </div>
                                )}
                                {viewSettings.showNetProfit && (
                                    <div className="glass-panel" style={{ padding: '1.25rem', flex: '1 1 min(100%, 250px)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <TrendingUp size={14} /> Net YTD Profit
                                        </p>
                                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: totalStats.profit >= 0 ? '#10b981' : '#f59e0b' }}>
                                            {formatCurrency(totalStats.profit)}
                                        </h3>
                                    </div>
                                )}
                                {viewSettings.showYtdProd && (
                                    <div className="glass-panel" style={{ padding: '1.25rem', flex: '1 1 min(100%, 250px)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Wheat size={14} /> YTD Production
                                        </p>
                                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-primary)' }}>
                                            {totalStats.production.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>kg</span>
                                        </h3>
                                    </div>
                                )}
                            </div>

                            {/* Strategic Recommendations */}
                            {viewSettings.showRecommendations && recommendations.length > 0 && (
                                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem' }}>
                                        <Target size={20} color="#3b82f6" />
                                        Strategic Recommendations
                                    </h3>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
                                        gap: '1rem' 
                                    }}>
                                        {recommendations.map((rec, idx) => (
                                            <div key={idx} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                padding: '1rem',
                                                borderRadius: '0.75rem',
                                                border: '1px solid var(--glass-border)',
                                                display: 'flex',
                                                gap: '1rem',
                                                alignItems: 'flex-start'
                                            }}>
                                                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                                    {rec.icon}
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600 }}>{rec.title}</h4>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{rec.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flexbox container for ALL charts/tables so they auto-flow visually */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>

                                {/* Financial Trend */}
                                {viewSettings.showFinancialTrends && (
                                    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 min(100%, 500px)' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <TrendingUp size={18} color="#3b82f6" />
                                            Financial Trends
                                        </h3>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <ComposedChart data={yearlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: 12 }} />
                                                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} opacity={0.8} />
                                                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Growth Trends */}
                                {viewSettings.showGrowthTrends && (
                                    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 min(100%, 500px)' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <TrendingUp size={18} color="#10b981" />
                                            Month-over-Month Growth
                                        </h3>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <AreaChart data={yearlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: 12 }} />
                                                    <Area type="monotone" dataKey="growth.revenue" name="Rev Growth %" stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" strokeWidth={2} />
                                                    <Area type="monotone" dataKey="growth.production" name="Prod Growth %" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.1)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Unit Economics Chart */}
                                {viewSettings.showUnitEconomics && (
                                    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 min(100%, 500px)' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <DollarSign size={18} color="#3b82f6" />
                                            Unit Economics (₹ / kg)
                                        </h3>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <LineChart data={yearlyData.filter(d => d.isActive)} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: 12 }} />
                                                    <Line type="monotone" dataKey="revenuePerKg" name="ASP (Price/kg)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                                    <Line type="monotone" dataKey="costPerKg" name="Production Cost/kg" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Expense Composition Chart */}
                                {viewSettings.showExpenseComp && (
                                    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 min(100%, 500px)' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <Activity size={18} color="#ef4444" />
                                            Expense Composition
                                        </h3>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <AreaChart data={yearlyData.filter(d => d.isActive)} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: 12 }} />
                                                    <Area type="monotone" dataKey="materials" stackId="1" name="Materials" stroke="#3b82f6" fill="#3b82f6" opacity={0.6} />
                                                    <Area type="monotone" dataKey="labour" stackId="1" name="Labour" stroke="#10b981" fill="#10b981" opacity={0.6} />
                                                    <Area type="monotone" dataKey="packaging" stackId="1" name="Packaging" stroke="#f59e0b" fill="#f59e0b" opacity={0.6} />
                                                    <Area type="monotone" dataKey="bills" stackId="1" name="Bills" stroke="#ef4444" fill="#ef4444" opacity={0.6} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Production Trend */}
                                {viewSettings.showProdYield && (
                                    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 min(100%, 500px)' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <Wheat size={18} color="#f59e0b" />
                                            Production & Yield Trends
                                        </h3>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <ComposedChart data={yearlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: 12 }} />
                                                    <Bar yAxisId="left" dataKey="productionKg" name="Paste Output (kg)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={25} />
                                                    <Line yAxisId="right" type="monotone" dataKey="yieldPercent" name="Yield %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Efficiency Analysis Table (Mini) */}
                                {viewSettings.showEfficiencyBench && (
                                    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 min(100%, 500px)' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <Target size={18} color="#3b82f6" />
                                            Key Efficiency Benchmarks
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {yearlyData.filter(d => d.isActive).slice(-3).reverse().map((m, idx) => (
                                                <div key={idx} style={{
                                                    padding: '1rem',
                                                    background: 'var(--glass-highlight)',
                                                    borderRadius: '0.75rem',
                                                    border: '1px solid var(--glass-border)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                        <span style={{ fontWeight: 600 }}>{m.name} {selectedYear}</span>
                                                        <span style={{ color: m.yieldPercent >= 70 ? 'var(--green-text)' : 'var(--amber-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                                                            {m.yieldPercent.toFixed(1)}% Yield
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ASP</p>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--green-text)' }}>₹{m.revenuePerKg.toFixed(1)}/kg</p>
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Production Cost</p>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)' }}>₹{m.costPerKg.toFixed(1)}/kg</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Itemized Production Cost Analysis Table */}
                            {viewSettings.showItemAnalysis && (
                                <div className="glass-panel" style={{
                                    marginBottom: '2rem',
                                    overflow: 'hidden',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--glass-border)',
                                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)'
                                }}>
                                    <div style={{ 
                                        padding: '1.5rem', 
                                        borderBottom: '1px solid var(--glass-border)', 
                                        display: 'flex', 
                                        flexDirection: isMobile ? 'column' : 'row',
                                        justifyContent: 'space-between', 
                                        alignItems: isMobile ? 'flex-start' : 'center',
                                        gap: isMobile ? '1rem' : '0'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                <Factory size={isMobile ? 18 : 22} color="#f59e0b" />
                                                {isMobile ? 'Production Analysis' : `Production Cost & Margin Analysis ${analysisViewMode === 'monthly' ? `- ${selectedAnalysisMonth}` : `(${selectedYear})`}`}
                                            </h3>

                                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                                <button
                                                    onClick={() => setAnalysisViewMode('monthly')}
                                                    style={{
                                                        padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer',
                                                        background: analysisViewMode === 'monthly' ? '#3b82f6' : 'transparent',
                                                        color: analysisViewMode === 'monthly' ? 'white' : 'var(--text-secondary)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >Monthly</button>
                                                <button
                                                    onClick={() => setAnalysisViewMode('yearly')}
                                                    style={{
                                                        padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer',
                                                        background: analysisViewMode === 'yearly' ? '#3b82f6' : 'transparent',
                                                        color: analysisViewMode === 'yearly' ? 'white' : 'var(--text-secondary)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >Yearly</button>
                                            </div>
                                        </div>

                                        {analysisViewMode === 'monthly' && (
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '0.4rem', 
                                                overflowX: 'auto', 
                                                maxWidth: isMobile ? '100%' : '400px', 
                                                paddingBottom: '5px',
                                                msOverflowStyle: 'none',
                                                scrollbarWidth: 'none'
                                            }}>
                                                {yearlyData.filter(m => m.isActive).map(m => (
                                                    <button
                                                        key={m.name}
                                                        onClick={() => setSelectedAnalysisMonth(m.name)}
                                                        style={{
                                                            padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.5rem',
                                                            border: `1px solid ${selectedAnalysisMonth === m.name ? '#3b82f6' : 'var(--glass-border)'}`,
                                                            background: selectedAnalysisMonth === m.name ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                            color: selectedAnalysisMonth === m.name ? '#3b82f6' : 'var(--text-secondary)',
                                                            cursor: 'pointer', whiteSpace: 'nowrap',
                                                            fontWeight: selectedAnalysisMonth === m.name ? 700 : 400
                                                        }}
                                                    >{m.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ overflowX: 'auto', background: 'var(--glass-highlight)', borderRadius: '12px', border: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '1400px', tableLayout: 'auto' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--glass-highlight)' }}>
                                                    <th colSpan={2} style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid var(--glass-border)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ITEM INFO</th>
                                                    <th colSpan={5} style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--amber-text)', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid var(--amber-border)', background: 'var(--amber-bg)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ACTUAL PRODUCTION COSTS</th>
                                                    <th colSpan={4} style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--blue-text)', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid var(--blue-border)', background: 'var(--blue-bg)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SIMULATOR BENCHMARKS (LATEST)</th>
                                                    <th colSpan={4} style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--green-text)', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid var(--green-border)', background: 'var(--green-bg)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MARKET PERFORMANCE</th>
                                                </tr>
                                                <tr>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'left', letterSpacing: '0.02em' }}>ITEM NAME</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', letterSpacing: '0.02em' }}>PROD (KG)</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--amber-border-bold)', borderLeft: '2px solid var(--amber-border)', color: 'var(--amber-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--amber-bg)', letterSpacing: '0.02em' }}>TOTAL ACTUAL</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--amber-border-bold)', color: 'var(--amber-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--amber-bg)', letterSpacing: '0.02em' }}>MATERIALS</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--amber-border-bold)', color: 'var(--amber-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--amber-bg)', letterSpacing: '0.02em' }}>LABOUR</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--amber-border-bold)', color: 'var(--amber-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--amber-bg)', letterSpacing: '0.02em' }}>PACKING</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--amber-border-bold)', color: 'var(--amber-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--amber-bg)', letterSpacing: '0.02em' }}>OVERHEADS</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--blue-border-bold)', borderLeft: '2px solid var(--blue-border)', color: 'var(--blue-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--blue-bg)', letterSpacing: '0.02em' }}>PROD COST (SIM)</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--blue-border-bold)', color: 'var(--blue-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--blue-bg)', letterSpacing: '0.02em' }}>REC RETAIL</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--blue-border-bold)', color: 'var(--blue-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--blue-bg)', letterSpacing: '0.02em' }}>REC W.SALE</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--blue-border-bold)', color: 'var(--blue-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--blue-bg)', letterSpacing: '0.02em' }}>SIM MARGIN %</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--green-border-bold)', borderLeft: '2px solid var(--green-border)', color: 'var(--green-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--green-bg)', letterSpacing: '0.02em' }}>AVG SELLING PRICE</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--green-border-bold)', color: 'var(--green-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--green-bg)', letterSpacing: '0.02em' }}>UNIT COST</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--green-border-bold)', color: 'var(--green-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--green-bg)', letterSpacing: '0.02em' }}>PROFIT/KG</th>
                                                    <th style={{ padding: '1.25rem 0.5rem', borderBottom: '2px solid var(--green-border-bold)', color: 'var(--green-text)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right', background: 'var(--green-bg)', letterSpacing: '0.02em' }}>ACTUAL MARGIN %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    let totalRev = 0;
                                                    let totalSimProfit = 0;
                                                    let totalSimRevForMargin = 0;
                                                    let totalActualCost = 0;
                                                    let totalAllocated = 0;
                                                    let totalMaterials = 0;
                                                    let totalLabour = 0;
                                                    let totalPackaging = 0;
                                                    let totalOverheads = 0;
                                                    let totalWeightProduced = 0;
                                                    let totalWeightSold = 0;
                                                    let totalSimCostVal = 0;
                                                    let totalSimRetailVal = 0;
                                                    let totalSimWholesaleVal = 0;

                                                    const aggregatedItems = {};
                                                    const dataToProcess = analysisViewMode === 'yearly'
                                                        ? yearlyData
                                                        : yearlyData.filter(m => m.name === selectedAnalysisMonth);

                                                    dataToProcess.forEach(m => {
                                                        if (m.itemBreakdown) {
                                                            m.itemBreakdown.forEach(item => {
                                                                if (!aggregatedItems[item.name]) {
                                                                    aggregatedItems[item.name] = { weight: 0, allocatedCost: 0, materials: 0, labour: 0, packaging: 0, bills: 0, other: 0, marketing: 0, revenue: 0, weightSold: 0, minPrice: Infinity, maxPrice: -Infinity };
                                                                }
                                                                aggregatedItems[item.name].weight += item.weight;
                                                                aggregatedItems[item.name].allocatedCost += item.allocatedCost;
                                                                aggregatedItems[item.name].materials += item.materials;
                                                                aggregatedItems[item.name].labour += item.labour;
                                                                aggregatedItems[item.name].packaging += (item.packaging || 0);
                                                                aggregatedItems[item.name].bills += (item.bills || 0);
                                                                aggregatedItems[item.name].other += (item.other || 0);
                                                                aggregatedItems[item.name].marketing += (item.marketing || 0);
                                                                aggregatedItems[item.name].revenue += (item.revenue || 0);
                                                                aggregatedItems[item.name].weightSold += (item.qty || 0);
                                                                if (item.minPrice > 0) aggregatedItems[item.name].minPrice = Math.min(aggregatedItems[item.name].minPrice, item.minPrice);
                                                                if (item.maxPrice > 0) aggregatedItems[item.name].maxPrice = Math.max(aggregatedItems[item.name].maxPrice, item.maxPrice);
                                                            });
                                                        }
                                                    });

                                                    const rows = Object.entries(aggregatedItems)
                                                        .sort((a, b) => b[1].weight - a[1].weight)
                                                        .map(([name, data]) => {
                                                            const normName = normalizeName(name);

                                                            // Calculate metrics from aggregated data
                                                            const itemAsp = data.weightSold > 0 ? data.revenue / data.weightSold : 0;
                                                            const itemUnitCost = data.weight > 0 ? data.allocatedCost / data.weight : 0;
                                                            const itemProfitPerKg = itemAsp - itemUnitCost;
                                                            const itemMargin = itemAsp > 0 ? (itemProfitPerKg / itemAsp) * 100 : 0;

                                                            // Determine target month for simulation lookup
                                                            const targetMonthStr = analysisViewMode === 'monthly' && selectedAnalysisMonth
                                                                ? `${selectedYear}-${String(monthNames.indexOf(selectedAnalysisMonth) + 1).padStart(2, '0')}`
                                                                : `${selectedYear}-12`; // For yearly, use latest available in that year

                                                            const simRetail = getSimForMonth(normName, targetMonthStr, 'retail', true);
                                                            const simWholesale = getSimForMonth(normName, targetMonthStr, 'wholesale', true);
                                                            const simCost = simRetail ? simRetail.unit_cost : (simWholesale ? simWholesale.unit_cost : null);
                                                            const currentSimRetail = simRetail?.suggested_price || 0;
                                                            const currentSimWholesale = simWholesale?.suggested_price || 0;

                                                            // Determine generation date for display
                                                            const benchmarkDateObj = simRetail || simWholesale;
                                                            const benchmarkDate = benchmarkDateObj?.created_at
                                                                ? new Date(benchmarkDateObj.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                                                : null;

                                                            totalRev += data.revenue;
                                                            totalWeightSold += data.weightSold;
                                                            totalWeightProduced += data.weight;
                                                            totalActualCost += data.allocatedCost;
                                                            totalAllocated += data.allocatedCost;
                                                            totalMaterials += (data.materials || 0);
                                                            totalLabour += (data.labour || 0);
                                                            totalPackaging += (data.packaging || 0);
                                                            totalOverheads += (data.bills || 0) + (data.other || 0) + (data.marketing || 0);

                                                            if (simCost) {
                                                                totalSimProfit += data.revenue - (data.weightSold * simCost);
                                                                totalSimRevForMargin += data.revenue;
                                                                totalSimCostVal += data.weightSold * simCost;
                                                                totalSimRetailVal += data.weightSold * currentSimRetail;
                                                                totalSimWholesaleVal += data.weightSold * currentSimWholesale;
                                                            }

                                                            return (
                                                                <tr key={name} className="analysis-row" style={{ borderBottom: '1px solid var(--glass-border)', background: 'transparent' }}>
                                                                    <td style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{name}</td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{data.weight >= 1000 ? (data.weight / 1000).toFixed(2) + 't' : data.weight.toLocaleString() + 'kg'}</td>

                                                                    {/* Actual Spend Section - Amber */}
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--amber-text)', fontWeight: 600, background: 'var(--amber-bg)', borderLeft: '2px solid var(--amber-border)' }}>{formatCurrency(data.allocatedCost)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--amber-text)', opacity: 0.8, background: 'var(--amber-bg)' }}>{formatCurrency(data.materials)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--amber-text)', opacity: 0.8, background: 'var(--amber-bg)' }}>{formatCurrency(data.labour)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--amber-text)', opacity: 0.8, background: 'var(--amber-bg)' }}>{formatCurrency(data.packaging)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--amber-text)', opacity: 0.8, background: 'var(--amber-bg)' }}>{formatCurrency((data.bills || 0) + (data.other || 0) + (data.marketing || 0))}</td>

                                                                    {/* Simulator Columns - Blue */}
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--blue-text)', fontWeight: 600, background: 'var(--blue-bg)', borderLeft: '2px solid var(--blue-border)' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                            <span>{simCost ? `₹${simCost.toFixed(1)}` : '-'}</span>
                                                                            {benchmarkDate && <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 400 }}>As of {benchmarkDate}</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--blue-text)', fontWeight: 600, background: 'var(--blue-bg)' }}>
                                                                        {simRetail ? `₹${simRetail.suggested_price.toFixed(1)}` : '-'}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--blue-text)', fontWeight: 600, background: 'var(--blue-bg)' }}>
                                                                        {simWholesale ? `₹${simWholesale.suggested_price.toFixed(1)}` : '-'}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--blue-text)', background: 'var(--blue-bg)', borderRight: '1px solid var(--blue-border)' }}>
                                                                        {simCost && data.revenue > 0 ? `${((data.revenue - (data.weightSold * simCost)) / data.revenue * 100).toFixed(1)}%` : '-'}
                                                                    </td>

                                                                    {/* Market Performance - Green */}
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--green-text)', background: 'var(--green-bg)', borderLeft: '2px solid var(--green-border)' }}>
                                                                        <div style={{ fontWeight: 600 }}>₹{itemAsp.toFixed(1)}/kg</div>
                                                                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>({formatCurrency(data.minPrice)}-{formatCurrency(data.maxPrice)})</div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--green-text)', fontWeight: 600, background: 'var(--green-bg)' }}>
                                                                        ₹{itemUnitCost.toFixed(1)}/kg
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--green-text)', fontWeight: 600, background: 'var(--green-bg)' }}>
                                                                        ₹{itemProfitPerKg.toFixed(1)}/kg
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, color: itemMargin > 15 ? 'var(--green-text)' : 'var(--amber-text)', background: 'var(--green-bg)' }}>
                                                                        {itemAsp > 0 ? `${itemMargin.toFixed(1)}%` : '-'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });

                                                    // Corrected Summary Logic for Market Performance (Weighted Average)
                                                    let totalRevForSum = 0;
                                                    let totalProfitValForSum = 0;
                                                    let totalWeightSoldForSumVal = 0;

                                                    Object.entries(aggregatedItems).forEach(([name, data]) => {
                                                        const itemAsp = data.weightSold > 0 ? data.revenue / data.weightSold : 0;
                                                        const itemUnitCost = data.weight > 0 ? data.allocatedCost / data.weight : 0;
                                                        const itemProfitPerKg = itemAsp - itemUnitCost;

                                                        totalRevForSum += data.revenue;
                                                        totalWeightSoldForSumVal += data.weightSold;
                                                        totalProfitValForSum += (itemProfitPerKg * data.weightSold);
                                                    });

                                                    const avgSellingPriceAll = totalWeightSoldForSumVal > 0 ? totalRevForSum / totalWeightSoldForSumVal : 0;
                                                    const avgProfitPerKgAll = totalWeightSoldForSumVal > 0 ? totalProfitValForSum / totalWeightSoldForSumVal : 0;
                                                    const totalActualMargin = avgSellingPriceAll > 0 ? (avgProfitPerKgAll / avgSellingPriceAll) * 100 : 0;

                                                    const totalMonthlyRevenue = totalRevForSum;
                                                    const totalSimMargin = totalSimRevForMargin > 0 ? (totalSimProfit / totalSimRevForMargin) * 100 : null;

                                                    const avgSimCostAll = totalWeightSoldForSumVal > 0 ? totalSimCostVal / totalWeightSoldForSumVal : 0;
                                                    const avgSimRetailAll = totalWeightSoldForSumVal > 0 ? totalSimRetailVal / totalWeightSoldForSumVal : 0;
                                                    const avgSimWholesaleAll = totalWeightSoldForSumVal > 0 ? totalSimWholesaleVal / totalWeightSoldForSumVal : 0;

                                                    return [
                                                        ...rows,
                                                        <tr key="summary-row" style={{ background: 'var(--blue-bg)', borderTop: '2px solid var(--blue-border-bold)', fontWeight: 700 }}>
                                                            <td style={{ textAlign: 'left', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--blue-text)', letterSpacing: '0.05em' }}>AVERAGE SUMMARY</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                                {totalWeightProduced >= 1000 ? (totalWeightProduced / 1000).toFixed(2) + 't' : totalWeightProduced.toLocaleString() + 'kg'}
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--amber-text)' }}>{formatCurrency(totalAllocated)}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--amber-text)' }}>{formatCurrency(totalMaterials)}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--amber-text)' }}>{formatCurrency(totalLabour)}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--amber-text)' }}>{formatCurrency(totalPackaging)}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--amber-text)' }}>{formatCurrency(totalOverheads)}</td>

                                                            {/* Simulator Summary - Blue */}
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--blue-text)', background: 'var(--blue-bg)' }}>{avgSimCostAll > 0 ? `₹${avgSimCostAll.toFixed(1)}` : '-'}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--blue-text)', background: 'var(--blue-bg)' }}>{avgSimRetailAll > 0 ? `₹${avgSimRetailAll.toFixed(1)}` : '-'}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '0.9rem', color: 'var(--blue-text)', background: 'var(--blue-bg)' }}>{avgSimWholesaleAll > 0 ? `₹${avgSimWholesaleAll.toFixed(1)}` : '-'}</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: '1rem', color: 'var(--blue-text)', background: 'var(--blue-bg)' }}>{totalSimMargin !== null ? `${totalSimMargin.toFixed(1)}%` : '-'}</td>

                                                            {/* Market Summary - Green */}
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: 13, color: 'var(--green-text)', background: 'var(--green-bg)' }}>₹{avgSellingPriceAll.toFixed(1)}/kg</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: 13, color: 'var(--green-text)', background: 'var(--green-bg)' }}>₹{(avgSellingPriceAll - avgProfitPerKgAll).toFixed(1)}/kg</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: 13, color: 'var(--green-text)', background: 'var(--green-bg)' }}>₹{avgProfitPerKgAll.toFixed(1)}/kg</td>
                                                            <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontSize: 13, color: totalActualMargin > 15 ? 'var(--green-text)' : 'var(--amber-text)', background: 'var(--green-bg)' }}>{totalActualMargin.toFixed(1)}%</td>
                                                        </tr>
                                                    ];
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Data Table */}
                            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                                        <Calendar size={isMobile ? 16 : 18} color="#10b981" />
                                        {isMobile ? 'Monthly Breakdown' : `Comprehensive Monthly Breakdown (${selectedYear})`}
                                    </h3>
                                </div>
                                <div style={{ overflowX: 'auto', padding: isMobile ? '0 0.75rem 0.75rem 0.75rem' : '0 1.5rem 1.5rem 1.5rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: isMobile ? '1000px' : 'auto' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>METRIC</th>
                                                {yearlyData.map(m => (
                                                    <th key={m.name} style={{ padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', background: m.isActive ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                        {m.name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* FINANCE */}
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>Total Revenue</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{m.revenue > 0 ? formatCurrency(m.revenue) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Average Price / kg (ASP)</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.revenuePerKg > 0 ? `₹${m.revenuePerKg.toFixed(1)}` : '-'}</td>)}
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 600, color: '#ef4444', fontSize: '0.85rem' }}>Total Expenses</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{m.expenses > 0 ? formatCurrency(m.expenses) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Materials & Water</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.materials > 0 ? formatCurrency(m.materials) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Packaging</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.packaging > 0 ? formatCurrency(m.packaging) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Labour / Wages</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.labour > 0 ? formatCurrency(m.labour) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Marketing / Ads</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.marketing > 0 ? formatCurrency(m.marketing) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Bills (Rent, EB, etc.)</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.bills > 0 ? formatCurrency(m.bills) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Other Expenses</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.other > 0 ? formatCurrency(m.other) : '-'}</td>)}
                                            </tr>
                                            <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>Net Net Profit</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: m.netProfit >= 0 ? '#10b981' : '#ef4444', fontSize: '0.9rem' }}>{m.isActive ? formatCurrency(m.netProfit) : '-'}</td>)}
                                            </tr>

                                            {/* OPERATIONS */}
                                            <tr>
                                                <td colSpan={13} style={{ textAlign: 'left', padding: '1rem 0.5rem 0.4rem 0.5rem', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Operational Performance</td>
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>Production Input (kg)</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>{m.peeledKg > 0 ? m.peeledKg.toLocaleString() : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Ginger Input (kg)</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.gingerInputKg > 0 ? m.gingerInputKg.toLocaleString() : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Garlic Input (kg)</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.garlicInputKg > 0 ? m.garlicInputKg.toLocaleString() : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>Finished Output (Paste/Peeled) (kg)</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>{m.productionKg > 0 ? m.productionKg.toLocaleString() : '-'}</td>)}
                                            </tr>
                                            <tr style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600, color: '#3b82f6', fontSize: '0.85rem' }}>Recovery / Yield %</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#3b82f6', fontSize: '0.85rem' }}>{m.yieldPercent > 0 ? `${m.yieldPercent.toFixed(1)}%` : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>Production Cost / kg</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>{m.costPerKg > 0 ? `₹${m.costPerKg.toFixed(1)}` : '-'}</td>)}
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>Profit Margin %</td>
                                                {yearlyData.map(m => <td key={m.name} style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: m.margin > 15 ? '#10b981' : (m.margin > 0 ? '#f59e0b' : 'var(--text-secondary)'), fontSize: '0.85rem' }}>{m.isActive ? `${m.margin.toFixed(1)}%` : '-'}</td>)}
                                            </tr>

                                            {/* PROCUREMENT SECTION */}
                                            <tr>
                                                <td colSpan={13} style={{ textAlign: 'left', padding: '1rem 0.5rem 0.4rem 0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Raw Material Procurement</td>
                                            </tr>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600, color: '#38bdf8', fontSize: '0.85rem' }}>Total Procurement Spend</td>
                                                {yearlyData.map((m, idx) => {
                                                    const cost = yearlyProcurementData.trendData[idx]?.totalCost || 0;
                                                    return <td key={m.name} style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#38bdf8', fontSize: '0.85rem' }}>{cost > 0 ? formatCurrency(cost) : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Ginger Spend</td>
                                                {yearlyData.map((m, idx) => {
                                                    const cost = yearlyProcurementData.trendData[idx]?.GingerCost || 0;
                                                    return <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cost > 0 ? formatCurrency(cost) : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.8 }}>- Qty (kg)</td>
                                                {yearlyData.map((m, idx) => {
                                                    const qty = yearlyProcurementData.trendData[idx]?.GingerQty || 0;
                                                    return <td key={m.name} style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{qty > 0 ? `${qty.toLocaleString()} kg` : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.8 }}>- Avg Price (₹/kg)</td>
                                                {yearlyData.map((m, idx) => {
                                                    const price = yearlyProcurementData.priceTrendData[idx]?.GingerPrice || 0;
                                                    return <td key={m.name} style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{price > 0 ? `₹${price}` : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Garlic Spend</td>
                                                {yearlyData.map((m, idx) => {
                                                    const cost = yearlyProcurementData.trendData[idx]?.GarlicCost || 0;
                                                    return <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cost > 0 ? formatCurrency(cost) : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.8 }}>- Qty (kg)</td>
                                                {yearlyData.map((m, idx) => {
                                                    const qty = yearlyProcurementData.trendData[idx]?.GarlicQty || 0;
                                                    return <td key={m.name} style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{qty > 0 ? `${qty.toLocaleString()} kg` : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.8 }}>- Avg Price (₹/kg)</td>
                                                {yearlyData.map((m, idx) => {
                                                    const price = yearlyProcurementData.priceTrendData[idx]?.GarlicPrice || 0;
                                                    return <td key={m.name} style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{price > 0 ? `₹${price}` : '-'}</td>;
                                                })}
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Other Material Spend</td>
                                                {yearlyData.map((m, idx) => {
                                                    const cost = yearlyProcurementData.trendData[idx]?.OthersCost || 0;
                                                    return <td key={m.name} style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cost > 0 ? formatCurrency(cost) : '-'}</td>;
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                    {activeAnalysisSubTab === 'profitHub' && (
                        <div className="profit-hub-container animate-fade-in" style={{ padding: '0' }} key="profit-hub-view">
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: isMobile ? 'column' : 'row',
                                justifyContent: 'space-between', 
                                alignItems: isMobile ? 'flex-start' : 'center', 
                                marginBottom: '2rem',
                                gap: isMobile ? '1rem' : '0'
                            }}>
                                <div></div>
                                {isAdmin && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("System Reset?")) {
                                                const { error } = await supabase.from('profit_payouts').delete().like('month_year', `%${selectedYear}%`);
                                                if (!error) {
                                                    await logProfitHubAction('System Reset', { year: selectedYear });
                                                    await fetchProfitHubData();
                                                }
                                            }
                                        }}
                                        style={{ 
                                            width: isMobile ? '100%' : 'auto',
                                            padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.5rem', 
                                            borderRadius: '0.75rem', 
                                            background: 'rgba(239, 68, 68, 0.1)', 
                                            color: '#ef4444', 
                                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                                            cursor: 'pointer', 
                                            fontWeight: 700,
                                            fontSize: isMobile ? '0.85rem' : '1rem'
                                        }}
                                    >Reset Year Protocol</button>
                                )}
                            </div>

                            {(() => {
                                let totalProfit = 0;
                                let totalReserve = 0;
                                let totalPaid = 0;
                                let totalPending = 0;

                                // Track per-stakeholder stats for the ledger
                                const stakeholderStats = profitStakeholders.map(s => ({
                                    ...s,
                                    paid: 0,
                                    pending: 0,
                                    total: 0
                                }));

                                yearlyData.filter(m => m.isActive).forEach(month => {
                                    const mProfit = month.netProfit || 0;
                                    totalProfit += mProfit;

                                    const mOverride = profitMonthlySettings.find(s => s.month_year === `${month.name} ${selectedYear}`);
                                    const activeReservePct = mOverride ? parseFloat(mOverride.reserve_percentage) : profitReservePct;
                                    totalReserve += (mProfit * activeReservePct) / 100;

                                    profitStakeholders.forEach((s, idx) => {
                                        const p = profitPayouts.find(pa => pa.stakeholder_id === s.id && pa.month_year === `${month.name} ${selectedYear}`);
                                        const status = p?.status || 'pending';
                                        const share = (mProfit * (parseFloat(s.default_percent) || 0)) / 100;

                                        stakeholderStats[idx].total += share;
                                        if (status === 'paid') {
                                            stakeholderStats[idx].paid += share;
                                            totalPaid += share;
                                        } else {
                                            stakeholderStats[idx].pending += share;
                                            totalPending += share;
                                        }
                                    });
                                });

                                return (
                                    <>
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                                            gap: isMobile ? '0.75rem' : '1rem', 
                                            marginBottom: '2rem' 
                                        }}>
                                            <div className="glass-panel" style={{ padding: isMobile ? '0.75rem' : '1.25rem', borderLeft: `4px solid ${totalProfit < 0 ? '#ef4444' : '#10b981'}` }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Profit Pool</span>
                                                <h3 style={{ margin: '0.25rem 0 0 0', color: totalProfit < 0 ? '#ef4444' : '#10b981', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>{formatCurrency(totalProfit)}</h3>
                                            </div>
                                            <div className="glass-panel" style={{ padding: isMobile ? '0.75rem' : '1.25rem', borderLeft: `4px solid ${totalPaid < 0 ? '#ef4444' : '#3b82f6'}` }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Distributed</span>
                                                <h3 style={{ margin: '0.25rem 0 0 0', color: totalPaid < 0 ? '#ef4444' : '#3b82f6', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>{formatCurrency(totalPaid)}</h3>
                                            </div>
                                            <div className="glass-panel" style={{ padding: isMobile ? '0.75rem' : '1.25rem', borderLeft: '4px solid #ef4444' }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Payouts</span>
                                                <h3 style={{ margin: '0.25rem 0 0 0', color: '#ef4444', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>{formatCurrency(totalPending)}</h3>
                                            </div>
                                            <div className="glass-panel" style={{ padding: isMobile ? '0.75rem' : '1.25rem', borderLeft: `4px solid ${totalReserve < 0 ? '#ef4444' : '#f59e0b'}` }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Reserved</span>
                                                <h3 style={{ margin: '0.25rem 0 0 0', color: totalReserve < 0 ? '#ef4444' : '#f59e0b', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>{formatCurrency(totalReserve)}</h3>
                                            </div>
                                        </div>

                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', 
                                            gap: '1.5rem' 
                                        }}>
                                            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: isMobile ? '600px' : 'auto' }}>
                                                        <thead>
                                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                                                <th style={{ padding: isMobile ? '0.75rem' : '1.25rem 1rem', fontSize: '0.75rem' }}>PERIOD</th>
                                                                <th style={{ padding: isMobile ? '0.75rem' : '1.25rem 1rem', fontSize: '0.75rem' }}>NET PROFIT</th>
                                                                {profitStakeholders.map(s => <th key={s.id} style={{ padding: isMobile ? '0.75rem' : '1rem', fontSize: '0.75rem' }}>{s.name}</th>)}
                                                                <th style={{ padding: isMobile ? '0.75rem' : '1rem', fontSize: '0.75rem', color: '#f59e0b' }}>RESERVE</th>
                                                            </tr>
                                                        </thead>
                                                    <tbody>
                                                        {yearlyData.filter(m => m.isActive).map(month => {
                                                            const mProfit = month.netProfit || 0;
                                                            const mOverride = profitMonthlySettings.find(s => s.month_year === `${month.name} ${selectedYear}`);
                                                            const activeReservePct = mOverride ? parseFloat(mOverride.reserve_percentage) : profitReservePct;
                                                            const reserved = (mProfit * activeReservePct) / 100;
                                                            return (
                                                                <tr key={month.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <td style={{ padding: '1.25rem 1rem', fontWeight: 700 }}>{month.name}</td>
                                                                    <td style={{ padding: '1.25rem 1rem', fontWeight: 800, color: mProfit < 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(mProfit)}</td>
                                                                    {profitStakeholders.map(s => {
                                                                        const p = profitPayouts.find(pa => pa.stakeholder_id === s.id && pa.month_year === `${month.name} ${selectedYear}`);
                                                                        const status = p?.status || 'pending';
                                                                        const share = (mProfit * (parseFloat(s.default_percent) || 0)) / 100;
                                                                        const cellColor = share < 0 ? '#ef4444' : (status === 'paid' ? '#10b981' : '#3b82f6');
                                                                        return (
                                                                            <td key={s.id} style={{ padding: '1rem' }}>
                                                                                <div style={{ color: cellColor, fontWeight: 700 }}>{formatCurrency(share)}</div>
                                                                                <select
                                                                                    value={status}
                                                                                    onChange={async (e) => {
                                                                                        const newVal = e.target.value;
                                                                                        if (p) await supabase.from('profit_payouts').update({ status: newVal, paid_at: newVal === 'paid' ? new Date().toISOString() : null }).eq('id', p.id);
                                                                                        else await supabase.from('profit_payouts').insert({ stakeholder_id: s.id, month_year: `${month.name} ${selectedYear}`, amount: share, status: newVal, paid_at: newVal === 'paid' ? new Date().toISOString() : null });
                                                                                        await logProfitHubAction('Status Change', { month: `${month.name} ${selectedYear}`, stakeholder: s.name, status: newVal });
                                                                                        await fetchProfitHubData();
                                                                                    }}
                                                                                    style={{ fontSize: '0.65rem', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: cellColor }}
                                                                                >
                                                                                    <option value="pending">Wait</option>
                                                                                    <option value="paid">Paid</option>
                                                                                </select>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td style={{ padding: '1rem', fontWeight: 700, color: reserved < 0 ? '#ef4444' : '#f59e0b' }}>{formatCurrency(reserved)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                </div>
                                            </div>
                                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Users size={18} color="#3b82f6" /> Stakeholder Ledger
                                                </h3>
                                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>SYSTEM RESERVE</div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profitReservePct.toFixed(1)}%</div>
                                                    </div>
                                                    {stakeholderStats.map(s => (
                                                        <div key={s.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                                                                <div style={{ padding: '0.25rem 0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 800 }}>{s.default_percent}%</div>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                                <div style={{ padding: '0.75rem', background: s.paid < 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', borderRadius: '0.75rem', border: s.paid < 0 ? '1px solid rgba(239, 68, 68, 0.1)' : '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                                    <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Paid</p>
                                                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: s.paid < 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(s.paid)}</p>
                                                                </div>
                                                                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                                    <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Balance</p>
                                                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{formatCurrency(s.pending)}</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Total Entitlement</span>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: s.total < 0 ? '#ef4444' : 'var(--text-primary)' }}>{formatCurrency(s.total)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {activeAnalysisSubTab === 'insights' && (
                        <div className="strategic-insights-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} key="insights-view">
                            <h2 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                <Info size={isMobile ? 24 : 32} color="#3b82f6" /> Strategic Executive Insights
                            </h2>

                            {/* 1. TOP ROW: HIGH IMPACT STRATEGIC KPI CARDS */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Profit Month</span>
                                    <h3 style={{ margin: '0.25rem 0', color: '#10b981', fontSize: '1.5rem', fontWeight: 'bold' }}>March Peak</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Revenue: <strong>{formatCurrency(553840)}</strong> • Profit: <strong>{formatCurrency(208243)}</strong> (37.6% margin)
                                    </p>
                                </div>

                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #FCD34D' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ginger Price Surge</span>
                                    <h3 style={{ margin: '0.25rem 0', color: '#FCD34D', fontSize: '1.5rem', fontWeight: 'bold' }}>₹109/kg (June)</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Nearly doubled from the winter baseline of <strong>₹55/kg</strong> in March.
                                    </p>
                                </div>

                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #60A5FA' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Garlic Deflation</span>
                                    <h3 style={{ margin: '0.25rem 0', color: '#60A5FA', fontSize: '1.5rem', fontWeight: 'bold' }}>₹74/kg (March)</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Dropped by <strong>36.2%</strong> from peak price of <strong>₹116/kg</strong> in January.
                                    </p>
                                </div>

                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yield Anomaly</span>
                                    <h3 style={{ margin: '0.25rem 0', color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>92.1% (April)</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        The only month below the 102% average baseline. Indicates processing loss.
                                    </p>
                                </div>
                            </div>

                            {/* 2. MIDDLE ROW: CHART & RECOMMENDATIONS SIDE-BY-SIDE */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
                                gap: '1.5rem'
                            }}>
                                {/* Fluctuation Chart */}
                                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '380px' }}>
                                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                                        <ShoppingCart size={18} color="#38bdf8" />
                                        Raw Material Purchase Price Fluctuation (₹/kg)
                                    </h3>
                                    <div style={{ width: '100%', height: 280 }}>
                                        {yearlyProcurementData.priceTrendData.some(m => m.GingerPrice || m.GarlicPrice) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={yearlyProcurementData.priceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} unit="₹" axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: '0.5rem' }} />
                                                    <Line type="monotone" dataKey="GingerPrice" stroke="#FCD34D" name="Ginger Avg (₹/kg)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                                                    <Line type="monotone" dataKey="GarlicPrice" stroke="#E0E7FF" name="Garlic Avg (₹/kg)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                No purchase data available for price trend analysis.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Strategic Recommendations */}
                                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '380px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', fontWeight: 700 }}>
                                        <Target size={18} color="#3b82f6" />
                                        Strategic Action Points
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                                        <div style={{ background: 'rgba(245, 158, 11, 0.03)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Activity size={14} /> 1. Garlic Inventory Hedging
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                Garlic drops by 36% in spring. Build bulk inventory during March/April (target under ₹75/kg) to carry through winter peaks (₹116/kg).
                                            </p>
                                        </div>

                                        <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Wheat size={14} /> 2. Pre-Summer Ginger Contracts
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                Ginger prices surge by 98% from April to June. Secure forward purchase agreements or peel/stock ginger before May.
                                            </p>
                                        </div>

                                        <div style={{ background: 'rgba(239, 68, 68, 0.03)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <AlertTriangle size={14} /> 3. April Yield Waste Audit
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                April yield drop to 92.1% signifies waste or batch leakage. Enforce a processing floor of 105% to save ~280 kg of finished paste.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. BOTTOM ROW: FULL SUMMARY OF OBSERVATIONS */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Key Observations Overview</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ minWidth: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', marginTop: '7px' }} />
                                        <p style={{ margin: 0 }}>
                                            <strong>Margins vs. Expenses:</strong> Although February generated higher revenue than January, its net profit dropped by over 40% (₹80k vs ₹140k). This cost anomaly was driven by a four-fold bills spike (deferred utility charges) and massive upfront raw material purchases.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ minWidth: '6px', height: '6px', borderRadius: '50%', background: '#10b981', marginTop: '7px' }} />
                                        <p style={{ margin: 0 }}>
                                            <strong>Production Cost Peak:</strong> In June, production cost soared to its YTD maximum of ₹140.4/kg. This peak was caused by the combined pressure of record-high ginger prices (₹109/kg) and lower plant throughput.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ minWidth: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginTop: '7px' }} />
                                        <p style={{ margin: 0 }}>
                                            <strong>Yield Loss:</strong> Most months maintain yields between 102%–111% due to blending inputs. April's anomaly (92.1%) represents a clear operational outlier that directly affected unit production efficiency.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>

    );
};

export default YearlyAnalysis;
