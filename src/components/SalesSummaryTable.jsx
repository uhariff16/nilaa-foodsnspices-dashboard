import React, { useMemo } from 'react';
import { TrendingUp, Calendar, Package } from 'lucide-react';

const extractKgFromItemName = (name) => {
    if (!name) return 1;
    const lowerName = name.toLowerCase();
    
    const kgMatch = lowerName.match(/([\d.]+)\s*kg/);
    if (kgMatch) return parseFloat(kgMatch[1]);
    
    const gmMatch = lowerName.match(/([\d.]+)\s*g(?:m|rams?)?\b/);
    if (gmMatch) return parseFloat(gmMatch[1]) / 1000;
    
    const ltrMatch = lowerName.match(/([\d.]+)\s*ltr/);
    if (ltrMatch) return parseFloat(ltrMatch[1]);
    
    const mlMatch = lowerName.match(/([\d.]+)\s*ml\b/);
    if (mlMatch) return parseFloat(mlMatch[1]) / 1000;
    
    return 1;
};

const SalesSummaryTable = ({ transactions, groupBy = 'date' }) => {
    const summary = useMemo(() => {
        const grouped = {};
        let totalSales = 0;
        let totalAllKg = 0;

        transactions.forEach(t => {
            let key;
            if (groupBy === 'item') {
                key = (t.originalDesc || 'Unknown Item').trim();
            } else {
                key = t.parsedDate;
            }

            if (!grouped[key]) grouped[key] = { key, amount: 0, count: 0, totalKg: 0 };
            grouped[key].amount += Math.abs(t.parsedAmount || 0); // Always positive for sales
            if (groupBy === 'item') {
                const qty = parseFloat(t.parsedQty) || 1;
                grouped[key].count += qty;
                const kg = qty * extractKgFromItemName(key);
                grouped[key].totalKg += kg;
                totalAllKg += kg;
            } else {
                grouped[key].count += 1; // In 'date' groupBy, this counts the number of row entries
            }
            totalSales += Math.abs(t.parsedAmount || 0);
        });

        const list = Object.values(grouped).sort((a, b) => {
            if (groupBy === 'date') return new Date(a.key) - new Date(b.key);
            return b.amount - a.amount; // Sort Items by Sales Value (High to Low)
        });

        return { list, total: totalSales, totalAllKg };
    }, [transactions, groupBy]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {groupBy === 'item' ? 'Sales by Item' : 'Daily Sales Performance'}
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {groupBy === 'item' && (
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                            Total Weight: {summary.totalAllKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Kg
                        </span>
                    )}
                    <span className="badge-success" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                        Total Value: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.total)}
                    </span>
                </div>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {groupBy === 'item' ? 'Item Name' : 'Date'}
                            </th>
                            <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{groupBy === 'item' ? 'Qty Sold' : 'Entries'}</th>
                            {groupBy === 'item' && (
                                <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Kg Sold</th>
                            )}
                            <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Sales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.list.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {groupBy === 'item' ? (
                                        <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)' }}>
                                            <Package size={14} color="#3b82f6" />
                                        </div>
                                    ) : (
                                        <Calendar size={14} color="var(--text-secondary)" />
                                    )}
                                    <span style={{ fontWeight: groupBy === 'item' ? 500 : 400 }}>
                                        {item.key}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{item.count}</td>
                                {groupBy === 'item' && (
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {item.totalKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Kg
                                        </span>
                                    </td>
                                )}
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.amount)}
                                </td>
                            </tr>
                        ))}
                        {summary.list.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No sales data available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesSummaryTable;
