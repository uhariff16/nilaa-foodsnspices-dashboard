import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, Truck, IndianRupee, Layers } from 'lucide-react';
import gingerIcon from '../assets/ginger.png';
import garlicIcon from '../assets/garlic.png';

const COLORS = ['#FCD34D', '#E0E7FF', '#34D399', '#F87171', '#60A5FA', '#A78BFA', '#F471B5'];

const MetricCard = ({ title, value, subtext, icon: Icon, color, iconColor, customIcon, image, CustomElement }) => (
    <div style={{
        background: 'var(--glass-highlight)',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center', // Center vertically
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '160px',
        position: 'relative' // Ensure relative positioning for absolute children
    }}>
        {CustomElement}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                {title}
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: color || 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
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
                        background: 'var(--glass-highlight)',
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

const ProcurementDashboard = ({ stockIn = [], purchases = [], summaryData = [], selectedMonth, selectedYear }) => {
    console.log("ProcurementDashboard Render. SummaryData:", summaryData?.length, "Selected:", selectedMonth, selectedYear);

    // Helper: Filter by Month/Year
    const getFilteredItems = (items) => {
        if (!items) return [];
        const getDate = (item) => item.date || item.parsedDate || ''; // Handle both schemas

        if (selectedMonth === 'Overall') {
            if (selectedYear) {
                return items.filter(item => getDate(item).startsWith(selectedYear));
            }
            return items;
        }
        const [selMonth, selYear] = selectedMonth.split(' ');
        const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const targetPrefix = `${selYear}-${monthMap[selMonth]}`;
        return items.filter(item => getDate(item).startsWith(targetPrefix));
    };

    // Shared Filtered Data
    const filteredStockIn = useMemo(() => getFilteredItems(stockIn), [stockIn, selectedMonth, selectedYear]);

    // Strict Filter for "Raw Materials" only (User Request)
    // Exclude general expenses like Tea, Packing, Transport, etc.
    const filteredPurchases = useMemo(() => {
        const dateFiltered = getFilteredItems(purchases);
        return dateFiltered.filter(item => {
            const desc = (item.originalDesc || item.supplier || item.remarks || '').toLowerCase();
            // Whitelist: Only allow Ginger and Garlic related records
            // Also explicit allow for 'jayakodi' as fallback if item name is missing
            return desc.includes('ginger') || desc.includes('garlic') || desc.includes('jayakodi');
        });
    }, [purchases, selectedMonth, selectedYear]);


    // 1. Process Physical Stock (Quantity) - Dynamic Grouping
    const { materialGroups, totalWeight, pieData, trendData } = useMemo(() => {

        // Strict OS Filtering
        const procurementItems = filteredStockIn.filter(item => {
            const mat = String(item.material || '').trim().toUpperCase();
            const isOS = mat.startsWith('OS') || mat.startsWith('OPENING') || mat.includes('B/F') || mat.includes('BROKEN GARLIC');
            return !isOS;
        });

        // Group by Material Name from Stock In
        const groups = {};
        procurementItems.forEach(item => {
            let name = String(item.material || 'Unknown').trim();
            name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            groups[name] = (groups[name] || 0) + item.weight;
        });

        // NEW: Ensure items from Purchases are also represented (even if 0 weight)
        // This ensures the Card appears even if only Financial data exists (User Case: Missing Card)
        filteredPurchases.forEach(p => {
            const desc = (p.originalDesc || p.supplier || '').toLowerCase();
            let name = null;
            if (desc.includes('ginger') || desc.includes('jayakodi')) name = 'Ginger';
            else if (desc.includes('garlic') || desc.includes('senthil') || desc.includes('svg') || desc.includes('pk')) name = 'Garlic';

            if (name) {
                // Initialize with 0 weight if not present. 
                // We do NOT add weight here because Purchase weight is unreliable/not parsed.
                if (!groups[name]) groups[name] = 0;
            }
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
                // item.date is from Production Logs which uses 'date'
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
    // Use 'parsedAmount' and 'parsedDate' from App.jsx mapping
    const totalSpent = filteredPurchases.reduce((sum, i) => sum + (i.parsedAmount || i.amount || 0), 0);
    const sortedPurchases = [...filteredPurchases].sort((a, b) => (b.parsedDate || b.date).localeCompare(a.parsedDate || a.date));

    // Calculate Cost & Count per Material (Heuristic)
    const materialStats = useMemo(() => {
        const stats = {};
        // Initialize with 0
        materialGroups.forEach(g => stats[g.name] = { cost: 0, count: 0 });

        filteredPurchases.forEach(p => {
            // Use originalDesc as supplier/remarks fallback
            const str = (String(p.originalDesc || p.supplier || p.remarks || '')).toLowerCase();
            const amt = p.parsedAmount || p.amount || 0;
            let matched = false;

            materialGroups.forEach(g => {
                if (matched) return;
                const groupKey = g.name.toLowerCase();
                if (str.includes(groupKey)) {
                    stats[g.name].cost += amt;
                    stats[g.name].count += 1;
                    matched = true;
                }
            });

            if (!matched) {
                // Generous fallback if no direct match found
                if (stats['Ginger'] && (str.includes('ginger') || str.includes('jayakodi'))) {
                    stats['Ginger'].cost += amt;
                    stats['Ginger'].count += 1;
                } else if (stats['Garlic'] && (str.includes('garlic') || str.includes('senthil') || str.includes('svg') || str.includes('pk'))) {
                    stats['Garlic'].cost += amt;
                    stats['Garlic'].count += 1;
                }
            }
        });
        return stats;
    }, [filteredPurchases, materialGroups]);

    // Supplier Summary Data
    const supplierSummary = useMemo(() => {
        const summary = filteredPurchases.reduce((acc, curr) => {
            // Use 'originalDesc' as 'Supplier' name since we don't have explicit supplier field in mapped txns
            // Or extract from desc if possible? For now, group by Item Name (originalDesc)
            const sName = (curr.originalDesc || curr.supplier || 'Unknown').toUpperCase();
            if (!acc[sName]) acc[sName] = { amount: 0, count: 0 };
            acc[sName].amount += (curr.parsedAmount || curr.amount || 0);
            acc[sName].count += 1;
            return acc;
        }, {});
        return Object.entries(summary).sort((a, b) => b[1].amount - a[1].amount);
    }, [filteredPurchases]);


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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '16rem', color: 'var(--text-secondary)' }}>
                <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No data found for period: {selectedMonth} {selectedMonth === 'Overall' ? selectedYear : ''}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="#38bdf8" /> Procurement Overview
            </h3>

            {/* Top Stats Grid - Compact Cards */}
            {/* Top Stats Grid - Compact Cards */}
            <div className="responsive-grid-4" style={{ marginBottom: '1.5rem' }}>
                {/* 1. Material Cards */}
                {materialGroups.map((group, index) => {
                    const { cost, count } = materialStats[group.name] || { cost: 0, count: 0 };
                    return (
                        <div key={group.name} style={{
                            background: 'var(--glass-highlight)',
                            borderRadius: '1rem',
                            padding: '1.25rem',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            minHeight: '140px' // Reduced Height
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', flex: 1 }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{group.name}</span>
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{count} Bills</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: getColorForMaterial(group.name, index), marginBottom: '0.25rem', lineHeight: 1 }}>
                                    ₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e0f2fe' }}>
                                    {group.weight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>kg</span>
                                </div>
                            </div>
                            <div style={{ marginLeft: '1rem' }}>
                                {getImageForMaterial(group.name) ? (
                                    <div style={{
                                        width: '64px', height: '64px', // Reduced Icon
                                        borderRadius: '50%',
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `1px solid ${getColorForMaterial(group.name, index)}`,
                                        overflow: 'hidden',
                                        padding: '5px'
                                    }}>
                                        <img src={getImageForMaterial(group.name)} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    );
                })}

                {/* 2. Total Quantity Card */}
                <MetricCard
                    title="Total Quantity"
                    value={`${totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`}
                    subtext="All Materials"
                    icon={Truck}
                    color="#34D399"
                    iconColor="#34D399"
                />

                {/* 3. Total Spend Card */}
                <MetricCard
                    title="Total Spend"
                    value={`₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    subtext={`${filteredPurchases.length} Bills`}
                    icon={IndianRupee}
                    color="#F43F5E"
                    iconColor="#F43F5E"
                />
            </div>

            {/* Monthly Trend Chart (Overall Only) */}
            {selectedMonth === 'Overall' && (
                <div style={{
                    background: 'var(--glass-highlight)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    border: '1px solid var(--glass-border)',
                    marginBottom: '1.5rem',
                    height: '350px'
                }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Monthly Procurement Trend (kg)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                cursor={{ fill: 'var(--glass-highlight)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="Ginger" fill="#FCD34D" name="Ginger" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Garlic" fill="#E0E7FF" name="Garlic" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Charts & Details Grid - 3 Columns */}
            <div className="responsive-grid-3" style={{ gap: '1rem' }}>

                {/* Col 1: Material Distribution (Pie) */}
                <div style={{
                    background: 'var(--glass-highlight)',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    border: '1px solid var(--glass-border)',
                    display: 'flex', flexDirection: 'column',
                    height: '400px'
                }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Volume Mix</h4>
                    <div style={{ flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColorForMaterial(entry.name, index)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
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

                {/* Col 2: Supplier Payment Summary */}
                <div style={{
                    background: 'var(--glass-highlight)',
                    borderRadius: '1rem',
                    padding: '0',
                    border: '1px solid var(--glass-border)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    height: '400px'
                }}>
                    <div style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', fontWeight: 600, color: '#38bdf8' }}>
                        Supplier Payments
                    </div>
                    <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                        {supplierSummary.map(([supplier, stats], index) => (
                            <div key={index} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{supplier}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.count} Bills</div>
                                </div>
                                <div style={{ fontWeight: 700, color: '#34D399', fontSize: '0.9rem' }}>₹{stats.amount.toLocaleString('en-IN')}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Col 3: Financial Ledger */}
                <div style={{
                    background: 'var(--glass-highlight)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    height: '400px'
                }}>
                    <div style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', fontWeight: 600, color: '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Supplier Ledger</span>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '0.1rem 0.5rem', borderRadius: '0.25rem' }}>{sortedPurchases.length} Recs</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr 90px', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        <div>Date</div>
                        <div>Supplier & Remarks</div>
                        <div style={{ textAlign: 'right' }}>Amount</div>
                    </div>
                    <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                        {sortedPurchases.map((item, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '85px 1fr 90px', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.875rem', alignItems: 'center' }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(item.parsedDate || item.date)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.originalDesc || item.supplier}</span>
                                    {item.remarks && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.remarks}</span>}
                                </div>
                                <div style={{ textAlign: 'right', color: '#f43f5e', fontWeight: 600 }}>₹{(item.parsedAmount || item.amount || 0).toLocaleString('en-IN')}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Variety Analysis Section (New) */}
            {summaryData && summaryData.length > 0 && (
                <div className="responsive-grid-2" style={{ marginTop: '1.5rem', gap: '1.5rem' }}>
                    {['Ginger', 'Garlic'].map(mat => {
                        // Filter summary data for this material
                        const matVarieties = summaryData.filter(d => {
                            // Date Filter
                            if (selectedMonth !== 'Overall') {
                                const dDate = new Date(d.date);
                                const dMonth = dDate.toLocaleString('default', { month: 'long' });
                                const dYear = dDate.getFullYear();
                                if (dMonth !== selectedMonth || String(dYear) !== String(selectedYear)) return false;
                            }

                            // Check Material Name in Variety String
                            // e.g. "OLD GINGER" contains "GINGER"
                            return d.variety.toLowerCase().includes(mat.toLowerCase());
                        }).reduce((acc, curr) => {
                            const vName = curr.variety.toUpperCase();
                            if (!acc[vName]) acc[vName] = { qty: 0, cost: 0 };
                            acc[vName].qty += curr.quantity;
                            acc[vName].cost += curr.amount;
                            return acc;
                        }, {});

                        const sortedVars = Object.entries(matVarieties).sort((a, b) => b[1].qty - a[1].qty);

                        return (
                            <div key={mat} style={{
                                background: 'var(--glass-highlight)',
                                borderRadius: '1rem',
                                border: '1px solid var(--glass-border)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: '1rem', background: mat === 'Ginger' ? 'rgba(252, 211, 77, 0.1)' : 'rgba(224, 231, 255, 0.1)', borderBottom: '1px solid var(--glass-border)', fontWeight: 700, color: mat === 'Ginger' ? '#FCD34D' : '#E0E7FF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {mat} Varieties
                                </div>
                                <div className="overflow-x-auto" style={{ padding: '0.5rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Variety</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Quantity</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Avg Price</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Total Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedVars.map(([vName, stats]) => (
                                                <tr key={vName} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>{vName}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#e0f2fe' }}>{stats.qty.toLocaleString()} kg</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>₹{(stats.cost / stats.qty).toFixed(1)}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', color: mat === 'Ginger' ? '#FCD34D' : '#E0E7FF', fontWeight: 600 }}>₹{stats.cost.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            {sortedVars.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No variety data found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

export default ProcurementDashboard;
