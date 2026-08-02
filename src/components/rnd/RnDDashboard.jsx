import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Beaker, ClipboardList, Settings, Plus, Search, ArrowLeft, Leaf } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RndProjects from './RndProjects';
import RndFormulas from './RndFormulas';
import RndIngredients from './RndIngredients';
import RndTrials from './RndTrials';
import RndStorage from './RndStorage';
import RndObservations from './RndObservations';
import { Microscope } from 'lucide-react';

const RnDDashboard = () => {
    const [activeTab, setActiveTab] = useState('projects');
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    // Verify Access
    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
        }
    }, [isAdmin, navigate]);

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                        <FlaskConical size={32} />
                        Research & Development
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Product development, trial formulations, and laboratory tracking.
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/')}
                    className="btn-primary"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                >
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to ERP
                </button>
            </div>

            {/* Sub-navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('projects')}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 1rem',
                        color: activeTab === 'projects' ? '#10b981' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'projects' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer', fontWeight: activeTab === 'projects' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <ClipboardList size={18} /> Projects
                </button>
                <button
                    onClick={() => setActiveTab('formulas')}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 1rem',
                        color: activeTab === 'formulas' ? '#10b981' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'formulas' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer', fontWeight: activeTab === 'formulas' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Beaker size={18} /> Formula Management
                </button>
                <button
                    onClick={() => setActiveTab('ingredients')}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 1rem',
                        color: activeTab === 'ingredients' ? '#10b981' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'ingredients' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer', fontWeight: activeTab === 'ingredients' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Leaf size={18} /> Ingredient DB
                </button>
                <button
                    onClick={() => setActiveTab('trials')}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 1rem',
                        color: activeTab === 'trials' ? '#10b981' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'trials' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer', fontWeight: activeTab === 'trials' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <ClipboardList size={18} /> Trials & Batches
                </button>
                <button
                    onClick={() => setActiveTab('storage')}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 1rem',
                        color: activeTab === 'storage' ? '#10b981' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'storage' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer', fontWeight: activeTab === 'storage' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <FlaskConical size={18} /> Storage & Samples
                </button>
                <button
                    onClick={() => setActiveTab('observations')}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 1rem',
                        color: activeTab === 'observations' ? '#10b981' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'observations' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer', fontWeight: activeTab === 'observations' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Microscope size={18} /> Observations & Labs
                </button>
            </div>

            {/* Content Area */}
            <div className="glass-panel" style={{ padding: '2rem', minHeight: '60vh' }}>
                {activeTab === 'projects' && <RndProjects />}
                {activeTab === 'formulas' && <RndFormulas />}
                {activeTab === 'ingredients' && <RndIngredients />}
                {activeTab === 'trials' && <RndTrials />}
                {activeTab === 'storage' && <RndStorage />}
                {activeTab === 'observations' && <RndObservations />}
            </div>
        </div>
    );
};

export default RnDDashboard;
