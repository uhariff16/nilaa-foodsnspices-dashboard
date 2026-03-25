import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Award, Clock, MapPin, Phone, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const CustomerInsights = ({ selectedMonth }) => {
    const [loading, setLoading] = useState(true);
    const [topPerformers, setTopPerformers] = useState([]);
    const [customerStats, setCustomerStats] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [searchTermStats, setSearchTermStats] = useState('');
    const [searchTermRec, setSearchTermRec] = useState('');
    const [sortConfigStats, setSortConfigStats] = useState({ key: 'profit', direction: 'desc' });
    const [sortConfigRec, setSortConfigRec] = useState({ key: 'balance_due', direction: 'desc' });

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Convert "Mar 2026" to "2026-03-01"
            const getMonthDate = (mStr) => {
                if (!mStr || mStr === 'Overall') return null;
                const parts = mStr.split(' ');
                if (parts.length < 2) return null;
                const [m, y] = parts;
                const mIdx = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(m);
                if (mIdx === -1) return null;
                return `${y}-${String(mIdx + 1).padStart(2, '0')}-01`;
            };

            const targetDate = getMonthDate(selectedMonth);

            // 1. Fetch Customer Stats (Profit & Revenue)
            let query = supabase
                .from('customer_stats')
                .select('*');
            
            if (targetDate) {
                query = query.eq('date', targetDate);
            }

            const { data: statsData, error: statsError } = await query.order('profit', { ascending: false });

            if (statsError) throw statsError;
            
            let finalStats = statsData;
            if (!targetDate) {
                // Aggregate by customer_name if Overall selected
                const aggregated = {};
                (statsData || []).forEach(s => {
                    const name = s.customer_name || s.name;
                    if (!aggregated[name]) {
                        aggregated[name] = { ...s, revenue: 0, profit: 0 };
                    }
                    aggregated[name].revenue += Number(s.revenue || 0);
                    aggregated[name].profit += Number(s.profit || 0);
                });
                finalStats = Object.values(aggregated).sort((a, b) => b.profit - a.profit);
            }

            setTopPerformers(finalStats.slice(0, 3));
            setCustomerStats(finalStats);

            // 2. Fetch Receivables
            const { data: recData, error: recError } = await supabase
                .from('customer_receivables')
                .select('*');

            if (recError) throw recError;
            
            // Sort by absolute balance descending (biggest debtors first)
            const sortedRec = (recData || []).sort((a, b) => 
                Math.abs(Number(b.balance_due)) - Math.abs(Number(a.balance_due))
            );
            setReceivables(sortedRec);

        } catch (err) {
            console.error("Error fetching insights:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    const handleSort = (config, setConfig, key) => {
        let direction = 'desc';
        if (config.key === key && config.direction === 'desc') {
            direction = 'asc';
        }
        setConfig({ key, direction });
    };

    const getSortedAndFilteredData = (data, searchTerm, sortConfig) => {
        let processed = [...data];
        
        // Filter
        if (searchTerm) {
            processed = processed.filter(item => 
                (item.customer_name || item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        processed.sort((a, b) => {
            let aVal, bVal;
            
            if (sortConfig.key === 'margin') {
                aVal = a.revenue > 0 ? (a.profit / a.revenue) : 0;
                bVal = b.revenue > 0 ? (b.profit / b.revenue) : 0;
            } else {
                aVal = a[sortConfig.key];
                bVal = b[sortConfig.key];
            }
            
            // Numeric sort for financial columns
            if (['profit', 'revenue', 'balance_due', 'amount', 'margin'].includes(sortConfig.key)) {
                // Use signed values for profit/margin, but absolute for balance_due (per user signs)
                const aNum = sortConfig.key === 'balance_due' ? Math.abs(Number(aVal || 0)) : Number(aVal || 0);
                const bNum = sortConfig.key === 'balance_due' ? Math.abs(Number(bVal || 0)) : Number(bVal || 0);
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            // String sort for names
            const aStr = String(aVal || '').toLowerCase();
            const bStr = String(bVal || '').toLowerCase();
            if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return processed;
    };

    const filteredAndSortedStats = getSortedAndFilteredData(customerStats, searchTermStats, sortConfigStats);
    const filteredAndSortedRec = getSortedAndFilteredData(receivables, searchTermRec, sortConfigRec);

    const SortIcon = ({ config, columnKey }) => {
        if (config.key !== columnKey) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.3 }} />;
        return config.direction === 'asc' ? 
            <ChevronUp size={12} style={{ marginLeft: '4px', color: '#3b82f6' }} /> : 
            <ChevronDown size={12} style={{ marginLeft: '4px', color: '#3b82f6' }} />;
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '400px', flexDirection: 'column', gap: '1rem' }}>
                <div className="spin-slow">
                    <Users size={48} color="#3b82f6" />
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>Analyzing Customer Performance...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            
            {/* Top 3 Performers Section */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Award color="#fbbf24" size={24} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Top 3 Performers</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {topPerformers.map((customer, index) => (
                        <div key={customer.name} className="glass-panel" style={{ 
                            padding: '1.5rem', 
                            position: 'relative', 
                            border: index === 0 ? '1px solid #fbbf24' : '1px solid var(--glass-border)',
                            background: index === 0 ? 'rgba(251, 191, 36, 0.05)' : 'var(--glass-bg)'
                        }}>
                            {index === 0 && (
                                <div style={{ position: 'absolute', top: '-0.75rem', right: '1rem', background: '#fbbf24', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                                    PLATINUM PARTNER
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>RANK #{index + 1}</p>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{customer.customer_name || customer.name}</h3>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                    <TrendingUp color="#10b981" size={20} />
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>TOTAL REVENUE</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{formatCurrency(customer.revenue)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>NET PROFIT</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(customer.profit)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>MARGIN %</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                        {customer.revenue > 0 ? ((customer.profit / customer.revenue) * 100).toFixed(1) + '%' : '0.0%'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Receivables Summary</h3>
                        {receivables.length > 0 && receivables[0].created_at && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                                <Clock size={12} /> Data as of: {new Date(receivables[0].created_at).toLocaleDateString()} {new Date(receivables[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <div style={{ flex: 1, padding: '1.25rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL OUTSTANDING</p>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fca5a5', margin: 0 }}>
                                {formatCurrency(receivables.reduce((sum, r) => sum + Math.abs(r.balance_due || 0), 0))}
                            </p>
                        </div>
                        <div style={{ minWidth: '200px', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE DEBTORS</p>
                            <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>{receivables.filter(r => Math.abs(r.balance_due) > 0).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Profit Ranking */}
                <div className="glass-panel" style={{ padding: '0' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Profit Ranking</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTermStats}
                                onChange={(e) => setSearchTermStats(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', padding: '0.4rem 0.75rem 0.4rem 2rem', color: 'var(--text-primary)', fontSize: '0.75rem', width: '160px' }}
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: '450px', overflowY: 'auto', padding: '0.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th 
                                        onClick={() => handleSort(sortConfigStats, setSortConfigStats, 'customer_name')}
                                        style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Customer <SortIcon config={sortConfigStats} columnKey="customer_name" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort(sortConfigStats, setSortConfigStats, 'revenue')}
                                        style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Revenue <SortIcon config={sortConfigStats} columnKey="revenue" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort(sortConfigStats, setSortConfigStats, 'profit')}
                                        style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Profit <SortIcon config={sortConfigStats} columnKey="profit" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort(sortConfigStats, setSortConfigStats, 'margin')}
                                        style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Margin % <SortIcon config={sortConfigStats} columnKey="margin" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedStats.map((stat, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{stat.customer_name}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formatCurrency(stat.revenue)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stat.profit)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#3b82f6', fontWeight: 500 }}>
                                            {stat.revenue > 0 ? ((stat.profit / stat.revenue) * 100).toFixed(1) + '%' : '0.0%'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Outstanding Balances */}
                <div className="glass-panel" style={{ padding: '0' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Outstanding Balances</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTermRec}
                                onChange={(e) => setSearchTermRec(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', padding: '0.4rem 0.75rem 0.4rem 2rem', color: 'var(--text-primary)', fontSize: '0.75rem', width: '160px' }}
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: '450px', overflowY: 'auto', padding: '0.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th 
                                        onClick={() => handleSort(sortConfigRec, setSortConfigRec, 'customer_name')}
                                        style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Customer <SortIcon config={sortConfigRec} columnKey="customer_name" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort(sortConfigRec, setSortConfigRec, 'phone')}
                                        style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Contact <SortIcon config={sortConfigRec} columnKey="phone" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort(sortConfigRec, setSortConfigRec, 'balance_due')}
                                        style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'normal', cursor: 'pointer' }}
                                    >
                                        Balance <SortIcon config={sortConfigRec} columnKey="balance_due" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedRec.map((rec, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '0.75rem' }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{rec.customer_name}</div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MapPin size={10} /> {rec.city}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Phone size={10} /> {rec.phone || 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 'bold', color: '#ef4444', fontFamily: 'monospace' }}>
                                            {formatCurrency(rec.balance_due)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerInsights;
