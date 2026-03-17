import React, { useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart, Line, Cell, LineChart } from 'recharts';
import { Calendar, TrendingUp, DollarSign, Activity, Wheat, Target, AlertTriangle, CheckCircle, Info, ArrowUpRight, ArrowDownRight, Settings, Eye, EyeOff, ChevronDown, ChevronUp, Factory } from 'lucide-react';

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

const YearlyAnalysis = ({ selectedYear, transactions = [], productionData = {} }) => {
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
    const getSimForMonth = (normName, targetMonthStr, channel) => {
        const availableMonths = Object.keys(simHistory)
            .filter(m => m <= targetMonthStr)
            .sort((a, b) => b.localeCompare(a)); // Newest first but <= target
        
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
            let purchasesKgValue = 0;  // Raw Material In

            // 1. Process Transactions (Revenue, Expenses, Sales Kg)
            const monthTxns = transactions ? transactions.filter(t => t.parsedDate && t.parsedDate.startsWith(targetPrefix)) : [];

            if (monthTxns.length > 0) {
                // --- SALES LOGIC ---
                const allSales = monthTxns.filter(t => String(t.parsedType).toLowerCase().includes('sale'));
                const invoiceTotalRows = monthTxns.filter(t => t.parsedType === 'Invoice Total');
                const salesSummaryRows = allSales.filter(t => String(t.parsedType || '').toLowerCase() === 'sales summary');

                const salesAppearsGranular = allSales.filter(t => {
                    const type = String(t.parsedType || '').toLowerCase();
                    const desc = String(t.originalDesc || '').toLowerCase();
                    if (type === 'sales summary' || type === 'profitsummary' || type === 'invoice total') return false;
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
                    const invoiceMap = new Map();
                    const getKey = (t) => t.invoiceNo ? String(t.invoiceNo).trim().toUpperCase() : 'NO_INVOICE_' + t.id;

                    salesAppearsGranular.forEach(t => {
                        const k = getKey(t);
                        if (!invoiceMap.has(k)) invoiceMap.set(k, { totals: [], granular: [] });
                        invoiceMap.get(k).granular.push(t);
                    });

                    invoiceTotalRows.forEach(t => {
                        const k = getKey(t);
                        if (!invoiceMap.has(k)) invoiceMap.set(k, { totals: [], granular: [] });
                        invoiceMap.get(k).totals.push(t);
                    });

                    invoiceMap.forEach(group => {
                        // CRITICAL: Prefer granular items over Invoice Totals for per-item analysis
                        if (group.granular.length > 0) {
                            selectedSalesRows.push(...group.granular);
                        } else if (group.totals.length > 0) {
                            if (group.totals.length === 1) selectedSalesRows.push(group.totals[0]);
                            else {
                                const sorted = [...group.totals].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                                selectedSalesRows.push(sorted[0]);
                            }
                        }
                    });
                }

                const uniqueSalesMap = new Map();
                selectedSalesRows.forEach(t => {
                    const key = t.id || `${t.invoiceNo}-${t.parsedDate}-${t.parsedAmount}-${t.originalDesc}`;
                    if (!uniqueSalesMap.has(key)) uniqueSalesMap.set(key, t);
                });
                const finalSales = Array.from(uniqueSalesMap.values());

                finalSales.forEach(t => {
                    const amt = Math.abs(parseFloat(t.parsedAmount || 0));
                    const qty = parseFloat(t.parsedQty || 0);
                    revenue += amt;
                    salesKg += qty;

                    const rawName = (t.originalDesc || 'Generic Item').trim().toUpperCase();

                    // Filter out accounting noise and summary rows
                    const isBlacklisted = BLACKLIST_ITEMS.some(b => rawName.includes(b)) ||
                        rawName === 'ITEM' || rawName === 'PRODUCT' ||
                        rawName === 'AMOUNT' || rawName === 'SUBTOTAL';

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
                        productionInputKgValue += parseFloat(item.weight || 0);
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
                productionKg: effectiveOutput,
                itemBreakdown: (() => {
                    const breakdown = [];
                    const usedSalesKeys = new Set();

                    // 1. Process Produced Items
                    Object.entries(itemProduction).forEach(([originalName, weight]) => {
                        const normKey = normalizeName(originalName);
                        const share = effectiveOutput > 0 ? weight / effectiveOutput : 0;
                        const sales = itemSalesData[normKey] || { revenue: 0, weight: 0, minPrice: Infinity, maxPrice: -Infinity };

                        usedSalesKeys.add(normKey);

                        const itemAsp = sales.weight > 0 ? sales.revenue / sales.weight : 0;
                        const itemUnitCost = weight > 0 ? (share * totalExpenses) / weight : 0;
                        const itemProfitPerKg = itemAsp > 0 ? (itemAsp - itemUnitCost) : (0 - itemUnitCost);
                        const itemMargin = itemAsp > 0 ? (itemProfitPerKg / itemAsp) * 100 : 0;

                        breakdown.push({
                            name: originalName,
                            weight,
                            share,
                            allocatedCost: share * totalExpenses,
                            materials: share * materialsCost,
                            labour: share * labour,
                            packaging: share * packaging,
                            bills: share * bills,
                            other: share * other,
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
                                asp: itemAsp,
                                minPrice: data.minPrice === Infinity ? 0 : data.minPrice,
                                maxPrice: data.maxPrice === -Infinity ? 0 : data.maxPrice,
                                profitPerKg: itemAsp,
                                margin: 100,
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
    }, [selectedYear, transactions, productionData]);

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

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            {/* Dashboard Header with Settings */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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

            {/* Quarterly Summary Section */}
            {viewSettings.showQuarterly && (
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Calendar size={18} color="#3b82f6" />
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Quarterly Performance</h3>
                    </div>
                    <div className="responsive-grid-4">
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
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
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--glass-border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontWeight: 600 }}>{m.name} {selectedYear}</span>
                                        <span style={{ color: m.yieldPercent >= 70 ? '#10b981' : '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {m.yieldPercent.toFixed(1)}% Yield
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ASP</p>
                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>₹{m.revenuePerKg.toFixed(1)}/kg</p>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Production Cost</p>
                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>₹{m.costPerKg.toFixed(1)}/kg</p>
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
                <div className="glass-panel" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                <Factory size={18} color="#f59e0b" />
                                Itemized Production {analysisViewMode === 'yearly' ? 'Yearly' : 'Monthly'} Cost Analysis ({selectedYear})
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
                            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', maxWidth: '400px', paddingBottom: '2px' }}>
                                {yearlyData.filter(m => m.isActive).map(m => (
                                    <button
                                        key={m.name}
                                        onClick={() => setSelectedAnalysisMonth(m.name)}
                                        style={{
                                            padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '0.4rem',
                                            border: `1px solid ${selectedAnalysisMonth === m.name ? '#3b82f6' : 'var(--glass-border)'}`,
                                            background: selectedAnalysisMonth === m.name ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                            color: selectedAnalysisMonth === m.name ? '#3b82f6' : 'var(--text-secondary)',
                                            cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >{m.name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '1200px', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'left', width: '170px' }}>ITEM NAME</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'right', width: '100px' }}>PROD (KG)</th>
                                    
                                    {/* Actual Spend Section - Amber */}
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(245, 158, 11, 0.4)', borderLeft: '2px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(245, 158, 11, 0.1)', width: '110px' }}>ALLOCATED</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(245, 158, 11, 0.1)', width: '110px' }}>MATERIALS</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(245, 158, 11, 0.1)', width: '90px' }}>LABOUR</th>
                                    
                                    {/* Simulator Benchmarks - Blue */}
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(59, 130, 246, 0.4)', borderLeft: '2px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(59, 130, 246, 0.1)', width: '100px' }}>SIM COST</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(59, 130, 246, 0.4)', color: '#3b82f6', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(59, 130, 246, 0.1)', width: '100px' }}>REC RETAIL</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(59, 130, 246, 0.4)', color: '#3b82f6', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(59, 130, 246, 0.1)', width: '100px' }}>REC W.SALE</th>
                                    
                                    {/* Market Performance - Green */}
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(16, 185, 129, 0.4)', borderLeft: '2px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)', width: '120px' }}>SELL PRICE</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(16, 185, 129, 0.4)', color: '#10b981', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)', width: '100px' }}>PROFIT/KG</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(16, 185, 129, 0.4)', color: '#10b981', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)', width: '80px' }}>MARGIN %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const aggregatedItems = {};
                                    const dataToProcess = analysisViewMode === 'yearly'
                                        ? yearlyData
                                        : yearlyData.filter(m => m.name === selectedAnalysisMonth);

                                    dataToProcess.forEach(m => {
                                        if (m.itemBreakdown) {
                                            m.itemBreakdown.forEach(item => {
                                                if (!aggregatedItems[item.name]) {
                                                    aggregatedItems[item.name] = { weight: 0, allocatedCost: 0, materials: 0, labour: 0, packaging: 0, bills: 0, revenue: 0, weightSold: 0, minPrice: Infinity, maxPrice: -Infinity };
                                                }
                                                aggregatedItems[item.name].weight += item.weight;
                                                aggregatedItems[item.name].allocatedCost += item.allocatedCost;
                                                aggregatedItems[item.name].materials += item.materials;
                                                aggregatedItems[item.name].labour += item.labour;
                                                aggregatedItems[item.name].packaging += (item.packaging || 0);
                                                aggregatedItems[item.name].bills += (item.bills || 0);
                                                aggregatedItems[item.name].revenue += (item.revenue || 0);
                                                aggregatedItems[item.name].weightSold += (item.qty || 0); // Correctly using qty (which is weight now)
                                                if (item.minPrice > 0) aggregatedItems[item.name].minPrice = Math.min(aggregatedItems[item.name].minPrice, item.minPrice);
                                                if (item.maxPrice > 0) aggregatedItems[item.name].maxPrice = Math.max(aggregatedItems[item.name].maxPrice, item.maxPrice);
                                            });
                                        }
                                    });

                                    return Object.entries(aggregatedItems)
                                        .sort((a, b) => b[1].weight - a[1].weight)
                                        .map(([name, data]) => {
                                            const normName = normalizeName(name);
                                            
                                            // Determine target month for simulation lookup
                                            const targetMonthStr = analysisViewMode === 'monthly' && selectedAnalysisMonth
                                                ? `${selectedYear}-${String(monthNames.indexOf(selectedAnalysisMonth) + 1).padStart(2, '0')}`
                                                : `${selectedYear}-12`; // For yearly, use latest available in that year

                                            const simRetail = getSimForMonth(normName, targetMonthStr, 'retail');
                                            const simWholesale = getSimForMonth(normName, targetMonthStr, 'wholesale');
                                            const simCost = simRetail ? simRetail.unit_cost : (simWholesale ? simWholesale.unit_cost : null);

                                            return (
                                                <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{name}</td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{data.weight >= 1000 ? (data.weight / 1000).toFixed(2) + 't' : data.weight.toLocaleString() + 'kg'}</td>
                                                    
                                                    {/* Actual Spend Section - Amber */}
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, background: 'rgba(245, 158, 11, 0.04)', borderLeft: '2px solid rgba(245, 158, 11, 0.2)' }}>{formatCurrency(data.allocatedCost)}</td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#f59e0b', opacity: 0.8, background: 'rgba(245, 158, 11, 0.04)' }}>{formatCurrency(data.materials)}</td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#f59e0b', opacity: 0.8, background: 'rgba(245, 158, 11, 0.04)' }}>{formatCurrency(data.labour)}</td>
                                                    
                                                    {/* Simulator Columns - Blue */}
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, background: 'rgba(59, 130, 246, 0.04)', borderLeft: '2px solid rgba(59, 130, 246, 0.2)' }}>
                                                        {simCost ? `₹${simCost.toFixed(1)}` : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, background: 'rgba(59, 130, 246, 0.04)' }}>
                                                        {simRetail ? `₹${simRetail.suggested_price.toFixed(1)}` : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, background: 'rgba(59, 130, 246, 0.04)' }}>
                                                        {simWholesale ? `₹${simWholesale.suggested_price.toFixed(1)}` : '-'}
                                                    </td>

                                                    {/* Market Performance - Green */}
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.04)', borderLeft: '2px solid rgba(16, 185, 129, 0.2)' }}>
                                                        <div>₹{data.weightSold > 0 ? (data.revenue / data.weightSold).toFixed(1) : '0'}/kg</div>
                                                        {data.minPrice !== Infinity && data.minPrice > 0 && (
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                                                (₹{data.minPrice.toFixed(0)}-₹{data.maxPrice.toFixed(0)})
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', fontWeight: 700, color: (data.weightSold > 0 && data.revenue / data.weightSold - (data.weight > 0 ? data.allocatedCost / data.weight : 0)) > 0 ? '#10b981' : '#ef4444', background: 'rgba(16, 185, 129, 0.04)' }}>
                                                        ₹{data.weightSold > 0 ? (data.revenue / data.weightSold - (data.weight > 0 ? data.allocatedCost / data.weight : 0)).toFixed(1) : (data.weight > 0 ? `-${(data.allocatedCost / data.weight).toFixed(1)}` : '0')}/kg
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: (data.revenue > 0 && (data.revenue - (data.weightSold * (data.weight > 0 ? data.allocatedCost / data.weight : 0)))) / data.revenue * 100 > 15 ? '#10b981' : '#f59e0b', background: 'rgba(16, 185, 129, 0.04)' }}>
                                                        {data.revenue > 0 ? `${((data.revenue - (data.weightSold * (data.weight > 0 ? data.allocatedCost / data.weight : 0))) / data.revenue * 100).toFixed(1)}%` : '0%'}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed Data Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Calendar size={18} color="#10b981" />
                        Comprehensive Monthly Breakdown ({selectedYear})
                    </h3>
                </div>
                <div style={{ overflowX: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
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
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default YearlyAnalysis;
