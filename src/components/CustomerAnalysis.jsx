import React, { useMemo, useState } from 'react';
import { Users, IndianRupee, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const CustomerAnalysis = ({ data, receivables = [] }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });

    // 1. Merge Data and Calculate Derived Metrics
    const customersWithReceivables = useMemo(() => {
        const map = new Map();

        // Add Sales Data
        data.forEach(c => {
            const revenue = parseFloat(c.revenue || 0);
            const profit = parseFloat(c.profit || 0);
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            map.set(c.name.trim().toLowerCase(), {
                ...c,
                revenue,
                profit,
                margin,
                balance: 0
            });
        });

        // Merge Receivables
        receivables.forEach(r => {
            const key = r.customer_name.trim().toLowerCase();
            const balance = parseFloat(r.balance || 0);

            if (map.has(key)) {
                map.get(key).balance = balance;
            } else {
                map.set(key, {
                    name: r.customer_name,
                    revenue: 0,
                    profit: 0,
                    margin: 0,
                    balance: balance
                });
            }
        });

        return Array.from(map.values());
    }, [data, receivables]);

    // 2. Sorting Logic
    const sortedCustomers = useMemo(() => {
        const sortableItems = [...customersWithReceivables];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle strings case-insensitive
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [customersWithReceivables, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc';
        // Toggle direction if already sorted by this key
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        if (sortConfig.direction === 'asc') return <ArrowUp size={14} />;
        return <ArrowDown size={14} />;
    };

    const totalReceivables = useMemo(() => {
        return receivables.reduce((sum, r) => sum + (parseFloat(r.balance || 0)), 0);
    }, [receivables]);

    return (
        <div className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Users /> Customer Insights
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {customersWithReceivables.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Customer Data Found for this Period</p>
                        <p style={{ fontSize: '0.9rem' }}>
                            Daily transactions appear to be Item-based. <br />
                            Upload a "Customer Wise Sales" file with dates to see monthly customer insights.
                        </p>
                    </div>
                ) : (
                    // Show Top 3 based on CURRENT SORT if it makes sense? 
                    // Usually "Top Customers" implies by Revenue. 
                    // Let's keep the Top 3 fixed to REVENUE for the cards (standard dashboard behavior), 
                    // OR follow the sort? User asked for "Sorting option on of All customers list".
                    // The cards are "Top Customer" highlights. Usually these are fixed to Revenue/Importance.
                    // But if I sort by "Balance Due", maybe I want to see top debtors?
                    // Let's stick to Revenue for the cards to avoid confusion, or use a separate sorted list for cards.
                    // I'll create a separate topRevenueCustomers for the cards.
                    [...customersWithReceivables].sort((a, b) => b.revenue - a.revenue).slice(0, 3).map((customer, i) => (
                        <div key={i} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderColor: i === 0 ? 'var(--accent-primary)' : 'var(--glass-border)' }}>
                            <div style={{
                                width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                                fontWeight: 'bold', fontSize: '1.25rem'
                            }}>
                                {i + 1}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{customer.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Top Revenue</p>

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

            {/* Pending Receivables Section - kept separate logic */}
            {(() => {
                const sortedReceivables = [...customersWithReceivables]
                    .filter(c => c.balance < 0)
                    .sort((a, b) => a.balance - b.balance);

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

                            {/* Total Receivables Card */}
                            {receivables.length > 0 && (
                                <div className="glass-panel" style={{
                                    padding: '2rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)',
                                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
                                    transform: 'scale(1.02)'
                                }}>
                                    <div style={{
                                        width: '4rem', height: '4rem', borderRadius: '50%',
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
                                    }}>
                                        <IndianRupee size={32} />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#ffadad', fontWeight: 'bold' }}>Total Receivables</h3>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0', color: '#ef4444', textShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalReceivables)}
                                    </div>
                                    <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>Outstanding from {receivables.length} customers</p>
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
                                <th
                                    onClick={() => requestSort('name')}
                                    style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Customer Name {getSortIcon('name')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => requestSort('revenue')}
                                    style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        Revenue {getSortIcon('revenue')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => requestSort('profit')}
                                    style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        Profit {getSortIcon('profit')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => requestSort('margin')}
                                    style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        Margin {getSortIcon('margin')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => requestSort('balance')}
                                    style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        Balance Due {getSortIcon('balance')}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                                            {c.margin ? c.margin.toFixed(1) + '%' : '-'}
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
        </div>
    );
};

export default CustomerAnalysis;
