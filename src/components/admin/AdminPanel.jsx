import React, { useState } from 'react';
import { Upload, Database, Users, PlusCircle, ArrowLeft, Layers, LayoutGrid, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminDataIngestion from './AdminDataIngestion';
import DataManager from './DataManager';
import AdminUserAccess from './AdminUserAccess';
import AdminCleanup from './AdminCleanup';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('upload');

    // Matching the Dashboard's "Pill" style navigation
    const tabs = [
        { id: 'upload', label: 'Data Ingestion', icon: Upload },
        { id: 'manager', label: 'Data Manager', icon: Database },
        { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
        { id: 'users', label: 'User Access', icon: Users },
        { id: 'cleanup', label: 'Cleanup', icon: Trash2 },
    ];

    return (
        <div className="min-h-screen bg-[#0f1219] text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Top Navigation Bar - Clean & Professional */}
            <div className="bg-[#1e293b] border-b border-slate-700 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <LayoutGrid size={18} className="text-white" />
                            </div>
                            <h1 className="text-lg font-bold text-white tracking-wide">
                                Admin Console
                            </h1>
                        </div>
                    </div>

                    {/* Dashboard-style Pill Tabs */}
                    <div className="flex items-center gap-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                                    `}
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
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[#1a1f2e] border border-white/5 rounded-2xl p-1 shadow-2xl">
                        {activeTab === 'upload' && <AdminDataIngestion />}
                        {activeTab === 'manager' && <DataManager />}
                        {activeTab === 'manual' && <ManualEntry />}
                        {activeTab === 'users' && <AdminUserAccess />}
                        {activeTab === 'cleanup' && <AdminCleanup />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
