import React, { useState } from 'react';
import { Trash2, Calendar, AlertTriangle, RefreshCw, CheckCircle, X, Bomb, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const AdminCleanup = () => {
    const [mode, setMode] = useState('period'); // 'period' | 'all_production' | 'customer_insights'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [targets, setTargets] = useState({ sales: true, production: true, payments: false });

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
                    setStatus({ type: 'error', message: 'Please select a month or Whole Year.' });
                    setPreviewLoading(false);
                    return;
                }

                if (!targets.sales && !targets.production && !targets.payments) {
                    setStatus({ type: 'error', message: 'Please select at least one data type to clean.' });
                    setPreviewLoading(false);
                    return;
                }

                let startDate, nextMonthDate;
                if (selectedMonth === 'Whole Year') {
                    startDate = getLocalDateString(selectedYear, 0, 1);
                    nextMonthDate = getLocalDateString(selectedYear + 1, 0, 1);
                } else {
                    const monthIndex = months.indexOf(selectedMonth);
                    startDate = getLocalDateString(selectedYear, monthIndex, 1);
                    nextMonthDate = getLocalDateString(selectedYear, monthIndex + 1, 1);
                }

                let txCount = 0;
                let plCount = 0;
                let payCount = 0;
                let samples = [];

                if (targets.sales) {
                    const { data, count, error } = await supabase
                        .from('transactions')
                        .select('id, date, payment_mode, item_name, amount', { count: 'exact' })
                        .gte('date', startDate)
                        .lt('date', nextMonthDate)
                        .neq('payment_mode', 'Supplier_Payment')
                        .limit(50);
                    if (error) throw error;
                    txCount = count || 0;
                    if (data) samples = [...samples, ...data.map(d => ({ ...d, _type: 'Sales/Expense' }))];
                }

                if (targets.payments) {
                    const { data, count, error } = await supabase
                        .from('transactions')
                        .select('id, date, payment_mode, item_name, amount', { count: 'exact' })
                        .gte('date', startDate)
                        .lt('date', nextMonthDate)
                        .eq('payment_mode', 'Supplier_Payment')
                        .limit(50);
                    if (error) throw error;
                    payCount = count || 0;
                    if (data) samples = [...samples, ...data.map(d => ({ ...d, _type: 'Payment' }))];
                }

                if (targets.production) {
                    const { data, count, error } = await supabase
                        .from('production_logs')
                        .select('id, date, type, material, weight', { count: 'exact' })
                        .gte('date', startDate)
                        .lt('date', nextMonthDate)
                        .limit(50);
                    if (error) throw error;
                    plCount = count || 0;
                    if (data) samples = [...samples, ...data.map(d => ({ ...d, _type: 'Production Log' }))];
                }

                const totalCount = txCount + plCount + payCount;

                setPreviewData({
                    mode: 'period',
                    txCount,
                    plCount,
                    payCount,
                    totalCount,
                    period: `${selectedMonth} ${selectedYear}`,
                    samples: samples.slice(0, 100)
                });

                if (totalCount === 0) setStatus({ type: 'info', message: `No selected records found for ${selectedMonth === 'Whole Year' ? 'the year' : selectedMonth} ${selectedYear}.` });

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
            } else if (mode === 'customer_insights') {
                const { count: statsCount, error: sErr } = await supabase.from('customer_stats').select('*', { count: 'exact', head: true });
                const { count: recCount, error: rErr } = await supabase.from('customer_receivables').select('*', { count: 'exact', head: true });

                if (sErr) throw sErr;
                if (rErr) throw rErr;

                setPreviewData({
                    mode: 'customer_insights',
                    statsCount: statsCount || 0,
                    recCount: recCount || 0,
                    totalCount: (statsCount || 0) + (recCount || 0)
                });

                if ((statsCount || 0) + (recCount || 0) === 0) setStatus({ type: 'info', message: `Customer Insights data is already empty.` });
            }

        } catch (error) {
            console.error('Preview error:', error);
            setStatus({ type: 'error', message: 'Failed to fetch preview. Check console.' });
        } finally {
            setPreviewLoading(false);
        }
    };

    // Recursive deletion helper to bypass limits
    const deleteInBatches = async (table, startDate, endDate, filterCol = null, filterVal = null, notFilter = false) => {
        let deletedTotal = 0;
        let hasMore = true;

        while (hasMore) {
            // Check if ANY records exist in this range
            let query = supabase.from(table).select('*', { count: 'exact', head: true })
                .gte('date', startDate).lt('date', endDate);
            
            if (filterCol) {
                if (notFilter) query = query.neq(filterCol, filterVal);
                else query = query.eq(filterCol, filterVal);
            }

            const { count, error: checkError } = await query;

            if (checkError) throw checkError;

            if (!count || count === 0) {
                hasMore = false;
                break;
            }

            // Perform Delete
            let delQuery = supabase.from(table).delete()
                .gte('date', startDate).lt('date', endDate);
            
            if (filterCol) {
                if (notFilter) delQuery = delQuery.neq(filterCol, filterVal);
                else delQuery = delQuery.eq(filterCol, filterVal);
            }

            const { error: deleteError } = await delQuery;

            if (deleteError) throw deleteError;

            deletedTotal += count; 

            if (count === 0) hasMore = false;
        }
        return deletedTotal;
    };

    const handleDelete = async () => {
        if (!previewData || previewData.totalCount === 0) return;

        let confirmMessage = "";
        if (mode === 'period') {
            confirmMessage = `Are you SURE you want to delete data from ${previewData.period}? \n` +
                (targets.sales ? `\n- ${previewData.txCount} Sales/Expenses` : '') +
                (targets.payments ? `\n- ${previewData.payCount} Payments` : '') +
                (targets.production ? `\n- ${previewData.plCount} Production Logs` : '') +
                `\n\nThis cannot be undone.`;
        } else if (mode === 'all_production') {
            confirmMessage = `⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete ALL Production Logs (${previewData.count} records)?\n\nThis will wipe the entire production history from the database.\nThis action is IRREVERSIBLE.`;
        } else if (mode === 'customer_insights') {
            confirmMessage = `⚠️ CLEAR CUSTOMER DATA ⚠️\n\nAre you sure you want to delete ALL Customer Insights data?\n- ${previewData.statsCount} Profit Records\n- ${previewData.recCount} Receivables\n\nThis will reset the Insights dashboard to zero. This action is IRREVERSIBLE.`;
        }

        if (!window.confirm(confirmMessage)) return;

        setDeleteLoading(true);
        setStatus({ type: '', message: '' });

        try {
            if (mode === 'period') {
                let startDate, nextMonthDate;
                if (selectedMonth === 'Whole Year') {
                    startDate = getLocalDateString(selectedYear, 0, 1);
                    nextMonthDate = getLocalDateString(selectedYear + 1, 0, 1);
                } else {
                    const monthIndex = months.indexOf(selectedMonth);
                    startDate = getLocalDateString(selectedYear, monthIndex, 1);
                    nextMonthDate = getLocalDateString(selectedYear, monthIndex + 1, 1);
                }

                if (targets.sales) {
                    await deleteInBatches('transactions', startDate, nextMonthDate, 'payment_mode', 'Supplier_Payment', true);
                }

                if (targets.payments) {
                    await deleteInBatches('transactions', startDate, nextMonthDate, 'payment_mode', 'Supplier_Payment', false);
                }

                if (targets.production) {
                    await deleteInBatches('production_logs', startDate, nextMonthDate);
                }

                setStatus({ type: 'success', message: `Successfully deleted selected records.` });

            } else if (mode === 'all_production') {
                const { error } = await supabase.from('production_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) throw error;

                setStatus({ type: 'success', message: `Successfully wiped all Production Logs.` });
            } else if (mode === 'customer_insights') {
                const { error: sErr } = await supabase.from('customer_stats').delete().neq('customer_name', 'RESET_TOKEN_VOID');
                const { error: rErr } = await supabase.from('customer_receivables').delete().neq('customer_name', 'RESET_TOKEN_VOID');
                
                if (sErr) throw sErr;
                if (rErr) throw rErr;

                setStatus({ type: 'success', message: `Successfully cleared all Customer Insights data.` });
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
                            className={`btn-toggle ${mode === 'all_production' ? 'active' : ''}`}
                            style={mode === 'all_production' ? { background: '#dc2626', color: 'var(--text-primary)', borderColor: '#dc2626' } : {}}
                        >
                            <Bomb size={16} />
                            Reset Production DB
                        </button>
                        <button
                            onClick={() => { setMode('customer_insights'); setPreviewData(null); setStatus({ type: '', message: '' }); }}
                            className={`btn-toggle ${mode === 'customer_insights' ? 'active blue' : ''}`}
                        >
                            <Users size={16} />
                            Clear Customer Insights
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
                            : mode === 'all_production'
                            ? "Permanently delete ALL Production Logs from the database."
                            : "Permanently delete all Customer Profit Stats and Receivables records."}
                        <br /> <span style={{ color: '#fb923c', fontWeight: 'bold' }}>Warning: This action is irreversible.</span>
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                        {mode === 'period' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                {/* Left Side: Checkboxes */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', flex: 1, minWidth: '200px' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Data to Clean</h4>
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: targets.sales ? 'white' : '#94a3b8', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={targets.sales}
                                            onChange={(e) => {
                                                setTargets(prev => ({ ...prev, sales: e.target.checked }));
                                                setPreviewData(null);
                                            }}
                                            style={{ accentColor: '#3b82f6', width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                                        />
                                        Sales & Expenses
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: targets.payments ? 'white' : '#94a3b8', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={targets.payments}
                                            onChange={(e) => {
                                                setTargets(prev => ({ ...prev, payments: e.target.checked }));
                                                setPreviewData(null);
                                            }}
                                            style={{ accentColor: '#3b82f6', width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                                        />
                                        Payments
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: targets.production ? 'white' : '#94a3b8', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={targets.production}
                                            onChange={(e) => {
                                                setTargets(prev => ({ ...prev, production: e.target.checked }));
                                                setPreviewData(null);
                                            }}
                                            style={{ accentColor: '#3b82f6', width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                                        />
                                        Production Logs
                                    </label>
                                </div>

                                {/* Right Side: Period & Button */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1.5, minWidth: '280px' }}>
                                    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                        {/* Year Selector */}
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Year</label>
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.875rem', borderRadius: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer' }}
                                            >
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>

                                        {/* Month Selector */}
                                        <div style={{ flex: 2 }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Month</label>
                                            <select
                                                value={selectedMonth}
                                                onChange={(e) => {
                                                    setSelectedMonth(e.target.value);
                                                    setPreviewData(null);
                                                    setStatus({ type: '', message: '' });
                                                }}
                                                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.875rem', borderRadius: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer' }}
                                            >
                                                <option value="">Select Period</option>
                                                <option value="Whole Year" style={{ fontWeight: 'bold', color: '#fca5a5' }}>Whole Year</option>
                                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview Button */}
                                    <button
                                        onClick={fetchPreview}
                                        disabled={(mode === 'period' && !selectedMonth) || previewLoading}
                                        className="btn-action"
                                        style={{
                                            width: '100%',
                                            justifyContent: 'center',
                                            padding: '0.875rem',
                                            background: 'linear-gradient(to right, #2563eb, #3b82f6)',
                                            opacity: (!selectedMonth || previewLoading) ? 0.5 : 1,
                                            cursor: (!selectedMonth || previewLoading) ? 'not-allowed' : 'pointer',
                                            marginTop: 'auto'
                                        }}
                                    >
                                        {previewLoading ? <RefreshCw className="animate-spin" size={18} /> : <Calendar size={18} />}
                                        Analyze Data
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                {/* Preview Button for other modes */}
                                <button
                                    onClick={fetchPreview}
                                    disabled={previewLoading}
                                    className="btn-action"
                                    style={{
                                        background: mode === 'customer_insights' ? 'linear-gradient(to right, #3b82f6, #60a5fa)' : '#dc2626',
                                        opacity: previewLoading ? 0.5 : 1,
                                        cursor: previewLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {previewLoading ? <RefreshCw className="animate-spin" size={18} /> : (mode === 'customer_insights' ? <Users size={18} /> : <Bomb size={18} />)}
                                    Scan DB
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview & Delete Action */}
                {previewData && previewData.totalCount > 0 && (
                    <div style={{ marginTop: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', animation: 'fadeIn 0.5s ease-out forwards' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.25rem' }}>{mode === 'period' ? 'Confirm Deletion' : (mode === 'all_production' ? '🔥 NUCLEAR DELETE' : 'Confirm Wipe')}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                                    {mode === 'period' ? (
                                        <>
                                            <p style={{ margin: 0 }}>
                                                Found <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{previewData.totalCount}</span> total records
                                                for <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{previewData.period}</span>.
                                            </p>
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Breakdown of records to delete:</p>
                                                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {previewData.txCount > 0 && <li>Sales & Expenses: <span style={{ fontWeight: 'bold', color: 'white' }}>{previewData.txCount}</span></li>}
                                                    {previewData.payCount > 0 && <li>Payments: <span style={{ fontWeight: 'bold', color: 'white' }}>{previewData.payCount}</span></li>}
                                                    {previewData.plCount > 0 && <li>Production Logs: <span style={{ fontWeight: 'bold', color: 'white' }}>{previewData.plCount}</span></li>}
                                                </ul>
                                            </div>

                                            {/* Preview Table */}
                                            {previewData.samples && previewData.samples.length > 0 && (
                                                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Data Preview (Sample):</p>
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }} className="custom-scrollbar">
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                                            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', color: '#cbd5e1' }}>
                                                                <tr>
                                                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                                                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                                                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Details</th>
                                                                    <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Amount/Qty</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody style={{ color: '#94a3b8' }}>
                                                                {previewData.samples.map(s => (
                                                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{s.date}</td>
                                                                        <td style={{ padding: '0.5rem' }}>
                                                                            <span style={{ padding: '0.125rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.1)', fontSize: '0.625rem', whiteSpace: 'nowrap' }}>
                                                                                {s._type}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '0.5rem', color: '#e2e8f0' }}>{s.item_name || s.material || 'N/A'}</td>
                                                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                                                                            {s.amount ? `₹${s.amount}` : s.weight ? `${s.weight} KG` : '-'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : mode === 'all_production' ? (
                                        <>
                                            Found <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{previewData.totalCount}</span> records in TOTAL.
                                            This includes all Stock In, Pre-Production, and Post-Production logs.
                                        </>
                                    ) : (
                                        <>
                                            Found <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{previewData.totalCount}</span> records in Customer Insights.
                                            This includes all Profit Performance records and Receivables snapshots.
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
                                {mode === 'period' ? 'Delete Data' : (mode === 'all_production' ? 'WIPE ALL' : 'CLEAR ALL')}
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
