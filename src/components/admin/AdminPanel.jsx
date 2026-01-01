import React, { useState } from 'react';
import { Upload, Database, Users, PlusCircle, ArrowLeft, Layers, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminDataIngestion from './AdminDataIngestion';
import DataManager from './DataManager';
import UserManagement from './UserManagement';
import ManualEntry from './ManualEntry';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('upload');

    // Matching the Dashboard's "Pill" style navigation
    const tabs = [
        { id: 'upload', label: 'Data Ingestion', icon: Upload },
        { id: 'manager', label: 'Data Manager', icon: Database },
        { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
        { id: 'users', label: 'User Access', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-[#0f1219] text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Top Navigation Bar - Clean & Professional */}
            <div className="bg-[#1a1f2e]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2.5 rounded-lg hover:bg-white/5 transition-all text-slate-400 hover:text-white group border border-transparent hover:border-white/10"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <LayoutGrid size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-wide">
                                    Admin Console
                                </h1>
                                <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">System Management</p>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard-style Pill Tabs */}
                    <div className="flex bg-[#0f1219] p-1.5 rounded-xl border border-white/5">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
                                        ${isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Consistent padding and layout */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[#1a1f2e] border border-white/5 rounded-2xl p-1 shadow-2xl">
                        {activeTab === 'upload' && <AdminDataIngestion />}
                        {activeTab === 'manager' && <DataManager />}
                        {activeTab === 'manual' && <ManualEntry />}
                        {activeTab === 'users' && <UserManagement />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
