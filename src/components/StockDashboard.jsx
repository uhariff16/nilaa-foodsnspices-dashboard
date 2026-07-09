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
const StockAdjustmentModal = ({ isOpen, onClose, onSave, isAdmin, gingerAvailable, garlicAvailable, monthlyPhysical, selectedMonth, selectedYear }) => {
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
        'GINGER PEELED', 'GARLIC PEELED'
    ];

    const handleAutoReconcile = async () => {
        const gingerDiff = monthlyPhysical.ginger ? (monthlyPhysical.ginger.weight - gingerAvailable) : 0;
        const garlicDiff = monthlyPhysical.garlic ? (monthlyPhysical.garlic.weight - garlicAvailable) : 0;

        if (Math.abs(gingerDiff) < 0.01 && Math.abs(garlicDiff) < 0.01) {
            alert("No discrepancies found to reconcile.");
            return;
        }

        const msg = `This will log manual adjustments to reconcile calculated stock with physical counts for ${selectedMonth}:\n\n` +
            (monthlyPhysical.ginger ? `• Ginger Raw: ${gingerDiff >= 0 ? '+' : ''}${gingerDiff.toFixed(1)} kg\n` : '') +
            (monthlyPhysical.garlic ? `• Garlic Raw: ${garlicDiff >= 0 ? '+' : ''}${garlicDiff.toFixed(1)} kg\n` : '') +
            `\nDo you want to proceed?`;

        if (!window.confirm(msg)) return;
        if (!window.confirm("Are you absolutely sure? This will update the calculated available stocks on the dashboard.")) return;

        setIsSaving(true);
        try {
            // Find target date (last day of the selected month)
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
            if (monthlyPhysical.ginger && Math.abs(gingerDiff) >= 0.01) {
                inserts.push({
                    date: targetDate,
                    type: 'adjustment',
                    material: 'GINGER RAW',
                    weight: parseFloat(gingerDiff.toFixed(2)),
                    remarks: `Auto-Reconcile Discrepancy (${selectedMonth})`
                });
            }
            if (monthlyPhysical.garlic && Math.abs(garlicDiff) >= 0.01) {
                inserts.push({
                    date: targetDate,
                    type: 'adjustment',
                    material: 'GARLIC RAW',
                    weight: parseFloat(garlicDiff.toFixed(2)),
                    remarks: `Auto-Reconcile Discrepancy (${selectedMonth})`
                });
            }

            if (inserts.length > 0) {
                const { error } = await supabase.from('production_logs').insert(inserts);
                if (error) throw error;
            }

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
            onSave();
            onClose();
        } catch (err) {
            console.error("Error saving adjustment:", err);
            alert("Failed to save adjustment: " + err.message);
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
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
                    <PlusCircle size={24} /> Stock Adjustment
                </h2>

                {/* Auto-Reconcile Section */}
                {selectedMonth !== 'Overall' && (monthlyPhysical.ginger || monthlyPhysical.garlic) && (
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
                            {monthlyPhysical.ginger && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Ginger (Raw):</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Diff: {monthlyPhysical.ginger.weight - gingerAvailable >= 0 ? '+' : ''}{(monthlyPhysical.ginger.weight - gingerAvailable).toFixed(1)} kg
                                    </span>
                                </div>
                            )}
                            {monthlyPhysical.garlic && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Garlic (Raw):</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Diff: {monthlyPhysical.garlic.weight - garlicAvailable >= 0 ? '+' : ''}{(monthlyPhysical.garlic.weight - garlicAvailable).toFixed(1)} kg
                                    </span>
                                </div>
                            )}
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Adjustment Date</label>
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
                            Weight Change (Kg)
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                (Use negative for loss/damage)
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. -5.2"
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
                            placeholder="Reason for adjustment..."
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
                            {isSaving ? 'Processing...' : 'Record Adjustment'}
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
        'GINGER PEELED', 'GARLIC PEELED'
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
        let ginger = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 };
        let garlic = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 };
        // Peeled
        let gingerPeeled = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 };
        let garlicPeeled = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 };
        // Paste
        let paste = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 };       // G&G Paste (Mixed)
        let gingerPaste = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 }; // Ginger Paste
        let garlicPaste = { open: 0, in: 0, out: 0, nextOpen: 0, adj: 0 }; // Garlic Paste

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

        // 2.1 Process Manual Adjustments (logged in DB)
        adjustments.forEach(item => {
            if (isMatch(item.date)) {
                const name = (item.material || '').toUpperCase();
                const weight = parseFloat(item.weight || 0);
                
                const addAdj = (statObj, wt) => {
                    statObj.adj += wt;
                };
                
                const classifyAdjustment = (matName, wt) => {
                    if (matName.includes('GINGER') && !matName.includes('PASTE') && !matName.includes('PEELED') && !matName.includes('PROCESSED') && !matName.includes('CLEANED')) {
                        addAdj(ginger, wt);
                    } else if (matName.includes('GARLIC') && !matName.includes('PASTE') && !matName.includes('PEELED') && !matName.includes('PROCESSED') && !matName.includes('CLEANED')) {
                        addAdj(garlic, wt);
                    } else if (matName.includes('GINGER') && (matName.includes('PEELED') || matName.includes('PROCESSED') || matName.includes('CLEANED')) && !matName.includes('PASTE')) {
                        addAdj(gingerPeeled, wt);
                    } else if (matName.includes('GARLIC') && (matName.includes('PEELED') || matName.includes('PROCESSED') || matName.includes('CLEANED')) && !matName.includes('PASTE')) {
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

        const close = (obj) => obj.open + obj.in - obj.out + (obj.adj || 0);

        // Get physical count for Raw Ginger and Garlic
        let gingerPhysical = null;
        let garlicPhysical = null;

        if (selectedMonth === 'Overall') {
            const yearCounts = physicalCounts.filter(p => p.date && p.date.startsWith(selectedYear));
            const sorted = [...yearCounts].sort((a, b) => b.date.localeCompare(a.date));
            const gCount = sorted.find(s => s.material === 'GINGER RAW');
            const gaCount = sorted.find(s => s.material === 'GARLIC RAW');
            gingerPhysical = gCount ? gCount.weight : null;
            garlicPhysical = gaCount ? gaCount.weight : null;
        } else {
            const [sMonth, sYear] = selectedMonth.split(' ');
            const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const prefix = `${sYear}-${monthMap[sMonth]}`;
            const monthCounts = physicalCounts.filter(p => p.date && p.date.startsWith(prefix));
            const gCount = monthCounts.find(s => s.material === 'GINGER RAW');
            const gaCount = monthCounts.find(s => s.material === 'GARLIC RAW');
            gingerPhysical = gCount ? gCount.weight : null;
            garlicPhysical = gaCount ? gaCount.weight : null;
        }

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

        const ledgers = {
            ginger: { ...ginger, closing: closeRaw(ginger, gingerPhysical) },
            garlic: { ...garlic, closing: closeRaw(garlic, garlicPhysical) },
            // Reconcile Processed items as per user request
            gingerPeeled: reconcile(gingerPeeled, 'Ginger Peeled'),
            garlicPeeled: reconcile(garlicPeeled, 'Garlic Peeled'),
            paste: reconcile(paste, 'Paste Mix'),
            gingerPaste: reconcile(gingerPaste, 'Ginger Paste'),
            garlicPaste: reconcile(garlicPaste, 'Garlic Paste')
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

    const monthlyPhysical = useMemo(() => {
        let gingerManual = null;
        let garlicManual = null;

        if (selectedMonth === 'Overall') {
            const yearCounts = physicalCounts.filter(p => p.date && p.date.startsWith(selectedYear));
            const sorted = [...yearCounts].sort((a, b) => b.date.localeCompare(a.date));
            gingerManual = sorted.find(s => s.material === 'GINGER RAW');
            garlicManual = sorted.find(s => s.material === 'GARLIC RAW');
        } else {
            const [sMonth, sYear] = selectedMonth.split(' ');
            const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const prefix = `${sYear}-${monthMap[sMonth]}`;
            const monthCounts = physicalCounts.filter(p => p.date && p.date.startsWith(prefix));
            gingerManual = monthCounts.find(s => s.material === 'GINGER RAW');
            garlicManual = monthCounts.find(s => s.material === 'GARLIC RAW');
        }

        let gingerRes = gingerManual ? { weight: gingerManual.weight, source: 'Manual' } : null;
        let garlicRes = garlicManual ? { weight: garlicManual.weight, source: 'Manual' } : null;

        if (!gingerRes && selectedMonth !== 'Overall') {
            if (stockStats.ginger.open > 0) {
                gingerRes = { weight: stockStats.ginger.open, source: 'Excel OS' };
            }
        }

        if (!garlicRes && selectedMonth !== 'Overall') {
            if (stockStats.garlic.open > 0) {
                garlicRes = { weight: stockStats.garlic.open, source: 'Excel OS' };
            }
        }

        return { ginger: gingerRes, garlic: garlicRes };
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

    const isGingerReconciled = useMemo(() => {
        if (!monthlyPhysical.ginger) return false;
        return Math.abs(monthlyPhysical.ginger.weight - gingerCalculatedClosing) < 0.1;
    }, [monthlyPhysical.ginger, gingerCalculatedClosing]);

    const isGarlicReconciled = useMemo(() => {
        if (!monthlyPhysical.garlic) return false;
        return Math.abs(monthlyPhysical.garlic.weight - garlicCalculatedClosing) < 0.1;
    }, [monthlyPhysical.garlic, garlicCalculatedClosing]);

    const isReconciliationDone = isGingerReconciled && isGarlicReconciled;

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
                gingerAvailable={gingerCalculatedClosing}
                garlicAvailable={garlicCalculatedClosing}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>Ginger (Raw)</span>
                                    {isGingerReconciled && (
                                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>
                                            Reconciled
                                        </span>
                                    )}
                                </div>
                                {monthlyPhysical.ginger && (() => {
                                    const originalCalculated = gingerCalculatedClosing - monthlyAdjustedGinger;
                                    const discrepancy = monthlyPhysical.ginger.weight - originalCalculated;
                                    const discrepancyPct = originalCalculated > 0 ? (discrepancy / originalCalculated) * 100 : 0;
                                    const isError = Math.abs(discrepancy) > 10 || (originalCalculated > 0 && Math.abs(discrepancy) / originalCalculated > 0.05);
                                    const remainingGap = monthlyPhysical.ginger.weight - gingerCalculatedClosing;
                                    return (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span>└ System Stock:</span>
                                                <span>{originalCalculated.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span>└ Physical Stock:</span>
                                                <span>{monthlyPhysical.ginger.weight.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg{monthlyPhysical.ginger.source === 'Excel OS' ? ' (OS)' : ''}</span>
                                            </div>
                                            <div style={{ 
                                                display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', 
                                                color: discrepancy >= 0 ? '#34d399' : '#ef4444', 
                                                fontWeight: 600 
                                            }}>
                                                <span>└ Discrepancy:</span>
                                                <span>{discrepancy >= 0 ? '+' : ''}{discrepancy.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg ({discrepancy >= 0 ? '+' : ''}{discrepancyPct.toFixed(1)}%)</span>
                                            </div>
                                            {Math.abs(monthlyAdjustedGinger) >= 0.01 && (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                                                        <span>└ Reconciled Adj:</span>
                                                        <span>{monthlyAdjustedGinger >= 0 ? '+' : ''}{monthlyAdjustedGinger.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: Math.abs(remainingGap) < 0.1 ? '#34d399' : '#f59e0b', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                                        <span>└ Remaining Gap:</span>
                                                        <span>{remainingGap >= 0 ? '+' : ''}{remainingGap.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>Garlic (Raw)</span>
                                    {isGarlicReconciled && (
                                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>
                                            Reconciled
                                        </span>
                                    )}
                                </div>
                                {monthlyPhysical.garlic && (() => {
                                    const originalCalculated = garlicCalculatedClosing - monthlyAdjustedGarlic;
                                    const discrepancy = monthlyPhysical.garlic.weight - originalCalculated;
                                    const discrepancyPct = originalCalculated > 0 ? (discrepancy / originalCalculated) * 100 : 0;
                                    const isError = Math.abs(discrepancy) > 20 || (originalCalculated > 0 && Math.abs(discrepancy) / originalCalculated > 0.05);
                                    const remainingGap = monthlyPhysical.garlic.weight - garlicCalculatedClosing;
                                    return (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span>└ System Stock:</span>
                                                <span>{originalCalculated.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span>└ Physical Stock:</span>
                                                <span>{monthlyPhysical.garlic.weight.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg{monthlyPhysical.garlic.source === 'Excel OS' ? ' (OS)' : ''}</span>
                                            </div>
                                            <div style={{ 
                                                display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', 
                                                color: discrepancy >= 0 ? '#34d399' : '#ef4444', 
                                                fontWeight: 600 
                                            }}>
                                                <span>└ Discrepancy:</span>
                                                <span>{discrepancy >= 0 ? '+' : ''}{discrepancy.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg ({discrepancy >= 0 ? '+' : ''}{discrepancyPct.toFixed(1)}%)</span>
                                            </div>
                                            {Math.abs(monthlyAdjustedGarlic) >= 0.01 && (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                                                        <span>└ Reconciled Adj:</span>
                                                        <span>{monthlyAdjustedGarlic >= 0 ? '+' : ''}{monthlyAdjustedGarlic.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: Math.abs(remainingGap) < 0.1 ? '#34d399' : '#f59e0b', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                                        <span>└ Remaining Gap:</span>
                                                        <span>{remainingGap >= 0 ? '+' : ''}{remainingGap.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg</span>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>


                            {!monthlyPhysical.ginger && !monthlyPhysical.garlic && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '0.5rem' }}>
                                    No physical count recorded for {selectedMonth}
                                </span>
                            )}
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
