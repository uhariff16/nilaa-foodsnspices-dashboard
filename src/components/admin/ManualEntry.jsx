import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Layers, DollarSign, Package, Save, CheckCircle, AlertCircle, RefreshCw, Calendar, FileText, Tag, TrendingUp, Archive, PlusCircle } from 'lucide-react';

const ManualEntry = () => {
    const [entryType, setEntryType] = useState('transaction'); // 'transaction' | 'production'
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Transaction Form
    const [txnForm, setTxnForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Sales', // Sales | Expense
        item_name: '',
        amount: '',
        invoice_no: ''
    });

    // Production Form
    const [prodForm, setProdForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'stock_in', // stock_in | usage | production
        material: '',
        weight: ''
    });

    const resetForms = () => {
        const today = new Date().toISOString().split('T')[0];
        setTxnForm({ date: today, type: 'Sales', item_name: '', amount: '', invoice_no: '' });
        setProdForm({ date: today, type: 'stock_in', material: '', weight: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: 'idle', message: '' });

        try {
            if (entryType === 'transaction') {
                if (!txnForm.item_name || !txnForm.amount) throw new Error("Item Name and Amount are required.");

                const { error } = await supabase.from('transactions').insert([{
                    date: txnForm.date,
                    payment_mode: txnForm.type === 'Expense' ? 'Expense' : 'Online',
                    item_name: txnForm.item_name,
                    amount: parseFloat(txnForm.amount),
                    invoice_no: txnForm.invoice_no
                }]);
                if (error) throw error;
            } else {
                if (!prodForm.material || !prodForm.weight) throw new Error("Material and Weight are required.");

                const { error } = await supabase.from('production_logs').insert([{
                    date: prodForm.date,
                    type: prodForm.type,
                    material: prodForm.material,
                    weight: parseFloat(prodForm.weight)
                }]);
                if (error) throw error;
            }

            setStatus({ type: 'success', message: "Record saved successfully!" });
            resetForms();

        } catch (err) {
            console.error("Save Error:", err);
            setStatus({ type: 'error', message: "Failed to save: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-wrapper" style={{ minHeight: '600px' }}>
            <div className="admin-header" style={{ maxWidth: '48rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>

                    <div>
                        <h2 className="admin-title">
                            <PlusCircle color="#f59e0b" size={28} />
                            Manual Entry
                        </h2>
                        <p className="admin-subtitle">Create single transaction or production records manually.</p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="btn-toggle-group" style={{ marginTop: '0.5rem' }}>
                        <button
                            onClick={() => setEntryType('transaction')}
                            className={`btn-toggle ${entryType === 'transaction' ? 'active blue' : ''}`}
                        >
                            <DollarSign size={16} />
                            Financial
                        </button>
                        <button
                            onClick={() => setEntryType('production')}
                            className={`btn-toggle ${entryType === 'production' ? 'active emerald' : ''}`}
                        >
                            <Package size={16} />
                            Production
                        </button>
                    </div>
                </div>
            </div>

            {/* Entry Form */}
            <div style={{ maxWidth: '48rem', width: '100%', margin: '0 auto', background: entryType === 'transaction' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(249, 115, 22, 0.05)', border: entryType === 'transaction' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '0.75rem', padding: '2rem', transition: 'all 0.3s ease' }}>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {entryType === 'transaction' ? (
                        <div className="animate-fade-in">
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                Transaction Details
                            </h3>
                            <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transaction Date</label>
                                    <input type="date" required value={txnForm.date} onChange={e => setTxnForm({ ...txnForm, date: e.target.value })}
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontFamily: 'monospace', fontSize: '0.875rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Type</label>
                                    <select value={txnForm.type} onChange={e => setTxnForm({ ...txnForm, type: e.target.value })}
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', cursor: 'pointer' }}>
                                        <option value="Sales">Sales Income (+)</option>
                                        <option value="Expense">Business Expense (-)</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description / Item Name</label>
                                <input type="text" required value={txnForm.item_name} onChange={e => setTxnForm({ ...txnForm, item_name: e.target.value })} placeholder="e.g. Ginger Paste 1kg"
                                    style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontSize: '0.875rem' }} />
                            </div>
                            <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Amount (₹)</label>
                                    <input type="number" required value={txnForm.amount} onChange={e => setTxnForm({ ...txnForm, amount: e.target.value })} placeholder="0.00"
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 'bold', textAlign: 'right' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Invoice No. (Optional)</label>
                                    <input type="text" value={txnForm.invoice_no} onChange={e => setTxnForm({ ...txnForm, invoice_no: e.target.value })} placeholder="#INV-001"
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontFamily: 'monospace', fontSize: '0.875rem' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                Production Log
                            </h3>
                            <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Log Date</label>
                                    <input type="date" required value={prodForm.date} onChange={e => setProdForm({ ...prodForm, date: e.target.value })}
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontFamily: 'monospace', fontSize: '0.875rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Activity Type</label>
                                    <select value={prodForm.type} onChange={e => setProdForm({ ...prodForm, type: e.target.value })}
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', cursor: 'pointer' }}>
                                        <option value="stock_in">Stock In (Purchase)</option>
                                        <option value="usage">Usage (Consumed)</option>
                                        <option value="production">Production Output</option>
                                    </select>
                                </div>
                            </div>
                            <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Material / Product</label>
                                    <input type="text" required value={prodForm.material} onChange={e => setProdForm({ ...prodForm, material: e.target.value })} placeholder="e.g. Raw Ginger"
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontSize: '0.875rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Weight (KG)</label>
                                    <input type="number" step="0.01" required value={prodForm.weight} onChange={e => setProdForm({ ...prodForm, weight: e.target.value })} placeholder="0.00"
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', color: 'white', fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 'bold', textAlign: 'right' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className={entryType === 'transaction' ? 'btn-action btn-sales' : 'btn-action btn-prod'}
                            style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                            Save Record
                        </button>
                    </div>
                </form>
            </div>

            {/* Status Toast */}
            {status.message && (
                <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: status.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: status.type === 'error' ? '#fca5a5' : '#6ee7b7' }} className="animate-fade-in">
                    {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span style={{ fontWeight: 600 }}>{status.message}</span>
                </div>
            )}
        </div>
    );
};

export default ManualEntry;
