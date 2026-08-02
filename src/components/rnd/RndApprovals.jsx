import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CheckCircle, Search, Edit2, ShieldCheck } from 'lucide-react';

const RndApprovals = () => {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApprovals();
    }, []);

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_approvals')
                .select('*, rnd_projects(name), rnd_formula_versions(version_no)')
                .order('created_at', { ascending: false });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching approvals:", error);
            } else if (data) {
                setApprovals(data);
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
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Approval Workflows</h2>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} /> Request Approval
                </button>
            </div>
            
            {loading ? (
                <p>Loading approvals...</p>
            ) : approvals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No approval requests found. Start a commercialization sign-off!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Project</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Formula Version</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Stage</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Approver</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvals.map(appr => (
                                <tr key={appr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{appr.rnd_projects?.name || '-'}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>v{appr.rnd_formula_versions?.version_no || '-'}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{appr.stage}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{appr.approver_name || '-'}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', background: appr.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: appr.status === 'Approved' ? '#10b981' : '#3b82f6' }}>
                                            {appr.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <button style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', marginRight: '0.5rem' }}><CheckCircle size={16} /></button>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={16} /></button>
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

export default RndApprovals;
