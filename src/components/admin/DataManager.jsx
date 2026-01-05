import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Search, Filter, Edit2, Trash2, ChevronLeft, ChevronRight, X, Save, AlertCircle, CheckCircle, Database, Calendar, DollarSign, Package, RefreshCw } from 'lucide-react';

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
        <div className="admin-wrapper" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '600px' }}>
            {/* Header & Controls */}
            <div style={{ padding: '0 0 1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="btn-toggle-group">
                        <button
                            onClick={() => setSelectedTable('transactions')}
                            className={`btn-toggle ${selectedTable === 'transactions' ? 'active blue' : ''}`}
                        >
                            <DollarSign size={16} />
                            Transactions
                        </button>
                        <button
                            onClick={() => setSelectedTable('production_logs')}
                            className={`btn-toggle ${selectedTable === 'production_logs' ? 'active emerald' : ''}`}
                        >
                            <Package size={16} />
                            Production Logs
                        </button>
                    </div>

                    <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <Calendar style={{ position: 'absolute', left: '0.75rem', top: '0.625rem', color: '#64748b' }} size={16} />
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={e => setDateFilter(e.target.value)}
                                style={{ background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem 1rem 0.5rem 2.5rem', color: 'white', fontSize: '0.875rem', outline: 'none', height: '100%' }}
                            />
                        </div>
                        <div style={{ position: 'relative', minWidth: '250px' }}>
                            <Search style={{ position: 'absolute', left: '0.75rem', top: '0.625rem', color: '#64748b' }} size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={selectedTable === 'transactions' ? "Search Item or Invoice..." : "Search Material..."}
                                style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem 1rem 0.5rem 2.5rem', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                            />
                        </div>
                        <button type="submit" className="btn-action" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Status Message */}
            {status.message && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', border: status.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: status.type === 'error' ? '#fca5a5' : '#6ee7b7' }}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span style={{ fontWeight: 500 }}>{status.message}</span>
                    <button onClick={() => setStatus({ type: 'idle', message: '' })} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'currentColor', opacity: 0.7, cursor: 'pointer' }}><X size={14} /></button>
                </div>
            )}

            {/* Data Table */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#0f1219', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflow: 'auto', flex: 1 }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ background: '#151923', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                                {selectedTable === 'transactions' ? (
                                    <>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Type</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item / Description</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Amount</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Type</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Material</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Weight (KG)</th>
                                    </>
                                )}
                                <th style={{ padding: '1rem', textAlign: 'right', width: '120px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: 'white' }}>
                            {data.map(row => (
                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: editingId === row.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent', transition: 'background 0.2s' }} className="hover:bg-slate-800/50">
                                    {editingId === row.id ? (
                                        // EDIT MODE
                                        <>
                                            <td style={{ padding: '1rem' }}>
                                                <input type="date" value={editForm.date} onChange={e => handleEditChange('date', e.target.value)}
                                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem' }} />
                                            </td>
                                            {selectedTable === 'transactions' ? (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <select value={editForm.payment_mode} onChange={e => handleEditChange('payment_mode', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem' }}>
                                                            <option value="Sale">Sale</option>
                                                            <option value="Expense">Expense</option>
                                                            <option value="Online">Online</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.item_name} onChange={e => handleEditChange('item_name', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="number" value={editForm.amount} onChange={e => handleEditChange('amount', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem', textAlign: 'right' }} />
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <select value={editForm.type} onChange={e => handleEditChange('type', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem' }}>
                                                            <option value="stock_in">Stock In</option>
                                                            <option value="usage">Usage</option>
                                                            <option value="production">Production</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.material} onChange={e => handleEditChange('material', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="number" value={editForm.weight} onChange={e => handleEditChange('weight', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'white', fontSize: '0.75rem', textAlign: 'right' }} />
                                                    </td>
                                                </>
                                            )}
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={saveEdit} disabled={loading} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '0.25rem' }}><Save size={16} /></button>
                                                    <button onClick={cancelEdit} disabled={loading} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}><X size={16} /></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        // VIEW MODE
                                        <>
                                            <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.75rem', fontFamily: 'monospace' }}>{row.date}</td>
                                            {selectedTable === 'transactions' ? (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase',
                                                            background: row.payment_mode === 'Expense' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: row.payment_mode === 'Expense' ? '#fca5a5' : '#6ee7b7',
                                                            border: row.payment_mode === 'Expense' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                                                        }}>
                                                            {row.payment_mode}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: '#e2e8f0', fontWeight: 500 }}>
                                                        {row.item_name}
                                                        {row.invoice_no && <span style={{ marginLeft: '0.5rem', fontSize: '0.625rem', color: '#64748b', padding: '0.125rem 0.375rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem' }}>#{row.invoice_no}</span>}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(row.amount)}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase',
                                                            background: row.type === 'stock_in' ? 'rgba(59, 130, 246, 0.1)' : (row.type === 'usage' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(168, 85, 247, 0.1)'),
                                                            color: row.type === 'stock_in' ? '#93c5fd' : (row.type === 'usage' ? '#fcd34d' : '#d8b4fe'),
                                                            border: row.type === 'stock_in' ? '1px solid rgba(59, 130, 246, 0.2)' : (row.type === 'usage' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(168, 85, 247, 0.2)')
                                                        }}>
                                                            {(row.type || 'N/A').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: '#e2e8f0', fontWeight: 500 }}>{row.material}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace' }}>{row.weight} KG</td>
                                                </>
                                            )}

                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => startEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#60a5fa' }} title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8' }} title="Delete" onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                        No records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Load More Bar */}
                {hasMore && (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', background: '#151923' }}>
                        <button
                            onClick={() => { setPage(p => p + 1); fetchData(); }}
                            disabled={loading}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.05em' }}
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
