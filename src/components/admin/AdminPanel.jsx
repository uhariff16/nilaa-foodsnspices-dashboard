import React, { useState } from 'react';
import { Upload, Database, Users, PlusCircle, ArrowLeft, LayoutGrid, Trash2, Settings, User, LogOut, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminDataIngestion from './AdminDataIngestion';
import DataManager from './DataManager';
import AdminUserAccess from './AdminUserAccess';
import AdminCleanup from './AdminCleanup';
import ManualEntry from './ManualEntry';
import AdminSystemSettings from './AdminSystemSettings';
import HumanResources from './HumanResources';
import ItemMaster from './ItemMaster';

const AdminPanel = () => {
    const navigate = useNavigate();
    const { logout, user, role } = useAuth();
    const [activeTab, setActiveTab] = useState('upload');

    // Matching the Dashboard's "Pill" style navigation
    const tabs = [
        { id: 'upload', label: 'Data Ingestion', icon: Upload },
        { id: 'master', label: 'Item Master', icon: List },
        { id: 'manager', label: 'Data Manager', icon: Database },
        { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
        { id: 'hr', label: 'Human Resources', icon: Users },
        { id: 'users', label: 'User Access', icon: Users },
        { id: 'cleanup', label: 'Cleanup', icon: Trash2 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
            {/* Top Navigation Bar - Clean & Professional */}
            <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/')}
                            title="Back to Dashboard"
                            style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'white'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '2rem', height: '2rem', background: '#2563eb', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LayoutGrid size={18} color="white" />
                            </div>
                            <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '0.025em' }}>
                                Admin Console
                            </h1>
                        </div>
                    </div>

                    {/* Grouped Pill Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Group 1: Data & Logistics */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.35rem' }}>Data</span>
                            {[
                                { id: 'upload', label: 'Ingestion', icon: Upload },
                                { id: 'master', label: 'Item Master', icon: List },
                                { id: 'manager', label: 'Manager', icon: Database },
                                { id: 'manual', label: 'Manual', icon: PlusCircle },
                                { id: 'cleanup', label: 'Clean-up', icon: Trash2 }
                            ].map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '0.50rem',
                                            fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                                            background: isActive ? '#2563eb' : 'transparent', color: isActive ? 'white' : '#94a3b8'
                                        }}
                                        onMouseEnter={e => !isActive && (e.currentTarget.style.color = 'white')}
                                        onMouseLeave={e => !isActive && (e.currentTarget.style.color = '#94a3b8')}
                                    >
                                        <Icon size={14} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Group 2: People mgmt */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.35rem' }}>People</span>
                            <button
                                onClick={() => setActiveTab('hr')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '0.50rem',
                                    fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'hr' ? '#2563eb' : 'transparent', color: activeTab === 'hr' ? 'white' : '#94a3b8'
                                }}
                            >
                                <Users size={14} />
                                <span>Human Resources</span>
                            </button>
                        </div>

                        <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Group 3: Settings */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.35rem' }}>Settings</span>
                            <button
                                onClick={() => setActiveTab('users')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '0.50rem',
                                    fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'users' ? '#2563eb' : 'transparent', color: activeTab === 'users' ? 'white' : '#94a3b8'
                                }}
                            >
                                <User size={14} />
                                <span>User Access</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '0.50rem',
                                    fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'settings' ? '#2563eb' : 'transparent', color: activeTab === 'settings' ? 'white' : '#94a3b8'
                                }}
                            >
                                <Settings size={14} />
                                <span>System</span>
                            </button>
                        </div>
                    </div>

                    {/* User Profile & Logout - Matching Dashboard Style */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.35rem 0.75rem',
                            background: 'var(--glass-highlight)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '0.75rem',
                        }}>
                            <div style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(37, 99, 235, 0.1)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#3b82f6'
                            }}>
                                <User size={16} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                    {user?.email?.split('@')[0] || 'Admin'}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {role || 'Administrator'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            title="Logout"
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Consistent padding and layout */}
            <main className="admin-container">
                <div style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                    <div style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        {activeTab === 'upload' && <AdminDataIngestion />}
                        {activeTab === 'master' && <ItemMaster />}
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
