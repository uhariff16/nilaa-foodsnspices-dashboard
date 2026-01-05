import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Search, Filter, Edit2, Trash2, ChevronLeft, ChevronRight, X, Save, AlertCircle, CheckCircle, Database, Calendar, DollarSign, Package } from 'lucide-react';

const DataManager = () => {
    const [selectedTable, setSelectedTable] = useState('transactions'); // 'transactions' | 'production_logs'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Editing
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Status
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        try {
            let query = supabase
                .from(selectedTable)
                .select('*')
                .order('date', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            // Apply Filters
            if (dateFilter) query = query.eq('date', dateFilter);

            if (searchTerm) {
                if (selectedTable === 'transactions') {
                    // Search by item name or invoice
                    query = query.or(`item_name.ilike.%${searchTerm}%,invoice_no.ilike.%${searchTerm}%`);
                } else {
                    // Search by material
                    query = query.ilike('material', `%${searchTerm}%`);
                }
            }

            const { data: result, error } = await query;

            if (error) throw error;

            if (page === 0) {
                setData(result);
            } else {
                setData(prev => [...prev, ...result]);
            }

            setHasMore(result.length === PAGE_SIZE);

        } catch (err) {
            console.error("Fetch Error:", err);
            setStatus({ type: 'error', message: "Failed to load data." });
        } finally {
            setLoading(false);
        }
    };

    // Reset and Fetch when Table/Filters change
    useEffect(() => {
        setPage(0);
        setData([]); // Clear old data immediately to avoid confusion
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTable, dateFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(0);
        fetchData();
    };

    // Edit Logic
    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const saveEdit = async () => {
        setLoading(true);
        try {
            // Clean up fields based on table
            const updatePayload = { ...editForm };
            delete updatePayload.id; // Don't update ID
            delete updatePayload.created_at;

            const { error } = await supabase
                .from(selectedTable)
                .update(updatePayload)
                .eq('id', editingId);

            if (error) throw error;

            // Update Local State
            setData(prev => prev.map(item => item.id === editingId ? { ...item, ...updatePayload } : item));

            setStatus({ type: 'success', message: "Record updated successfully." });
            setEditingId(null);
        } catch (err) {
            console.error("Update Error:", err);
            setStatus({ type: 'error', message: "Update failed: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    // Delete Logic
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record? This cannot be undone.")) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from(selectedTable)
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update Local State
            setData(prev => prev.filter(item => item.id !== id));
            setStatus({ type: 'success', message: "Record deleted." });
        } catch (err) {
            console.error("Delete Error:", err);
            setStatus({ type: 'error', message: "Delete failed: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6 bg-[#1a1f2e] min-h-[calc(100vh-140px)] rounded-2xl flex flex-col">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-4 gap-6">

                {/* Tab Navigation - Dashboard Style */}
                <div className="flex bg-[#0f1219] p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setSelectedTable('transactions')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${selectedTable === 'transactions'
                            ? 'bg-[#2563eb] text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <DollarSign size={14} />
                        Transactions
                    </button>
                    <button
                        onClick={() => setSelectedTable('production_logs')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${selectedTable === 'production_logs'
                            ? 'bg-[#2563eb] text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Package size={14} />
                        Production Logs
                    </button>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
                    <div className="relative group">
                        <Calendar className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-white transition-colors" size={14} />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="bg-[#0f1219] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                    </div>
                    <div className="relative flex-1 xl:w-72 group">
                        <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-white transition-colors" size={14} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={selectedTable === 'transactions' ? "Search Item or Invoice..." : "Search Material..."}
                            className="w-full bg-[#0f1219] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder-slate-600"
                        />
                    </div>
                    <button type="submit" className="bg-[#252b3b] hover:bg-[#2d3345] border border-white/5 text-slate-200 px-5 py-2 rounded-lg text-sm font-medium transition-all">
                        Search
                    </button>
                </form>
            </div>

            {/* Status Message */}
            {status.message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 border ${status.type === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span className="font-medium">{status.message}</span>
                    <button onClick={() => setStatus({ type: 'idle', message: '' })} className="ml-auto text-current opacity-70 hover:opacity-100 hover:bg-white/10 p-1 rounded-full"><X size={14} /></button>
                </div>
            )}

            {/* Data Table */}
            <div className="flex-1 overflow-hidden bg-[#0f1219] rounded-xl border border-white/5 relative flex flex-col shadow-inner">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-[#151923] text-slate-400 font-semibold uppercase tracking-wider text-xs sticky top-0 z-10 border-b border-white/5">
                            <tr>
                                <th className="p-4">Date</th>
                                {selectedTable === 'transactions' ? (
                                    <>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Item / Description</th>
                                        <th className="p-4 text-right">Amount</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Material</th>
                                        <th className="p-4 text-right">Weight (KG)</th>
                                    </>
                                )}
                                <th className="p-4 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.map(row => (
                                <tr key={row.id} className={`hover:bg-white/5 transition-colors group ${editingId === row.id ? 'bg-blue-500/10' : ''}`}>
                                    {editingId === row.id ? (
                                        // EDIT MODE
                                        <>
                                            <td className="p-4">
                                                <input type="date" value={editForm.date} onChange={e => handleEditChange('date', e.target.value)}
                                                    className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                                            </td>
                                            {selectedTable === 'transactions' ? (
                                                <>
                                                    <td className="p-4">
                                                        <select value={editForm.payment_mode} onChange={e => handleEditChange('payment_mode', e.target.value)}
                                                            className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none">
                                                            <option value="Sale">Sale</option>
                                                            <option value="Expense">Expense</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <input type="text" value={editForm.item_name} onChange={e => handleEditChange('item_name', e.target.value)}
                                                            className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                                                    </td>
                                                    <td className="p-4">
                                                        <input type="number" value={editForm.amount} onChange={e => handleEditChange('amount', e.target.value)}
                                                            className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-right text-white focus:outline-none" />
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4">
                                                        <select value={editForm.type} onChange={e => handleEditChange('type', e.target.value)}
                                                            className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none">
                                                            <option value="stock_in">Stock In</option>
                                                            <option value="usage">Usage</option>
                                                            <option value="production">Production</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <input type="text" value={editForm.material} onChange={e => handleEditChange('material', e.target.value)}
                                                            className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                                                    </td>
                                                    <td className="p-4">
                                                        <input type="number" value={editForm.weight} onChange={e => handleEditChange('weight', e.target.value)}
                                                            className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-right text-white focus:outline-none" />
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={saveEdit} disabled={loading} className="text-emerald-400 hover:bg-emerald-500/20 p-1.5 rounded transition-colors"><Save size={14} /></button>
                                                    <button onClick={cancelEdit} disabled={loading} className="text-slate-400 hover:bg-white/10 p-1.5 rounded transition-colors"><X size={14} /></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        // VIEW MODE
                                        <>
                                            <td className="p-4 text-slate-300 font-mono text-xs">{row.date}</td>
                                            {selectedTable === 'transactions' ? (
                                                <>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${row.payment_mode === 'Expense'
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            }`}>
                                                            {row.payment_mode}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-200 font-medium">
                                                        {row.item_name}
                                                        {row.invoice_no && <span className="ml-2 text-[10px] text-slate-500 px-1.5 rounded bg-white/5">#{row.invoice_no}</span>}
                                                    </td>
                                                    <td className="p-4 text-right font-mono text-slate-200">
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(row.amount)}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${row.type === 'stock_in' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            row.type === 'usage' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                            }`}>
                                                            {(row.type || 'N/A').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-200 font-medium">{row.material}</td>
                                                    <td className="p-4 text-right font-mono text-slate-200">{row.weight} KG</td>
                                                </>
                                            )}

                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => startEdit(row)} className="text-blue-400 hover:bg-blue-500/10 p-1.5 rounded transition-colors" title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-colors" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-500 italic">
                                        No records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Load More Bar */}
                {hasMore && (
                    <div className="p-3 bg-[#151923] border-t border-white/5 text-center">
                        <button
                            onClick={() => { setPage(p => p + 1); fetchData(); }}
                            disabled={loading}
                            className="text-xs text-blue-400 hover:text-blue-300 font-bold tracking-wide uppercase disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Loading...' : 'Load More Records'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataManager;
