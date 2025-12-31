import React, { useMemo } from 'react';
import { Users, IndianRupee } from 'lucide-react';

const CustomerAnalysis = ({ data }) => {
    const sortedCustomers = useMemo(() => {
        return [...data].sort((a, b) => b.revenue - a.revenue);
    }, [data]);

    return (
        <div className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Users /> Customer Insights
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{customer.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Top Customer</p>

                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Revenue</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.revenue)}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Profit</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981' }}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.profit)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>All Customers</h3>
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Customer Name</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Total Revenue</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Total Profit</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Margin</th>
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
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{c.name}</td>
                                        <td style={{ textAlign: 'right', padding: '1rem' }}>
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.revenue)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1rem', color: c.profit < 0 ? '#ef4444' : '#10b981' }}>
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.profit)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1rem' }}>
                                            {((c.profit / c.revenue) * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CustomerAnalysis;
