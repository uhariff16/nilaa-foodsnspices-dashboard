import React, { useMemo } from 'react';
import { Package, TrendingUp, TrendingDown, ArrowRight, Activity, Layers, AlertCircle } from 'lucide-react';
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
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e0f2fe' }}>{title}</h3>
            </div>
            <div style={{
                width: '60px', height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
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
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>Opening:</span>
            <span style={{ textAlign: 'right', color: '#fbbf24', fontWeight: 600 }}>{opening.toLocaleString()} kg</span>

            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Purchased:</span>
            <span style={{ textAlign: 'right', color: '#38bdf8', fontWeight: 600 }}>{purchased.toLocaleString()} kg</span>

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

const StockCard = ({ title, open, in: inVal, out, closing, unit = 'kg', color = 'blue', nextOpen }) => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: `rgba(var(--color-${color}-500), 0.1)` }}>
                    <Package size={20} color={`var(--color-${color}-500)`} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
                {/* Opening */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Opening</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{open.toLocaleString()}</span>
                </div>

                {/* In (+ via Proc/Prod) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#10b981' }}>In</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>+{inVal.toLocaleString()}</span>
                </div>

                {/* Out (- via Usage/Sales) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>Out</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ef4444' }}>-{out.toLocaleString()}</span>
                </div>

                {/* Closing */}
                {/* Closing */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--glass-highlight)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Closing</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{closing.toLocaleString()}</span>
                </div>
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{unit}</span>
            </div>

            {/* Shortage Analysis */}
            {nextOpen > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Next Opening</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nextOpen.toLocaleString()}</span>
                    </div>

                    {(() => {
                        const variance = closing - nextOpen;
                        // Tolerance of 0.1 for float issues
                        if (Math.abs(variance) < 0.1) return <span style={{ color: '#10b981', fontWeight: 600 }}>Stocks Matched ✅</span>;

                        // Variance > 0 means Closing > Next Open -> Shortage (We expected more than we have)
                        // Actually: Closing (System) - Next Open (Physical)
                        // If System says 100, Physical says 90. Diff is 10. Shortage of 10.
                        // If System says 90, Physical says 100. Diff is -10. Surplus of 10.
                        const isShortage = variance > 0;

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ color: isShortage ? '#ef4444' : '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {isShortage ? 'Shortage' : 'Surplus'}
                                </span>
                                <span style={{ color: isShortage ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                                    {Math.abs(variance).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

const StockDashboard = ({ productionData, salesData, procurementData, selectedMonth, selectedYear }) => {

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
            const isOS = name.startsWith('OS') || name.includes('OPENING') || name.includes('B/F');

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
            if (item.parsedDate && item.parsedDate.startsWith(targetPrefix)) {
                const name = (item.name || '').toUpperCase();
                classifyAndAdd(name, parseFloat(item.qty || 0), 'out');
            }
        });

        const close = (obj) => obj.open + obj.in - obj.out;

        return {
            ginger: { ...ginger, closing: close(ginger) },
            garlic: { ...garlic, closing: close(garlic) },
            gingerPeeled: { ...gingerPeeled, closing: close(gingerPeeled) },
            garlicPeeled: { ...garlicPeeled, closing: close(garlicPeeled) },
            paste: { ...paste, closing: close(paste) },
            gingerPaste: { ...gingerPaste, closing: close(gingerPaste) },
            garlicPaste: { ...garlicPaste, closing: close(garlicPaste) }
        };

    }, [productionData, salesData, selectedMonth, selectedYear]);

    return (
        <div className="animate-fade-in">
            {/* Stock Summary Cards (Ginger/Garlic) - Top Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
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

            {/* Main Stock Analysis Section */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Stock Analysis
            </h2>

            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Raw Materials</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <StockCard title="Ginger (Raw)" {...stockStats.ginger} color="amber" />
                <StockCard title="Garlic (Raw)" {...stockStats.garlic} color="purple" />
            </div>

            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Processed Goods</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Peeled Items - Flow naturally with Paste */}
                <StockCard title="Ginger (Peeled)" {...stockStats.gingerPeeled} color="orange" />
                <StockCard title="Garlic (Peeled)" {...stockStats.garlicPeeled} color="indigo" />

                {/* Paste Items */}
                <StockCard title="G&G Paste (Mix)" {...stockStats.paste} color="green" />
                <StockCard title="Ginger Paste" {...stockStats.gingerPaste} color="teal" />
                <StockCard title="Garlic Paste" {...stockStats.garlicPaste} color="cyan" />
            </div>
        </div>
    );
};

export default StockDashboard;
