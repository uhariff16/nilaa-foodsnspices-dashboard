import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const RndTrials = () => {
    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrials();
    }, []);

    const fetchTrials = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_trials')
                .select('*, rnd_projects(name)')
                .order('created_at', { ascending: false });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching trials:", error);
            } else if (data) {
                setTrials(data);
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
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Trials & Trial Batches</h2>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Plan New Trial
                </button>
            </div>
            
            {loading ? (
                <p>Loading trials...</p>
            ) : trials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No trials found. Plan your first R&D trial!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Project</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Trial No</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Objective</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trials.map(trial => (
                                <tr key={trial.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem' }}>{trial.rnd_projects?.name || '-'}</td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{trial.trial_no}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{trial.objective}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                            {trial.status}
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

export default RndTrials;
