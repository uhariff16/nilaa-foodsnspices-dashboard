import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Save, Users, Target, Plus, Trash2, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const AdminProfitSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    
    // Configurations
    const [reservePercentage, setReservePercentage] = useState(0);
    const [stakeholders, setStakeholders] = useState([]);
    
    useEffect(() => {
        fetchProfitConfig();
    }, []);

    const fetchProfitConfig = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Reserve Percentage from system_settings
            const { data: reserveData, error: reserveErr } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'profit_reserve_percentage')
                .maybeSingle();
                
            if (reserveData) {
                setReservePercentage(parseFloat(reserveData.value) || 0);
            } else {
                setReservePercentage(0); // Default if not explicitly set
            }

            // 2. Fetch Stakeholders
            const { data: stkData, error: stkErr } = await supabase
                .from('profit_stakeholders')
                .select('*')
                .order('created_at', { ascending: true });
                
            if (!stkErr && stkData) {
                setStakeholders(stkData);
            }
            
        } catch (err) {
            console.error('Error fetching profit settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReserve = async () => {
        try {
            setSaving(true);
            setMessage(null);
            
            // Upsert the system setting
            const { data, error } = await supabase
                .from('system_settings')
                .select('id')
                .eq('key', 'profit_reserve_percentage')
                .maybeSingle();

            let res;
            if (data) {
                // Update
                res = await supabase.from('system_settings').update({ value: String(reservePercentage) }).eq('id', data.id);
            } else {
                // Insert
                res = await supabase.from('system_settings').insert({ key: 'profit_reserve_percentage', value: String(reservePercentage) });
            }

            if (res && res.error) throw res.error;
            
            setMessage({ type: 'success', text: 'Reserved Fund percentage saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error('Failed to save reserve:', err);
            setMessage({ type: 'error', text: 'Failed to save reserved fund setting.' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddStakeholder = async () => {
        const newStakeholder = { name: 'New Stakeholder', default_percent: 0 };
        const { data, error } = await supabase.from('profit_stakeholders').insert(newStakeholder).select().single();
        if (!error && data) {
            setStakeholders([...stakeholders, data]);
        }
    };

    const handleUpdateStakeholder = async (id, field, value) => {
        // Optimistic update locally
        setStakeholders(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
        
        // Background DB Update
        await supabase.from('profit_stakeholders').update({ [field]: value }).eq('id', id);
    };

    const handleDeleteStakeholder = async (id) => {
        if (!window.confirm("Are you sure you want to delete this stakeholder? This might break historical payout references.")) return;
        
        // Optimistic local update
        setStakeholders(prev => prev.filter(s => s.id !== id));
        
        // Background delete
        await supabase.from('profit_stakeholders').delete().eq('id', id);
    };

    const totalStakeholderShared = stakeholders.reduce((sum, s) => sum + (parseFloat(s.default_percent) || 0), 0);
    const overallTotal = totalStakeholderShared + (parseFloat(reservePercentage) || 0);

    return (
        <div style={{ padding: '1rem', color: 'var(--text-primary)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Target size={24} color="#3b82f6" /> 
                Profit Distribution Constraints
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Configure global settings for Profit Hub and Stakeholder payouts.</p>

            {message && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.5rem',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* 1. Reserve Fund Config */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--glass-bg)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Save size={18} color="#f59e0b" /> Reserved Fund Percentage
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        This percentage is deducted from the <strong>Overall YTD Profit</strong> as the operational reserve fund. The remaining profit will be visibly distributed to stakeholders.
                    </p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input 
                            type="number" 
                            min="0" max="100"
                            value={reservePercentage}
                            onChange={(e) => setReservePercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            style={{ 
                                flex: 1, 
                                padding: '0.6rem', 
                                borderRadius: '0.5rem', 
                                border: '1px solid var(--amber-border)', 
                                background: 'rgba(245, 158, 11, 0.1)', 
                                color: 'var(--amber-text)', 
                                fontSize: '1.1rem', 
                                fontWeight: 700 
                            }}
                        />
                        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>%</span>
                        
                        <button 
                            className="btn-primary" 
                            onClick={handleSaveReserve}
                            disabled={saving}
                            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* 2. Stakeholders Config */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--glass-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="#3b82f6" /> Manage Stakeholders
                        </h3>
                        
                        <button className="btn-primary" onClick={handleAddStakeholder} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                            <Plus size={16} /> Add Stakeholder
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loading ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading stakeholders...</p>
                        ) : stakeholders.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No stakeholders configured yet.</p>
                        ) : (
                            stakeholders.map((s) => (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--glass-highlight)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600 }}>NAME</label>
                                        <input 
                                            type="text" 
                                            value={s.name}
                                            onChange={(e) => handleUpdateStakeholder(s.id, 'name', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
                                            placeholder="Stakeholder Name"
                                        />
                                    </div>
                                    
                                    <div style={{ width: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600 }}>SHARE %</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input 
                                                type="number" 
                                                value={s.default_percent === 0 ? '' : s.default_percent}
                                                onChange={(e) => handleUpdateStakeholder(s.id, 'default_percent', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                style={{ width: '80px', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
                                                placeholder="0.0"
                                            />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>%</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                                        <button 
                                            onClick={() => handleDeleteStakeholder(s.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                                            title="Delete Stakeholder"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Allocation Warning / Info */}
                    <div style={{ 
                        marginTop: '2rem', padding: '1rem', borderRadius: '0.5rem', 
                        background: overallTotal === 100 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${overallTotal === 100 ? '#10b981' : '#f59e0b'}`,
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                    }}>
                        <Info size={20} color={overallTotal === 100 ? '#10b981' : '#f59e0b'} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: overallTotal === 100 ? '#10b981' : '#f59e0b', fontSize: '0.9rem' }}>
                                Total Payout Allocation: {overallTotal.toFixed(1)}%
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {overallTotal !== 100 
                                    ? "Notice: The combination of the Reserved Fund and Stakeholder shares does not equal exactly 100%. Ensure this is intentional, as unallocated profits will not be formally tracked."
                                    : "Perfect! 100% of the overall profit is explicitly allocated between the reserve fund and current stakeholders."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProfitSettings;
