import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Smartphone, Check, X, Save } from 'lucide-react';

const AdminSystemSettings = () => {
    const [loading, setLoading] = useState(true);
    const [mobileEnabled, setMobileEnabled] = useState(true); // Default to true
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .eq('key', 'mobile_layout_enabled')
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // Ignore no rows found, use default
                    console.error('Error fetching settings:', error);
                }
            } else if (data) {
                setMobileEnabled(data.value === 'true');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleMobileLayout = async () => {
        const newValue = !mobileEnabled;
        setMobileEnabled(newValue); // Optimistic update

        try {
            const { error } = await supabase
                .from('system_settings')
                .update({
                    value: String(newValue)
                })
                .eq('key', 'mobile_layout_enabled');

            if (error) throw error;
            setMessage({ type: 'success', text: `Mobile Layout ${newValue ? 'Enabled' : 'Disabled'} Successfully` });
        } catch (err) {
            console.error('Error updating setting:', err);
            setMobileEnabled(!newValue); // Revert
            setMessage({ type: 'error', text: 'Failed to update setting' });
        }

        // Clear message after 3s
        setTimeout(() => setMessage(null), 3000);
    };

    if (loading) return <div style={{ color: 'var(--text-primary)', padding: '2rem' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '1rem', color: 'var(--text-primary)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>System Settings</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Configure global application behavior.</p>

            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{
                            padding: '0.75rem', borderRadius: '0.75rem',
                            background: mobileEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: mobileEnabled ? '#10b981' : '#ef4444'
                        }}>
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Mobile Optimized Layout</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px' }}>
                                When enabled, users on small screens will see the dedicated App-like Mobile Dashboard.
                                When disabled, they will see the standard Desktop view (responsive).
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={toggleMobileLayout}
                        style={{
                            position: 'relative',
                            width: '3.5rem', height: '1.75rem',
                            borderRadius: '9999px',
                            border: 'none', cursor: 'pointer',
                            background: mobileEnabled ? '#10b981' : '#334155',
                            transition: 'background 0.3s'
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: '2px', left: mobileEnabled ? 'calc(100% - 1.6rem)' : '2px',
                            width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                            background: 'white',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </button>
                </div>
            </div>

            {message && (
                <div style={{
                    marginTop: '1.5rem', padding: '1rem', borderRadius: '0.5rem',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default AdminSystemSettings;
