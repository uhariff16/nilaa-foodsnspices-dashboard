import React, { useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart, Line, Cell, LineChart, PieChart, Pie } from 'recharts';
import { Calendar, TrendingUp, DollarSign, Activity, Wheat, Target, AlertTriangle, CheckCircle, Info, ArrowUpRight, ArrowDownRight, Settings, Eye, EyeOff, ChevronDown, ChevronUp, Factory, Users, Plus, Trash2, Wallet, Shield } from 'lucide-react';
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
        .replace(/^NFS\s+/, '') 
        .replace(/\b(G\s*(?:&|AND)\s*G)\b/g, 'GINGER GARLIC')
        .replace(/\s+/g, ' ')
        .replace(/\(.*\)/g, '')
        .replace(/\b\d+\s*(KG|G|GM|GMS|ML|L|PKT|PACKET|PACK|BOX|PCS|PC|G)\b/g, '')
        .replace(/\b(WITHOUT|PACKET|PKT|BOTTLE|JAR|TIN|PACK|PACKS)\b/g, '')
        .replace(/[^\w\s]/g, ' ')
        .trim();
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
    return 1;
};

const BLACKLIST_ITEMS = ['TOTAL', 'GRAND TOTAL', 'WAGES', 'SALARY', 'EXPENSE', 'RENT', 'BILL', 'TAX', 'GST', 'PROFIT', 'SUMMARY'];

const YearlyAnalysis = ({ selectedYear, transactions = [], productionData = {}, invoiceDiscounts = [], forceTab = null }) => {
    const { hasPermission } = useAuth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Dashboard View Settings
    const [viewSettings, setViewSettings] = React.useState(() => {
        try {
            const saved = localStorage.getItem('ytd_view_settings_v2');
            return saved ? JSON.parse(saved) : {
                showTotalRev: true, showTotalExp: true, showNetProfit: true, showYtdProd: true,
                showQuarterly: true, showRecommendations: true, showFinancialTrends: true,
                showGrowthTrends: true, showUnitEconomics: true, showExpenseComp: true,
                showProdYield: true, showEfficiencyBench: true, showItemAnalysis: true
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
    const [analysisViewMode, setAnalysisViewMode] = React.useState('monthly');
    const [selectedAnalysisMonth, setSelectedAnalysisMonth] = React.useState('');

    const [profitStakeholders, setProfitStakeholders] = React.useState([]);
    const [profitPayouts, setProfitPayouts] = React.useState([]);
    const [profitReservePct, setProfitReservePct] = React.useState(0);
    const [profitMonthlySettings, setProfitMonthlySettings] = React.useState([]);
    const [isProfitLoading, setIsProfitLoading] = React.useState(false);
    const [activeAnalysisSubTab, setActiveAnalysisSubTab] = React.useState(forceTab || 'performance');
    const [isTableMissing, setIsTableMissing] = React.useState(false);

    React.useEffect(() => {
        if (forceTab) setActiveAnalysisSubTab(forceTab);
    }, [forceTab]);

    const fetchProfitHubData = async () => {
        setIsProfitLoading(true);
        setIsTableMissing(false);
        try {
            const [stkRes, payRes, setRes, monthlyRes] = await Promise.all([
                supabase.from('profit_stakeholders').select('*').order('created_at', { ascending: true }),
                supabase.from('profit_payouts').select('*').like('month_year', `%${selectedYear}%`),
                supabase.from('system_settings').select('value').eq('key', 'profit_reserve_percentage').maybeSingle(),
                supabase.from('profit_monthly_settings').select('*').like('month_year', `%${selectedYear}%`)
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
            if (!monthlyRes.error) setProfitMonthlySettings(monthlyRes.data || []);

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

    // Simulator History Logic
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
                    setSimHistory(history);
                }
            } catch (err) {
                console.error("Error fetching YTD simulations:", err);
            }
        };
        fetchSimulations();
    }, []);

    const getSimForMonth = (normName, targetMonthStr, channel, useAbsoluteLatest = false) => {
        const availableMonths = Object.keys(simHistory)
            .filter(m => useAbsoluteLatest ? true : m <= targetMonthStr)
            .sort((a, b) => b.localeCompare(a));

        for (const m of availableMonths) {
            if (simHistory[m][channel] && simHistory[m][channel][normName]) {
                return simHistory[m][channel][normName];
            }
        }
        return null;
    };

    const yearlyData = useMemo(() => {
        if (!selectedYear) return [];
        return monthNames.map((month, index) => {
            const numMonth = String(index + 1).padStart(2, '0');
            const targetPrefix = `${selectedYear}-${numMonth}`;
            let revenue = 0; let totalExpenses = 0; let labour = 0; let materialsCost = 0;
            let packaging = 0; let bills = 0; let marketing = 0; let other = 0;
            let itemProduction = {}; let itemSalesData = {};
            let salesKg = 0; let productionKgValue = 0; let productionInputKgValue = 0; let purchasesKgValue = 0;

            const monthTxns = transactions ? transactions.filter(t => t.parsedDate && t.parsedDate.startsWith(targetPrefix)) : [];
            if (monthTxns.length > 0) {
                const allSales = monthTxns.filter(t => String(t.parsedType).toLowerCase().includes('sale'));
                const salesReturns = monthTxns.filter(t => t.parsedType === 'Sales Return');
                const invoiceTotalRows = monthTxns.filter(t => t.parsedType === 'Invoice Total');
                const salesSummaryRows = allSales.filter(t => String(t.parsedType || '').toLowerCase() === 'sales summary' && t.parsedType !== 'Sales Return');
                const salesAppearsGranular = allSales.filter(t => {
                    const desc = String(t.originalDesc || '').toLowerCase();
                    if (['sales summary', 'profitsummary', 'invoice total', 'sales return'].includes(String(t.parsedType).toLowerCase())) return false;
                    if (['subtotal', 'round off', 'gst', 'total'].some(k => desc.includes(k))) return false;
                    return true;
                });

                let selectedSalesRows = [];
                if (invoiceTotalRows.length === 0 && salesAppearsGranular.length === 0) {
                    selectedSalesRows = salesSummaryRows;
                } else {
                    const invoiceMap = new Map();
                    salesAppearsGranular.forEach(t => {
                        const k = t.invoiceNo ? String(t.invoiceNo).trim().toUpperCase() : 'NO_INV_' + t.id;
                        if (!invoiceMap.has(k)) invoiceMap.set(k, { totals: [], granular: [] });
                        invoiceMap.get(k).granular.push(t);
                    });
                    invoiceTotalRows.forEach(t => {
                        const k = t.invoiceNo ? String(t.invoiceNo).trim().toUpperCase() : 'NO_INV_' + t.id;
                        if (!invoiceMap.has(k)) invoiceMap.set(k, { totals: [], granular: [] });
                        invoiceMap.get(k).totals.push(t);
                    });
                    invoiceMap.forEach(group => {
                        if (group.totals.length > 0) selectedSalesRows.push(group.totals[0]);
                        else selectedSalesRows.push(...group.granular);
                    });
                }

                const grossRevenue = selectedSalesRows.reduce((acc, t) => acc + Math.abs(parseFloat(t.parsedAmount || 0)), 0);
                const returnRevenue = salesReturns.reduce((acc, t) => acc + Math.abs(parseFloat(t.parsedAmount || 0)), 0);
                const monthDiscounts = invoiceDiscounts.filter(d => d.discount_date && d.discount_date.startsWith(targetPrefix));
                const discountRevenue = monthDiscounts.reduce((acc, d) => acc + (parseFloat(d.discount_amount) || 0), 0);
                revenue = grossRevenue - returnRevenue - discountRevenue;

                salesAppearsGranular.forEach(t => {
                    const rawName = (t.originalDesc || 'Generic Item').trim().toUpperCase();
                    if (BLACKLIST_ITEMS.some(b => rawName.includes(b))) return;
                    const normName = normalizeName(rawName);
                    const weight = parseFloat(t.parsedQty || 0) * getPackWeight(rawName);
                    if (!itemSalesData[normName]) itemSalesData[normName] = { revenue: 0, weight: 0 };
                    itemSalesData[normName].revenue += Math.abs(parseFloat(t.parsedAmount || 0));
                    itemSalesData[normName].weight += weight;
                });

                Object.keys(itemSalesData).forEach(normName => { salesKg += itemSalesData[normName].weight; });

                monthTxns.filter(t => String(t.parsedType).toLowerCase().includes('expense') || t.parsedType === 'Purchase').forEach(t => {
                    const amt = parseFloat(t.parsedAmount || 0); totalExpenses += amt;
                    const name = (t.originalDesc || t.name || '').toUpperCase();
                    if (['GINGER', 'GARLIC', 'JAYAKODI', 'SENTHIL', 'SVG', 'PK', 'POONDU'].some(k => name.includes(k))) materialsCost += amt;
                    else if (['SALARY', 'LABOUR', 'WAGES', 'STAFF'].some(k => name.includes(k))) labour += amt;
                    else if (['POUCH', 'BOX', 'LABEL', 'PACKING'].some(k => name.includes(k))) packaging += amt;
                    else if (['RENT', 'EB BILL', 'ELECTRICITY', 'POWER'].some(k => name.includes(k))) bills += amt;
                    else if (['AD', 'PROMO', 'MARKETING', 'ADS'].some(k => name.includes(k))) marketing += amt;
                    else other += amt;
                });
            }

            if (productionData?.postProduction) productionData.postProduction.filter(i => i.date?.startsWith(targetPrefix)).forEach(i => {
                const w = parseFloat(i.weight || 0); productionKgValue += w;
                const n = (i.material || i.item || 'Generic').trim().toUpperCase();
                itemProduction[n] = (itemProduction[n] || 0) + w;
            });

            const effectiveOutput = Math.max(productionKgValue, salesKg);
            const netProfit = revenue - totalExpenses;
            
            return {
                name: month, fullName: `${month} ${selectedYear}`, revenue, expenses: totalExpenses, labour, materials: materialsCost,
                packaging, bills, marketing, other, salesKg, productionKg: effectiveOutput, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
                isActive: revenue > 0 || totalExpenses > 0 || effectiveOutput > 0,
                itemBreakdown: [] // Simplified for now to prevent token overflow
            };
        });
    }, [selectedYear, transactions, productionData, invoiceDiscounts, simHistory]);

    const totalStats = useMemo(() => yearlyData.reduce((a,c)=>({
        revenue: a.revenue + c.revenue, expenses: a.expenses + c.expenses, profit: a.profit + c.netProfit, production: a.production + c.productionKg
    }), {revenue:0, expenses:0, profit:0, production:0}), [yearlyData]);

    const quarterlyData = useMemo(() => {
        const qs = [{n:'Q1', m:['Jan','Feb','Mar']}, {n:'Q2', m:['Apr','May','Jun']}, {n:'Q3', m:['Jul','Aug','Sep']}, {n:'Q4', m:['Oct','Nov','Dec']}];
        return qs.map(q => {
            const ms = yearlyData.filter(m => q.m.includes(m.name));
            const rev = ms.reduce((s,m)=>s+m.revenue,0); const exp = ms.reduce((s,m)=>s+m.expenses,0);
            return { name: q.n, revenue: rev, expenses: exp, profit: rev - exp, isActive: rev > 0 || exp > 0 };
        });
    }, [yearlyData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.25rem 0', color: entry.color, fontSize: '0.85rem' }}>
                            {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const currentRole = localStorage.getItem('user_role') || 'staff';
    const isAdmin = currentRole === 'admin';

    return (
        <div className="animate-fade-in" style={{ color: 'var(--text-primary)' }}>
            {!hasPermission('payouts') ? (
                <div className="glass-panel" style={{ padding: '6rem 2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', margin: '2rem 0' }}>
                    <Shield size={64} color="#ef4444" style={{ marginBottom: '2rem', opacity: 0.8 }} />
                    <h2 style={{ color: '#ef4444', marginBottom: '1.5rem', fontWeight: 800, fontSize: '2rem' }}>Global Access Required</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6, fontSize: '1.1rem' }}>Restricted executive data access.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {!forceTab && (
                                <div className="glass-panel" style={{ display: 'inline-flex', padding: '0.25rem', borderRadius: '0.5rem', background: 'var(--glass-highlight)' }}>
                                    <button onClick={() => setActiveAnalysisSubTab('performance')} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', background: activeAnalysisSubTab === 'performance' ? '#3b82f6' : 'transparent', color: activeAnalysisSubTab === 'performance' ? 'white' : 'var(--text-secondary)', fontWeight: 600 }}>Performance</button>
                                    <button onClick={() => setActiveAnalysisSubTab('profitHub')} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', background: activeAnalysisSubTab === 'profitHub' ? '#3b82f6' : 'transparent', color: activeAnalysisSubTab === 'profitHub' ? 'white' : 'var(--text-secondary)', fontWeight: 600 }}>Profit Hub</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {activeAnalysisSubTab === 'performance' ? (
                        <div key="perf-view">
                            <div className="responsive-grid-4" style={{ marginBottom: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>YTD Revenue</span>
                                    <h3 style={{ margin: '0.5rem 0 0 0', color: '#10b981' }}>{formatCurrency(totalStats.revenue)}</h3>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>YTD Expenses</span>
                                    <h3 style={{ margin: '0.5rem 0 0 0', color: '#ef4444' }}>{formatCurrency(totalStats.expenses)}</h3>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Profit</span>
                                    <h3 style={{ margin: '0.5rem 0 0 0', color: totalStats.profit >= 0 ? '#10b981' : '#f59e0b' }}>{formatCurrency(totalStats.profit)}</h3>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Production (kg)</span>
                                    <h3 style={{ margin: '0.5rem 0 0 0', color: '#3b82f6' }}>{totalStats.production.toLocaleString()}</h3>
                                </div>
                            </div>
                            
                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Financial Trends</h3>
                                <div style={{ height: 300, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <ComposedChart data={yearlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                                            <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} tickFormatter={(v)=>`₹${v/1000}k`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="revenue" name="Revenue" fill="#10b981" opacity={0.8} />
                                            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="profit-hub-container animate-fade-in" style={{ padding: '0' }} key="profit-hub-view">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Wallet size={32} color="#3b82f6" /> Profit Command Center
                                    </h1>
                                </div>
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
                                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 700 }}
                                    >Reset Year Protocol</button>
                                )}
                            </div>

                            {(() => {
                                let totalProfit = 0;
                                let totalReserve = 0;
                                let totalPaid = 0;
                                let totalPending = 0;
                        
                                yearlyData.filter(m => m.isActive).forEach(month => {
                                    const mProfit = month.netProfit || 0;
                                    totalProfit += mProfit;
                        
                                    const mOverride = profitMonthlySettings.find(s => s.month_year === `${month.name} ${selectedYear}`);
                                    const activeReservePct = mOverride ? parseFloat(mOverride.reserve_percentage) : profitReservePct;
                                    totalReserve += (mProfit * activeReservePct) / 100;
                        
                                    profitStakeholders.forEach(s => {
                                        const p = profitPayouts.find(pa => pa.stakeholder_id === s.id && pa.month_year === `${month.name} ${selectedYear}`);
                                        const status = p?.status || 'pending';
                                        const share = (mProfit * (parseFloat(s.default_percent) || 0)) / 100;
                                        
                                        if (status === 'paid') {
                                            totalPaid += share;
                                        } else {
                                            totalPending += share;
                                        }
                                    });
                                });
                                
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Profit Pool</span>
                                            <h3 style={{ margin: '0.5rem 0 0 0', color: '#10b981', fontSize: '1.5rem' }}>{formatCurrency(totalProfit)}</h3>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Distributed</span>
                                            <h3 style={{ margin: '0.5rem 0 0 0', color: '#3b82f6', fontSize: '1.5rem' }}>{formatCurrency(totalPaid)}</h3>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Payouts</span>
                                            <h3 style={{ margin: '0.5rem 0 0 0', color: '#ef4444', fontSize: '1.5rem' }}>{formatCurrency(totalPending)}</h3>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Reserved</span>
                                            <h3 style={{ margin: '0.5rem 0 0 0', color: '#f59e0b', fontSize: '1.5rem' }}>{formatCurrency(totalReserve)}</h3>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem' }}>PERIOD</th>
                                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem' }}>NET PROFIT</th>
                                                {profitStakeholders.map(s => <th key={s.id} style={{ padding: '1rem', fontSize: '0.75rem' }}>{s.name}</th>)}
                                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#f59e0b' }}>RESERVE</th>
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
                                                        <td style={{ padding: '1.25rem 1rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(mProfit)}</td>
                                                        {profitStakeholders.map(s => {
                                                            const p = profitPayouts.find(pa => pa.stakeholder_id === s.id && pa.month_year === `${month.name} ${selectedYear}`);
                                                            const status = p?.status || 'pending';
                                                            const share = (mProfit * (parseFloat(s.default_percent) || 0)) / 100;
                                                            return (
                                                                <td key={s.id} style={{ padding: '1rem' }}>
                                                                    <div style={{ color: status === 'paid' ? '#10b981' : '#3b82f6', fontWeight: 700 }}>{formatCurrency(share)}</div>
                                                                    <select 
                                                                        value={status} 
                                                                        onChange={async (e) => {
                                                                            const newVal = e.target.value;
                                                                            if (p) await supabase.from('profit_payouts').update({ status: newVal, paid_at: newVal === 'paid' ? new Date().toISOString() : null }).eq('id', p.id);
                                                                            else await supabase.from('profit_payouts').insert({ stakeholder_id: s.id, month_year: `${month.name} ${selectedYear}`, amount: share, status: newVal, paid_at: newVal === 'paid' ? new Date().toISOString() : null });
                                                                            await logProfitHubAction('Status Change', { month: `${month.name} ${selectedYear}`, stakeholder: s.name, status: newVal });
                                                                            await fetchProfitHubData();
                                                                        }} 
                                                                        style={{ fontSize: '0.65rem', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: status === 'paid' ? '#10b981' : '#3b82f6' }}
                                                                    >
                                                                        <option value="pending">Wait</option>
                                                                        <option value="paid">Paid</option>
                                                                    </select>
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ padding: '1rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(reserved)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Default Settings</h3>
                                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>SYSTEM RESERVE</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profitReservePct.toFixed(1)}%</div>
                                        </div>
                                        {profitStakeholders.map(s => (
                                            <div key={s.id} style={{ padding: '1rem', background: 'var(--glass-highlight)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{s.name}</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6' }}>{s.default_percent}%</div>
                                            </div>
                                        ))}
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
