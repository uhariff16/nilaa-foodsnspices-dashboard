import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, Truck, IndianRupee, Layers } from 'lucide-react';
import gingerIcon from '../assets/ginger.png';
import garlicIcon from '../assets/garlic.png';

const COLORS = ['#FCD34D', '#E0E7FF', '#34D399', '#F87171', '#60A5FA', '#A78BFA', '#F471B5'];

const MetricCard = ({ title, value, subtext, icon: Icon, color, iconColor, customIcon, image }) => (
    <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center', // Center vertically
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '160px'
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                {title}
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: color || 'white', marginBottom: '0.5rem' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280' }}>
                {subtext}
            </div>
        </div>

        {/* Right Side Icon */}
        <div style={{ marginLeft: '1rem' }}>
            {customIcon ? customIcon : (
                image ? (
                    <div style={{
                        width: '80px', height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))', // Glassmorphism circle
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${color || '#ffffff20'}`, // Use card color for border
                        overflow: 'hidden',
                        padding: '10px'
                    }}>
                        <img src={image} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                ) : (
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '0.75rem',
                        color: iconColor || color || '#9ca3af'
                    }}>
                        {Icon && <Icon size={24} />}
                    </div>
                )
            )}
        </div>
    </div>
);

const ProcurementDashboard = ({ stockIn = [], purchases = [], selectedMonth, selectedYear }) => {

    // Helper: Filter by Month/Year
    const getFilteredItems = (items) => {
        if (!items) return [];
        if (selectedMonth === 'Overall') {
            if (selectedYear) {
                return items.filter(item => item.date && item.date.startsWith(selectedYear));
            }
            return items;
        }
        const [selMonth, selYear] = selectedMonth.split(' ');
        const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const targetPrefix = `${selYear}-${monthMap[selMonth]}`;
        return items.filter(item => item.date && item.date.startsWith(targetPrefix));
    };

    // Shared Filtered Data
    const filteredStockIn = useMemo(() => getFilteredItems(stockIn), [stockIn, selectedMonth, selectedYear]);
    const filteredPurchases = useMemo(() => getFilteredItems(purchases), [purchases, selectedMonth, selectedYear]);


    // 1. Process Physical Stock (Quantity) - Dynamic Grouping
    const { materialGroups, totalWeight, pieData, trendData } = useMemo(() => {

        // Strict OS Filtering
        const procurementItems = filteredStockIn.filter(item => {
            const mat = String(item.material || '').trim().toUpperCase();
            const isOS = mat.startsWith('OS') || mat.startsWith('OPENING') || mat.includes('B/F') || mat.includes('BROKEN GARLIC');
            return !isOS;
        });

        // Group by Material Name
        const groups = {};
        procurementItems.forEach(item => {
            let name = String(item.material || 'Unknown').trim();
            name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            groups[name] = (groups[name] || 0) + item.weight;
        });

        const total = Object.values(groups).reduce((a, b) => a + b, 0);

        // Prepare Data for Cards/Pie
        const groupList = Object.entries(groups)
            .map(([name, weight]) => ({ name, weight }))
            .sort((a, b) => b.weight - a.weight);

        const pData = groupList.map((g, index) => ({
            name: g.name,
            value: g.weight
        }));

        // Calculate Trend Data (Only for Overall View)
        let tData = [];
        if (selectedMonth === 'Overall') {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthMap = {};
            months.forEach(m => monthMap[m] = { name: m, Ginger: 0, Garlic: 0, Others: 0 });

            procurementItems.forEach(item => {
                const dateParts = item.date.split('-'); // YYYY-MM-DD
                if (dateParts.length >= 2) {
                    const monthIndex = parseInt(dateParts[1], 10) - 1;
                    const monthName = months[monthIndex];
                    if (monthName) {
                        const matLower = (item.material || '').toLowerCase();
                        if (matLower.includes('ginger')) monthMap[monthName].Ginger += item.weight;
                        else if (matLower.includes('garlic')) monthMap[monthName].Garlic += item.weight;
                        else monthMap[monthName].Others += item.weight;
                    }
                }
            });
            tData = Object.values(monthMap);
        }

        return { materialGroups: groupList, totalWeight: total, pieData: pData, trendData: tData };
    }, [filteredStockIn, selectedMonth]);


    // 2. Process Financials
    const totalSpent = filteredPurchases.reduce((sum, i) => sum + i.amount, 0);
    const sortedPurchases = [...filteredPurchases].sort((a, b) => b.date.localeCompare(a.date));

    // Helpers
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    const getColorForMaterial = (name, index) => {
        const lower = name.toLowerCase();
        if (lower.includes('ginger')) return '#FCD34D'; // Yellow
        if (lower.includes('garlic')) return '#E0E7FF'; // White-ish
        return COLORS[index % COLORS.length];
    };

    const getImageForMaterial = (name) => {
        const lower = name.toLowerCase();
        if (lower.includes('ginger')) return gingerIcon;
        if (lower.includes('garlic')) return garlicIcon;
        return null;
    };

    if (stockIn.length === 0 && purchases.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '16rem', color: '#9ca3af' }}>
                <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No data found for period: {selectedMonth} {selectedMonth === 'Overall' ? selectedYear : ''}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="#38bdf8" /> Procurement Overview
            </h3>

            {/* Top Stats Grid - Dynamic Cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: `repeat(${materialGroups.length + 2}, 1fr)`, gap: '1.5rem', marginBottom: '2rem'
            }}>
                {/* Dynamically Render a Card for EACH Material Group */}
                {materialGroups.map((group, index) => (
                    <MetricCard
                        key={group.name}
                        title={`${group.name} Stock`}
                        value={`${group.weight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`}
                        subtext="Purchased Quantity"
                        image={getImageForMaterial(group.name)}
                        color={getColorForMaterial(group.name, index)}
                    />
                ))}

                {/* Total Quantity Card */}
                <MetricCard
                    title="Total Quantity"
                    value={`${totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`}
                    subtext="All Materials"
                    icon={Truck}
                    color="#34D399" // Green
                    iconColor="#34D399"
                />

                {/* Total Spend (Financial) */}
                <MetricCard
                    title="Total Spend"
                    value={`₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    subtext={`${filteredPurchases.length} Bills Processed`}
                    icon={IndianRupee}
                    color="#F43F5E" // Rose-500
                    iconColor="#F43F5E"
                />
            </div>

            {/* Monthly Trend Chart (Overall Only) */}
            {selectedMonth === 'Overall' && (
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '1.5rem',
                    height: '350px'
                }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#9ca3af', marginBottom: '1rem' }}>Monthly Procurement Trend (kg)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="Ginger" fill="#FCD34D" name="Ginger" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Garlic" fill="#E0E7FF" name="Garlic" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            {/* <Bar dataKey="Others" fill="#A78BFA" name="Others" radius={[4, 4, 0, 0]} stackId="a" /> */}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Charts & Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem' }}>

                {/* 1. Pie Chart Section */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#9ca3af', marginBottom: '1rem' }}>Material Distribution (%)</h4>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColorForMaterial(entry.name, index)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value, name) => [`${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`, name]}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry) => {
                                        const item = pieData.find(d => d.name === value);
                                        const percent = item ? ((item.value / totalWeight) * 100).toFixed(1) : 0;
                                        return `${value} (${percent}%)`;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Financial Ledger Table */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    height: '400px'
                }}>
                    <div style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', fontWeight: 600, color: '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Supplier Ledger</span>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '0.1rem 0.5rem', borderRadius: '0.25rem' }}>{sortedPurchases.length} Recs</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 100px', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                        <div>Date</div>
                        <div>Supplier</div>
                        <div>Remarks</div>
                        <div style={{ textAlign: 'right' }}>Amount</div>
                    </div>
                    <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                        {sortedPurchases.map((item, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 100px', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.875rem', alignItems: 'center' }}>
                                <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{formatDate(item.date)}</div>
                                <div style={{ color: '#e5e7eb' }}>{item.material}</div>
                                <div style={{ color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.remarks || '-'}</div>
                                <div style={{ textAlign: 'right', color: '#f43f5e', fontWeight: 500 }}>₹{item.amount.toLocaleString('en-IN')}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProcurementDashboard;
