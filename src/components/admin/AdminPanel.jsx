import React, { useState } from 'react';
import { Upload, Database, Users, PlusCircle, ArrowLeft, LayoutGrid, Trash2, Settings, User, LogOut, List, ChevronDown } from 'lucide-react';
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
    const [activeMenu, setActiveMenu] = useState(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const menuGroups = {
        data: {
            label: 'Data & Logistics',
            icon: Database,
            items: [
                { id: 'upload', label: 'Data Ingestion', icon: Upload },
                { id: 'master', label: 'Item Master', icon: List },
                { id: 'manager', label: 'Data Manager', icon: Database },
                { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
                { id: 'cleanup', label: 'Clean-up', icon: Trash2 }
            ]
        },
        people: {
            label: 'People mgmt',
            icon: Users,
            items: [
                { id: 'hr', label: 'Human Resources', icon: Users }
            ]
        },
        settings: {
            label: 'Settings',
            icon: Settings,
            items: [
                { id: 'users', label: 'User Access', icon: User },
                { id: 'settings', label: 'System Settings', icon: Settings }
            ]
        }
    };

    const DropdownMenu = ({ groupKey, config }) => {
        const Icon = config.icon;
        const isOpen = activeMenu === groupKey;
        const hasActiveTab = config.items.some(item => item.id === activeTab);
        const activeItemLabel = config.items.find(item => item.id === activeTab)?.label;

        return (
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => setActiveMenu(isOpen ? null : groupKey)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', borderRadius: '0.75rem',
                        fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s', border: '1px solid ' + (hasActiveTab ? 'rgba(37, 99, 235, 0.4)' : 'transparent'),
                        cursor: 'pointer', background: hasActiveTab ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        color: hasActiveTab ? '#60a5fa' : '#94a3b8'
                    }}
                    onMouseEnter={e => !hasActiveTab && (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => !hasActiveTab && (e.currentTarget.style.color = '#94a3b8')}
                >
                    <Icon size={18} />
                    <span>{config.label}</span>
                    <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute', top: '120%', left: 0, minWidth: '220px',
                        background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1rem',
                        padding: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                        zIndex: 100, animation: 'slideDown 0.2s ease-out'
                    }}>
                        {config.items.map(item => {
                            const ItemIcon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setActiveMenu(null);
                                    }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 1rem', borderRadius: '0.6rem', fontSize: '0.85rem',
                                        fontWeight: 500, border: 'none', cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.15s',
                                        background: isActive ? '#2563eb' : 'transparent',
                                        color: isActive ? 'white' : '#cbd5e1'
                                    }}
                                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                                >
                                    <ItemIcon size={16} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Top Navigation Bar - Clean & Professional */}
            <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '85rem', margin: '0 auto', padding: '0 1.5rem', height: '4.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button
                            onClick={() => navigate('/')}
                            title="Back to Dashboard"
                            style={{ padding: '0.6rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ width: '2.2rem', height: '2.2rem', background: '#2563eb', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}>
                                <LayoutGrid size={18} color="white" />
                            </div>
                            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                                Admin Console
                            </h1>
                        </div>

                        {/* Dropdown Menus */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <DropdownMenu groupKey="data" config={menuGroups.data} />
                            <DropdownMenu groupKey="people" config={menuGroups.people} />
                            <DropdownMenu groupKey="settings" config={menuGroups.settings} />
                        </div>
                    </div>

                    {/* User Profile & Logout - Matching Dashboard Style */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.4rem 1rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.75rem',
                        }}>
                            <div style={{
                                width: '2.1rem',
                                height: '2.1rem',
                                borderRadius: '0.6rem',
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
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                    {user?.email?.split('@')[0] || 'Admin'}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                    {role || 'Administrator'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            title="Logout"
                            style={{
                                width: '2.5rem', height: '2.5rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Consistent padding and layout */}
            <main className="admin-container" style={{ padding: '2rem 1.5rem' }}>
                <div style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                    <div style={{ 
                        background: 'rgba(26, 31, 46, 0.8)', 
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: '1.25rem', 
                        padding: '2rem', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                    }}>
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
