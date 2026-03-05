import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart, Line, Cell } from 'recharts';
import { Calendar, TrendingUp, DollarSign, Activity, Wheat, Target, AlertTriangle, CheckCircle, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val || 0);
};

const YearlyAnalysis = ({ selectedYear, transactions = [], productionData = {} }) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
                        if (group.totals.length > 0) {
                            if (group.totals.length === 1) selectedSalesRows.push(group.totals[0]);
                            else {
                                const sorted = [...group.totals].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                                selectedSalesRows.push(sorted[0]);
                            }
                        } else {
                            selectedSalesRows.push(...group.granular);
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
                    revenue += Math.abs(parseFloat(t.parsedAmount || 0));
                    salesKg += parseFloat(t.parsedQty || 0);
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
                        productionKgValue += parseFloat(item.weight || 0);
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
                netProfit,
                margin,
                costPerKg,
                revenuePerKg,
                yieldPercent,
                isActive: revenue > 0 || totalExpenses > 0 || effectiveOutput > 0 || purchasesKgValue > 0 || productionInputKgValue > 0
            };
        });

        return aggregated;
    }, [selectedYear, transactions, productionData]);

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
                title: 'Rising Operational Cost',
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
            {/* Header Totals */}
            <div className="responsive-grid-4" style={{ marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={14} /> Total YTD Revenue
                    </p>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#10b981' }}>{formatCurrency(totalStats.revenue)}</h3>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={14} /> Total YTD Expenses
                    </p>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#ef4444' }}>{formatCurrency(totalStats.expenses)}</h3>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <TrendingUp size={14} /> Net YTD Profit
                    </p>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, color: totalStats.profit >= 0 ? '#10b981' : '#f59e0b' }}>
                        {formatCurrency(totalStats.profit)}
                    </h3>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Wheat size={14} /> YTD Production
                    </p>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-primary)' }}>
                        {totalStats.production.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>kg</span>
                    </h3>
                </div>
            </div>

            {/* Strategic Recommendations */}
            {recommendations.length > 0 && (
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* Financial Trend */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
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

                {/* Production Trend */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Wheat size={18} color="#f59e0b" />
                        Production & Yield Trends
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={yearlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: 12 }} />
                                <Bar dataKey="peeledKg" name="Production Input (kg)" fill="rgba(59, 130, 246, 0.5)" radius={[4, 4, 0, 0]} maxBarSize={25} />
                                <Bar dataKey="productionKg" name="Paste Output (kg)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

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
                                <td style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}>Operational Cost / kg</td>
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
