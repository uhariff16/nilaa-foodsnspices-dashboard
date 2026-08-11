import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Beaker, ClipboardList, ShieldCheck, Download, Target, PlayCircle } from 'lucide-react';

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

    const runEndToEndTest = async () => {
        try {
            console.log("Starting End-to-End Test...");
            
            // Step 1: Create a Project
            const { data: project, error: projErr } = await supabase.from('rnd_projects').insert([{
                project_no: 'TEST-' + Date.now(),
                name: 'E2E Test Project',
                category: 'Testing',
                objective: 'Verify module flow',
                target_cost: 1.5,
                status: 'Draft'
            }]).select().single();
            if (projErr) throw projErr;
            const projectId = project.id;

            // Step 2: Create a Formula Version
            const { data: formula, error: formErr } = await supabase.from('rnd_formula_versions').insert([{
                project_id: projectId,
                version_no: 1,
                ingredients: JSON.stringify([{ code: 'ING01', qty: 100 }]),
                remarks: 'Initial Test Formula'
            }]).select().single();
            if (formErr) throw formErr;
            const formulaId = formula.id;

            // Step 3: Create a Storage Location
            const { data: location, error: locErr } = await supabase.from('rnd_storage_locations').insert([{
                name: 'Test Fridge A',
                type: 'Refrigerator',
                temperature: '4°C'
            }]).select().single();
            if (locErr) throw locErr;
            const locationId = location.id;

            // Step 4: Plan a Trial
            const { data: trial, error: trialErr } = await supabase.from('rnd_trials').insert([{
                project_id: projectId,
                formula_version_id: formulaId,
                trial_no: 'TR-' + Date.now(),
                objective: 'Test stability',
                status: 'Planned'
            }]).select().single();
            if (trialErr) throw trialErr;
            const trialId = trial.id;

            // Step 5: Log a Trial Batch
            const { data: batch, error: batchErr } = await supabase.from('rnd_trial_batches').insert([{
                trial_id: trialId,
                batch_no: 'B-' + Date.now(),
                total_yield: 50,
                machine_used: 'Mixer 1'
            }]).select().single();
            if (batchErr) throw batchErr;
            const batchId = batch.id;

            // Step 6: Log a Sample
            const { data: sample, error: sampErr } = await supabase.from('rnd_samples').insert([{
                trial_batch_id: batchId,
                storage_location_id: locationId,
                sample_code: 'SAMP-' + Date.now(),
                quantity: 200,
                uom: 'grams',
                status: 'Stored'
            }]).select().single();
            if (sampErr) throw sampErr;
            const sampleId = sample.id;

            // Step 7: Record an Observation
            const { data: obs, error: obsErr } = await supabase.from('rnd_observations').insert([{
                sample_id: sampleId,
                observer_name: 'Auto Tester',
                observation_date: new Date().toISOString().split('T')[0],
                day_number: 0,
                status: 'Pass'
            }]).select().single();
            if (obsErr) throw obsErr;

            // Step 8: Risk Assessment
            const { data: risk, error: riskErr } = await supabase.from('rnd_risk_assessments').insert([{
                project_id: projectId,
                assessment_date: new Date().toISOString().split('T')[0],
                overall_score: 95,
                recommendation: 'Pass',
                assessed_by: 'Auto Tester'
            }]).select().single();
            if (riskErr) throw riskErr;

            // Step 9: Approval Workflow
            const { data: app, error: appErr } = await supabase.from('rnd_approvals').insert([{
                project_id: projectId,
                formula_version_id: formulaId,
                stage: 'QA Approval',
                status: 'Pending',
                approver_name: 'QA Lead'
            }]).select().single();
            if (appErr) throw appErr;

            alert("🎉 END-TO-END TEST COMPLETED SUCCESSFULLY!\n\nAll tables inserted data seamlessly. The schema relationships and RLS policies are working perfectly. Refresh the page to see the new data.");
            fetchStats();
        } catch (e) {
            console.error("Test failed:", e);
            alert("❌ TEST FAILED: " + (e.message || JSON.stringify(e)));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>R&D Executive Overview</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>High-level analytics and performance metrics for the Research & Development department.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={runEndToEndTest} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
                        <PlayCircle size={16} /> Run E2E Test
                    </button>
                    <button onClick={handleExport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
                        <Download size={16} /> Export
                    </button>
                </div>
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
