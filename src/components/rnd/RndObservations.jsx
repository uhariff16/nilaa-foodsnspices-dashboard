import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Search, Edit2, Trash2, Microscope, FileText } from 'lucide-react';

const RndObservations = () => {
    const [observations, setObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('observations');

    useEffect(() => {
        fetchObservations();
    }, []);

    const fetchObservations = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_observations')
                .select('*, rnd_samples(sample_code)')
                .order('observation_date', { ascending: false });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching observations:", error);
            } else if (data) {
                setObservations(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Observations & Labs</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setActiveTab('observations')} className={activeTab === 'observations' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Microscope size={16} /> Sensory Observations
                    </button>
                    <button onClick={() => setActiveTab('labs')} className={activeTab === 'labs' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} /> Lab Requests & COAs
                    </button>
                </div>
            </div>
            
            {activeTab === 'observations' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={16} /> Log Observation
                        </button>
                    </div>

                    {loading ? (
                        <p>Loading observations...</p>
                    ) : observations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <p>No observations found. Start tracking shelf-life today!</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Sample</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Day No.</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Observer</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {observations.map(obs => (
                                        <tr key={obs.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem 1rem' }}>{obs.observation_date}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{obs.rnd_samples?.sample_code}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>Day {obs.day_number}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{obs.observer_name}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', background: obs.status === 'Fail' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: obs.status === 'Fail' ? '#ef4444' : '#10b981' }}>
                                                    {obs.status}
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
                </>
            )}

            {activeTab === 'labs' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={16} /> New Lab Request
                        </button>
                    </div>
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <p>No lab requests found. Submit a sample for analysis!</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RndObservations;
