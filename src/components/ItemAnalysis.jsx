import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';

const ItemAnalysis = ({ data }) => {
    const sortedByProfit = useMemo(() => {
        return [...data].sort((a, b) => b.profit - a.profit).slice(0, 10);
    }, [data]);

    const sortedByRevenue = useMemo(() => {
        return [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }, [data]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</p>
                    <p style={{ margin: 0, color: '#3b82f6' }}>Revenue: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload[0].value)}</p>
                    {payload[1] && (
                        <p style={{ margin: 0, color: '#10b981' }}>Profit: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload[1].value)}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Package /> Item Performance Analysis
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* Top Profit Generators */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: '450px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Top 10 Most Profitable Items</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={sortedByProfit} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]}>
                                {sortedByProfit.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Revenue Generators */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: '450px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Top 10 Revenue Generators</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={sortedByRevenue} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Detailed Item List (Top 20)</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Item Name</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Qty Sold</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Revenue</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedByProfit.slice(0, 20).map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{item.name}</td>
                                    <td style={{ textAlign: 'right', padding: '1rem' }}>{item.qty}</td>
                                    <td style={{ textAlign: 'right', padding: '1rem' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.revenue)}</td>
                                    <td style={{ textAlign: 'right', padding: '1rem', color: item.profit === 0 && item.revenue > 0 ? 'var(--text-secondary)' : (item.profit < 0 ? '#ef4444' : '#10b981') }}>
                                        {item.profit === 0 && item.revenue > 0 ? 'N/A' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ItemAnalysis;
