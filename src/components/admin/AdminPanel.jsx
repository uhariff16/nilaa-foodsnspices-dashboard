import React, { useState } from 'react';
import { Upload, Database, Users, PlusCircle, ArrowLeft, Layers, LayoutGrid, Trash2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminDataIngestion from './AdminDataIngestion';
import DataManager from './DataManager';
import AdminUserAccess from './AdminUserAccess';
import AdminCleanup from './AdminCleanup';
import ManualEntry from './ManualEntry';
import AdminSystemSettings from './AdminSystemSettings';
import HumanResources from './HumanResources';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('upload');

    // Matching the Dashboard's "Pill" style navigation
    const tabs = [
        { id: 'upload', label: 'Data Ingestion', icon: Upload },
        { id: 'manager', label: 'Data Manager', icon: Database },
        { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
        { id: 'hr', label: 'Human Resources', icon: Users },
        { id: 'users', label: 'User Access', icon: Users },
        { id: 'cleanup', label: 'Cleanup', icon: Trash2 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#0f1219', color: '#f8fafc', fontFamily: 'var(--font-sans)' }}>
            {/* Top Navigation Bar - Clean & Professional */}
            <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/')}
                            title="Back to Dashboard"
                            style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'white'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '2rem', height: '2rem', background: '#2563eb', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LayoutGrid size={18} color="white" />
                            </div>
                            <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.025em' }}>
                                Admin Console
                            </h1>
                        </div>
                    </div>

                    {/* Dashboard-style Pill Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: isActive ? '#2563eb' : 'transparent',
                                        color: isActive ? 'white' : '#94a3b8'
                                    }}
                                    onMouseEnter={e => !isActive && (e.currentTarget.style.color = 'white')}
                                    onMouseLeave={e => !isActive && (e.currentTarget.style.color = '#94a3b8')}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Consistent padding and layout */}
            <main className="admin-container">
                <div style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                    <div style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        {activeTab === 'upload' && <AdminDataIngestion />}
                        {activeTab === 'manager' && <DataManager />}
                        {activeTab === 'manual' && <ManualEntry />}
                        {activeTab === 'hr' && <HumanResources />}
                        {activeTab === 'users' && <AdminUserAccess />}
                        {activeTab === 'cleanup' && <AdminCleanup />}
                        {activeTab === 'settings' && <AdminSystemSettings />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
