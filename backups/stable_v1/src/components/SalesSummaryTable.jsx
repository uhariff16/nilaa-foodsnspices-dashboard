import React, { useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

const SalesSummaryTable = ({ transactions }) => {
    const summary = useMemo(() => {
        const grouped = {};
        let totalSales = 0;

        transactions.forEach(t => {
            const date = t.parsedDate;
            if (!grouped[date]) grouped[date] = { date, amount: 0, count: 0 };
            grouped[date].amount += t.parsedAmount;
            grouped[date].count += 1;
            totalSales += t.parsedAmount;
        });

        return {
            daily: Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date)),
            total: totalSales
        };
    }, [transactions]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Daily Sales Performance</h3>
                <span className="badge-success">
                    Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.total)}
                </span>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</th>
                            <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Transactions</th>
                            <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Sales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.daily.map((day, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={14} color="var(--text-secondary)" />
                                    {day.date}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{day.count}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(day.amount)}
                                </td>
                            </tr>
                        ))}
                        {summary.daily.length === 0 && (
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
