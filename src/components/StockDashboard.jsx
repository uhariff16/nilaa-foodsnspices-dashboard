import React, { useMemo } from 'react';
import { Package, TrendingUp, TrendingDown, ArrowRight, Activity, Layers, AlertCircle, Search, Filter, CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import gingerIcon from '../assets/ginger.png';
import garlicIcon from '../assets/garlic.png';

const StockSummaryCard = ({ title, icon, color, opening, purchased, total, available }) => (
    <div style={{
        background: 'var(--glass-highlight)',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '220px',
        position: 'relative',
        overflow: 'hidden'
    }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }}></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
            </div>
            <div style={{
                width: '60px', height: '60px',
                borderRadius: '50%',
                background: 'var(--glass-highlight)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${color}`,
                overflow: 'hidden',
                padding: '5px'
            }}>
                <img src={icon} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
        </div>

        {/* content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            <span style={{ color: '#d97706', fontWeight: 600 }}>Opening:</span>
            <span style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{opening.toLocaleString()} kg</span>

            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Purchased:</span>
            <span style={{ textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 600 }}>{purchased.toLocaleString()} kg</span>

            <span style={{ color: 'var(--text-primary)', fontWeight: 700, borderTop: '1px solid var(--glass-border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>Total:</span>
            <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700, borderTop: '1px solid var(--glass-border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>{total.toLocaleString()} kg</span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Available: {available.toLocaleString()} kg
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Currently Available</div>
        </div>
    </div>
);

const StockDashboard = ({ productionData, salesData, procurementData, selectedMonth, selectedYear }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('All'); // All, Raw, Processed

    // Thresholds for alerts
    const THRESHOLDS = {
        RAW: 100,
        PEELED: 50,
        PASTE: 20
    };

    const getHealthStatus = (title, closing) => {
        if (closing < 0) return { label: 'Data Error', color: '#ef4444', icon: XCircle, bg: 'rgba(239, 68, 68, 0.1)' };

        let threshold = THRESHOLDS.PASTE;
        if (title.includes('(Raw)')) threshold = THRESHOLDS.RAW;
        if (title.includes('(Peeled)')) threshold = THRESHOLDS.PEELED;

        if (closing === 0) return { label: 'Out of Stock', color: '#f59e0b', icon: AlertTriangle, bg: 'rgba(245, 158, 11, 0.1)' };
        if (closing < threshold) return { label: 'Low Stock', color: '#f59e0b', icon: AlertCircle, bg: 'rgba(245, 158, 11, 0.1)' };
        return { label: 'Healthy', color: '#10b981', icon: CheckCircle, bg: 'rgba(16, 185, 129, 0.1)' };
    };

    const StockTable = ({ title, data, icon: Icon, color }) => {
        if (data.length === 0) return null;

        return (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: `rgba(var(--color-${color}-500), 0.1)` }}>
                        <Icon size={20} color={`var(--color-${color}-500)`} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({data.length} Items)</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Item Name & Status</th>
                                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Opening</th>
                                <th style={{ padding: '1rem 0.5rem', color: '#10b981', fontWeight: 600, textAlign: 'right' }}>Stock In</th>
                                <th style={{ padding: '1rem 0.5rem', color: '#ef4444', fontWeight: 600, textAlign: 'right' }}>Stock Out</th>
                                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right' }}>Closing</th>
                                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Audit (Next)</th>
                                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Reconciliation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => {
                                const health = getHealthStatus(item.title, item.closing);
                                const variance = item.nextOpen > 0 ? (item.closing - item.nextOpen) : 0;
                                const isMatched = item.nextOpen > 0 && Math.abs(variance) < 0.1;

                                return (
                                    <tr key={idx} style={{
                                        borderBottom: idx === data.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                        background: item.closing < 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                        transition: 'background 0.2s ease'
                                    }} className="hover-highlight">
                                        <td style={{ padding: '1rem 0.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: health.color }}>
                                                    <health.icon size={10} />
                                                    {health.label}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            {item.open.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#10b981', fontWeight: 500 }}>
                                            +{item.in.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.5rem 0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                                            -{item.out.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                                            <span style={{
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                color: item.closing < 0 ? '#ef4444' : 'var(--text-primary)',
                                                display: 'block'
                                            }}>
                                                {item.closing.toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>kg</span>
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            {item.nextOpen > 0 ? `${item.nextOpen.toLocaleString()} kg` : '-'}
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                                            {item.nextOpen > 0 ? (
                                                isMatched ? (
                                                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                                                        <CheckCircle size={12} /> Synced
                                                    </span>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{
                                                            fontSize: '0.85rem',
                                                            fontWeight: 700,
                                                            color: variance > 0 ? '#ef4444' : '#10b981'
                                                        }}>
                                                            {variance > 0 ? `-${Math.abs(variance).toLocaleString()}` : `+${Math.abs(variance).toLocaleString()}`}
                                                        </span>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8, color: variance > 0 ? '#ef4444' : '#10b981' }}>
                                                            {variance > 0 ? 'SHORTAGE' : 'SURPLUS'}
                                                        </span>
                                                    </div>
                                                )
                                            ) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const stockStats = useMemo(() => {
        // Raw
        let ginger = { open: 0, in: 0, out: 0, nextOpen: 0 };
        let garlic = { open: 0, in: 0, out: 0, nextOpen: 0 };
        // Peeled
        let gingerPeeled = { open: 0, in: 0, out: 0, nextOpen: 0 };
        let garlicPeeled = { open: 0, in: 0, out: 0, nextOpen: 0 };
        // Paste
        let paste = { open: 0, in: 0, out: 0, nextOpen: 0 };       // G&G Paste (Mixed)
        let gingerPaste = { open: 0, in: 0, out: 0, nextOpen: 0 }; // Ginger Paste
        let garlicPaste = { open: 0, in: 0, out: 0, nextOpen: 0 }; // Garlic Paste

        // 1. Determine Date Prefix for Filtering Current Month
        let targetPrefix = selectedYear;
        let nextMonthPrefix = null;

        if (selectedMonth !== 'Overall') {
            const parts = selectedMonth.split(' ');
            if (parts.length === 2) {
                const selMonth = parts[0];
                const selYear = parts[1];
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                if (monthMap[selMonth]) {
                    targetPrefix = selYear + '-' + monthMap[selMonth];

                    // Calculate Next Month Prefix
                    let yearInt = parseInt(selYear);
                    let monthInt = parseInt(monthMap[selMonth]);

                    monthInt++;
                    if (monthInt > 12) {
                        monthInt = 1;
                        yearInt++;
                    }
                    nextMonthPrefix = yearInt + '-' + String(monthInt).padStart(2, '0');
                }
            }
        }

        const isMatch = (dateStr) => dateStr && dateStr.startsWith(targetPrefix);
        const isNextMonthMatch = (dateStr) => nextMonthPrefix && dateStr && dateStr.startsWith(nextMonthPrefix);

        // Usage Helpers
        const addToStat = (statObj, type, weight) => {
            if (type === 'open') statObj.open += weight;
            else if (type === 'in') statObj.in += weight;
            else if (type === 'out') statObj.out += weight;
            else if (type === 'nextOpen') statObj.nextOpen += weight;
        };

        const classifyAndAdd = (name, weight, type) => {
            // Raw
            if (name.includes('GINGER') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                addToStat(ginger, type, weight);
            } else if (name.includes('GARLIC') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                addToStat(garlic, type, weight);
            }
            // Peeled
            else if (name.includes('GINGER') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                addToStat(gingerPeeled, type, weight);
            } else if (name.includes('GARLIC') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                addToStat(garlicPeeled, type, weight);
            }
            // Paste
            else if (name.includes('PASTE')) {
                if (name.includes('GINGER') && !name.includes('GARLIC')) {
                    addToStat(gingerPaste, type, weight);
                } else if (name.includes('GARLIC') && !name.includes('GINGER')) {
                    addToStat(garlicPaste, type, weight);
                } else {
                    // Default to G&G Paste if both or neither (usually "Ginger Garlic Paste")
                    addToStat(paste, type, weight);
                }
            }
        };

        // 2. Process Stock In (Opening + Purchases)
        (productionData?.stockIn || []).forEach(item => {
            const name = (item.material || item.item || '').trim().toUpperCase();
            const weight = parseFloat(item.weight || 0);

            // Is Opening Stock?
            const isOS = name.startsWith('OS') || name.startsWith('O.S') || name.includes('OPENING') || name.includes('B/F');

            // Current Month Activity
            if (isMatch(item.date)) {
                classifyAndAdd(name, weight, isOS ? 'open' : 'in');
            }
            if (isNextMonthMatch(item.date) && isOS) {
                classifyAndAdd(name, weight, 'nextOpen');
            }
        });

        // 3. Process Usage (Raw/Peeled Out) -> From PreProduction
        (productionData?.preProduction || []).forEach(item => {
            if (!isMatch(item.date)) return;
            const name = (item.material || '').toUpperCase();
            const weight = parseFloat(item.weight || 0);

            // PreProduction usually logs usage of Raw to make Peeled, OR Peeled to make Paste.
            // If name is Raw, it's Usage of Raw.
            // If name is Peeled, it's Usage of Peeled.
            classifyAndAdd(name, weight, 'out');
        });

        // 4. Process Production (Peeled/Paste In) -> From PostProduction
        (productionData?.postProduction || []).forEach(item => {
            if (!isMatch(item.date)) return;
            const name = (item.material || '').toUpperCase();
            const weight = parseFloat(item.weight || 0);

            // PostProduction logs output. 
            // If it's Paste -> In for Paste.
            // If it's Peeled -> In for Peeled (if logged here).
            classifyAndAdd(name, weight, 'in');
        });

        // 5. Process Sales (Paste Out)
        (salesData || []).forEach(item => {
            // Note: salesData is now pre-filtered/aggregated by Dashboard.jsx (filteredItems)
            // So we don't check date here, we just sum up what we got.
            const name = (item.name || '').toUpperCase();
            classifyAndAdd(name, parseFloat(item.qty || 0), 'out');
        });

        // Detect if we have data for the next month (to enable reconciliation)
        const hasNextMonthData = productionData?.stockIn?.some(item => isNextMonthMatch(item.date));

        // DEBUG LOGGING
        // console.log('DEBUG: Stock Dashboard Calc', {
        //    selectedMonth, targetPrefix, nextMonthPrefix, hasNextMonthData,
        //    salesDataLen: salesData?.length,
        //    sampleSales: salesData?.slice(0, 3)
        // });

        const close = (obj) => obj.open + obj.in - obj.out;

        // Auto-Reconcile: If Out is 0 (missing sales data) but we have Next Month's Opening,
        // assume the difference is IMPLICIT SALES defined by the user ("Deduct shortage from sales").
        // Formula: Sales (Out) = (Open + In) - NextOpen
        const reconcile = (obj, name) => {
            // console.log(`DEBUG: Reconcile check for ${name}`, {
            //    out: obj.out, open: obj.open, in: obj.in, nextOpen: obj.nextOpen, hasNextMonthData
            // });

            // Only apply to Processed Goods where Sales Qty is often missing
            // Relaxed check: logic applies if Out is negligible (< 1kg)
            if (hasNextMonthData && obj.out < 1 && (obj.open > 0 || obj.in > 0)) {
                const theoreticalClosing = obj.open + obj.in;
                // If we have less next month than we theoretically should, the gap is Sales.
                if (theoreticalClosing > obj.nextOpen) {
                    const implicitSales = theoreticalClosing - obj.nextOpen;
                    // Only reconcile if implicit sales is positive
                    if (implicitSales > 0) {
                        return { ...obj, out: implicitSales, closing: obj.nextOpen, isEstimated: true };
                    }
                }
            }
            return { ...obj, closing: close(obj) };
        };

        const ledgers = {
            ginger: { ...ginger, closing: close(ginger) },
            garlic: { ...garlic, closing: close(garlic) },
            // Reconcile Processed items as per user request
            gingerPeeled: reconcile(gingerPeeled, 'Ginger Peeled'),
            garlicPeeled: reconcile(garlicPeeled, 'Garlic Peeled'),
            paste: reconcile(paste, 'Paste Mix'),
            gingerPaste: reconcile(gingerPaste, 'Ginger Paste'),
            garlicPaste: reconcile(garlicPaste, 'Garlic Paste')
        };
        // console.log('DEBUG: Final Ledgers', ledgers);
        return ledgers;

    }, [productionData, salesData, selectedMonth, selectedYear]);

    const filteredStocks = useMemo(() => {
        let items = [
            { id: 'ginger_raw', title: "Ginger (Raw)", ...stockStats.ginger, color: "amber", category: "Raw" },
            { id: 'garlic_raw', title: "Garlic (Raw)", ...stockStats.garlic, color: "purple", category: "Raw" },
            { id: 'ginger_peeled', title: "Ginger (Peeled)", ...stockStats.gingerPeeled, color: "orange", category: "Processed" },
            { id: 'garlic_peeled', title: "Garlic (Peeled)", ...stockStats.garlicPeeled, color: "indigo", category: "Processed" },
            { id: 'mix_paste', title: "G&G Paste (Mix)", ...stockStats.paste, color: "green", category: "Processed" },
            { id: 'ginger_paste', title: "Ginger Paste", ...stockStats.gingerPaste, color: "teal", category: "Processed" },
            { id: 'garlic_paste', title: "Garlic Paste", ...stockStats.garlicPaste, color: "cyan", category: "Processed" }
        ];

        if (activeCategory !== 'All') {
            items = items.filter(i => i.category === activeCategory);
        }

        if (searchTerm) {
            items = items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return items;
    }, [stockStats, activeCategory, searchTerm]);

    const globalStats = useMemo(() => {
        const total = filteredStocks.length;
        const low = filteredStocks.filter(s => {
            const status = getHealthStatus(s.title, s.closing);
            return status.label === 'Low Stock' || status.label === 'Out of Stock';
        }).length;
        const errors = filteredStocks.filter(s => s.closing < 0).length;
        return { total, low, errors };
    }, [filteredStocks]);

    const rawMaterialStocks = useMemo(() => filteredStocks.filter(s => s.category === 'Raw'), [filteredStocks]);
    const processedGoodsStocks = useMemo(() => filteredStocks.filter(s => s.category === 'Processed'), [filteredStocks]);

    return (
        <div className="animate-fade-in">
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--glass-highlight)', padding: '0.4rem', borderRadius: '0.75rem' }}>
                    {['All', 'Raw', 'Processed'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: activeCategory === cat ? 'var(--accent-primary)' : 'transparent',
                                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.9rem'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                            {globalStats.total} Total
                        </div>
                        {globalStats.low > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 600 }}>
                                <AlertCircle size={14} />
                                {globalStats.low} Low Stock
                            </div>
                        )}
                        {globalStats.errors > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600 }}>
                                <XCircle size={14} />
                                {globalStats.errors} Issues
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Search stock..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'var(--glass-highlight)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                padding: '0.6rem 1rem 0.6rem 2.8rem',
                                borderRadius: '0.75rem',
                                width: '250px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Summary row - Only shown in All mode to avoid redundancy */}
            {activeCategory === 'All' && !searchTerm && (
                <div className="responsive-grid-2" style={{ marginBottom: '2.5rem' }}>
                    <StockSummaryCard
                        title="Ginger Stock"
                        icon={gingerIcon}
                        color="#FCD34D"
                        opening={stockStats.ginger.open}
                        purchased={stockStats.ginger.in}
                        total={stockStats.ginger.open + stockStats.ginger.in}
                        available={stockStats.ginger.closing}
                    />
                    <StockSummaryCard
                        title="Garlic Stock"
                        icon={garlicIcon}
                        color="#818cf8"
                        opening={stockStats.garlic.open}
                        purchased={stockStats.garlic.in}
                        total={stockStats.garlic.open + stockStats.garlic.in}
                        available={stockStats.garlic.closing}
                    />
                </div>
            )}

            {/* Tables Section */}
            <StockTable
                title="Raw Materials"
                data={rawMaterialStocks}
                icon={Package}
                color="amber"
            />

            <StockTable
                title="Processed Goods"
                data={processedGoodsStocks}
                icon={Activity}
                color="green"
            />

            {filteredStocks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No matching stock items found.</p>
                </div>
            )}
        </div>
    );
};

export default StockDashboard;
