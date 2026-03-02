import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { Calendar, TrendingUp, DollarSign, Activity } from 'lucide-react';

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
            let materials = 0;
            let packaging = 0;
            let bills = 0;
            let other = 0;

            let salesKg = 0;
            let productionKg = 0;

            
            // 1. Process Transactions (Revenue, Expenses, Sales Kg)
            
            // Replicate Dashboard Deduplication for Sales
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
                
                // Calculate Revenue and Sales Kg
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
                    const isExplicitOther = nameUpper.includes('OTHER EXP');

                    if (isMaterial && !isEssential && !isExplicitOther) {
                        materials += amount;
                    } else if (isWater) {
                        materials += amount;
                    } else if (isLabour && !nameUpper.includes('OTHER EXP')) {
                        labour += amount;
                    } else if (isPackaging) {
                        packaging += amount;
                    } else if (isBills) {
                        bills += amount;
                    } else if (isMarketing && !isEssential && !nameUpper.includes('INVOICE DISCOUNT')) {
                        // Put marketing in Other for this table since there's no marketing column
                        other += amount;
                    } else {
                        other += amount;
                    }
                });
            }
            // 2. Process Production (Stock Output Kg)
            if (productionData?.postProduction) {
                productionData.postProduction.forEach(item => {
                    if (item.date && item.date.startsWith(targetPrefix)) {
                        productionKg += parseFloat(item.weight || 0);
                    }
                });
            }

            // Fallback for missing prod logs: If we sold X, we must have produced X
            const effectiveOutput = Math.max(productionKg, salesKg);

            // Calculate per KG metrics
            const grossProfit = revenue - materials - packaging; // Direct cost of goods sold roughly
            const netProfit = revenue - totalExpenses;

            const costPerKg = effectiveOutput > 0 ? (totalExpenses / effectiveOutput) : 0;
            const revenuePerKg = effectiveOutput > 0 ? (revenue / effectiveOutput) : 0;
            const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

            return {
                name: month,
                fullName: `${month} ${selectedYear}`,
                revenue,
                expenses: totalExpenses,
                labour,
                materials,
                packaging,
                bills,
                other,
                salesKg,
                productionKg: effectiveOutput,
                netProfit,
                margin,
                costPerKg,
                revenuePerKg,
                isActive: revenue > 0 || totalExpenses > 0 || effectiveOutput > 0 // Flag if month has actual data
            };
        });

        return aggregated;
    }, [selectedYear, transactions, productionData]);

    // Active Data (Filter out months in the future with absolutely 0 activity)
    // Actually, for a comparison table, full 12 months is better structure.

    // Calculate Totals / Averages for Active Months
    const totalStats = useMemo(() => {
        const activeMonths = yearlyData.filter(d => d.isActive);
        const count = activeMonths.length || 1;

        return yearlyData.reduce((acc, curr) => ({
            revenue: acc.revenue + curr.revenue,
            expenses: acc.expenses + curr.expenses,
            profit: acc.profit + curr.netProfit,
            production: acc.production + curr.productionKg,
            sales: acc.sales + curr.salesKg
        }), { revenue: 0, expenses: 0, profit: 0, production: 0, sales: 0 });
    }, [yearlyData]);

    const bestMonth = useMemo(() => {
        const active = yearlyData.filter(d => d.isActive);
        if (active.length === 0) return null;
        return active.reduce((max, curr) => curr.netProfit > max.netProfit ? curr : max, active[0]);
    }, [yearlyData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.25rem 0', color: entry.color, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                            <span>{entry.name}:</span>
                            <span style={{ fontWeight: 600 }}>{entry.name?.includes('Kg') || entry.name?.includes('Production') ? entry.value.toLocaleString() + ' kg' : formatCurrency(entry.value)}</span>
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
                <div style={{ background: 'var(--glass-highlight)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} /> Total YTD Revenue
                    </p>
                    <h3 style={{ fontSize: '1.75rem', margin: 0, color: '#10b981' }}>{formatCurrency(totalStats.revenue)}</h3>
                </div>
                <div style={{ background: 'var(--glass-highlight)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={16} /> Total YTD Expenses
                    </p>
                    <h3 style={{ fontSize: '1.75rem', margin: 0, color: '#ef4444' }}>{formatCurrency(totalStats.expenses)}</h3>
                </div>
                <div style={{ background: 'var(--glass-highlight)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={16} /> Net YTD Profit
                    </p>
                    <h3 style={{ fontSize: '1.75rem', margin: 0, color: totalStats.profit >= 0 ? '#10b981' : '#f59e0b' }}>
                        {formatCurrency(totalStats.profit)}
                    </h3>
                </div>
                <div style={{ background: 'var(--glass-highlight)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} /> Most Profitable Month
                    </p>
                    <h3 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--accent-primary)' }}>
                        {bestMonth ? bestMonth.name : 'N/A'}
                    </h3>
                    {bestMonth && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatCurrency(bestMonth.netProfit)}</span>}
                </div>
            </div>

            {/* Financial Trend Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} color="#3b82f6" />
                    Financial Trends ({selectedYear})
                </h3>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <ComposedChart data={yearlyData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                            <YAxis
                                stroke="var(--text-secondary)"
                                tick={{ fill: 'var(--text-secondary)' }}
                                tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '1rem' }} />
                            <Bar dataKey="revenue" name="Revenue" fill="url(#colorRev)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Data Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} color="#10b981" />
                        Month-by-Month Breakdown ({selectedYear})
                    </h3>
                </div>
                <div style={{ overflowX: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 500, borderRight: '1px solid var(--glass-border)' }}>Summary</th>
                                {yearlyData.map(m => (
                                    <th key={m.name} style={{ width: '100px', minWidth: '80px', padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: 600, background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* REVENUE ROW */}
                            <tr>
                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#10b981', borderRight: '1px solid var(--glass-border)' }}>Total Revenue</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.75rem 0.5rem', color: m.revenue > 0 ? '#10b981' : 'var(--text-secondary)', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.revenue > 0 ? formatCurrency(m.revenue) : '-'}
                                    </td>
                                ))}
                            </tr>

                            {/* EXPENSES ROWS */}
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderRight: '1px solid var(--glass-border)' }}>└ Materials</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.materials > 0 ? formatCurrency(m.materials) : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderRight: '1px solid var(--glass-border)' }}>└ Packaging</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.packaging > 0 ? formatCurrency(m.packaging) : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderRight: '1px solid var(--glass-border)' }}>└ Labour</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.labour > 0 ? formatCurrency(m.labour) : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderRight: '1px solid var(--glass-border)' }}>└ Bills/Rent</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.bills > 0 ? formatCurrency(m.bills) : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <td style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderRight: '1px solid var(--glass-border)' }}>└ Other</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.other > 0 ? formatCurrency(m.other) : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#ef4444', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Total Expenses</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: m.expenses > 0 ? '#ef4444' : 'var(--text-secondary)', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.expenses > 0 ? formatCurrency(m.expenses) : '-'}
                                    </td>
                                ))}
                            </tr>

                            {/* PROFIT ROW */}
                            <tr>
                                <td style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: 'bold', color: 'var(--text-primary)', borderBottom: '2px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)', fontSize: '1.1rem' }}>Net Profit</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', fontWeight: 'bold', color: m.netProfit > 0 ? '#10b981' : (m.netProfit < 0 ? '#ef4444' : 'var(--text-secondary)'), background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.isActive ? formatCurrency(m.netProfit) : '-'}
                                    </td>
                                ))}
                            </tr>

                            {/* KPI ROWS */}
                            <tr>
                                <td colSpan={13} style={{ textAlign: 'left', padding: '1.5rem 0.5rem 0.5rem 0.5rem', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Operational Metrics</td>
                            </tr>
                            <tr style={{ background: 'var(--glass-highlight)' }}>
                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--text-primary)', borderRight: '1px solid var(--glass-border)' }}>Production Output (kg)</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.productionKg > 0 ? m.productionKg.toLocaleString() : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr style={{ background: 'var(--glass-highlight)' }}>
                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--text-primary)', borderRight: '1px solid var(--glass-border)' }}>Sales Volume (kg)</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.salesKg > 0 ? m.salesKg.toLocaleString() : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--glass-border)' }}>Cost per kg</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        {m.costPerKg > 0 ? `₹${m.costPerKg.toFixed(2)}` : '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>Profit Margin</td>
                                {yearlyData.map(m => (
                                    <td key={m.name} style={{ padding: '0.75rem 0.5rem', color: m.margin > 0 ? '#10b981' : 'var(--text-secondary)', background: m.isActive ? 'transparent' : 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--glass-border)' }}>
                                        {m.isActive ? `${m.margin.toFixed(1)}%` : '-'}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default YearlyAnalysis;
