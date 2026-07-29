import React from 'react';
import ReactDOM from 'react-dom';
import { X, TrendingUp, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { 
    ResponsiveContainer, ComposedChart, BarChart, Line, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const OperationalAnalysisModal = ({ isOpen, onClose, yearlyData, selectedYear }) => {
    if (!isOpen || !yearlyData) return null;

    // Filter to only active months
    const activeData = yearlyData.filter(d => d.isActive);

    // 1. Yield vs. Cost Correlation Data
    const correlationData = activeData.map(d => ({
        name: d.name,
        yieldPercent: d.yieldPercent || 0,
        costPerKg: d.costPerKg || 0,
        margin: d.margin || 0,
    }));

    // 2. Recipe Shift Analysis (Ginger vs Garlic in GG Paste)
    const recipeData = activeData.map(d => {
        // Look for exact matches or keys containing "GINGER GARLIC PASTE"
        let ginger = 0;
        let garlic = 0;
        
        if (d.inputBreakdown) {
            Object.keys(d.inputBreakdown).forEach(key => {
                if (key.toUpperCase().includes('GINGER GARLIC PASTE')) {
                    ginger += d.inputBreakdown[key].ginger || 0;
                    garlic += d.inputBreakdown[key].garlic || 0;
                }
            });
        }

        const total = ginger + garlic;
        return {
            name: d.name,
            gingerPercent: total > 0 ? (ginger / total) * 100 : 0,
            garlicPercent: total > 0 ? (garlic / total) * 100 : 0,
            totalKg: total
        };
    });

    // 3. Product-Mix Efficiency (Averaged over the year)
    const productMixData = [];
    const productTotals = {};
    
    activeData.forEach(d => {
        if (d.inputBreakdown) {
            Object.keys(d.inputBreakdown).forEach(key => {
                const totalInputForProduct = (d.inputBreakdown[key].ginger || 0) + (d.inputBreakdown[key].garlic || 0) + (d.inputBreakdown[key].water || 0);
                if (totalInputForProduct > 0) {
                    productTotals[key] = (productTotals[key] || 0) + totalInputForProduct;
                }
            });
        }
    });

    Object.entries(productTotals).forEach(([name, value]) => {
        productMixData.push({ name, value });
    });

    productMixData.sort((a, b) => b.value - a.value);

    // Custom Tooltip for Recipe Chart
    const RecipeTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '10px', borderRadius: '8px' }}>
                    <p style={{ color: '#f8fafc', margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
                            {entry.name}: {entry.value.toFixed(1)}%
                        </p>
                    ))}
                    <p style={{ color: '#94a3b8', margin: '5px 0 0 0', fontSize: '0.8rem' }}>
                        Total Input: {payload[0]?.payload.totalKg.toFixed(1)} kg
                    </p>
                </div>
            );
        }
        return null;
    };

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: '#0f172a', // Solid dark background to match app
            zIndex: 99999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            padding: '2rem 1rem'
        }}>
            <div style={{ 
                width: '100%', maxWidth: '1400px', 
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                            Detailed Operational Analysis ({selectedYear})
                        </h2>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Deep dive into production efficiency, yields, and recipes.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                            padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <X size={28} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Chart 1: Yield vs Cost */}
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(30, 41, 59, 0.7)' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={20} color="#3b82f6" />
                            Yield vs. Cost Correlation
                        </h3>
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={correlationData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" label={{ value: 'Yield %', angle: -90, position: 'insideLeft', fill: '#3b82f6' }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: 'Cost (₹/kg)', angle: 90, position: 'insideRight', fill: '#f59e0b' }} />
                                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                                    <Legend />
                                    <Bar yAxisId="right" dataKey="costPerKg" name="Production Cost (₹/kg)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Line yAxisId="left" type="monotone" dataKey="yieldPercent" name="Yield %" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
                            Compare if pushing for higher yield percentages directly results in lower production costs.
                        </p>
                    </div>

                    {/* Chart 2 & 3 row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                        
                        {/* Chart 2: Recipe Shift */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(30, 41, 59, 0.7)' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BarChart2 size={20} color="#10b981" />
                                Recipe Shift: Ginger Garlic Paste
                            </h3>
                            <div style={{ height: '300px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={recipeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                        <Tooltip content={<RecipeTooltip />} />
                                        <Legend />
                                        <Bar dataKey="gingerPercent" stackId="a" name="Ginger %" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="garlicPercent" stackId="a" name="Garlic %" fill="#f87171" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
                                Month-over-month ratio of Ginger vs. Garlic used in GG Paste production.
                            </p>
                        </div>

                        {/* Chart 3: Product Mix */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(30, 41, 59, 0.7)' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <PieChartIcon size={20} color="#8b5cf6" />
                                Total Product-Mix Efficiency (YTD)
                            </h3>
                            <div style={{ height: '300px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={productMixData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {productMixData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${value.toLocaleString(undefined, {maximumFractionDigits:1})} kg`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
                                Total distribution of raw materials across all finished products for the year.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OperationalAnalysisModal;
