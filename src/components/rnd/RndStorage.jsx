import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Search, Edit2, Trash2, Box } from 'lucide-react';

const RndStorage = () => {
    const [samples, setSamples] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSamples();
    }, []);

    const fetchSamples = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_samples')
                .select('*, rnd_storage_locations(name)')
                .order('created_at', { ascending: false });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching samples:", error);
            } else if (data) {
                setSamples(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Storage & Samples</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Box size={16} /> Manage Locations
                    </button>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={16} /> Log New Sample
                    </button>
                </div>
            </div>
            
            {loading ? (
                <p>Loading samples...</p>
            ) : samples.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No samples found. Conduct a trial batch and log a sample!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Sample Code</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Quantity</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Location</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {samples.map(sample => (
                                <tr key={sample.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{sample.sample_code}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{sample.quantity} {sample.uom}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{sample.rnd_storage_locations?.name || 'Unassigned'}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
                                            {sample.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: '0.5rem' }}><Edit2 size={16} /></button>
                                        <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RndStorage;
