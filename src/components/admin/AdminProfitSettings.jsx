import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Save, Users, Target, Plus, Trash2, AlertTriangle, Info, CheckCircle, Calendar, Shield, Clock, Eye } from 'lucide-react';

const AdminProfitSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    
    // Configurations
    const [reservePercentage, setReservePercentage] = useState(0);
    const [stakeholders, setStakeholders] = useState([]);
    const [monthlyOverrides, setMonthlyOverrides] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    
    // New Override Form
    const [newOverride, setNewOverride] = useState({ month: '', year: new Date().getFullYear(), percent: 0 });

    useEffect(() => {
        fetchProfitConfig();
        fetchAuditLogs();
    }, []);

    const fetchProfitConfig = async () => {
        try {
            setLoading(true);
            const [reserveRes, stkRes, overrideRes] = await Promise.all([
                supabase.from('system_settings').select('value').eq('key', 'profit_reserve_percentage').maybeSingle(),
                supabase.from('profit_stakeholders').select('*').order('created_at', { ascending: true }),
                supabase.from('profit_monthly_settings').select('*').order('month_year', { ascending: false })
            ]);
                
            if (reserveRes.data) setReservePercentage(parseFloat(reserveRes.data.value) || 0);
            if (stkRes.data) setStakeholders(stkRes.data);
            if (overrideRes.data) setMonthlyOverrides(overrideRes.data);
            
        } catch (err) {
            console.error('Error fetching profit settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        const { data, error } = await supabase
            .from('profit_hub_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (!error) setAuditLogs(data || []);
    };

    const handleSaveReserve = async () => {
        try {
            setSaving(true);
            const { data } = await supabase.from('system_settings').select('id').eq('key', 'profit_reserve_percentage').maybeSingle();
            let res;
            if (data) res = await supabase.from('system_settings').update({ value: String(reservePercentage) }).eq('id', data.id);
            else res = await supabase.from('system_settings').insert({ key: 'profit_reserve_percentage', value: String(reservePercentage) });
            if (res?.error) throw res.error;
            setMessage({ type: 'success', text: 'Default Reserve saved!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Save failed.' });
        } finally { setSaving(false); }
    };

    const handleAddOverride = async () => {
        if (!newOverride.month) return;
        const monthYear = `${newOverride.month} ${newOverride.year}`;
        const { error } = await supabase.from('profit_monthly_settings').upsert({
            month_year: monthYear,
            reserve_percentage: newOverride.percent,
            updated_at: new Date().toISOString()
        }, { onConflict: 'month_year' });
        if (!error) {
            fetchProfitConfig();
            setNewOverride({ month: '', year: new Date().getFullYear(), percent: 0 });
        }
    };

    const handleDeleteOverride = async (id) => {
        await supabase.from('profit_monthly_settings').delete().eq('id', id);
        fetchProfitConfig();
    };

    const totalStakeholderShared = stakeholders.reduce((sum, s) => sum + (parseFloat(s.default_percent) || 0), 0);
    const overallTotal = totalStakeholderShared + (parseFloat(reservePercentage) || 0);

    return (
        <div style={{ padding: '1rem', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield size={32} color="#3b82f6" /> 
                        Profit Governance
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Manage financial distribution rules and audit operational changes.</p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>Global Allocation</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: overallTotal === 100 ? '#10b981' : '#f59e0b' }}>{overallTotal.toFixed(1)}%</div>
                </div>
            </div>

            {message && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.5rem', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`, color: message.type === 'success' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* 1. Global Stakeholders */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="#3b82f6" /> Distribution Stakeholders
                        </h3>
                        <button onClick={async () => {
                            const { data, error } = await supabase.from('profit_stakeholders').insert({ name: 'New Partner', default_percent: 0 }).select().single();
                            if (!error) setStakeholders([...stakeholders, data]);
                        }} style={{ padding: '0.4rem 0.8rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {stakeholders.map(s => (
                            <div key={s.id} style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                <input type="text" value={s.name} onChange={async (e) => {
                                    const val = e.target.value;
                                    setStakeholders(prev => prev.map(item => item.id === s.id ? {...item, name: val} : item));
                                    await supabase.from('profit_stakeholders').update({ name: val }).eq('id', s.id);
                                }} style={{ flex: 2, background: 'transparent', border: 'none', color: 'white', fontWeight: 600, outline: 'none' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <input type="number" value={s.default_percent} onChange={async (e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setStakeholders(prev => prev.map(item => item.id === s.id ? {...item, default_percent: val} : item));
                                        await supabase.from('profit_stakeholders').update({ default_percent: val }).eq('id', s.id);
                                    }} style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#3b82f6', textAlign: 'right', fontWeight: 700 }} />
                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>%</span>
                                </div>
                                <button onClick={async () => {
                                    if (window.confirm("Delete?")) {
                                        await supabase.from('profit_stakeholders').delete().eq('id', s.id);
                                        setStakeholders(prev => prev.filter(item => item.id !== s.id));
                                    }
                                }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Monthly Reserve Fund Adjustment */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} color="#f59e0b" /> Monthly Reserve Overrides
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        <select value={newOverride.month} onChange={e => setNewOverride({...newOverride, month: e.target.value})} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', background: '#333', border: '1px solid var(--glass-border)', color: 'white' }}>
                            <option value="">Month</option>
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={newOverride.year} onChange={e => setNewOverride({...newOverride, year: e.target.value})} style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', background: '#333', border: '1px solid var(--glass-border)', color: 'white' }}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <input type="number" placeholder="%" value={newOverride.percent} onChange={e => setNewOverride({...newOverride, percent: e.target.value})} style={{ width: '60px', padding: '0.4rem', borderRadius: '4px', background: '#333', border: '1px solid var(--glass-border)', color: 'white' }} />
                        <button onClick={handleAddOverride} style={{ padding: '0.4rem 1rem', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {monthlyOverrides.map(o => (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontWeight: 600 }}>{o.month_year}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{o.reserve_percentage}%</span>
                                    <button onClick={() => handleDeleteOverride(o.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {monthlyOverrides.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '2rem 0' }}>No monthly overrides configured.</p>}
                    </div>
                </div>
            </div>

            {/* 3. Security Audit Logs */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="#10b981" /> Profit Command Audit Trail
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '0.75rem' }}>TIMESTAMP</th>
                                <th style={{ padding: '0.75rem' }}>USER</th>
                                <th style={{ padding: '0.75rem' }}>ACTION</th>
                                <th style={{ padding: '0.75rem' }}>DETAILS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <div style={{ fontWeight: 600 }}>{log.user_email?.split('@')[0]}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{log.user_email}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: log.action.includes('Reset') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: log.action.includes('Reset') ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '0.7rem' }}>{log.action.toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{JSON.stringify(log.details)}</td>
                                </tr>
                            ))}
                            {auditLogs.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No logs found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminProfitSettings;
