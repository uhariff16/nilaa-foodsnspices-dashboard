import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Smartphone, Check, X, Save, AlertTriangle, TrendingUp, Coins, Package, ShieldAlert, BadgeAlert } from 'lucide-react';

const AdminSystemSettings = () => {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeStockTab, setActiveStockTab] = useState('raw'); // 'raw' | 'processed'
    const [lockedMonths, setLockedMonths] = useState([]);
    const [lockYear, setLockYear] = useState(new Date().getFullYear());

    const [settings, setSettings] = useState({
        mobile_layout_enabled: 'true',
        alert_system_enabled: 'true', // Global toggle
        alert_material_cost_enabled: 'true',
        alert_material_cost_threshold: '40',
        alert_labour_cost_enabled: 'true',
        alert_labour_cost_threshold: '15',
        alert_net_margin_enabled: 'true',
        alert_net_margin_threshold: '15',
        alert_warranty_expiry_enabled: 'true',
        alert_partner_debt_enabled: 'true',
        alert_partner_debt_threshold: '10000',
        // Stock Raw overrides
        alert_stock_ginger_raw_enabled: 'true',
        alert_stock_ginger_raw_threshold: '100',
        alert_stock_garlic_raw_enabled: 'true',
        alert_stock_garlic_raw_threshold: '100',
        // Stock Processed overrides
        alert_stock_ginger_peeled_enabled: 'true',
        alert_stock_ginger_peeled_threshold: '50',
        alert_stock_garlic_peeled_enabled: 'true',
        alert_stock_garlic_peeled_threshold: '50',
        alert_stock_mix_paste_enabled: 'true',
        alert_stock_mix_paste_threshold: '20',
        alert_stock_ginger_paste_enabled: 'true',
        alert_stock_ginger_paste_threshold: '20',
        alert_stock_garlic_paste_enabled: 'true',
        alert_stock_garlic_paste_threshold: '20',
        alert_invoice_gaps_enabled: 'true',
        financial_model_cogs_enabled: 'false',
        rnd_module_enabled: 'false'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('system_settings')
                .select('*');

            if (error) {
                console.error('Error fetching settings:', error);
            } else if (data) {
                const loaded = { ...settings };
                data.forEach(item => {
                    if (item.key === 'locked_months') {
                        try { setLockedMonths(JSON.parse(item.value || '[]')); } catch(e) {}
                    } else {
                        loaded[item.key] = item.value;
                    }
                });
                setSettings(loaded);
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleLockMonth = (monthName) => {
        const str = `${monthName} ${lockYear}`;
        setLockedMonths(prev => 
            prev.includes(str) ? prev.filter(m => m !== str) : [...prev, str]
        );
    };
    
    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        // Convert state keys into database upsert format
        const upsertData = Object.entries(settings).map(([key, value]) => ({
            key,
            value: String(value)
        }));
        upsertData.push({ key: 'locked_months', value: JSON.stringify(lockedMonths) });

        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert(upsertData, { onConflict: 'key' });

            if (error) throw error;
            setMessage({ type: 'success', text: 'System settings saved successfully!' });
        } catch (err) {
            console.error('Error saving settings:', err);
            setMessage({ type: 'error', text: `Failed to save settings: ${err.message}` });
        } finally {
            setIsSaving(false);
            // Clear message after 3s
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (loading) return <div style={{ color: 'var(--text-primary)', padding: '2rem' }}>Loading system settings...</div>;

    const renderToggleSwitch = (key, value) => {
        const isEnabled = value === 'true';
        return (
            <button
                type="button"
                onClick={() => handleChange(key, isEnabled ? 'false' : 'true')}
                style={{
                    position: 'relative',
                    width: '3.25rem', height: '1.65rem',
                    borderRadius: '9999px',
                    border: 'none', cursor: 'pointer',
                    background: isEnabled ? '#10b981' : '#334155',
                    transition: 'background 0.3s',
                    flexShrink: 0
                }}
            >
                <div style={{
                    position: 'absolute', top: '2px', left: isEnabled ? 'calc(100% - 1.5rem)' : '2px',
                    width: '1.35rem', height: '1.35rem', borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
            </button>
        );
    };

    const alertsDisabled = settings.alert_system_enabled !== 'true';

    return (
        <form onSubmit={handleSave} style={{ padding: '1rem', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 700 }}>System Settings</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure global application layout and executive alerts.</p>
                </div>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', opacity: isSaving ? 0.7 : 1 }}
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {message && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.5rem',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
                {/* Section 1: Interface Settings */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Smartphone size={20} color="#3b82f6" />
                        Layout Settings
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Mobile Optimized Layout</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                When enabled, users on small screens will see the dedicated App-like Mobile Dashboard.
                                When disabled, they will see the standard Desktop view (responsive).
                            </p>
                        </div>
                        {renderToggleSwitch('mobile_layout_enabled', settings.mobile_layout_enabled)}
                    </div>
                </div>

                {/* Section 1.5: Financial Logic Settings */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Coins size={20} color="#3b82f6" />
                        Financial Reporting Logic
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Cost of Goods Sold (COGS) Model</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>
                                Toggle how production cost and profit margins are calculated globally across the system.
                            </p>
                            <div style={{ 
                                background: settings.financial_model_cogs_enabled === 'true' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${settings.financial_model_cogs_enabled === 'true' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                padding: '1rem',
                                borderRadius: '0.5rem'
                            }}>
                                <strong style={{ color: settings.financial_model_cogs_enabled === 'true' ? '#10b981' : '#ef4444', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                    {settings.financial_model_cogs_enabled === 'true' ? 'Current: COGS Model' : 'Current: Cash Flow Model'}
                                </strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {settings.financial_model_cogs_enabled === 'true' 
                                        ? "Production Cost is calculated by matching the exact volume of raw material consumed this month against the Year-to-Date average purchase price. Ideal for tracking true operational profitability."
                                        : "Production Cost is calculated using total expenses paid this month, including all bulk raw material purchases regardless of how much was actually consumed. Ideal for tracking absolute cash position."
                                    }
                                </span>
                            </div>
                        </div>
                        {renderToggleSwitch('financial_model_cogs_enabled', settings.financial_model_cogs_enabled)}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                        <div style={{ flex: 1, paddingRight: '2rem' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Research & Development Module</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>
                                Enable or disable the entire R&D module (Project Tracking, Formula Management, Labs). Currently accessible only to Administrators.
                            </p>
                        </div>
                        {renderToggleSwitch('rnd_module_enabled', settings.rnd_module_enabled)}
                    </div>
                </div>

                
                {/* Section: Month Lock */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldAlert size={20} color="#ef4444" />
                                Financial Data Locking
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                Lock historical months to prevent retroactive manual entries or bulk excel uploads. Perfect for freezing finalized accounting periods.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Year:</span>
                            <select 
                                className="glass-input" 
                                value={lockYear} 
                                onChange={(e) => setLockYear(Number(e.target.value))}
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', width: '100px' }}
                            >
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                                <option value={2027}>2027</option>
                                <option value={2028}>2028</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => {
                            const str = `${m} ${lockYear}`;
                            const isLocked = lockedMonths.includes(str);
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => toggleLockMonth(m)}
                                    className={`btn-toggle ${isLocked ? 'active red' : ''}`}
                                    style={{ justifyContent: 'center' }}
                                >
                                    {isLocked ? <Check size={14} /> : <X size={14} opacity={0.3} />}
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Alerts Config Settings */}

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BadgeAlert size={20} color="#3b82f6" />
                        Executive Alerts Configuration
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                        Enable or disable specific alerts and set the exact numeric boundaries to trigger them.
                    </p>

                    {/* Global Enable/Disable Switch */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: '0.5rem' }}>
                        <div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#3b82f6' }}>Executive Alerts Dashboard Feature</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                Enable or disable the entire alerts and notifications panel on the home tab of the dashboard globally.
                            </p>
                        </div>
                        {renderToggleSwitch('alert_system_enabled', settings.alert_system_enabled)}
                    </div>

                    <div style={{ opacity: alertsDisabled ? 0.4 : 1, pointerEvents: alertsDisabled ? 'none' : 'auto', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 1: Material Cost */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Material Cost Alert
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    Triggers when raw material purchases exceed a specific percentage of net sales.
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                {settings.alert_material_cost_enabled === 'true' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Threshold:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            required={!alertsDisabled}
                                            className="glass-input"
                                            style={{ width: '80px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                                            value={settings.alert_material_cost_threshold}
                                            onChange={(e) => handleChange('alert_material_cost_threshold', e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>%</span>
                                    </div>
                                )}
                                {renderToggleSwitch('alert_material_cost_enabled', settings.alert_material_cost_enabled)}
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 2: Labour Cost */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Labour Cost Alert
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    Triggers when staff wages and daily payouts exceed a specific percentage of net sales.
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                {settings.alert_labour_cost_enabled === 'true' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Threshold:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            required={!alertsDisabled}
                                            className="glass-input"
                                            style={{ width: '80px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                                            value={settings.alert_labour_cost_threshold}
                                            onChange={(e) => handleChange('alert_labour_cost_threshold', e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>%</span>
                                    </div>
                                )}
                                {renderToggleSwitch('alert_labour_cost_enabled', settings.alert_labour_cost_enabled)}
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 3: Profit Margin */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Profit Margin Alert
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    Triggers when net profit margin falls below a specific target percentage.
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                {settings.alert_net_margin_enabled === 'true' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Min Margin:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            required={!alertsDisabled}
                                            className="glass-input"
                                            style={{ width: '80px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                                            value={settings.alert_net_margin_threshold}
                                            onChange={(e) => handleChange('alert_net_margin_threshold', e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>%</span>
                                    </div>
                                )}
                                {renderToggleSwitch('alert_net_margin_enabled', settings.alert_net_margin_enabled)}
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 4: Itemized Stock Alerts with Sub-tabs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Inventory Safety Stock Alerts
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                                    Configure individual thresholds (kg) for raw materials and processed items.
                                </p>
                            </div>

                            {/* Sub-tabs toggle */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', background: 'var(--glass-highlight)', padding: '0.25rem', borderRadius: '0.5rem', width: 'max-content' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveStockTab('raw')}
                                    style={{
                                        padding: '0.4rem 1rem', borderRadius: '0.35rem', border: 'none',
                                        background: activeStockTab === 'raw' ? 'var(--accent-primary)' : 'transparent',
                                        color: activeStockTab === 'raw' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                                    }}
                                >
                                    Raw Materials
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveStockTab('processed')}
                                    style={{
                                        padding: '0.4rem 1rem', borderRadius: '0.35rem', border: 'none',
                                        background: activeStockTab === 'processed' ? 'var(--accent-primary)' : 'transparent',
                                        color: activeStockTab === 'processed' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                                    }}
                                >
                                    Processed Items
                                </button>
                            </div>

                            {/* Sub-tab 1: Raw Materials */}
                            {activeStockTab === 'raw' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                    {/* Ginger Raw */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ginger (Raw)</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_ginger_raw_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_ginger_raw_threshold}
                                                        onChange={(e) => handleChange('alert_stock_ginger_raw_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_ginger_raw_enabled', settings.alert_stock_ginger_raw_enabled)}
                                        </div>
                                    </div>
                                    {/* Garlic Raw */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Garlic (Raw)</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_garlic_raw_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_garlic_raw_threshold}
                                                        onChange={(e) => handleChange('alert_stock_garlic_raw_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_garlic_raw_enabled', settings.alert_stock_garlic_raw_enabled)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sub-tab 2: Processed Items */}
                            {activeStockTab === 'processed' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                    {/* Ginger Peeled */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ginger (Peeled)</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_ginger_peeled_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_ginger_peeled_threshold}
                                                        onChange={(e) => handleChange('alert_stock_ginger_peeled_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_ginger_peeled_enabled', settings.alert_stock_ginger_peeled_enabled)}
                                        </div>
                                    </div>
                                    {/* Garlic Peeled */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Garlic (Peeled)</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_garlic_peeled_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_garlic_peeled_threshold}
                                                        onChange={(e) => handleChange('alert_stock_garlic_peeled_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_garlic_peeled_enabled', settings.alert_stock_garlic_peeled_enabled)}
                                        </div>
                                    </div>
                                    {/* G&G Paste Mix */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>G&G Paste (Mix)</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_mix_paste_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_mix_paste_threshold}
                                                        onChange={(e) => handleChange('alert_stock_mix_paste_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_mix_paste_enabled', settings.alert_stock_mix_paste_enabled)}
                                        </div>
                                    </div>
                                    {/* Ginger Paste */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ginger Paste</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_ginger_paste_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_ginger_paste_threshold}
                                                        onChange={(e) => handleChange('alert_stock_ginger_paste_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_ginger_paste_enabled', settings.alert_stock_ginger_paste_enabled)}
                                        </div>
                                    </div>
                                    {/* Garlic Paste */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Garlic Paste</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {settings.alert_stock_garlic_paste_enabled === 'true' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        required={!alertsDisabled}
                                                        className="glass-input"
                                                        style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        value={settings.alert_stock_garlic_paste_threshold}
                                                        onChange={(e) => handleChange('alert_stock_garlic_paste_threshold', e.target.value)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                                                </div>
                                            )}
                                            {renderToggleSwitch('alert_stock_garlic_paste_enabled', settings.alert_stock_garlic_paste_enabled)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 5: Warranty Expiry */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Asset Warranty Expiry Alert
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    Triggers when an asset warranty is expiring within the next 30 days.
                                </p>
                            </div>
                            {renderToggleSwitch('alert_warranty_expiry_enabled', settings.alert_warranty_expiry_enabled)}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 6: Partner Debt */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Partner Outstanding Debt Alert
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    Triggers when outstanding partner reimbursement settlements exceed a specific value.
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                {settings.alert_partner_debt_enabled === 'true' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Threshold:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required={!alertsDisabled}
                                            className="glass-input"
                                            style={{ width: '110px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                                            value={settings.alert_partner_debt_threshold}
                                            onChange={(e) => handleChange('alert_partner_debt_threshold', e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>₹</span>
                                    </div>
                                )}
                                {renderToggleSwitch('alert_partner_debt_enabled', settings.alert_partner_debt_enabled)}
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                        {/* Alert 7: Invoice Sequence Gaps */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                                    Invoice Sequence Gaps Alert
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    Triggers when invoice numbers have sequence gaps in the selected month's ledger.
                                </p>
                            </div>
                            {renderToggleSwitch('alert_invoice_gaps_enabled', settings.alert_invoice_gaps_enabled)}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default AdminSystemSettings;
