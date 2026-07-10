import React, { useMemo, useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, ArrowRight, Activity, Layers, AlertCircle, Search, Filter, CheckCircle, AlertTriangle, XCircle, ChevronRight, PlusCircle } from 'lucide-react';
import gingerIcon from '../assets/ginger.png';
import garlicIcon from '../assets/garlic.png';
import { supabase } from '../lib/supabaseClient';

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


// Stock Logs Modal Component
const StockLogsModal = ({ isOpen, onClose, monthlyAdjustments, selectedMonth }) => {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', border: '1px solid var(--accent-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Reconciliation Logs ({selectedMonth})
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <XCircle size={24} />
                    </button>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="custom-scrollbar">
                    {monthlyAdjustments.length === 0 ? (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', margin: '2rem 0' }}>
                            No adjustments logged for this month.
                        </div>
                    ) : (
                        monthlyAdjustments.map((adj, idx) => (
                            <div key={adj.id || idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.6rem 0.8rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '0.5rem',
                                fontSize: '0.85rem'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{adj.material}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{adj.remarks}</span>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <span style={{ fontWeight: 700, color: adj.weight >= 0 ? '#34d399' : '#ef4444' }}>
                                        {adj.weight >= 0 ? '+' : ''}{adj.weight.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {adj.date ? new Date(adj.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        marginTop: '1.5rem',
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '0.5rem',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

// Stock Adjustment Modal Component
const StockAdjustmentModal = ({ isOpen, onClose, onSave, isAdmin, calculatedClosings, monthlyPhysical, selectedMonth, selectedYear }) => {
    const [mode, setMode] = useState('adjustment'); // 'adjustment' | 'transfer'
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        material: 'GINGER RAW',
        sourceMaterial: 'GINGER PEELED',
        destMaterial: 'G&G PASTE (MIX)',
        weight: '',
        remarks: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const materials = [
        'GINGER RAW', 'GARLIC RAW',
        'GINGER PEELED', 'GARLIC PEELED',
        'G&G PASTE (MIX)', 'GINGER PASTE', 'GARLIC PASTE'
    ];

    const sourcePeeledMaterials = [
        'GINGER PEELED', 'GARLIC PEELED'
    ];

    const destPasteMaterials = [
        'G&G PASTE (MIX)', 'GINGER PASTE', 'GARLIC PASTE'
    ];

    const dbToKey = {
        'GINGER RAW': 'ginger',
        'GARLIC RAW': 'garlic',
        'GINGER PEELED': 'gingerPeeled',
        'GARLIC PEELED': 'garlicPeeled',
        'G&G PASTE (MIX)': 'paste',
        'GINGER PASTE': 'gingerPaste',
        'GARLIC PASTE': 'garlicPaste'
    };

    const sourceKey = dbToKey[formData.sourceMaterial];
    const sourceSys = calculatedClosings?.[sourceKey] || 0;
    const sourcePhysObj = monthlyPhysical?.[sourceKey];
    const calculatedShortage = sourcePhysObj 
        ? Math.max(0, sourceSys - sourcePhysObj.weight) 
        : (sourceSys < 0 ? -sourceSys : 0);

    const itemsToReconcile = [
        { key: 'ginger', label: 'Ginger Raw', dbName: 'GINGER RAW', available: calculatedClosings?.ginger || 0 },
        { key: 'garlic', label: 'Garlic Raw', dbName: 'GARLIC RAW', available: calculatedClosings?.garlic || 0 },
        { key: 'gingerPeeled', label: 'Ginger Peeled', dbName: 'GINGER PEELED', available: calculatedClosings?.gingerPeeled || 0 },
        { key: 'garlicPeeled', label: 'Garlic Peeled', dbName: 'GARLIC PEELED', available: calculatedClosings?.garlicPeeled || 0 },
        { key: 'paste', label: 'G&G Paste (Mix)', dbName: 'G&G PASTE (MIX)', available: calculatedClosings?.paste || 0 },
        { key: 'gingerPaste', label: 'Ginger Paste', dbName: 'GINGER PASTE', available: calculatedClosings?.gingerPaste || 0 },
        { key: 'garlicPaste', label: 'Garlic Paste', dbName: 'GARLIC PASTE', available: calculatedClosings?.garlicPaste || 0 }
    ];

    const activeDiscrepancies = itemsToReconcile.filter(item => {
        const phys = monthlyPhysical?.[item.key];
        return phys && Math.abs(phys.weight - item.available) >= 0.01;
    });

    const handleAutoReconcile = async () => {
        let targetDate = new Date().toISOString().split('T')[0];
        if (selectedMonth !== 'Overall') {
            const [sMonth, sYear] = selectedMonth.split(' ');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const mIdx = monthNames.indexOf(sMonth);
            if (mIdx !== -1) {
                const lastDay = new Date(parseInt(sYear), mIdx + 1, 0);
                targetDate = lastDay.toISOString().split('T')[0];
            }
        }

        const inserts = [];
        let msgDetails = '';

        activeDiscrepancies.forEach(item => {
            const phys = monthlyPhysical[item.key];
            const diff = phys.weight - item.available;
            inserts.push({
                date: targetDate,
                type: 'adjustment',
                material: item.dbName,
                weight: parseFloat(diff.toFixed(2)),
                remarks: `Auto-Reconcile Discrepancy (${selectedMonth})`
            });
            msgDetails += `• ${item.label}: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg\n`;
        });

        if (inserts.length === 0) {
            alert("No discrepancies found to reconcile.");
            return;
        }

        const msg = `This will log manual adjustments to reconcile calculated stock with physical counts for ${selectedMonth}:\n\n` +
            msgDetails +
            `\nDo you want to proceed?`;

        if (!window.confirm(msg)) return;
        if (!window.confirm("Are you absolutely sure? This will update the calculated available stocks on the dashboard.")) return;

        setIsSaving(true);
        try {
            const { error } = await supabase.from('production_logs').insert(inserts);
            if (error) throw error;

            alert("Discrepancies reconciled and adjustments recorded successfully!");
            onSave();
            onClose();
        } catch (err) {
            console.error("Error auto-reconciling:", err);
            alert("Failed to reconcile: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.weight || isNaN(formData.weight)) {
            alert("Please enter a valid weight.");
            return;
        }

        setIsSaving(true);
        try {
            if (mode === 'transfer') {
                const wt = parseFloat(formData.weight);
                if (wt <= 0) {
                    alert("Transfer weight must be greater than zero.");
                    setIsSaving(false);
                    return;
                }
                const { error } = await supabase
                    .from('production_logs')
                    .insert([
                        {
                            date: formData.date,
                            type: 'adjustment',
                            material: formData.sourceMaterial,
                            weight: -wt,
                            remarks: formData.remarks || `Transfer to ${formData.destMaterial}`
                        },
                        {
                            date: formData.date,
                            type: 'adjustment',
                            material: formData.destMaterial,
                            weight: wt,
                            remarks: formData.remarks || `Transfer from ${formData.sourceMaterial}`
                        }
                    ]);
                if (error) throw error;
                alert("Stock transfer completed successfully!");
            } else {
                const { error } = await supabase
                    .from('production_logs')
                    .insert([{
                        date: formData.date,
                        type: 'adjustment',
                        material: formData.material,
                        weight: parseFloat(formData.weight),
                        remarks: formData.remarks || 'Manual Adjustment'
                    }]);

                if (error) throw error;
                alert("Adjustment recorded successfully!");
            }
            
            onSave();
            onClose();
        } catch (err) {
            console.error("Error saving adjustment/transfer:", err);
            alert("Failed to save: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '450px', padding: '2rem', border: '1px solid var(--accent-color)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--accent-color)' }}>
                    <PlusCircle size={24} /> Stock Operations
                </h2>

                {/* Mode Selector Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => setMode('adjustment')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: mode === 'adjustment' ? '2px solid var(--accent-color)' : 'none',
                            color: mode === 'adjustment' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 650,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            paddingBottom: '0.4rem'
                        }}
                    >
                        Adjustment
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('transfer')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: mode === 'transfer' ? '2px solid var(--accent-color)' : 'none',
                            color: mode === 'transfer' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 650,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            paddingBottom: '0.4rem'
                        }}
                    >
                        Stock Transfer
                    </button>
                </div>

                {/* Auto-Reconcile Section */}
                {mode === 'adjustment' && selectedMonth !== 'Overall' && activeDiscrepancies.length > 0 && (
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px dashed #3b82f6',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#60a5fa', fontWeight: 600 }}>
                            Auto-Reconcile with Physical Count
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {activeDiscrepancies.map(item => {
                                const phys = monthlyPhysical[item.key];
                                const diff = phys.weight - item.available;
                                return (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{item.label}:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            Diff: {diff >= 0 ? '+' : ''}{diff.toFixed(1)} kg
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={handleAutoReconcile}
                            disabled={isSaving}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                background: '#3b82f6',
                                border: 'none',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            {isSaving ? 'Processing...' : 'Apply Discrepancy Adjustments'}
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)'
                            }}
                            required
                        />
                    </div>

                    {mode === 'transfer' ? (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Source Material (Deduct)</label>
                                <select
                                    value={formData.sourceMaterial}
                                    onChange={(e) => setFormData({ ...formData, sourceMaterial: e.target.value })}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                        background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {sourcePeeledMaterials.map(m => (
                                        <option key={m} value={m} style={{ background: '#1f2937', color: '#f3f4f6' }}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Destination Material (Add)</label>
                                <select
                                    value={formData.destMaterial}
                                    onChange={(e) => setFormData({ ...formData, destMaterial: e.target.value })}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                        background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {destPasteMaterials.map(m => (
                                        <option key={m} value={m} style={{ background: '#1f2937', color: '#f3f4f6' }}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {calculatedShortage > 0.01 && (
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    border: '1px dashed #3b82f6',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '0.5rem'
                                }}>
                                    <div style={{ color: '#93c5fd' }}>
                                        <strong>Source Discrepancy (Shortage):</strong> {calculatedShortage.toFixed(1)} kg
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, weight: calculatedShortage.toFixed(2) })}
                                        style={{
                                            padding: '0.25rem 0.6rem',
                                            background: '#3b82f6',
                                            border: 'none',
                                            borderRadius: '0.25rem',
                                            color: 'white',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        Auto-Fill Weight
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Material Type</label>
                            <select
                                value={formData.material}
                                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                    background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {materials.map(m => (
                                    <option key={m} value={m} style={{ background: '#1f2937', color: '#f3f4f6' }}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            {mode === 'transfer' ? 'Weight to Transfer (Kg)' : 'Weight Change (Kg)'}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                {mode === 'transfer' ? '(Must be a positive value)' : '(Use negative for loss/damage)'}
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder={mode === 'transfer' ? "e.g. 15.0" : "e.g. -5.2"}
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)'
                            }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Remarks</label>
                        <textarea
                            placeholder={mode === 'transfer' ? "e.g. Transferred for paste production..." : "Reason for adjustment..."}
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem', height: '80px',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)', resize: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'transparent', border: '1px solid var(--glass-border)',
                                color: 'var(--text-secondary)', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                flex: 2, padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'var(--accent-color)', border: 'none',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            {isSaving ? 'Processing...' : mode === 'transfer' ? 'Execute Transfer' : 'Record Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Physical Count Modal Component
const PhysicalCountModal = ({ isOpen, onClose, onSave, isAdmin }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        material: 'GINGER RAW',
        weight: '',
        remarks: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const materials = [
        'GINGER RAW', 'GARLIC RAW',
        'GINGER PEELED', 'GARLIC PEELED',
        'G&G PASTE (MIX)', 'GINGER PASTE', 'GARLIC PASTE'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.weight || isNaN(formData.weight) || parseFloat(formData.weight) < 0) {
            alert("Please enter a valid positive physical count.");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('production_logs')
                .insert([{
                    date: formData.date,
                    type: 'physical_count',
                    material: formData.material,
                    weight: parseFloat(formData.weight),
                    remarks: formData.remarks || 'Physical Stock Count'
                }]);

            if (error) throw error;

            alert("Physical count recorded successfully!");
            onSave();
            onClose();
        } catch (err) {
            console.error("Error saving physical count:", err);
            alert("Failed to save physical count: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '450px', padding: '2rem', border: '1px solid #10b981' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#10b981' }}>
                    <PlusCircle size={24} /> Physical Stock Count
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Count Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)'
                            }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Material Type</label>
                        <select
                            value={formData.material}
                            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            {materials.map(m => (
                                <option key={m} value={m} style={{ background: '#1f2937', color: '#f3f4f6' }}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Physical Weight (Kg)
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                (Must be a positive value)
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 150.5"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)'
                            }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Remarks</label>
                        <textarea
                            placeholder="e.g. June End Stock Take..."
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem', height: '80px',
                                background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)', resize: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                                background: 'transparent', border: '1px solid var(--glass-border)',
                                color: 'var(--text-secondary)', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                flex: 2, padding: '0.75rem', borderRadius: '0.5rem',
                                background: '#10b981', border: 'none',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            {isSaving ? 'Processing...' : 'Record Count'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StockDashboard = ({ productionData, salesData, procurementData, selectedMonth, selectedYear, isAdmin }) => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [searchTerm, setSearchTerm] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('All'); // All, Raw, Processed

    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [showPhysicalModal, setShowPhysicalModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [adjustments, setAdjustments] = useState([]);
    const [physicalCounts, setPhysicalCounts] = useState([]);

    // Fetch Manual Adjustments from DB
    const fetchAdjustments = async () => {
        try {
            const { data: logs, error } = await supabase
                .from('production_logs')
                .select('*')
                .eq('type', 'adjustment')
                .order('date', { ascending: false });

            if (error) throw error;
            setAdjustments(logs || []);
        } catch (err) {
            console.error("Error fetching adjustments:", err);
        }
    };

    // Fetch Physical Stock Counts from DB
    const fetchPhysicalCounts = async () => {
        try {
            const { data: logs, error } = await supabase
                .from('production_logs')
                .select('*')
                .eq('type', 'physical_count')
                .order('date', { ascending: false });

            if (error) throw error;
            setPhysicalCounts(logs || []);
        } catch (err) {
            console.error("Error fetching physical counts:", err);
        }
    };

    useEffect(() => {
        fetchAdjustments();
        fetchPhysicalCounts();
    }, []);

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
                                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '150px' }}>Item Name & Status</th>
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
                                                {item.lastDate && (
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.8, marginTop: '0.05rem' }}>
                                                        Last Updated: {(() => {
                                                            const parts = item.lastDate.split('-');
                                                            if (parts.length !== 3) return item.lastDate;
                                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                            const mIdx = parseInt(parts[1]) - 1;
                                                            if (mIdx >= 0 && mIdx < 12) {
                                                                return `${parseInt(parts[2])}-${months[mIdx]}-${parts[0]}`;
                                                            }
                                                            return item.lastDate;
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            <div>{item.open.toLocaleString()}</div>
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#10b981', fontWeight: 500 }}>
                                            +{item.in.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.5rem 0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                                            -{item.out.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                                            {item.adj && Math.abs(item.adj) >= 0.01 ? (() => {
                                                const systemStock = item.open + item.in - item.out;
                                                const adjColor = item.adj >= 0 ? '#34d399' : '#ef4444';
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', fontSize: '0.75rem' }}>
                                                        <div style={{ color: 'var(--text-secondary)' }}>System stock: {systemStock.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</div>
                                                        <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Physical stock: {item.closing.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</div>
                                                        <div style={{ color: adjColor, fontWeight: 700 }}>Adjustments: {item.adj >= 0 ? '+' : ''}{item.adj.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</div>
                                                    </div>
                                                );
                                            })() : (
                                                <>
                                                    <span style={{
                                                        fontWeight: 800,
                                                        fontSize: '1rem',
                                                        color: item.closing < 0 ? '#ef4444' : 'var(--text-primary)',
                                                        display: 'block'
                                                    }}>
                                                        {item.closing.toLocaleString()}
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </>
                                            )}
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
        let ginger = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' };
        let garlic = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' };
        // Peeled
        let gingerPeeled = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' };
        let garlicPeeled = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' };
        // Paste
        let paste = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' };       // G&G Paste (Mixed)
        let gingerPaste = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' }; // Ginger Paste
        let garlicPaste = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0, lastDate: null, lastObjDate: '' }; // Garlic Paste

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

        const updateLastDate = (statObj, dateStr) => {
            if (!dateStr) return;
            const cleanDate = dateStr.split('T')[0];
            if (!statObj.lastObjDate || cleanDate > statObj.lastObjDate) {
                statObj.lastObjDate = cleanDate;
                statObj.lastDate = cleanDate;
            }
        };

        // Usage Helpers
        const addToStat = (statObj, type, weight) => {
            if (type === 'open') statObj.open += weight;
            else if (type === 'in') statObj.in += weight;
            else if (type === 'out') statObj.out += weight;
            else if (type === 'nextOpen') statObj.nextOpen += weight;
        };

        const classifyAndAdd = (name, weight, type, dateStr) => {
            let targetObj = null;
            // Raw
            if (name.includes('GINGER') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                targetObj = ginger;
            } else if (name.includes('GARLIC') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                targetObj = garlic;
            }
            // Peeled
            else if (name.includes('GINGER') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                targetObj = gingerPeeled;
            } else if (name.includes('GARLIC') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                targetObj = garlicPeeled;
            }
            // Paste
            else if (name.includes('PASTE')) {
                if (name.includes('GINGER') && !name.includes('GARLIC')) {
                    targetObj = gingerPaste;
                } else if (name.includes('GARLIC') && !name.includes('GINGER')) {
                    targetObj = garlicPaste;
                } else {
                    // Default to G&G Paste if both or neither (usually "Ginger Garlic Paste")
                    targetObj = paste;
                }
            }

            if (targetObj) {
                addToStat(targetObj, type, weight);
                if (dateStr && type !== 'open' && type !== 'nextOpen') {
                    updateLastDate(targetObj, dateStr);
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
                classifyAndAdd(name, weight, isOS ? 'open' : 'in', item.date);
            }
            if (isNextMonthMatch(item.date) && isOS) {
                classifyAndAdd(name, weight, 'nextOpen', item.date);
            }
        });

        // 2.1 Process Manual Adjustments (logged in DB)
        adjustments.forEach(item => {
            if (isMatch(item.date)) {
                const name = (item.material || '').toUpperCase();
                const weight = parseFloat(item.weight || 0);
                
                const addAdj = (statObj, wt) => {
                    statObj.adj += wt;
                    updateLastDate(statObj, item.date);
                };
                
                const classifyAdjustment = (matName, wt) => {
                    if (matName.includes('GINGER') && !matName.includes('PASTE') && !matName.includes('PEELED') && !matName.includes('PROCESSED') && !matName.includes('CLEANED')) {
                        addAdj(ginger, wt);
                    } else if (matName.includes('GARLIC') && !matName.includes('PASTE') && !matName.includes('PEELED') && !matName.includes('PROCESSED') && !matName.includes('CLEANED')) {
                        addAdj(garlic, wt);
                    } else if (matName.includes('GINGER') && (matName.includes('PEELED') || matName.includes('PROCESSED') || matName.includes('CLEANED')) && !name.includes('PASTE')) {
                        addAdj(gingerPeeled, wt);
                    } else if (matName.includes('GARLIC') && (matName.includes('PEELED') || matName.includes('PROCESSED') || matName.includes('CLEANED')) && !name.includes('PASTE')) {
                        addAdj(garlicPeeled, wt);
                    } else if (matName.includes('PASTE')) {
                        if (matName.includes('GINGER') && !matName.includes('GARLIC')) {
                            addAdj(gingerPaste, wt);
                        } else if (matName.includes('GARLIC') && !matName.includes('GINGER')) {
                            addAdj(garlicPaste, wt);
                        } else {
                            addAdj(paste, wt);
                        }
                    }
                };

                classifyAdjustment(name, weight);
            }
        });

        // 2.2 Process Physical counts (to capture count date)
        physicalCounts.forEach(item => {
            if (isMatch(item.date)) {
                const name = (item.material || '').toUpperCase();
                const classifyPhys = (statObj) => {
                    updateLastDate(statObj, item.date);
                };
                if (name.includes('GINGER') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                    classifyPhys(ginger);
                } else if (name.includes('GARLIC') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                    classifyPhys(garlic);
                } else if (name.includes('GINGER') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                    classifyPhys(gingerPeeled);
                } else if (name.includes('GARLIC') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                    classifyPhys(garlicPeeled);
                } else if (name.includes('PASTE')) {
                    if (name.includes('GINGER') && !name.includes('GARLIC')) {
                        classifyPhys(gingerPaste);
                    } else if (name.includes('GARLIC') && !name.includes('GINGER')) {
                        classifyPhys(garlicPaste);
                    } else {
                        classifyPhys(paste);
                    }
                }
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
            classifyAndAdd(name, weight, 'out', item.date);
        });

        // 4. Process Production (Peeled/Paste In) -> From PostProduction
        (productionData?.postProduction || []).forEach(item => {
            if (!isMatch(item.date)) return;
            const name = (item.material || '').toUpperCase();
            const weight = parseFloat(item.weight || 0);

            // PostProduction logs output. 
            // If it's Paste -> In for Paste.
            // If it's Peeled -> In for Peeled (if logged here).
            classifyAndAdd(name, weight, 'in', item.date);
        });

        // 5. Process Sales (Paste Out)
        (salesData || []).forEach(item => {
            // Note: salesData is now pre-filtered/aggregated by Dashboard.jsx (filteredItems)
            // So we don't check date here, we just sum up what we got.
            const name = (item.name || '').toUpperCase();
            classifyAndAdd(name, parseFloat(item.qty || 0), 'out', item.date || item.Date);
        });

        // Detect if we have data for the next month (to enable reconciliation)
        const hasNextMonthData = productionData?.stockIn?.some(item => isNextMonthMatch(item.date));

        // DEBUG LOGGING
        // console.log('DEBUG: Stock Dashboard Calc', {
        //    selectedMonth, targetPrefix, nextMonthPrefix, hasNextMonthData,
        //    salesDataLen: salesData?.length,
        //    sampleSales: salesData?.slice(0, 3)
        // });

        const close = (obj) => obj.open + obj.in - obj.out + (obj.adj || 0);

        // Get physical counts dynamically
        const getPhysical = (materialName) => {
            if (selectedMonth === 'Overall') {
                const yearCounts = physicalCounts.filter(p => p.date && p.date.startsWith(selectedYear));
                const sorted = [...yearCounts].sort((a, b) => b.date.localeCompare(a.date));
                const count = sorted.find(s => s.material === materialName);
                return count ? count.weight : null;
            } else {
                const [sMonth, sYear] = selectedMonth.split(' ');
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                const prefix = `${sYear}-${monthMap[sMonth]}`;
                const monthCounts = physicalCounts.filter(p => p.date && p.date.startsWith(prefix));
                const count = monthCounts.find(s => s.material === materialName);
                return count ? count.weight : null;
            }
        };

        let gingerPhysical = getPhysical('GINGER RAW');
        let garlicPhysical = getPhysical('GARLIC RAW');
        let gingerPeeledPhysical = getPhysical('GINGER PEELED');
        let garlicPeeledPhysical = getPhysical('GARLIC PEELED');
        let pastePhysical = getPhysical('G&G PASTE (MIX)');
        let gingerPastePhysical = getPhysical('GINGER PASTE');
        let garlicPastePhysical = getPhysical('GARLIC PASTE');

        // Fallbacks to opening stock if no manual count
        if (gingerPhysical === null && selectedMonth !== 'Overall' && ginger.open > 0) {
            gingerPhysical = ginger.open;
        }
        if (garlicPhysical === null && selectedMonth !== 'Overall' && garlic.open > 0) {
            garlicPhysical = garlic.open;
        }

        const closeRaw = (obj, physVal) => {
            if (physVal !== null && physVal !== undefined) {
                return physVal;
            }
            return obj.open + obj.in - obj.out + (obj.adj || 0);
        };

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
                const theoreticalClosing = obj.open + obj.in + (obj.adj || 0);
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

        const closeProcessed = (obj, physVal, name) => {
            if (physVal !== null && physVal !== undefined) {
                return physVal;
            }
            return reconcile(obj, name).closing;
        };

        const ledgers = {
            ginger: { ...ginger, closing: closeRaw(ginger, gingerPhysical) },
            garlic: { ...garlic, closing: closeRaw(garlic, garlicPhysical) },
            gingerPeeled: { ...gingerPeeled, closing: closeProcessed(gingerPeeled, gingerPeeledPhysical, 'Ginger Peeled') },
            garlicPeeled: { ...garlicPeeled, closing: closeProcessed(garlicPeeled, garlicPeeledPhysical, 'Garlic Peeled') },
            paste: { ...paste, closing: closeProcessed(paste, pastePhysical, 'Paste Mix') },
            gingerPaste: { ...gingerPaste, closing: closeProcessed(gingerPaste, gingerPastePhysical, 'Ginger Paste') },
            garlicPaste: { ...garlicPaste, closing: closeProcessed(garlicPaste, garlicPastePhysical, 'Garlic Paste') }
        };
        // console.log('DEBUG: Final Ledgers', ledgers);
        return ledgers;

    }, [productionData, salesData, selectedMonth, selectedYear, adjustments, physicalCounts]);

    const gingerAvailable = stockStats.ginger.closing;
    const garlicAvailable = stockStats.garlic.closing;

    const gingerCalculatedClosing = useMemo(() => {
        return stockStats.ginger.open + stockStats.ginger.in - stockStats.ginger.out + (stockStats.ginger.adj || 0);
    }, [stockStats.ginger]);

    const garlicCalculatedClosing = useMemo(() => {
        return stockStats.garlic.open + stockStats.garlic.in - stockStats.garlic.out + (stockStats.garlic.adj || 0);
    }, [stockStats.garlic]);

    const gingerPeeledCalculatedClosing = useMemo(() => {
        return stockStats.gingerPeeled.open + stockStats.gingerPeeled.in - stockStats.gingerPeeled.out + (stockStats.gingerPeeled.adj || 0);
    }, [stockStats.gingerPeeled]);

    const garlicPeeledCalculatedClosing = useMemo(() => {
        return stockStats.garlicPeeled.open + stockStats.garlicPeeled.in - stockStats.garlicPeeled.out + (stockStats.garlicPeeled.adj || 0);
    }, [stockStats.garlicPeeled]);

    const pasteCalculatedClosing = useMemo(() => {
        return stockStats.paste.open + stockStats.paste.in - stockStats.paste.out + (stockStats.paste.adj || 0);
    }, [stockStats.paste]);

    const gingerPasteCalculatedClosing = useMemo(() => {
        return stockStats.gingerPaste.open + stockStats.gingerPaste.in - stockStats.gingerPaste.out + (stockStats.gingerPaste.adj || 0);
    }, [stockStats.gingerPaste]);

    const garlicPasteCalculatedClosing = useMemo(() => {
        return stockStats.garlicPaste.open + stockStats.garlicPaste.in - stockStats.garlicPaste.out + (stockStats.garlicPaste.adj || 0);
    }, [stockStats.garlicPaste]);

    const monthlyPhysical = useMemo(() => {
        const getManual = (materialName) => {
            if (selectedMonth === 'Overall') {
                const yearCounts = physicalCounts.filter(p => p.date && p.date.startsWith(selectedYear));
                const sorted = [...yearCounts].sort((a, b) => b.date.localeCompare(a.date));
                return sorted.find(s => s.material === materialName);
            } else {
                const [sMonth, sYear] = selectedMonth.split(' ');
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                const prefix = `${sYear}-${monthMap[sMonth]}`;
                const monthCounts = physicalCounts.filter(p => p.date && p.date.startsWith(prefix));
                return monthCounts.find(s => s.material === materialName);
            }
        };

        const buildRes = (matName, openVal) => {
            const manual = getManual(matName);
            if (manual) return { weight: manual.weight, source: 'Manual' };
            if (selectedMonth !== 'Overall' && openVal > 0) {
                return { weight: openVal, source: 'Excel OS' };
            }
            return null;
        };

        return {
            ginger: buildRes('GINGER RAW', stockStats.ginger.open),
            garlic: buildRes('GARLIC RAW', stockStats.garlic.open),
            gingerPeeled: buildRes('GINGER PEELED', stockStats.gingerPeeled.open),
            garlicPeeled: buildRes('GARLIC PEELED', stockStats.garlicPeeled.open),
            paste: buildRes('G&G PASTE (MIX)', stockStats.paste.open),
            gingerPaste: buildRes('GINGER PASTE', stockStats.gingerPaste.open),
            garlicPaste: buildRes('GARLIC PASTE', stockStats.garlicPaste.open)
        };
    }, [physicalCounts, selectedMonth, selectedYear, stockStats]);

    const monthlyAdjustments = useMemo(() => {
        if (selectedMonth === 'Overall') {
            return adjustments.filter(a => a.date && a.date.startsWith(selectedYear));
        } else {
            const [sMonth, sYear] = selectedMonth.split(' ');
            const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const prefix = `${sYear}-${monthMap[sMonth]}`;
            return adjustments.filter(a => a.date && a.date.startsWith(prefix));
        }
    }, [adjustments, selectedMonth, selectedYear]);

    const monthlyAdjustedGinger = useMemo(() => {
        return monthlyAdjustments
            .filter(a => String(a.material).toUpperCase().includes('GINGER') && String(a.material).toUpperCase().includes('RAW'))
            .reduce((sum, a) => sum + (a.weight || 0), 0);
    }, [monthlyAdjustments]);

    const monthlyAdjustedGarlic = useMemo(() => {
        return monthlyAdjustments
            .filter(a => String(a.material).toUpperCase().includes('GARLIC') && String(a.material).toUpperCase().includes('RAW'))
            .reduce((sum, a) => sum + (a.weight || 0), 0);
    }, [monthlyAdjustments]);

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

    const reconciliationItems = useMemo(() => {
        const getAdjustSum = (matName) => {
            return monthlyAdjustments
                .filter(a => String(a.material).toUpperCase() === matName)
                .reduce((sum, a) => sum + (a.weight || 0), 0);
        };

        return [
            { key: 'ginger', label: 'Ginger (Raw)', dbName: 'GINGER RAW', calculated: gingerCalculatedClosing, adjusted: getAdjustSum('GINGER RAW') },
            { key: 'garlic', label: 'Garlic (Raw)', dbName: 'GARLIC RAW', calculated: garlicCalculatedClosing, adjusted: getAdjustSum('GARLIC RAW') },
            { key: 'gingerPeeled', label: 'Ginger (Peeled)', dbName: 'GINGER PEELED', calculated: gingerPeeledCalculatedClosing, adjusted: getAdjustSum('GINGER PEELED') },
            { key: 'garlicPeeled', label: 'Garlic (Peeled)', dbName: 'GARLIC PEELED', calculated: garlicPeeledCalculatedClosing, adjusted: getAdjustSum('GARLIC PEELED') },
            { key: 'paste', label: 'G&G Paste (Mix)', dbName: 'G&G PASTE (MIX)', calculated: pasteCalculatedClosing, adjusted: getAdjustSum('G&G PASTE (MIX)') },
            { key: 'gingerPaste', label: 'Ginger Paste', dbName: 'GINGER PASTE', calculated: gingerPasteCalculatedClosing, adjusted: getAdjustSum('GINGER PASTE') },
            { key: 'garlicPaste', label: 'Garlic Paste', dbName: 'GARLIC PASTE', calculated: garlicPasteCalculatedClosing, adjusted: getAdjustSum('GARLIC PASTE') }
        ];
    }, [monthlyAdjustments, gingerCalculatedClosing, garlicCalculatedClosing, gingerPeeledCalculatedClosing, garlicPeeledCalculatedClosing, pasteCalculatedClosing, gingerPasteCalculatedClosing, garlicPasteCalculatedClosing]);

    const isReconciliationDone = useMemo(() => {
        const active = reconciliationItems.filter(item => monthlyPhysical[item.key]);
        if (active.length === 0) return false;
        return active.every(item => {
            const phys = monthlyPhysical[item.key];
            const remainingGap = phys.weight - item.calculated;
            return Math.abs(remainingGap) < 0.1;
        });
    }, [reconciliationItems, monthlyPhysical]);

    const rawMaterialStocks = useMemo(() => filteredStocks.filter(s => s.category === 'Raw'), [filteredStocks]);
    const processedGoodsStocks = useMemo(() => filteredStocks.filter(s => s.category === 'Processed'), [filteredStocks]);

    return (
        <div className="animate-fade-in">
            {/* Reconciliation Success Banner */}
            {isReconciliationDone && (
                <div className="glass-panel" style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderLeft: '4px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)'
                }}>
                    <CheckCircle size={20} color="#10b981" />
                    <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <span>🎉 <strong>Reconciliation Completed:</strong> The physical stock count and calculated system stock for <strong>{selectedMonth}</strong> are fully reconciled. All manual adjustments have been successfully logged.</span>
                        <button onClick={() => setShowLogsModal(true)} style={{ background: 'none', border: 'none', color: '#60a5fa', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                            [View Adjustments]
                        </button>
                    </div>
                </div>
            )}

            {/* Monthly Alert and Discrepancy Banner */}
            {((new Date().getDate() === 1) ||
              (monthlyPhysical.ginger && (Math.abs(monthlyPhysical.ginger.weight - gingerCalculatedClosing) > 10 || (gingerCalculatedClosing > 0 && Math.abs(monthlyPhysical.ginger.weight - gingerCalculatedClosing) / gingerCalculatedClosing > 0.05))) ||
              (monthlyPhysical.garlic && (Math.abs(monthlyPhysical.garlic.weight - garlicCalculatedClosing) > 20 || (garlicCalculatedClosing > 0 && Math.abs(monthlyPhysical.garlic.weight - garlicCalculatedClosing) / garlicCalculatedClosing > 0.05)))
            ) && (
                <div className="glass-panel" style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderLeft: '4px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    color: 'var(--text-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        <AlertCircle size={20} color="#ef4444" />
                        <span>Reconciliation Alerts & Notifications</span>
                    </div>
                    {new Date().getDate() === 1 && (
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>
                            📅 Today is the <strong>1st of the month</strong>. Please perform your physical stock take, record the counts, and enter manual adjustments if there is a discrepancy.
                        </p>
                    )}
                    {monthlyPhysical.ginger && (Math.abs(monthlyPhysical.ginger.weight - gingerCalculatedClosing) > 10 || (gingerCalculatedClosing > 0 && Math.abs(monthlyPhysical.ginger.weight - gingerCalculatedClosing) / gingerCalculatedClosing > 0.05)) && (
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>
                            ⚠️ <strong>Ginger Discrepancy Alert:</strong> The physical count ({monthlyPhysical.ginger.weight} kg) differs from the calculated stock ({gingerCalculatedClosing.toFixed(0)} kg) by <strong>{(monthlyPhysical.ginger.weight - gingerCalculatedClosing).toFixed(0)} kg</strong> ({gingerCalculatedClosing > 0 ? ((Math.abs(monthlyPhysical.ginger.weight - gingerCalculatedClosing)/gingerCalculatedClosing)*100).toFixed(1) : 100}%).
                        </p>
                    )}
                    {monthlyPhysical.garlic && (Math.abs(monthlyPhysical.garlic.weight - garlicCalculatedClosing) > 20 || (garlicCalculatedClosing > 0 && Math.abs(monthlyPhysical.garlic.weight - garlicCalculatedClosing) / garlicCalculatedClosing > 0.05)) && (
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>
                            ⚠️ <strong>Garlic Discrepancy Alert:</strong> The physical count ({monthlyPhysical.garlic.weight} kg) differs from the calculated stock ({garlicCalculatedClosing.toFixed(0)} kg) by <strong>{(monthlyPhysical.garlic.weight - garlicCalculatedClosing).toFixed(0)} kg</strong> ({garlicCalculatedClosing > 0 ? ((Math.abs(monthlyPhysical.garlic.weight - garlicCalculatedClosing)/garlicCalculatedClosing)*100).toFixed(1) : 100}%).
                        </p>
                    )}
                </div>
            )}

            {/* Admin Controls */}
            {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setShowPhysicalModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--glass-highlight)',
                            border: '1px solid #10b981',
                            color: 'var(--text-primary)', padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                        className="hover-scale"
                    >
                        <PlusCircle size={18} color="#10b981" /> Record Physical Count
                    </button>
                    <button
                        onClick={() => setShowAdjustmentModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--glass-highlight)',
                            border: '1px solid var(--accent-color)',
                            color: 'var(--text-primary)', padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                        className="hover-scale"
                    >
                        <PlusCircle size={18} color="var(--accent-color)" /> Manual Adjustment
                    </button>
                </div>
            )}

            <StockAdjustmentModal 
                isOpen={showAdjustmentModal} 
                onClose={() => setShowAdjustmentModal(false)}
                onSave={() => fetchAdjustments()}
                isAdmin={isAdmin}
                calculatedClosings={{
                    ginger: gingerCalculatedClosing,
                    garlic: garlicCalculatedClosing,
                    gingerPeeled: gingerPeeledCalculatedClosing,
                    garlicPeeled: garlicPeeledCalculatedClosing,
                    paste: pasteCalculatedClosing,
                    gingerPaste: gingerPasteCalculatedClosing,
                    garlicPaste: garlicPasteCalculatedClosing
                }}
                monthlyPhysical={monthlyPhysical}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
            />

            <PhysicalCountModal
                isOpen={showPhysicalModal}
                onClose={() => setShowPhysicalModal(false)}
                onSave={() => fetchPhysicalCounts()}
                isAdmin={isAdmin}
            />

            <StockLogsModal
                isOpen={showLogsModal}
                onClose={() => setShowLogsModal(false)}
                monthlyAdjustments={monthlyAdjustments}
                selectedMonth={selectedMonth}
            />

            {/* Search & Filter Bar */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                marginBottom: '2rem', 
                gap: '1rem' 
            }}>
                <div style={{ 
                    display: 'flex', 
                    gap: '0.4rem', 
                    background: 'var(--glass-highlight)', 
                    padding: '0.4rem', 
                    borderRadius: '0.75rem',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                }}>
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
                                fontSize: isMobile ? '0.8rem' : '0.9rem',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '1rem' : '1.5rem', 
                    alignItems: isMobile ? 'stretch' : 'center' 
                }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                            {globalStats.total} Total
                        </div>
                        {globalStats.low > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 600 }}>
                                <AlertCircle size={14} />
                                {globalStats.low} Low
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
                                width: isMobile ? '100%' : '250px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Summary row - Only shown in All mode to avoid redundancy */}
            {activeCategory === 'All' && !searchTerm && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
                    marginBottom: '2.5rem',
                    gap: '1.5rem' 
                }}>
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
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Physical Stock Count</h3>
                            </div>
                            <div style={{
                                width: '60px', height: '60px',
                                borderRadius: '50%',
                                background: 'var(--glass-highlight)',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid #3b82f6',
                                overflow: 'hidden',
                                padding: '5px'
                            }}>
                                <Package size={30} color="#3b82f6" />
                            </div>
                        </div>

                        {/* content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem', maxHeight: '280px', overflowY: 'auto' }} className="custom-scrollbar">
                            {(() => {
                                const countedReconItems = reconciliationItems.filter(item => monthlyPhysical[item.key]);
                                if (countedReconItems.length === 0) {
                                    return (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '0.5rem' }}>
                                            No physical count recorded for {selectedMonth}
                                        </span>
                                    );
                                }
                                return countedReconItems.map(item => {
                                    const phys = monthlyPhysical[item.key];
                                    const originalCalculated = item.calculated - item.adjusted;
                                    const discrepancy = phys.weight - originalCalculated;
                                    const discrepancyPct = originalCalculated > 0 ? (discrepancy / originalCalculated) * 100 : 0;
                                    const remainingGap = phys.weight - item.calculated;
                                    const isReconciled = Math.abs(remainingGap) < 0.1;

                                    return (
                                        <div key={item.key} style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{item.label}</span>
                                                {isReconciled && (
                                                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>
                                                        Reconciled
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span>└ System Stock:</span>
                                                <span>{originalCalculated.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span>└ Physical Stock:</span>
                                                <span>{phys.weight.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg{phys.source === 'Excel OS' ? ' (OS)' : ''}</span>
                                            </div>
                                            <div style={{ 
                                                display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', 
                                                color: discrepancy >= 0 ? '#34d399' : '#ef4444', 
                                                fontWeight: 600 
                                            }}>
                                                <span>└ Discrepancy:</span>
                                                <span>{discrepancy >= 0 ? '+' : ''}{discrepancy.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg ({discrepancy >= 0 ? '+' : ''}{discrepancyPct.toFixed(1)}%)</span>
                                            </div>
                                            {Math.abs(item.adjusted) >= 0.01 && (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                                                        <span>└ Reconciled Adj:</span>
                                                        <span>{item.adjusted >= 0 ? '+' : ''}{item.adjusted.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: isReconciled ? '#34d399' : '#f59e0b', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                                        <span>└ Remaining Gap:</span>
                                                        <span>{remainingGap >= 0 ? '+' : ''}{remainingGap.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

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
