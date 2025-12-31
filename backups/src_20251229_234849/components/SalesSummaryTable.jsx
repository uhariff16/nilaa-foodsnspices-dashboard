import React, { useMemo } from 'react';
import { TrendingUp, Calendar, Package } from 'lucide-react';

const SalesSummaryTable = ({ transactions, groupBy = 'date' }) => {
    const summary = useMemo(() => {
        const grouped = {};
        let totalSales = 0;

        transactions.forEach(t => {
            let key;
            if (groupBy === 'item') {
                key = (t.originalDesc || 'Unknown Item').trim();
            } else {
                key = t.parsedDate;
            }

            if (!grouped[key]) grouped[key] = { key, amount: 0, count: 0 };
            grouped[key].amount += Math.abs(t.parsedAmount || 0); // Always positive for sales
            grouped[key].count += 1;
            totalSales += Math.abs(t.parsedAmount || 0);
        });

        const list = Object.values(grouped).sort((a, b) => {
            if (groupBy === 'date') return new Date(a.key) - new Date(b.key);
            return b.amount - a.amount; // Sort Items by Sales Value (High to Low)
        });

        return { list, total: totalSales };
    }, [transactions, groupBy]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {groupBy === 'item' ? 'Sales by Item' : 'Daily Sales Performance'}
                </h3>
                <span className="badge-success">
                    Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.total)}
                </span>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {groupBy === 'item' ? 'Item Name' : 'Date'}
                            </th>
                            <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Transactions</th>
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
