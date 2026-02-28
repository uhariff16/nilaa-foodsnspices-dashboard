import React, { useState } from 'react';
import { Trash2, Calendar, AlertTriangle, RefreshCw, CheckCircle, X, Bomb } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const AdminCleanup = () => {
    const [mode, setMode] = useState('period'); // 'period' | 'all_production'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [targets, setTargets] = useState({ sales: true, production: true, receivables: true });

    // Generate Year Options
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // [FIX] Timezone-safe date string helper
    const getLocalDateString = (year, month, day) => {
        const d = new Date(year, month, day);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
    };

    const fetchPreview = async () => {
        setPreviewLoading(true);
        setStatus({ type: '', message: '' });
        setPreviewData(null);

        try {
            if (mode === 'period') {
                if (!selectedMonth) {
                    setStatus({ type: 'error', message: 'Please select a month.' });
                    setPreviewLoading(false);
                    return;
                }

                if (!targets.sales && !targets.production && !targets.receivables) {
                    setStatus({ type: 'error', message: 'Please select at least one data type to clean.' });
                    setPreviewLoading(false);
                    return;
                }

                const monthIndex = months.indexOf(selectedMonth);
                const startDate = getLocalDateString(selectedYear, monthIndex, 1);
                const nextMonthDate = getLocalDateString(selectedYear, monthIndex + 1, 1);

                let txCount = 0;
                let plCount = 0;
                let rxCount = 0;

                if (targets.receivables) {
                    const { count, error } = await supabase
                        .from('customer_receivables')
                        .select('*', { count: 'exact', head: true });
                    if (error) throw error;
                    rxCount = count || 0;
                }

                if (targets.sales) {
                    const { count, error } = await supabase
                        .from('transactions')
                        .select('*', { count: 'exact', head: true })
                        .gte('date', startDate)
                        .lt('date', nextMonthDate);
                    if (error) throw error;
                    txCount = count || 0;
                }

                if (targets.production) {
                    const { count, error } = await supabase
                        .from('production_logs')
                        .select('*', { count: 'exact', head: true })
                        .gte('date', startDate)
                        .lt('date', nextMonthDate);
                    if (error) throw error;
                    plCount = count || 0;
                }

                const totalCount = txCount + plCount + rxCount;

                setPreviewData({
                    mode: 'period',
                    txCount,
                    plCount,
                    rxCount,
                    totalCount,
                    period: `${selectedMonth} ${selectedYear}`
                });

                if (totalCount === 0) setStatus({ type: 'info', message: `No selected records found for ${selectedMonth} ${selectedYear}.` });

            } else if (mode === 'all_production') {
                // Fetch Total Production Logs
                const { count, error } = await supabase
                    .from('production_logs')
                    .select('*', { count: 'exact', head: true });

                if (error) throw error;

                setPreviewData({
                    mode: 'all_production',
                    count: count || 0,
                    totalCount: count || 0
                });

                if (count === 0) setStatus({ type: 'info', message: `Production Database is already empty.` });
            }

        } catch (error) {
            console.error('Preview error:', error);
            setStatus({ type: 'error', message: 'Failed to fetch preview. Check console.' });
        } finally {
            setPreviewLoading(false);
        }
    };

    // Recursive deletion helper to bypass limits
    const deleteInBatches = async (table, startDate, endDate) => {
        let deletedTotal = 0;
        let hasMore = true;

        while (hasMore) {
            // Check if ANY records exist in this range
            const { count, error: checkError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .gte('date', startDate)
                .lt('date', endDate);

            if (checkError) throw checkError;

            if (!count || count === 0) {
                hasMore = false;
                break;
            }

            // Perform Delete
            // Note: supabase .delete() usually deletes all matching rows, but sometimes has a timeout/limit.
            // We loop just to be safe and verify count drops to 0.
            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .gte('date', startDate)
                .lt('date', endDate);

            if (deleteError) throw deleteError;

            deletedTotal += count; // Estimate based on check

            // Safety break loop if it seems infinite (though delete should work)
            if (count === 0) hasMore = false;
        }
        return deletedTotal;
    };

    const handleDelete = async () => {
        if (!previewData || previewData.totalCount === 0) return;

        const confirmMessage = mode === 'period'
            ? `Are you SURE you want to delete data from ${previewData.period}? \n` +
            (targets.sales ? `\n- ${previewData.txCount} Sales/Expenses` : '') +
            (targets.production ? `\n- ${previewData.plCount} Production Logs` : '') +
            (targets.receivables ? `\n- ${previewData.rxCount} Customer Receivables (ALL)` : '') +
            `\n\nThis cannot be undone.`
            : `⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete ALL Production Logs (${previewData.count} records)?\n\nThis will wipe the entire production history from the database.\nThis action is IRREVERSIBLE.`;

        if (!window.confirm(confirmMessage)) return;

        setDeleteLoading(true);
        setStatus({ type: '', message: '' });

        try {
            if (mode === 'period') {
                const monthIndex = months.indexOf(selectedMonth);
                const startDate = getLocalDateString(selectedYear, monthIndex, 1);
                const nextMonthDate = getLocalDateString(selectedYear, monthIndex + 1, 1);

                if (targets.receivables) {
                    // Wipe all receivables (no date column, so deleteInBatches won't work)
                    const { error } = await supabase
                        .from('customer_receivables')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000');

                    if (error) throw error;
                }

                if (targets.sales) {
                    await deleteInBatches('transactions', startDate, nextMonthDate);
                    await deleteInBatches('customer_stats', startDate, nextMonthDate); // Clean up stats too
                }

                if (targets.production) {
                    await deleteInBatches('production_logs', startDate, nextMonthDate);
                }

                setStatus({ type: 'success', message: `Successfully deleted selected records.` });

            } else if (mode === 'all_production') {
                // Delete ALL Production Logs (Limitless)
                // Since we can't use date range easily here, we might need a different recursive strategy 
                // or just trust the 'neq 0' trick.
                // Let's stick to the neq trick but wrap in a loop if needed.
                const { error } = await supabase.from('production_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) throw error;

                setStatus({ type: 'success', message: `Successfully wiped all Production Logs.` });
            }

            setPreviewData(null); // Reset preview
        } catch (error) {
            console.error('Delete error:', error);
            setStatus({ type: 'error', message: 'Delete failed: ' + error.message });
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="admin-wrapper" style={{ minHeight: '600px' }}>
            <div className="admin-header">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'inline-flex' }}>
                        <Trash2 color="#ef4444" size={32} />
                    </div>

                    <div>
                        <h2 className="admin-title">
                            Data Cleanup
                        </h2>
                        <p className="admin-subtitle">Permanently delete records or reset the database.</p>
                    </div>

                    {/* Mode Switcher - Centered */}
                    <div className="btn-toggle-group">
                        <button
                            onClick={() => { setMode('period'); setPreviewData(null); setStatus({ type: '', message: '' }); }}
                            className={`btn-toggle ${mode === 'period' ? 'active blue' : ''}`}
                        >
                            <Calendar size={16} />
                            Clean by Period
                        </button>
                        <button
                            onClick={() => { setMode('all_production'); setPreviewData(null); setStatus({ type: '', message: '' }); }}
                            className="btn-toggle"
                            style={mode === 'all_production' ? { background: '#dc2626', color: 'var(--text-primary)', borderColor: '#dc2626' } : {}}
                        >
                            <Bomb size={16} />
                            Reset Production DB
                        </button>
                    </div>
                </div>
            </div>

            <div className="admin-grid" style={{ maxWidth: '40rem', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                {/* Selection Card */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.5' }}>
                        {mode === 'period'
                            ? "Select a period to permanently delete Sales, Expenses, and Production records."
                            : "Permanently delete ALL Production Logs from the database."}
                        <br /> <span style={{ color: '#fb923c', fontWeight: 'bold' }}>Warning: This action is irreversible.</span>
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', justifyContent: 'center' }}>
                        {mode === 'period' && (
                            <>
                                {/* Granular Toggles */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.25rem', justifyContent: 'center', width: '100%' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: targets.sales ? 'white' : '#64748b', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={targets.sales}
                                            onChange={(e) => {
                                                setTargets(prev => ({ ...prev, sales: e.target.checked }));
                                                setPreviewData(null);
                                            }}
                                            style={{ accentColor: '#3b82f6', width: '1rem', height: '1rem' }}
                                        />
                                        Sales & Expenses
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: targets.production ? 'white' : '#64748b', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={targets.production}
                                            onChange={(e) => {
                                                setTargets(prev => ({ ...prev, production: e.target.checked }));
                                                setPreviewData(null);
                                            }}
                                            style={{ accentColor: '#3b82f6', width: '1rem', height: '1rem' }}
                                        />
                                        Production Logs
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: targets.receivables ? 'white' : '#64748b', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={targets.receivables}
                                            onChange={(e) => {
                                                setTargets(prev => ({ ...prev, receivables: e.target.checked }));
                                                setPreviewData(null);
                                            }}
                                            style={{ accentColor: '#3b82f6', width: '1rem', height: '1rem' }}
                                        />
                                        Receivables
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
                                    {/* Year Selector */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.625rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Year</label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.875rem', borderRadius: '0.5rem', padding: '0.625rem 2rem 0.625rem 0.75rem', cursor: 'pointer' }}
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>

                                    {/* Month Selector */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.625rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Month</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => {
                                                setSelectedMonth(e.target.value);
                                                setPreviewData(null);
                                                setStatus({ type: '', message: '' });
                                            }}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.875rem', borderRadius: '0.5rem', padding: '0.625rem 2rem 0.625rem 0.75rem', cursor: 'pointer', minWidth: '140px' }}
                                        >
                                            <option value="">Select Month</option>
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Preview Button */}
                        <button
                            onClick={fetchPreview}
                            disabled={(mode === 'period' && !selectedMonth) || previewLoading}
                            className="btn-action"
                            style={{
                                background: mode === 'period' ? 'linear-gradient(to right, #2563eb, #3b82f6)' : '#dc2626',
                                opacity: (mode === 'period' && !selectedMonth) || previewLoading ? 0.5 : 1,
                                cursor: (mode === 'period' && !selectedMonth) || previewLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {previewLoading ? <RefreshCw className="animate-spin" size={18} /> : (mode === 'period' ? <Calendar size={18} /> : <Bomb size={18} />)}
                            {mode === 'period' ? 'Analyze' : 'Scan DB'}
                        </button>
                    </div>
                </div>

                {/* Preview & Delete Action */}
                {previewData && previewData.totalCount > 0 && (
                    <div style={{ marginTop: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', animation: 'fadeIn 0.5s ease-out forwards' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.25rem' }}>{mode === 'period' ? 'Confirm Deletion' : '🔥 NUCLEAR DELETE'}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                                    {mode === 'period' ? (
                                        <>
                                            Found <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{previewData.totalCount}</span> records
                                            for <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{previewData.period}</span>.
                                        </>
                                    ) : (
                                        <>
                                            Found <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{previewData.totalCount}</span> records in TOTAL.
                                            This includes all Stock In, Pre-Production, and Post-Production logs.
                                        </>
                                    )}
                                </p>
                            </div>

                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#dc2626',
                                    color: 'var(--text-primary)',
                                    borderRadius: '0.5rem',
                                    fontWeight: 'bold',
                                    fontSize: '0.875rem',
                                    boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {deleteLoading ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                {mode === 'period' ? 'Delete Data' : 'WIPE ALL'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Messages */}
            {status.message && (
                <div style={{ maxWidth: '40rem', margin: '1.5rem auto 0', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: status.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : (status.type === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)'), color: status.type === 'error' ? '#fca5a5' : (status.type === 'info' ? '#bfdbfe' : '#6ee7b7') }}>
                    {status.type === 'error' ? <AlertTriangle size={20} /> : status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{status.message}</span>
                </div>
            )}
        </div>
    );
};

export default AdminCleanup;
