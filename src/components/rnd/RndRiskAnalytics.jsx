import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ShieldAlert, Plus, Edit2, Trash2 } from 'lucide-react';

const RndRiskAnalytics = () => {
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRisks();
    }, []);

    const fetchRisks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_risk_assessments')
                .select('*, rnd_projects(name)')
                .order('created_at', { ascending: false });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching risks:", error);
            } else if (data) {
                setRisks(data);
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
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Risk Analytics & Costing</h2>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> New Assessment
                </button>
            </div>
            
            {loading ? (
                <p>Loading assessments...</p>
            ) : risks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No risk assessments found. Create a matrix to evaluate a formula!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Project</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Recommendation</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risks.map(risk => (
                                <tr key={risk.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{risk.rnd_projects?.name || '-'}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{risk.assessment_date}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{risk.overall_score}/100</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', background: risk.recommendation === 'Pass' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: risk.recommendation === 'Pass' ? '#10b981' : '#eab308' }}>
                                            {risk.recommendation}
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

export default RndRiskAnalytics;
