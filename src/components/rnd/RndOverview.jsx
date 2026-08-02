import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Beaker, ClipboardList, ShieldCheck, Download, Target } from 'lucide-react';

const RndOverview = () => {
    const [stats, setStats] = useState({
        totalProjects: 0,
        activeTrials: 0,
        pendingApprovals: 0,
        completedProjects: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            
            // Fetch total projects
            const { count: totalProjects } = await supabase.from('rnd_projects').select('*', { count: 'exact', head: true });
            
            // Fetch active trials
            const { count: activeTrials } = await supabase.from('rnd_trials').select('*', { count: 'exact', head: true }).in('status', ['Planned', 'In Progress']);
            
            // Fetch pending approvals
            const { count: pendingApprovals } = await supabase.from('rnd_approvals').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
            
            // Fetch completed projects (assuming status 'Completed' exists, or just a placeholder for demo)
            const { count: completedProjects } = await supabase.from('rnd_projects').select('*', { count: 'exact', head: true }).eq('status', 'Completed');

            setStats({
                totalProjects: totalProjects || 0,
                activeTrials: activeTrials || 0,
                pendingApprovals: pendingApprovals || 0,
                completedProjects: completedProjects || 0
            });
        } catch (err) {
            console.error("Error fetching overview stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        alert("Export functionality to PDF/Excel will be triggered here.");
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>R&D Executive Overview</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>High-level analytics and performance metrics for the Research & Development department.</p>
                </div>
                <button onClick={handleExport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
                    <Download size={16} /> Export Executive Report
                </button>
            </div>
            
            {loading ? (
                <p>Loading dashboard analytics...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {/* KPI Cards */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Beaker size={20} color="#3b82f6" /> Total R&D Projects
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{stats.totalProjects}</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                            <ClipboardList size={20} color="#eab308" /> Active Trials
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{stats.activeTrials}</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                            <ShieldCheck size={20} color="#10b981" /> Pending Approvals
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{stats.pendingApprovals}</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Target size={20} color="#8b5cf6" /> Completed Projects
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{stats.completedProjects}</div>
                    </div>
                </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>R&D Pipeline Status</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                        {/* Placeholder for a chart - using simple CSS bars */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <span>Concept Phase</span>
                                <span>60%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '60%', height: '100%', background: '#3b82f6' }}></div>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <span>Trial Phase</span>
                                <span>25%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '25%', height: '100%', background: '#eab308' }}></div>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <span>Commercialization</span>
                                <span>15%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '15%', height: '100%', background: '#10b981' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Recent Activities</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginTop: '6px' }}></div>
                            <div>
                                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>QA Approved Trial NFS001-T2</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>2 hours ago</span>
                            </div>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', marginTop: '6px' }}></div>
                            <div>
                                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Day 30 Observation for NFS002 Due</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Today</span>
                            </div>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px' }}></div>
                            <div>
                                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>New Project NFS003 Created</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yesterday</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RndOverview;
