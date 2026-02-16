import React, { useState, useEffect } from 'react';
import { Users, Clock, TrendingUp, DollarSign, UserCheck, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import HRSettings from './HRSettings';
import EmployeeMaster from './EmployeeMaster';
import TimeAttendance from '../TimeAttendance';

const HumanResources = () => {
    const [activeSubTab, setActiveSubTab] = useState('master'); // 'master' | 'attendance' | 'settings'
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        avgRate: 0
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const { data } = await supabase.from('employees').select('hourly_rate, is_active');
        if (data) {
            const active = data.filter(e => e.is_active).length;
            const sum = data.reduce((acc, curr) => acc + (parseFloat(curr.hourly_rate) || 0), 0);
            setStats({
                total: data.length,
                active: active,
                avgRate: data.length > 0 ? Math.round(sum / data.length) : 0
            });
        }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                    <div>
                        <h2 className="admin-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Users color="#a855f7" size={28} />
                            Human Resources
                        </h2>
                        <p className="admin-subtitle" style={{ margin: '0.25rem 0 0 0' }}>Manage personnel records and track work attendance.</p>
                    </div>

                    <div className="btn-toggle-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '0.75rem' }}>
                        <button
                            onClick={() => setActiveSubTab('master')}
                            className={`btn-toggle ${activeSubTab === 'master' ? 'active violet' : ''}`}
                            style={{ '--accent-color': '#a855f7' }}
                        >
                            <Users size={16} />
                            Employee Master
                        </button>
                        <button
                            onClick={() => setActiveSubTab('attendance')}
                            className={`btn-toggle ${activeSubTab === 'attendance' ? 'active orange' : ''}`}
                            style={{ '--accent-color': '#f97316' }}
                        >
                            <Clock size={16} />
                            Attendance Tracking
                        </button>
                        <button
                            onClick={() => setActiveSubTab('settings')}
                            className={`btn-toggle ${activeSubTab === 'settings' ? 'active indigo' : ''}`}
                            style={{ '--accent-color': '#6366f1' }}
                        >
                            <Settings size={16} />
                            HR Settings
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="responsive-grid-3" style={{ gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <Users color="#a855f7" size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Employees</p>
                            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.total}</h4>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <UserCheck color="#10b981" size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Staff</p>
                            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.active}</h4>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <DollarSign color="#f97316" size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg. Hourly Rate</p>
                            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>₹{stats.avgRate}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {activeSubTab === 'master' ? (
                <div className="animate-slide-up">
                    <EmployeeMaster />
                </div>
            ) : activeSubTab === 'attendance' ? (
                <div className="glass-panel animate-slide-up" style={{ padding: '0', background: 'transparent', border: 'none' }}>
                    <TimeAttendance hideBack={true} />
                </div>
            ) : (
                <div className="animate-slide-up">
                    <HRSettings />
                </div>
            )}
        </div>
    );
};

export default HumanResources;
