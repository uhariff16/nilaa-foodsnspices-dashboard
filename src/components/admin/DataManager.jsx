import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Search, Filter, Edit2, Trash2, ChevronLeft, ChevronRight, X, Save, AlertCircle, CheckCircle, Database, Calendar, DollarSign, Package, RefreshCw, Users } from 'lucide-react';

const DataManager = () => {
    const [selectedTable, setSelectedTable] = useState('transactions'); // 'transactions' | 'production_logs' | 'customer_receivables'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [hideInvoiceTotals, setHideInvoiceTotals] = useState(true);

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
            let query;
            
            if (selectedTable === 'payments') {
                query = supabase.from('transactions').select('*').eq('payment_mode', 'Supplier_Payment');
            } else {
                query = supabase.from(selectedTable).select('*');
            }

            if (searchTerm) {
                if (selectedTable === 'transactions' || selectedTable === 'payments') {
                    query = query.or(`item_name.ilike.%${searchTerm}%,invoice_no.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
                } else if (selectedTable === 'customer_receivables') {
                    query = query.ilike('customer_name', `%${searchTerm}%`);
                } else {
                    query = query.ilike('material', `%${searchTerm}%`);
                }
            }

            if (selectedTable === 'transactions') {
                // When viewing generic transactions, hide supplier payments to keep them separate
                query = query.neq('payment_mode', 'Supplier_Payment');
            }

            if (selectedTable === 'customer_receivables') {
                query = query.order('customer_name', { ascending: true });
            } else {
                query = query.order('date', { ascending: false });
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

            const targetDbTable = selectedTable === 'payments' ? 'transactions' : selectedTable;
            const { error } = await supabase
                .from(targetDbTable)
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
            const targetDbTable = selectedTable === 'payments' ? 'transactions' : selectedTable;
            const { error } = await supabase
                .from(targetDbTable)
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
                            onClick={() => setSelectedTable('payments')}
                            className={`btn-toggle ${selectedTable === 'payments' ? 'active blue' : ''}`}
                        >
                            <DollarSign size={16} />
                            Payments
                        </button>
                        <button
                            onClick={() => setSelectedTable('production_logs')}
                            className={`btn-toggle ${selectedTable === 'production_logs' ? 'active emerald' : ''}`}
                        >
                            <Package size={16} />
                            Production Logs
                        </button>
                        <button
                            onClick={() => setSelectedTable('customer_receivables')}
                            className={`btn-toggle ${selectedTable === 'customer_receivables' ? 'active blue' : ''}`}
                        >
                            <Users size={16} />
                            Receivables
                        </button>
                    </div>

                    <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1 }}>
                            <div style={{ position: 'relative' }}>
                                <Calendar style={{ position: 'absolute', left: '0.75rem', top: '0.625rem', color: '#64748b' }} size={16} />
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', padding: '0.5rem 1rem 0.5rem 2.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', height: '38px' }}
                                />
                            </div>
                            
                            {selectedTable === 'transactions' && (
                                <select
                                    value={typeFilter}
                                    onChange={e => setTypeFilter(e.target.value)}
                                    className="glass-input"
                                    style={{ height: '38px', padding: '0 1rem', fontSize: '0.875rem', minWidth: '150px' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="Income">Sales Income</option>
                                    <option value="Expense">Expenses</option>
                                    <option value="Returns">Sales Returns</option>
                                </select>
                            )}

                            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                                <Search style={{ position: 'absolute', left: '0.75rem', top: '0.625rem', color: '#64748b' }} size={16} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder={selectedTable === 'transactions' ? "Search Item, Customer, or Invoice..." : "Search..."}
                                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', padding: '0.5rem 1rem 0.5rem 2.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', height: '38px' }}
                                />
                            </div>
                            
                            <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem', height: '38px' }}>
                                <Filter size={16} style={{ marginRight: '0.5rem' }}/>
                                Apply Filters
                            </button>
                        </div>
                        
                        {selectedTable === 'transactions' && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                <input 
                                    type="checkbox" 
                                    checked={hideInvoiceTotals} 
                                    onChange={(e) => setHideInvoiceTotals(e.target.checked)} 
                                    style={{ accentColor: '#3b82f6' }}
                                />
                                Hide Invoice Totals (De-clutter)
                            </label>
                        )}
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
            <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-primary)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflow: 'auto', flex: 1 }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ background: '#151923', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {selectedTable === 'customer_receivables' ? 'Customer' : 'Date'}
                                </th>
                                {selectedTable === 'transactions' || selectedTable === 'payments' ? (
                                    <>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Type</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Customer/Supplier</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item / Description</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Amount</th>
                                    </>
                                ) : selectedTable === 'production_logs' ? (
                                    <>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Type</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Material</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Weight (KG)</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>City</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Phone</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Balance Due</th>
                                    </>
                                )}
                                <th style={{ padding: '1rem', textAlign: 'right', width: '120px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: 'var(--text-primary)' }}>
                            {data.map(row => (
                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: editingId === row.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent', transition: 'background 0.2s' }} className="hover:bg-slate-800/50">
                                    {editingId === row.id ? (
                                        // EDIT MODE
                                        <>
                                            <td style={{ padding: '1rem' }}>
                                                {selectedTable === 'customer_receivables' ? (
                                                    <input type="text" value={editForm.customer_name} onChange={e => handleEditChange('customer_name', e.target.value)}
                                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                ) : (
                                                    <input type="date" value={editForm.date} onChange={e => handleEditChange('date', e.target.value)}
                                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                )}
                                            </td>
                                            {selectedTable === 'transactions' || selectedTable === 'payments' ? (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <select value={editForm.payment_mode} onChange={e => handleEditChange('payment_mode', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                                                            <option value="Sale">Sale</option>
                                                            <option value="Purchase">Purchase</option>
                                                            <option value="Expense">Expense</option>
                                                            <option value="Supplier_Payment">Supplier Payment</option>
                                                            <option value="Online">Online</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.customer_name || ''} onChange={e => handleEditChange('customer_name', e.target.value)} placeholder="Customer Name"
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.item_name} onChange={e => handleEditChange('item_name', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="number" value={editForm.amount} onChange={e => handleEditChange('amount', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'right' }} />
                                                    </td>
                                                </>
                                            ) : selectedTable === 'production_logs' ? (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <select value={editForm.type} onChange={e => handleEditChange('type', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                                                            <option value="stock_in">Stock In</option>
                                                            <option value="usage">Usage</option>
                                                            <option value="production">Production</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.material} onChange={e => handleEditChange('material', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="number" value={editForm.weight} onChange={e => handleEditChange('weight', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'right' }} />
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.city} onChange={e => handleEditChange('city', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="text" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input type="number" value={editForm.balance_due} onChange={e => handleEditChange('balance_due', e.target.value)}
                                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'right' }} />
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
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                {selectedTable === 'customer_receivables' ? row.customer_name : row.date}
                                            </td>

                                            {selectedTable === 'transactions' || selectedTable === 'payments' ? (
                                                <>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase',
                                                            background: row.payment_mode === 'Expense' ? 'rgba(239, 68, 68, 0.1)' : (row.payment_mode === 'Supplier_Payment' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                                                            color: row.payment_mode === 'Expense' ? '#fca5a5' : (row.payment_mode === 'Supplier_Payment' ? '#93c5fd' : '#6ee7b7'),
                                                            border: row.payment_mode === 'Expense' ? '1px solid rgba(239, 68, 68, 0.2)' : (row.payment_mode === 'Supplier_Payment' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)')
                                                        }}>
                                                            {row.payment_mode}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                        {row.customer_name || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                        {row.item_name}
                                                        {row.invoice_no && <span style={{ marginLeft: '0.5rem', fontSize: '0.625rem', color: '#64748b', padding: '0.125rem 0.375rem', background: 'var(--glass-highlight)', borderRadius: '0.25rem' }}>#{row.invoice_no}</span>}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(row.amount) || 0)}
                                                    </td>
                                                </>
                                            ) : selectedTable === 'production_logs' ? (
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
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{row.material}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{row.weight} KG</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{row.city}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{row.phone}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: '#fca5a5', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(row.balance_due) || 0)}
                                                    </td>
                                                </>
                                            )}
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => startEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#60a5fa' }} title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-secondary)' }} title="Delete" onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
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
