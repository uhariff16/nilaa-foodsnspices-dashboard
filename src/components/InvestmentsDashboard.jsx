
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    Briefcase, 
    Plus, 
    Calendar, 
    IndianRupee, 
    HardHat, 
    TrendingUp, 
    Users, 
    Search,
    Trash2,
    Info,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const InvestmentsDashboard = ({ isAdmin }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [assets, setAssets] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [stakeholders, setStakeholders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showInvestmentModal, setShowInvestmentModal] = useState(false);
    
    // Form States
    const [assetForm, setAssetForm] = useState({ name: '', category: 'Machinery', purchase_date: new Date().toISOString().split('T')[0], total_cost: '', description: '' });
    const [investmentForm, setInvestmentForm] = useState({ stakeholder_id: '', asset_id: '', amount: '', investment_date: new Date().toISOString().split('T')[0], notes: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assetsRes, investmentsRes, stakeholdersRes] = await Promise.all([
                supabase.from('business_assets').select('*').order('purchase_date', { ascending: false }),
                supabase.from('partner_investments').select('*, business_assets(name), profit_stakeholders(name)').order('investment_date', { ascending: false }),
                supabase.from('profit_stakeholders').select('*').eq('is_active', true)
            ]);

            if (assetsRes.data) setAssets(assetsRes.data);
            if (investmentsRes.data) setInvestments(investmentsRes.data);
            if (stakeholdersRes.data) setStakeholders(stakeholdersRes.data);
        } catch (error) {
            console.error("Error fetching investment data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAsset = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('business_assets').insert([assetForm]);
            if (error) throw error;
            setShowAssetModal(false);
            setAssetForm({ name: '', category: 'Machinery', purchase_date: new Date().toISOString().split('T')[0], total_cost: '', description: '' });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleAddInvestment = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...investmentForm, asset_id: investmentForm.asset_id || null };
            const { error } = await supabase.from('partner_investments').insert([payload]);
            if (error) throw error;
            setShowInvestmentModal(false);
            setInvestmentForm({ stakeholder_id: '', asset_id: '', amount: '', investment_date: new Date().toISOString().split('T')[0], notes: '' });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteAsset = async (id) => {
        if (!window.confirm("Are you sure? This will not delete related investments but will unlinked them.")) return;
        await supabase.from('business_assets').delete().eq('id', id);
        fetchData();
    };

    const handleDeleteInvestment = async (id) => {
        if (!window.confirm("Delete this investment record?")) return;
        await supabase.from('partner_investments').delete().eq('id', id);
        fetchData();
    };

    // Calculations
    const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.total_cost), 0);
    const totalInvested = investments.reduce((sum, i) => sum + Number(i.amount), 0);
    
    const partnerTotals = stakeholders.map(s => {
        const total = investments.filter(i => i.stakeholder_id === s.id).reduce((sum, i) => sum + Number(i.amount), 0);
        return { name: s.name, value: total };
    }).filter(p => p.value > 0);

    const assetBreakdown = assets.map(a => ({
        name: a.name,
        cost: Number(a.total_cost),
        invested: investments.filter(i => i.asset_id === a.id).reduce((sum, i) => sum + Number(i.amount), 0)
    }));

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Investments Data...</div>;

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header Cards */}
            <div className="responsive-grid-4" style={{ marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Asset Value</p>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(totalAssetValue)}</h2>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <HardHat color="#3b82f6" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Partner Capital</p>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(totalInvested)}</h2>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <TrendingUp color="#10b981" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Machinery Count</p>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{assets.length} Items</h2>
                        </div>
                        <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <Briefcase color="#8b5cf6" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Funding Ratio</p>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalAssetValue > 0 ? ((totalInvested / totalAssetValue) * 100).toFixed(1) : 0}%</h2>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <Users color="#f59e0b" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="responsive-grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: '2rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="#3b82f6" /> Partner Equity Share
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={partnerTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name} (${((e.value/totalInvested)*100).toFixed(1)}%)`}>
                                    {partnerTotals.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Briefcase size={20} color="#10b981" /> Investment vs Asset Cost
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetBreakdown.slice(0, 5)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
                                <Bar dataKey="cost" name="Asset Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="invested" name="Partner Funding" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Asset Management */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HardHat size={20} color="#8b5cf6" /> Asset & Machinery Ledger
                    </h3>
                    {isAdmin && (
                        <button onClick={() => setShowAssetModal(true)} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={16} /> Add Asset
                        </button>
                    )}
                </div>
                <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Asset Name</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Category</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Purchase Date</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Total Cost</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Funding %</th>
                                {isAdmin && <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map(asset => {
                                const funded = investments.filter(i => i.asset_id === asset.id).reduce((s, i) => s + Number(i.amount), 0);
                                const pct = (funded / asset.total_cost) * 100;
                                return (
                                    <tr key={asset.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{asset.name}</td>
                                        <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{asset.category}</span></td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(asset.purchase_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{formatCurrency(asset.total_cost)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '4px' }}>
                                                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: pct >= 100 ? '#10b981' : '#f59e0b', borderRadius: '3px' }} />
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pct.toFixed(0)}% Funded</span>
                                        </td>
                                        {isAdmin && (
                                            <td style={{ padding: '1rem' }}>
                                                <button onClick={() => handleDeleteAsset(asset.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Investment Records */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} color="#10b981" /> Partner Contribution History
                    </h3>
                    {isAdmin && (
                        <button onClick={() => setShowInvestmentModal(true)} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={16} /> Record Investment
                        </button>
                    )}
                </div>
                <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Date</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Partner</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Purpose / Asset</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Amount</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Notes</th>
                                {isAdmin && <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {investments.map(inv => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(inv.investment_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', fontWeight: 600, color: '#3b82f6' }}>{inv.profit_stakeholders?.name}</td>
                                    <td style={{ padding: '1rem' }}>{inv.business_assets?.name || <span style={{ color: '#10b981' }}>General Capital</span>}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(inv.amount)}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{inv.notes || '-'}</td>
                                    {isAdmin && (
                                        <td style={{ padding: '1rem' }}>
                                            <button onClick={() => handleDeleteInvestment(inv.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showAssetModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: isMobile ? '95%' : '450px', padding: isMobile ? '1.5rem' : '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Record New Asset</h2>
                        <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Asset Name</label>
                                <input required type="text" className="glass-input" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} placeholder="e.g. Grinder Machine" />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Category</label>
                                    <select className="glass-input" value={assetForm.category} onChange={e => setAssetForm({...assetForm, category: e.target.value})}>
                                        <option>Machinery</option>
                                        <option>Vehicle</option>
                                        <option>Furniture</option>
                                        <option>Building</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Purchase Date</label>
                                    <input required type="date" className="glass-input" value={assetForm.purchase_date} onChange={e => setAssetForm({...assetForm, purchase_date: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Total Cost (₹)</label>
                                <input required type="number" className="glass-input" value={assetForm.total_cost} onChange={e => setAssetForm({...assetForm, total_cost: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAssetModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: '#3b82f6', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Save Asset</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showInvestmentModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: isMobile ? '95%' : '450px', padding: isMobile ? '1.5rem' : '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Record Partner Investment</h2>
                        <form onSubmit={handleAddInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Partner</label>
                                <select required className="glass-input" value={investmentForm.stakeholder_id} onChange={e => setInvestmentForm({...investmentForm, stakeholder_id: e.target.value})}>
                                    <option value="">Select Partner...</option>
                                    {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Linked Asset (Optional)</label>
                                <select className="glass-input" value={investmentForm.asset_id} onChange={e => setInvestmentForm({...investmentForm, asset_id: e.target.value})}>
                                    <option value="">General Investment (Working Capital)</option>
                                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} (₹{a.total_cost})</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Amount (₹)</label>
                                    <input required type="number" className="glass-input" value={investmentForm.amount} onChange={e => setInvestmentForm({...investmentForm, amount: e.target.value})} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Date</label>
                                    <input required type="date" className="glass-input" value={investmentForm.investment_date} onChange={e => setInvestmentForm({...investmentForm, investment_date: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Notes</label>
                                <textarea className="glass-input" value={investmentForm.notes} onChange={e => setInvestmentForm({...investmentForm, notes: e.target.value})} placeholder="Any additional details..." rows={2} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowInvestmentModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: '#10b981', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .glass-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    border-radius: 0.5rem;
                    padding: 0.75rem;
                    color: white;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .glass-input:focus { border-color: var(--accent-primary); background: rgba(255, 255, 255, 0.1); }
                .btn-primary {
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
            `}</style>
        </div>
    );
};

export default InvestmentsDashboard;
