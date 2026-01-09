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
            // Whitelist: Only allow Ginger and Garlic related records OR explicit 'Purchase' type
            // Also explicit allow for 'jayakodi' as fallback if item name is missing
            return item.parsedType === 'Purchase' || desc.includes('ginger') || desc.includes('garlic') || desc.includes('jayakodi');
        });
    }, [purchases, selectedMonth, selectedYear]);


    // 1. Process Physical Stock (Quantity) - Dynamic Grouping
    const { materialGroups, totalWeight, pieData, trendData } = useMemo(() => {

        // Source of Truth: Purchases (Bills)
        // We ignore StockIn here to avoid double counting with bills.
        const procurementItems = filteredPurchases;

        // Group by Material Name
        const groups = {};
        procurementItems.forEach(p => {
            // Determine Name
            const desc = (p.originalDesc || p.supplier || p.remarks || '').toLowerCase();
            let name = null;

            // Smart Mapping
            if (desc.includes('ginger') || desc.includes('jayakodi')) name = 'Ginger';
            else if (desc.includes('garlic') || desc.includes('senthil') || desc.includes('svg') || desc.includes('pk')) name = 'Garlic';
            else {
                // Fallback to extraction if possible or 'Others'
                if (desc.includes('onion')) name = 'Onion';
                else name = 'Others';
            }

            if (name && name !== 'Others') { // Only count known materials for Cards? Or All? 
                // Actually logic before was explicitly Ginger/Garlic via if/else if.
                // Let's stick to the previous conditional structure but cleaner.
            }

            // Re-implementing previous fuzzy logic:
            let finalName = null;
            if (desc.includes('ginger') || desc.includes('jayakodi')) finalName = 'Ginger';
            else if (desc.includes('garlic') || desc.includes('senthil') || desc.includes('svg') || desc.includes('pk')) finalName = 'Garlic';

            if (finalName) {
                groups[finalName] = (groups[finalName] || 0) + (p.parsedQty || p.quantity || 0);
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
                // item.parsedDate is from Transactions YYYY-MM-DD
                const dateStr = item.parsedDate || item.date;
                if (!dateStr || typeof dateStr !== 'string') return;

                const dateParts = dateStr.split('-'); // YYYY-MM-DD
                if (dateParts.length >= 2) {
                    const monthIndex = parseInt(dateParts[1], 10) - 1;
                    const monthName = months[monthIndex];
                    if (monthName) {
                        const matLower = (item.originalDesc || item.supplier || item.remarks || '').toLowerCase();
                        const qty = item.parsedQty || item.quantity || 0;

                        if (matLower.includes('ginger')) monthMap[monthName].Ginger += qty;
                        else if (matLower.includes('garlic')) monthMap[monthName].Garlic += qty;
                        else monthMap[monthName].Others += qty;
                    }
                }
            });
            tData = Object.values(monthMap);
        }

        return { materialGroups: groupList, totalWeight: total, pieData: pData, trendData: tData };
    }, [filteredPurchases, selectedMonth]);


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
            // Use 'customerName' (parsed from Billwise Summary)
            const sName = (curr.customerName || curr.originalDesc || curr.supplier || 'Unknown').toUpperCase();
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
            <div className="responsive-grid-3" style={{ marginBottom: '1.5rem' }}>
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

            {/* Side-by-Side Grid: Payments & Ledger */}
            <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1.5rem', alignItems: 'stretch' }}>

                {/* 1. Supplier Payments */}
                <div style={{
                    background: 'var(--glass-highlight)',
                    borderRadius: '1rem',
                    padding: '0',
                    border: '1px solid var(--glass-border)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    height: '450px' // Match Ledger Height
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
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '1rem' }}>{supplier}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stats.count} Bills</div>
                                </div>
                                <div style={{ fontWeight: 700, color: '#34D399', fontSize: '1rem' }}>₹{stats.amount.toLocaleString('en-IN')}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Financial Ledger */}
                <div style={{
                    background: 'var(--glass-highlight)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    height: '450px'
                }}>
                    <div style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', fontWeight: 600, color: '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Supplier Ledger</span>
                        <span style={{ fontSize: '0.85rem', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '0.1rem 0.5rem', borderRadius: '0.25rem' }}>{sortedPurchases.length} Recs</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr 1fr 60px 80px 100px', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        <div>Date</div>
                        <div>Bill No</div>
                        <div>Item Name</div>
                        <div>Supplier</div>
                        <div style={{ textAlign: 'right' }}>Qty</div>
                        <div style={{ textAlign: 'right' }}>Unit Price</div>
                        <div style={{ textAlign: 'right' }}>Amount</div>
                    </div>
                    <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                        {sortedPurchases.map((item, i) => {
                            const qty = item.quantity || item.parsedQty || 0;
                            const amount = item.parsedAmount || item.amount || 0;
                            const unitPrice = qty > 0 ? (amount / qty) : 0;
                            const supplierName = item.customerName || item.supplier || '-';
                            const itemName = item.originalDesc || item.item_name || 'Item';

                            return (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr 1fr 60px 80px 100px', padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.95rem', alignItems: 'center' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatDate(item.parsedDate || item.date)}</div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>{item.invoice_no || item.invoiceNo || '-'}</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>{itemName}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '0.5rem', minWidth: 0 }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplierName}</span>
                                        {item.remarks && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{item.remarks}</span>}
                                    </div>
                                    <div style={{ textAlign: 'right', color: '#e0f2fe', fontSize: '0.9rem' }}>{qty > 0 ? qty.toLocaleString() : '-'}</div>
                                    <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{qty > 0 ? `₹${unitPrice.toFixed(0)}` : '-'}</div>
                                    <div style={{ textAlign: 'right', color: '#f43f5e', fontWeight: 600, fontSize: '0.95rem' }}>₹{amount.toLocaleString('en-IN')}</div>
                                </div>
                            );
                        })}
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
