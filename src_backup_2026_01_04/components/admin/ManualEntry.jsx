import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Layers, DollarSign, Package, Save, CheckCircle, AlertCircle, RefreshCw, Calendar, FileText, Tag, TrendingUp, Archive } from 'lucide-react';

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
        <div className="p-8 space-y-8 bg-[#1a1f2e] min-h-[calc(100vh-140px)] rounded-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                        <PlusCircle className="text-amber-500" size={28} />
                        Manual Entry
                    </h2>
                    <p className="text-slate-400 text-sm">Create single transaction or production records manually.</p>
                </div>

                {/* Tab Navigation - Dashboard Style */}
                <div className="flex bg-[#0f1219] p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setEntryType('transaction')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${entryType === 'transaction'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <DollarSign size={14} />
                        Financial
                    </button>
                    <button
                        onClick={() => setEntryType('production')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${entryType === 'production'
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Package size={14} />
                        Production
                    </button>
                </div>
            </div>

            {/* Entry Form */}
            <div className={`max-w-3xl mx-auto rounded-xl border border-white/5 p-8 transition-all duration-300 ${entryType === 'transaction' ? 'bg-indigo-500/5 hover:border-indigo-500/20' : 'bg-orange-500/5 hover:border-orange-500/20'
                }`}>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {entryType === 'transaction' ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">
                                Transaction Details
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Transaction Date</label>
                                    <input type="date" required value={txnForm.date} onChange={e => setTxnForm({ ...txnForm, date: e.target.value })}
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Type</label>
                                    <select value={txnForm.type} onChange={e => setTxnForm({ ...txnForm, type: e.target.value })}
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                                        <option value="Sales">Sales Income (+)</option>
                                        <option value="Expense">Business Expense (-)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6">
                                <label className="block text-xs font-semibold text-slate-400 mb-2">Description / Item Name</label>
                                <input type="text" required value={txnForm.item_name} onChange={e => setTxnForm({ ...txnForm, item_name: e.target.value })} placeholder="e.g. Ginger Paste 1kg"
                                    className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-600 text-sm" />
                            </div>
                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Amount (₹)</label>
                                    <input type="number" required value={txnForm.amount} onChange={e => setTxnForm({ ...txnForm, amount: e.target.value })} placeholder="0.00"
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-lg font-bold text-right" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Invoice No. (Optional)</label>
                                    <input type="text" value={txnForm.invoice_no} onChange={e => setTxnForm({ ...txnForm, invoice_no: e.target.value })} placeholder="#INV-001"
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-sm" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">
                                Production Log
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Log Date</label>
                                    <input type="date" required value={prodForm.date} onChange={e => setProdForm({ ...prodForm, date: e.target.value })}
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-orange-500 transition-all font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Activity Type</label>
                                    <select value={prodForm.type} onChange={e => setProdForm({ ...prodForm, type: e.target.value })}
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer">
                                        <option value="stock_in">Stock In (Purchase)</option>
                                        <option value="usage">Usage (Consumed)</option>
                                        <option value="production">Production Output</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Material / Product</label>
                                    <input type="text" required value={prodForm.material} onChange={e => setProdForm({ ...prodForm, material: e.target.value })} placeholder="e.g. Raw Ginger"
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-orange-500 transition-all placeholder-slate-600 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2">Weight (KG)</label>
                                    <input type="number" step="0.01" required value={prodForm.weight} onChange={e => setProdForm({ ...prodForm, weight: e.target.value })} placeholder="0.00"
                                        className="w-full bg-[#0f1219] border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-orange-500 transition-all font-mono text-lg font-bold text-right" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-3 rounded-lg font-bold text-sm text-white shadow-lg transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 ${entryType === 'transaction'
                                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                                    : 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20'
                                }`}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                            Save Record
                        </button>
                    </div>
                </form>
            </div>

            {/* Status Toast */}
            {status.message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 border ${status.type === 'error'
                        ? 'bg-red-500/10 text-red-300 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                    {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span className="font-semibold">{status.message}</span>
                </div>
            )}
        </div>
    );
};

// Helper Icon for imports
const PlusCircle = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);

export default ManualEntry;
