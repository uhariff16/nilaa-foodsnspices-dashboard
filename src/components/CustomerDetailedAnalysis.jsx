import React, { useMemo, useState } from 'react';
import { IndianRupee, ArrowUpDown, ArrowUp, ArrowDown, BarChart2, Clock, AlertCircle, CheckCircle, Search, Filter } from 'lucide-react';

const CustomerDetailedAnalysis = ({ data, receivables = [] }) => {
    const [activeSubTab, setActiveSubTab] = useState('sales'); // 'sales' | 'overdue'
    const [salesSort, setSalesSort] = useState({ key: 'revenue', direction: 'desc' });
    const [overdueSort, setOverdueSort] = useState({ key: 'aging', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Data Preparation
    const customersWithReceivables = useMemo(() => {
        const map = new Map();

        // Initialize from daily transactions
        data.forEach(c => {
            const revenue = parseFloat(c.revenue || 0);
            const profit = parseFloat(c.profit || 0);
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            map.set(c.name.trim().toLowerCase(), {
                name: c.name,
                revenue,
                profit,
                margin,
                totalBalance: 0,
                invoices: []
            });
        });

        // Merge Receivables / Overdue Data
        receivables.forEach(r => {
            const key = (r.customer_name || '').trim().toLowerCase();
            const balance = parseFloat(r.balance || 0);

            if (map.has(key)) {
                const cust = map.get(key);
                cust.totalBalance += balance;
                cust.invoices.push(r);
            } else {
                map.set(key, {
                    name: r.customer_name,
                    revenue: 0,
                    profit: 0,
                    margin: 0,
                    totalBalance: balance,
                    invoices: [r]
                });
            }
        });

        return Array.from(map.values());
    }, [data, receivables]);

    // 2. Sorting & Filtering
    const filteredCustomers = useMemo(() => {
        return customersWithReceivables.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customersWithReceivables, searchTerm]);

    const sortedSalesData = useMemo(() => {
        return [...filteredCustomers].sort((a, b) => {
            const valA = a[salesSort.key];
            const valB = b[salesSort.key];
            if (valA < valB) return salesSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return salesSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredCustomers, salesSort]);

    const allInvoices = useMemo(() => {
        const list = [];
        filteredCustomers.forEach(c => {
            c.invoices.forEach(inv => {
                list.push({ ...inv, customerName: c.name });
            });
        });
        return list;
    }, [filteredCustomers]);

    const sortedOverdueData = useMemo(() => {
        return [...allInvoices].sort((a, b) => {
            let valA = a[overdueSort.key];
            let valB = b[overdueSort.key];

            if (overdueSort.key === 'aging' || overdueSort.key === 'balance' || overdueSort.key === 'amount') {
                valA = parseFloat(valA || 0);
                valB = parseFloat(valB || 0);
            }

            if (valA < valB) return overdueSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return overdueSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [allInvoices, overdueSort]);

    // Top Highlights
    const topRevenueCustomers = useMemo(() => {
        return [...customersWithReceivables].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
    }, [customersWithReceivables]);

    const topOverdueCustomers = useMemo(() => {
        return [...customersWithReceivables].sort((a, b) => b.totalBalance - a.totalBalance).slice(0, 3);
    }, [customersWithReceivables]);

    const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const getSortIcon = (currentSort, key) => {
        if (currentSort.key !== key) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        return currentSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    <BarChart2 /> Customer Analysis
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--glass-border)', padding: '0.3rem', borderRadius: '0.75rem' }}>
                    <button
                        onClick={() => setActiveSubTab('sales')}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.875rem', cursor: 'pointer',
                            background: activeSubTab === 'sales' ? 'var(--accent-primary)' : 'transparent',
                            color: activeSubTab === 'sales' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 600, transition: 'all 0.2s'
                        }}
                    >
                        Sales Analysis
                    </button>
                    <button
                        onClick={() => setActiveSubTab('overdue')}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.875rem', cursor: 'pointer',
                            background: activeSubTab === 'overdue' ? 'var(--accent-primary)' : 'transparent',
                            color: activeSubTab === 'overdue' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 600, transition: 'all 0.2s'
                        }}
                    >
                        Overdue Details
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'var(--glass-highlight)',
                        border: '1px solid var(--glass-border)', borderRadius: '0.75rem', color: 'var(--text-primary)',
                        outline: 'none', fontSize: '1rem'
                    }}
                />
            </div>

            {activeSubTab === 'sales' ? (
                <>
                    {/* Sales Highlights */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {topRevenueCustomers.map((c, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${i === 0 ? '#fbbf24' : (i === 1 ? '#94a3b8' : '#cd7f32')}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                        {i === 0 ? 'Top Performer' : (i === 1 ? 'Runner Up' : 'Elite Customer')}
                                    </span>
                                    <BarChart2 size={16} color="var(--accent-primary)" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{c.name}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Revenue</p>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatINR(c.revenue)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Margin</p>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: c.margin > 15 ? '#10b981' : 'var(--text-primary)' }}>{c.margin.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sales Table */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Customer Sales Breakdown</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }} onClick={() => setSalesSort(p => ({ key: 'name', direction: p.key === 'name' && p.direction === 'asc' ? 'desc' : 'asc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Customer {getSortIcon(salesSort, 'name')}</div>
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer' }} onClick={() => setSalesSort(p => ({ key: 'revenue', direction: p.key === 'revenue' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>Revenue {getSortIcon(salesSort, 'revenue')}</div>
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer' }} onClick={() => setSalesSort(p => ({ key: 'profit', direction: p.key === 'profit' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>Profit {getSortIcon(salesSort, 'profit')}</div>
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer' }} onClick={() => setSalesSort(p => ({ key: 'margin', direction: p.key === 'margin' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>Margin {getSortIcon(salesSort, 'margin')}</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSalesData.map((c, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500, textTransform: 'uppercase' }}>{c.name}</td>
                                            <td style={{ textAlign: 'right', padding: '1rem' }}>{formatINR(c.revenue)}</td>
                                            <td style={{ textAlign: 'right', padding: '1rem', color: c.profit > 0 ? '#10b981' : (c.profit < 0 ? '#ef4444' : 'inherit') }}>{formatINR(c.profit)}</td>
                                            <td style={{ textAlign: 'right', padding: '1rem' }}>{c.margin.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Overdue Highlights */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {topOverdueCustomers.filter(c => c.totalBalance > 0).map((c, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#fca5a5' }}>
                                        High Priority Collection
                                    </span>
                                    <Clock size={16} color="#ef4444" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{c.name}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Outstanding</p>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ef4444' }}>{formatINR(c.totalBalance)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Invoices</p>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{c.invoices.length}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Invoices Table */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Detailed Overdue Invoices</h3>
                        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '1rem' }}>Invoice #</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }} onClick={() => setOverdueSort(p => ({ key: 'customerName', direction: p.key === 'customerName' && p.direction === 'asc' ? 'desc' : 'asc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Customer {getSortIcon(overdueSort, 'customerName')}</div>
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }} onClick={() => setOverdueSort(p => ({ key: 'date', direction: p.key === 'date' && p.direction === 'asc' ? 'desc' : 'asc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Date {getSortIcon(overdueSort, 'date')}</div>
                                        </th>
                                        <th style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }} onClick={() => setOverdueSort(p => ({ key: 'aging', direction: p.key === 'aging' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>Aging (Days) {getSortIcon(overdueSort, 'aging')}</div>
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem', cursor: 'pointer' }} onClick={() => setOverdueSort(p => ({ key: 'balance', direction: p.key === 'balance' && p.direction === 'desc' ? 'asc' : 'desc' }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>Pending {getSortIcon(overdueSort, 'balance')}</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedOverdueData.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No overdue records found for the current selection.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedOverdueData.map((inv, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: 600,
                                                        background: String(inv.status || '').toLowerCase().includes('pending') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: String(inv.status || '').toLowerCase().includes('pending') ? '#ef4444' : '#10b981',
                                                        border: `1px solid ${String(inv.status || '').toLowerCase().includes('pending') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                                    }}>
                                                        {inv.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>#{inv.invoice_no || 'N/A'}</td>
                                                <td style={{ padding: '1rem', fontWeight: 500, textTransform: 'uppercase' }}>{inv.customerName || inv.customer_name || 'UNKNOWN'}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{inv.date || '-'}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        color: (inv.aging || 0) > 30 ? '#ef4444' : ((inv.aging || 0) > 15 ? '#f59e0b' : 'inherit'),
                                                        fontWeight: (inv.aging || 0) > 15 ? 700 : 400
                                                    }}>
                                                        {inv.aging || 0}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '1rem', fontWeight: 700, color: '#ef4444' }}>{formatINR(inv.balance || inv.balanceDue || 0)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomerDetailedAnalysis;
