import React, { useMemo } from 'react';
import { Users, IndianRupee } from 'lucide-react';

const CustomerAnalysis = ({ data, receivables = [] }) => {
    // 1. Merge Data
    const customersWithReceivables = useMemo(() => {
        const map = new Map();

        // Add Sales Data
        data.forEach(c => {
            map.set(c.name.trim().toLowerCase(), { ...c, balance: 0 });
        });

        // Merge Receivables
        receivables.forEach(r => {
            const key = r.customer_name.trim().toLowerCase();
            if (map.has(key)) {
                map.get(key).balance = r.balance;
            } else {
                map.set(key, {
                    name: r.customer_name,
                    revenue: 0,
                    profit: 0,
                    balance: r.balance
                });
            }
        });

        return Array.from(map.values());
    }, [data, receivables]);

    const sortedCustomers = useMemo(() => {
        return [...customersWithReceivables].sort((a, b) => b.revenue - a.revenue);
    }, [customersWithReceivables]);

    const totalReceivables = useMemo(() => {
        return receivables.reduce((sum, r) => sum + (r.balance || 0), 0);
    }, [receivables]);

    return (
        <div className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Users /> Customer Insights
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>


                {sortedCustomers.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Customer Data Found for this Period</p>
                        <p style={{ fontSize: '0.9rem' }}>
                            Daily transactions appear to be Item-based. <br />
                            Upload a "Customer Wise Sales" file with dates to see monthly customer insights.
                        </p>
                    </div>
                ) : (
                    sortedCustomers.slice(0, 3).map((customer, i) => (
                        <div key={i} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderColor: i === 0 ? 'var(--accent-primary)' : 'var(--glass-border)' }}>
                            <div style={{
                                width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                                fontWeight: 'bold', fontSize: '1.25rem'
                            }}>
                                {i + 1}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{customer.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Top Customer</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', width: '100%' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Revenue</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.revenue)}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Profit</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '1rem', color: customer.profit > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                                        {customer.profit ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.profit) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Balance</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '1rem', color: customer.balance < 0 ? '#ef4444' : (customer.balance > 0 ? '#f59e0b' : 'var(--text-secondary)') }}>
                                        {customer.balance ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.balance) : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pending Receivables Section */}
            {(() => {
                const sortedReceivables = [...customersWithReceivables]
                    .filter(c => c.balance < 0)
                    .sort((a, b) => a.balance - b.balance); // Ascending because they are negative (e.g. -100 is "larger" debt than -10)

                if (sortedReceivables.length === 0) return null;

                return (
                    <>
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Receivables Overview</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            {sortedReceivables.slice(0, 3).map((customer, i) => (
                                <div key={i} className="glass-panel" style={{
                                    padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                                    borderColor: '#ef4444',
                                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)'
                                }}>
                                    <div style={{
                                        width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                                        fontWeight: 'bold', fontSize: '1.25rem'
                                    }}>
                                        {i + 1}
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{customer.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Payment Pending</p>

                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0', color: '#ef4444' }}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.balance)}
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Outstanding Balance</p>
                                </div>
                            ))}

                            {/* Total Receivables Card (Moved to End) */}
                            {receivables.length > 0 && (
                                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderColor: totalReceivables < 0 ? '#ef4444' : 'var(--accent-primary)' }}>
                                    <div style={{
                                        width: '3rem', height: '3rem', borderRadius: '50%',
                                        background: totalReceivables < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: totalReceivables < 0 ? '#ef4444' : '#10b981',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
                                    }}>
                                        <IndianRupee size={24} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Total Receivables</h3>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: totalReceivables < 0 ? '#ef4444' : '#10b981' }}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalReceivables)}
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Outstanding from {receivables.length} customers</p>
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>All Customers</h3>
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Customer Name</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Revenue</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Profit</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Margin</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No customer data available for this month.<br />
                                        Please ensure your data source contains dated customer records.
                                    </td>
                                </tr>
                            ) : (
                                sortedCustomers.map((c, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500, textTransform: 'uppercase' }}>{c.name}</td>
                                        <td style={{ textAlign: 'right', padding: '1rem' }}>
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.revenue)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1rem', color: c.profit < 0 ? '#ef4444' : (c.profit > 0 ? '#10b981' : 'var(--text-secondary)') }}>
                                            {c.profit ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.profit) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1rem' }}>
                                            {c.profit && c.revenue ? ((c.profit / c.revenue) * 100).toFixed(1) + '%' : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1rem', fontWeight: c.balance !== 0 ? 'bold' : 'normal', color: c.balance < 0 ? '#ef4444' : (c.balance > 0 ? '#f59e0b' : 'inherit') }}>
                                            {c.balance ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.balance) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Removed Separate Receivables Table */}
        </div>
    );
};

export default CustomerAnalysis;
