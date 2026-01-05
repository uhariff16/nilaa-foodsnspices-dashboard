import React, { useState } from 'react';
import { Trash2, Calendar, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const AdminCleanup = () => {
    const [mode, setMode] = useState('period'); // 'period' | 'all_production'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Generate Year Options
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

                const monthIndex = months.indexOf(selectedMonth);
                const startDate = new Date(selectedYear, monthIndex, 1).toISOString().split('T')[0];
                const nextMonthDate = new Date(selectedYear, monthIndex + 1, 1).toISOString().split('T')[0];

                const { count: txCount, error: txError } = await supabase
                    .from('transactions')
                    .select('*', { count: 'exact', head: true })
                    .gte('date', startDate)
                    .lt('date', nextMonthDate);

                if (txError) throw txError;

                const { count: plCount, error: plError } = await supabase
                    .from('production_logs')
                    .select('*', { count: 'exact', head: true })
                    .gte('date', startDate)
                    .lt('date', nextMonthDate);

                if (plError) throw plError;

                const totalCount = (txCount || 0) + (plCount || 0);

                setPreviewData({
                    mode: 'period',
                    txCount: txCount || 0,
                    plCount: plCount || 0,
                    totalCount,
                    period: `${selectedMonth} ${selectedYear}`
                });

                if (totalCount === 0) setStatus({ type: 'info', message: `No records found for ${selectedMonth} ${selectedYear}.` });

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

    const handleDelete = async () => {
        if (!previewData || previewData.totalCount === 0) return;

        const confirmMessage = mode === 'period'
            ? `Are you SURE you want to delete data from ${previewData.period}? \n\n- ${previewData.txCount} Sales/Expenses\n- ${previewData.plCount} Production Logs\n\nThis cannot be undone.`
            : `⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete ALL Production Logs (${previewData.count} records)?\n\nThis will wipe the entire production history from the database.\nThis action is IRREVERSIBLE.`;

        if (!window.confirm(confirmMessage)) return;

        setDeleteLoading(true);
        setStatus({ type: '', message: '' });

        try {
            if (mode === 'period') {
                const monthIndex = months.indexOf(selectedMonth);
                const startDate = new Date(selectedYear, monthIndex, 1).toISOString().split('T')[0];
                const nextMonthDate = new Date(selectedYear, monthIndex + 1, 1).toISOString().split('T')[0];

                const { error: txError } = await supabase.from('transactions').delete().gte('date', startDate).lt('date', nextMonthDate);
                if (txError) throw txError;

                const { error: plError } = await supabase.from('production_logs').delete().gte('date', startDate).lt('date', nextMonthDate);
                if (plError) throw plError;

                setStatus({ type: 'success', message: `Successfully deleted records from ${previewData.period}.` });

            } else if (mode === 'all_production') {
                // Delete ALL Production Logs
                const { error } = await supabase.from('production_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
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
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Trash2 className="text-red-500" size={24} />
                <h2 className="text-xl font-semibold text-white">Data Cleanup</h2>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-4 border-b border-slate-700 pb-4">
                <button
                    onClick={() => { setMode('period'); setPreviewData(null); setStatus({ type: '', message: '' }); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'period' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    Clean by Period
                </button>
                <button
                    onClick={() => { setMode('all_production'); setPreviewData(null); setStatus({ type: '', message: '' }); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'all_production' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-slate-800 text-slate-400 hover:text-red-400'}`}
                >
                    Reset Production DB
                </button>
            </div>

            {/* Selection Card */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 shadow-sm">
                <p className="text-slate-400 mb-4 text-sm">
                    {mode === 'period'
                        ? "Select a period to permanently delete Sales, Expenses, and Production records."
                        : "Permanently delete ALL Production Logs from the database."}
                    <br /> <span className="text-orange-400">Warning: This action is irreversible.</span>
                </p>

                <div className="flex flex-wrap items-end gap-4">
                    {mode === 'period' && (
                        <>
                            {/* Year Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="bg-[#0f1219] border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            {/* Month Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(e.target.value);
                                        setPreviewData(null);
                                        setStatus({ type: '', message: '' });
                                    }}
                                    className="bg-[#0f1219] border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-40 p-2.5"
                                >
                                    <option value="">Select Month</option>
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Preview Button */}
                    <button
                        onClick={fetchPreview}
                        disabled={(mode === 'period' && !selectedMonth) || previewLoading}
                        className={`mb-[1px] px-5 py-2.5 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${mode === 'period' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {previewLoading ? <RefreshCw className="animate-spin" size={18} /> : <Calendar size={18} />}
                        {mode === 'period' ? 'Analyze Records' : 'Analyze Total Database'}
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {status.message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                    {status.type === 'error' ? <AlertTriangle size={20} /> : status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span>{status.message}</span>
                </div>
            )}

            {/* Preview & Delete Action */}
            {previewData && previewData.totalCount > 0 && (
                <div className={`border rounded-xl p-6 animate-in fade-in slide-in-from-bottom-2 ${mode === 'period' ? 'bg-red-500/5 border-red-500/20' : 'bg-red-900/10 border-red-500/50'}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-red-500 mb-1">{mode === 'period' ? 'Confirm Deletion' : '🔥 NUCLEAR DELETE'}</h3>
                            <p className="text-slate-300">
                                {mode === 'period' ? (
                                    <>
                                        Found <span className="font-bold text-white text-lg mx-1">{previewData.totalCount}</span> records
                                        for <span className="text-blue-400 font-medium">{previewData.period}</span>.
                                    </>
                                ) : (
                                    <>
                                        Found <span className="font-bold text-white text-lg mx-1">{previewData.totalCount}</span> records in TOTAL.
                                        This includes all Stock In, Pre-Production, and Post-Production logs.
                                    </>
                                )}
                            </p>
                            <p className="text-slate-500 text-sm mt-2">
                                Please confirm if you want to verify these records are removed from the database.
                            </p>
                        </div>

                        <button
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                        >
                            {deleteLoading ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
                            {mode === 'period' ? 'Delete Period Data' : 'WIPE DATABASE'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCleanup;
