import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Settings, Plus, Trash2, Layout, Briefcase, RefreshCw, Clock, DollarSign, TrendingUp } from 'lucide-react';

const HRSettings = () => {
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [payrollConfig, setPayrollConfig] = useState({
        standard_daily_hours: 8,
        ot_multiplier: 1.5,
        default_hourly_rate: 100
    });
    const [loading, setLoading] = useState(false);
    const [newDept, setNewDept] = useState('');
    const [newRole, setNewRole] = useState('');

    useEffect(() => {
        fetchData();
        fetchPayrollConfig();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: deptData } = await supabase.from('departments').select('*').order('name');
        const { data: roleData } = await supabase.from('roles').select('*').order('name');
        setDepartments(deptData || []);
        setRoles(roleData || []);
        setLoading(false);
    };

    const fetchPayrollConfig = async () => {
        const { data } = await supabase.from('payroll_config').select('*').eq('id', 1).single();
        if (data) {
            setPayrollConfig({
                standard_daily_hours: data.standard_daily_hours,
                ot_multiplier: data.ot_multiplier,
                default_hourly_rate: data.default_hourly_rate
            });
        }
    };

    const updatePayrollConfig = async (field, value) => {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return;

        const updated = { ...payrollConfig, [field]: numVal };
        setPayrollConfig(updated);

        const { error } = await supabase
            .from('payroll_config')
            .upsert({ id: 1, ...updated });

        if (error) console.error("Update Config Error:", error);
    };

    const addDepartment = async (e) => {
        e.preventDefault();
        if (!newDept.trim()) return;
        const { error } = await supabase.from('departments').insert([{ name: newDept.trim() }]);
        if (error) alert(error.message);
        else {
            setNewDept('');
            fetchData();
        }
    };

    const addRole = async (e) => {
        e.preventDefault();
        if (!newRole.trim()) return;
        const { error } = await supabase.from('roles').insert([{ name: newRole.trim() }]);
        if (error) alert(error.message);
        else {
            setNewRole('');
            fetchData();
        }
    };

    const deleteItem = async (table, id) => {
        if (!window.confirm(`Delete this ${table.slice(0, -1)}? This might affect existing employee records.`)) return;
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    };

    return (
        <div className="animate-slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Settings size={24} color="#6366f1" />
                        HR Settings & Master Data
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure payroll rules and organizational master data.</p>
                </div>
                <button onClick={() => { fetchData(); fetchPayrollConfig(); }} className="btn-icon">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Payroll Configuration Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <DollarSign size={18} color="#10b981" />
                    Global Payroll Configuration
                </h3>
                <div className="responsive-grid-3" style={{ gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <Clock size={16} color="#3b82f6" />
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Standard Daily Hours</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="number"
                                value={payrollConfig.standard_daily_hours}
                                onChange={(e) => updatePayrollConfig('standard_daily_hours', e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', width: '80px', fontWeight: 'bold', fontSize: '1.1rem' }}
                            />
                            <span style={{ fontWeight: 600 }}>Hrs</span>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Hours before OT kicks in.</p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <TrendingUp size={16} color="#f59e0b" />
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overtime Multiplier</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="number"
                                step="0.1"
                                value={payrollConfig.ot_multiplier}
                                onChange={(e) => updatePayrollConfig('ot_multiplier', e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#f59e0b', padding: '0.5rem', borderRadius: '0.4rem', width: '80px', fontWeight: 'bold', fontSize: '1.1rem' }}
                            />
                            <span style={{ fontWeight: 600 }}>x</span>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Multiplier for extra hours.</p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <DollarSign size={16} color="#10b981" />
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Default Hourly Rate</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: 'bold' }}>₹</span>
                            <input
                                type="number"
                                value={payrollConfig.default_hourly_rate}
                                onChange={(e) => updatePayrollConfig('default_hourly_rate', e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#10b981', padding: '0.5rem', borderRadius: '0.4rem', width: '100px', fontWeight: 'bold', fontSize: '1.1rem' }}
                            />
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Base rate if not set for staff.</p>
                    </div>
                </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '2rem' }}>
                {/* Departments Management */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                        <Layout size={18} color="#3b82f6" />
                        Departments
                    </h3>
                    <form onSubmit={addDepartment} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            value={newDept}
                            onChange={(e) => setNewDept(e.target.value)}
                            placeholder="Add new department..."
                            style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: '#fff' }}
                        />
                        <button type="submit" className="btn-icon" style={{ background: '#3b82f6', color: '#fff' }}>
                            <Plus size={20} />
                        </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {departments.map(dept => (
                            <div key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }}>
                                <span style={{ fontWeight: 500 }}>{dept.name}</span>
                                <button onClick={() => deleteItem('departments', dept.id)} className="btn-icon" style={{ padding: '0.25rem' }}>
                                    <Trash2 size={14} color="#ef4444" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Roles Management */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                        <Briefcase size={18} color="#10b981" />
                        Job Roles
                    </h3>
                    <form onSubmit={addRole} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            placeholder="Add new role..."
                            style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: '#fff' }}
                        />
                        <button type="submit" className="btn-icon" style={{ background: '#10b981', color: '#fff' }}>
                            <Plus size={20} />
                        </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {roles.map(role => (
                            <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }}>
                                <span style={{ fontWeight: 500 }}>{role.name}</span>
                                <button onClick={() => deleteItem('roles', role.id)} className="btn-icon" style={{ padding: '0.25rem' }}>
                                    <Trash2 size={14} color="#ef4444" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRSettings;
