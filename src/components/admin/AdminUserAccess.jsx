import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, UserPlus, Trash2, Mail, Shield, AlertCircle, CheckCircle, RefreshCw, X, Eye, Crown, Activity, DollarSign, LayoutDashboard, ChevronDown, ChevronRight, Lock, Unlock, Settings, Factory, ShoppingCart, Layers, Users as UsersIcon, Calculator, TrendingUp, Target, Clock, Wallet, Edit, Edit2, Save } from 'lucide-react';

const initialPermissions = {
    dashboard: {
        overview: true,
        sales: false,
        expenses: false,
        procurement: false,
        stock: false,
        production: false,
        insights: false,
        simulator: false,
        ytd: false,
        profitHub: false
    },
    attendance: {
        tracking: { read: false, write: false, delete: false, bulk: false },
        payouts: { read: false, write: false, delete: false },
        salaries: { read: false, write: false, delete: false }
    },
    payouts: false
};

const getRolePermissions = (role) => {
    const p = JSON.parse(JSON.stringify(initialPermissions));
    if (role === 'admin') {
        Object.keys(p.dashboard).forEach(k => p.dashboard[k] = true);
        Object.keys(p.attendance).forEach(k => {
            if (typeof p.attendance[k] === 'object') {
                Object.keys(p.attendance[k]).forEach(sub => p.attendance[k][sub] = true);
            } else {
                p.attendance[k] = true;
            }
        });
        p.payouts = true;
    } else if (role === 'executive') {
        p.dashboard.overview = true;
        p.dashboard.sales = true;
        p.dashboard.expenses = true;
        p.dashboard.procurement = true;
        p.dashboard.stock = true;
        p.dashboard.production = true;
        p.dashboard.insights = true;
        p.dashboard.simulator = true;
    } else if (role === 'attendance_manager') {
        p.dashboard.overview = true;
        p.attendance.tracking = { read: true, write: true, delete: true, bulk: true };
        p.attendance.payouts = { read: true, write: true, delete: true };
        p.attendance.salaries = { read: true, write: true, delete: true };
    } else if (role === 'data_entry') {
        p.dashboard.overview = true;
        p.attendance.tracking = { read: true, write: true, delete: false, bulk: false };
    } else if (role === 'financial_controller') {
        p.dashboard.overview = true;
        p.dashboard.sales = true;
        p.dashboard.expenses = true;
        p.attendance.tracking = { read: true, write: true, delete: false, bulk: false };
        p.attendance.payouts = { read: true, write: true, delete: true };
        p.attendance.salaries = { read: true, write: true, delete: true };
        p.payouts = true;
    }
    return p;
};

const PermissionMatrix = ({ permissions, onChange, disabled = false }) => {
    const toggle = (section, key = null, subKey = null) => {
        if (disabled) return;
        const newPerms = { ...permissions };
        if (subKey) {
            newPerms[section][key][subKey] = !newPerms[section][key][subKey];
        } else if (key) {
            if (typeof newPerms[section][key] === 'object') {
                // Toggle entire object (all true or all false)
                const currentState = Object.values(newPerms[section][key]).some(v => v);
                Object.keys(newPerms[section][key]).forEach(sub => newPerms[section][key][sub] = !currentState);
            } else {
                newPerms[section][key] = !newPerms[section][key];
            }
        } else {
            newPerms[section] = !newPerms[section];
        }
        onChange(newPerms);
    };

    const sectionStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1rem'
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '0.75rem',
        marginTop: '1rem'
    };

    const toggleBtnStyle = (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 0.8rem',
        borderRadius: '0.5rem',
        border: '1px solid',
        borderColor: active ? 'rgba(59, 130, 246, 0.3)' : 'var(--glass-border)',
        background: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        color: active ? '#60a5fa' : 'var(--text-secondary)',
        fontSize: '0.85rem',
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled && !active ? 0.3 : 1
    });

    const mergedPerms = {
        ...initialPermissions,
        ...permissions,
        dashboard: { ...initialPermissions.dashboard, ...(permissions?.dashboard || {}) },
        attendance: { ...initialPermissions.attendance, ...(permissions?.attendance || {}) }
    };

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} /> Granular Permissions Matrix
            </div>

            {/* Dashboard Section */}
            <div style={sectionStyle}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dashboard Tabs</div>
                <div style={gridStyle}>
                    {[
                        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
                        { id: 'sales', label: 'Sales', icon: <DollarSign size={14} /> },
                        { id: 'expenses', label: 'Expenses', icon: <DollarSign size={14} /> },
                        { id: 'procurement', label: 'Procurement', icon: <ShoppingCart size={14} /> },
                        { id: 'stock', label: 'Stock', icon: <Layers size={14} /> },
                        { id: 'production', label: 'Production', icon: <Factory size={14} /> },
                        { id: 'insights', label: 'Customer', icon: <UsersIcon size={14} /> },
                        { id: 'simulator', label: 'Simulator', icon: <Calculator size={14} /> },
                        { id: 'ytd', label: 'YTD Analysis', icon: <TrendingUp size={14} /> },
                        { id: 'profitHub', label: 'Profit Hub', icon: <Target size={14} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => toggle('dashboard', tab.id)}
                            style={toggleBtnStyle(mergedPerms.dashboard?.[tab.id])}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Attendance Section */}
            <div style={sectionStyle}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time & Attendance Tabs</div>
                <div style={{ ...gridStyle, gridTemplateColumns: '1fr' }}>
                    {[
                        { id: 'tracking', label: 'Tracking', icon: <Clock size={14} />, sub: ['read', 'write', 'delete', 'bulk'] },
                        { id: 'payouts', label: 'Payouts', icon: <DollarSign size={14} />, sub: ['read', 'write', 'delete'] },
                        { id: 'salaries', label: 'Salaries', icon: <Wallet size={14} />, sub: ['read', 'write', 'delete'] }
                    ].map(tab => {
                        const isActive = typeof mergedPerms.attendance?.[tab.id] === 'object' ? Object.values(mergedPerms.attendance[tab.id]).some(v => v) : !!mergedPerms.attendance?.[tab.id];
                        return (
                            <div key={tab.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <button
                                        type="button"
                                        onClick={() => toggle('attendance', tab.id)}
                                        style={{ ...toggleBtnStyle(isActive), width: 'auto', flex: 1 }}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                </div>
                                {isActive && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: '2rem' }}>
                                        {tab.sub.map(sub => (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => toggle('attendance', tab.id, sub)}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    fontSize: '0.7rem',
                                                    borderRadius: '0.4rem',
                                                    border: '1px solid',
                                                    fontWeight: 600,
                                                    textTransform: 'capitalize',
                                                    background: mergedPerms.attendance?.[tab.id]?.[sub] ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                                    color: mergedPerms.attendance?.[tab.id]?.[sub] ? '#10b981' : 'var(--text-secondary)',
                                                    borderColor: mergedPerms.attendance?.[tab.id]?.[sub] ? '#10b981' : 'var(--glass-border)',
                                                    cursor: disabled ? 'default' : 'pointer'
                                                }}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Global Modules */}
            <div style={sectionStyle}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Global Access</div>
                <div style={gridStyle}>
                    <button
                        type="button"
                        onClick={() => toggle('payouts')}
                        style={toggleBtnStyle(mergedPerms.payouts)}
                    >
                        <DollarSign size={14} />
                        Profit Distribution Hub
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminUserAccess = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Add User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('viewer');
    const [userPermissions, setUserPermissions] = useState(initialPermissions);

    // Edit Permissions Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const ROLES = [
        { id: 'admin', label: 'Master Admin', desc: 'Full access to all modules and settings' },
        { id: 'executive', label: 'Dashboard Executive', desc: 'View main Dashboard only' },
        { id: 'attendance_manager', label: 'Attendance Manager', desc: 'Full Time & Attendance control' },
        { id: 'data_entry', label: 'Data Entry Operator', desc: 'Add logs; cannot delete/edit without approval' },
        { id: 'financial_controller', label: 'Financial Controller', desc: 'View Dashboard, Payouts, and Salaries' },
        { id: 'viewer', label: 'Custom Viewer', desc: 'Manually configure access permissions' }
    ];

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            const cleanedData = (data || []).map(u => {
                const fetchedPerms = u.permissions || {};
                const mergedPerms = {
                    ...initialPermissions,
                    ...fetchedPerms,
                    dashboard: { ...initialPermissions.dashboard, ...(fetchedPerms.dashboard || {}) },
                    attendance: { ...initialPermissions.attendance, ...(fetchedPerms.attendance || {}) }
                };

                return {
                    ...u,
                    role: u.role === 'power_user' ? 'viewer' : u.role,
                    permissions: mergedPerms
                };
            });
            setUsers(cleanedData);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleSelect = (roleId) => {
        setNewUserRole(roleId);
        setUserPermissions(getRolePermissions(roleId));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: 'idle', message: '' });

        try {
            const { data: existing } = await supabase.from('user_roles').select('id').eq('email', newUserEmail).single();
            if (existing) throw new Error("User with this email already exists.");

            // Flatten permissions for legacy column support if needed, but primary is permissions JSON
            const legacyFields = {
                can_access_attendance: Object.values(userPermissions.attendance).some(v => v),
                can_access_payouts: userPermissions.payouts,
                can_view_dashboard: Object.values(userPermissions.dashboard).some(v => v),
                can_manage_users: newUserRole === 'admin'
            };

            const { error } = await supabase.from('user_roles').insert([{
                email: newUserEmail.toLowerCase(),
                role: newUserRole,
                permissions: userPermissions,
                ...legacyFields
            }]);

            if (error) throw error;

            setStatus({ type: 'success', message: `Access granted to ${newUserEmail}.` });
            setNewUserEmail('');
            setNewUserRole('viewer');
            setUserPermissions(initialPermissions);
            fetchUsers();
        } catch (error) {
            console.error("Add Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const changeUserRole = async (user, newRole) => {
        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        try {
            const newPerms = getRolePermissions(newRole);
            const { error } = await supabase.from('user_roles').update({
                role: newRole,
                permissions: newPerms,
                can_access_attendance: Object.values(newPerms.attendance).some(v => v),
                can_access_payouts: newPerms.payouts,
                can_view_dashboard: Object.values(newPerms.dashboard).some(v => v),
                can_manage_users: newRole === 'admin'
            }).eq('id', user.id);
            if (error) throw error;
            fetchUsers();
            setStatus({ type: 'success', message: `Role updated for ${user.email}.` });
        } catch (error) {
            console.error("Update Error:", error);
            setStatus({ type: 'error', message: "Failed to update role." });
        } finally {
            setLoading(false);
        }
    };

    const handleEditPermissions = (user) => {
        setEditingUser({ ...user });
        setIsEditing(true);
    };

    const handleSavePermissions = async () => {
        if (!editingUser) return;
        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        try {
            const { error } = await supabase.from('user_roles').update({
                permissions: editingUser.permissions,
                can_access_attendance: Object.values(editingUser.permissions.attendance).some(v => v),
                can_access_payouts: editingUser.permissions.payouts,
                can_view_dashboard: Object.values(editingUser.permissions.dashboard).some(v => v)
            }).eq('id', editingUser.id);

            if (error) throw error;
            
            setStatus({ type: 'success', message: `Permissions updated for ${editingUser.email}.` });
            setIsEditing(false);
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error("Save Error:", error);
            setStatus({ type: 'error', message: "Failed to save permissions." });
        } finally {
            setLoading(false);
        }
    };

    const removeUser = async (id, email) => {
        if (!window.confirm(`Are you sure you want to revoke access for ${email}?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('user_roles').delete().eq('id', id);
            if (error) throw error;
            fetchUsers();
            setStatus({ type: 'info', message: "Access revoked successfully." });
        } catch (error) {
            console.error("Delete Error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0.5rem' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>User Access & Permissions</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Manage stakeholder access and granular module permissions.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={fetchUsers} className="btn-icon" title="Refresh User List" style={{ background: 'var(--glass-highlight)' }}>
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Grant Access Form */}
            <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                        <UserPlus size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Invite User / Grant Access</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign a role and refine specific permissions.</p>
                    </div>
                </div>

                <form onSubmit={handleAddUser}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    required
                                    type="email"
                                    placeholder="user@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '0.75rem',
                                        background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Predetermined Role</label>
                            <div style={{ position: 'relative' }}>
                                <Shield size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <select
                                    value={newUserRole}
                                    onChange={(e) => handleRoleSelect(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '0.75rem',
                                        background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white',
                                        fontSize: '0.9rem', appearance: 'none', cursor: 'pointer', outline: 'none'
                                    }}
                                >
                                    {ROLES.map(r => <option key={r.id} value={r.id} style={{ background: '#1e293b', color: 'white' }}>{r.label}</option>)}
                                </select>
                                <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    </div>

                    <PermissionMatrix
                        permissions={userPermissions}
                        onChange={setUserPermissions}
                        disabled={newUserRole === 'admin'}
                    />

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button disabled={loading} className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Shield size={18} />}
                            Grant Access
                        </button>
                    </div>
                </form>

                {status.message && (
                    <div className={`animate-fade-in`} style={{
                        marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem',
                        background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        color: status.type === 'success' ? '#10b981' : '#ef4444'
                    }}>
                        {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{status.message}</span>
                    </div>
                )}
            </section>

            {/* Current Active Users */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                        <UsersIcon size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Manage Active Users ({users.length})</h3>
                </div>

                <div className="glass-panel" style={{ border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>User Details</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Assigned Role</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Permissions Summary</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="table-row-hover">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(45deg, #3b82f6, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                                                {user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Added on {new Date(user.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <select
                                            className="custom-select"
                                            value={user.role}
                                            onChange={(e) => changeUserRole(user, e.target.value)}
                                            style={{
                                                padding: '0.4rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.85rem',
                                                cursor: 'pointer', outline: 'none'
                                            }}
                                        >
                                            {ROLES.map(r => <option key={r.id} value={r.id} style={{ background: '#1e293b', color: 'white' }}>{r.label}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                            {/* Summary Badges */}
                                            {user.role === 'admin' ? (
                                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '1rem', fontWeight: 700 }}>SUPER ADMIN</span>
                                            ) : (
                                                <>
                                                    {(user.permissions?.dashboard && Object.entries(user.permissions.dashboard).some(([_, v]) => v)) && (
                                                        <span title="Has Dashboard Access" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '1rem', fontWeight: 600 }}>Dashboard</span>
                                                    )}
                                                    {(user.permissions?.attendance && Object.entries(user.permissions.attendance).some(([_, v]) => v)) && (
                                                        <span title="Has Attendance Access" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '1rem', fontWeight: 600 }}>Attendance</span>
                                                    )}
                                                    {user.permissions?.payouts && (
                                                        <span title="Has Payouts Access" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '1rem', fontWeight: 600 }}>Payouts</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEditPermissions(user)}
                                                className="btn-icon"
                                                style={{ color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.05)', height: '32px', width: '32px' }}
                                                title="Edit Permissions"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => removeUser(user.id, user.email)}
                                                className="btn-icon"
                                                style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', height: '32px', width: '32px' }}
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Edit Permissions Modal */}
            {isEditing && editingUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div className="glass-panel" style={{
                        maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
                        padding: '2rem', border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Permissions</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{editingUser.email}</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsEditing(false); setEditingUser(null); }} className="btn-icon">
                                <X size={20} />
                            </button>
                        </div>

                        <PermissionMatrix
                            permissions={editingUser.permissions}
                            onChange={(p) => setEditingUser({ ...editingUser, permissions: p })}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <button
                                onClick={() => { setIsEditing(false); setEditingUser(null); }}
                                style={{
                                    padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'transparent',
                                    border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={loading}
                                style={{
                                    padding: '0.75rem 2rem', borderRadius: '0.5rem', background: 'var(--accent-primary)',
                                    border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    boxShadow: '0 4px 12px var(--accent-glow)'
                                }}
                            >
                                {loading && <RefreshCw size={18} className="animate-spin" />}
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserAccess;
