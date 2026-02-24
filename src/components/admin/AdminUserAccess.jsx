import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, UserPlus, Trash2, Mail, Shield, AlertCircle, CheckCircle, RefreshCw, X, Eye, Crown } from 'lucide-react';

const AdminUserAccess = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Add User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('viewer'); // 'viewer' | 'admin' | 'power_user'
    const [permissions, setPermissions] = useState({
        overview: true,
        sales: false,
        expenses: false,
        procurement: false,
        stock: false,
        production: false,
        customers: false,
        simulator: false,
        attendance: false
    });

    const ALL_TABS = [
        { id: 'overview', label: 'Overview' },
        { id: 'sales', label: 'Sales' },
        { id: 'expenses', label: 'Expenses' },
        { id: 'procurement', label: 'Procurement' },
        { id: 'stock', label: 'Stock' },
        { id: 'production', label: 'Production' },
        { id: 'customers', label: 'Customers' },
        { id: 'simulator', label: 'Simulator' },
        { id: 'attendance', label: 'Attendance' }
    ];

    const handleRoleChange = (role) => {
        setNewUserRole(role);
        if (role === 'admin') {
            setPermissions(Object.fromEntries(ALL_TABS.map(t => [t.id, true])));
        } else if (role === 'power_user') {
            setPermissions(Object.fromEntries(ALL_TABS.map(t => [t.id, true])));
        } else {
            setPermissions({
                overview: true,
                sales: false, expenses: false, procurement: false,
                stock: false, production: false, customers: false,
                simulator: false, attendance: false
            });
        }
    };

    const togglePermission = (id) => {
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: 'idle', message: '' });

        try {
            const { data: existing } = await supabase.from('user_roles').select('id').eq('email', newUserEmail).single();
            if (existing) throw new Error("User with this email already exists.");

            const { error } = await supabase.from('user_roles').insert([{
                email: newUserEmail,
                role: newUserRole,
                permissions: permissions,
                can_access_attendance: permissions.attendance
            }]);

            if (error) throw error;

            setStatus({ type: 'success', message: `Access granted to ${newUserEmail}.` });
            setNewUserEmail('');
            setPermissions({
                overview: true,
                sales: false, expenses: false, procurement: false,
                stock: false, production: false, customers: false,
                simulator: false, attendance: false
            });
            fetchUsers();
        } catch (error) {
            console.error("Add Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (email) => {
        if (!window.confirm(`Are you sure you want to remove access for ${email}?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('user_roles').delete().eq('email', email);
            if (error) throw error;
            setStatus({ type: 'success', message: "User access revoked." });
            fetchUsers();
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendanceAccess = async (user) => {
        setLoading(true);
        try {
            const newPermissions = { ...user.permissions, attendance: !user.can_access_attendance };
            const { error } = await supabase
                .from('user_roles')
                .update({
                    can_access_attendance: !user.can_access_attendance,
                    permissions: newPermissions
                })
                .eq('email', user.email);

            if (error) throw error;
            setStatus({ type: 'success', message: "Permission updated." });
            fetchUsers();
        } catch (error) {
            console.error("Update Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="admin-wrapper" style={{ minHeight: '600px' }}>
            <div className="admin-header">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'inline-flex' }}>
                        <Users color="#3b82f6" size={32} />
                    </div>

                    <div>
                        <h2 className="admin-title">
                            User Access Management
                        </h2>
                        <p className="admin-subtitle">Control who has access to the dashboard and data.</p>
                    </div>
                </div>
            </div>

            <div className="admin-grid">
                {/* Grant Access Card - Clean & Solid */}
                <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.375rem', color: '#60a5fa' }}>
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Invite Team Member</h3>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Grant access via email address.</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Email Input */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#64748b' }} size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={newUserEmail}
                                        onChange={e => setNewUserEmail(e.target.value)}
                                        placeholder="colleague@example.com"
                                        style={{ width: '100%', background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.625rem 1rem 0.625rem 2.5rem', color: 'white', outline: 'none', transition: 'border 0.2s', fontSize: '0.875rem' }}
                                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Assign Role</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleRoleChange('viewer')}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', transition: 'all 0.2s', border: newUserRole === 'viewer' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)', background: newUserRole === 'viewer' ? '#2563eb' : '#0f1219', color: 'white', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Viewer</span>
                                            {newUserRole === 'viewer' && <CheckCircle size={14} />}
                                        </div>
                                        <div style={{ fontSize: '0.625rem', color: newUserRole === 'viewer' ? '#bfdbfe' : '#64748b' }}>Limited access</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleRoleChange('power_user')}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', transition: 'all 0.2s', border: newUserRole === 'power_user' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)', background: newUserRole === 'power_user' ? '#2563eb' : '#0f1219', color: 'white', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Power User</span>
                                            {newUserRole === 'power_user' && <CheckCircle size={14} />}
                                        </div>
                                        <div style={{ fontSize: '0.625rem', color: newUserRole === 'power_user' ? '#bfdbfe' : '#64748b' }}>Deep data access</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleRoleChange('admin')}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', transition: 'all 0.2s', border: newUserRole === 'admin' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)', background: newUserRole === 'admin' ? '#2563eb' : '#0f1219', color: 'white', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Admin</span>
                                            {newUserRole === 'admin' && <CheckCircle size={14} />}
                                        </div>
                                        <div style={{ fontSize: '0.625rem', color: newUserRole === 'admin' ? '#bfdbfe' : '#64748b' }}>Full system access</div>
                                    </button>
                                </div>
                            </div>

                            {/* [NEW] Tab-Level Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Granular Tab Access</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', background: '#0f1219', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {ALL_TABS.map(tab => (
                                        <div
                                            key={tab.id}
                                            onClick={() => newUserRole !== 'admin' && togglePermission(tab.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.35rem 0.5rem',
                                                background: permissions[tab.id] ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                                border: '1px solid',
                                                borderColor: permissions[tab.id] ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)',
                                                borderRadius: '0.375rem',
                                                cursor: newUserRole === 'admin' ? 'not-allowed' : 'pointer',
                                                opacity: newUserRole === 'admin' ? 0.7 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                width: '1rem',
                                                height: '1rem',
                                                borderRadius: '4px',
                                                border: '1px solid',
                                                borderColor: permissions[tab.id] ? '#3b82f6' : '#475569',
                                                background: permissions[tab.id] ? '#3b82f6' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '0.6rem'
                                            }}>
                                                {permissions[tab.id] && <CheckCircle size={10} />}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: permissions[tab.id] ? 'white' : '#94a3b8' }}>{tab.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                            <button
                                type="submit"
                                disabled={loading || !newUserEmail}
                                className="btn-action btn-sales"
                                style={{ width: '100%', padding: '0.75rem', opacity: loading || !newUserEmail ? 0.5 : 1, cursor: loading || !newUserEmail ? 'not-allowed' : 'pointer', justifyContent: 'center' }}
                            >
                                {loading && <RefreshCw className="animate-spin" size={14} />}
                                {loading ? 'Processing...' : 'Grant Access'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Current Users List */}
                <div style={{ background: '#1e293b', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1e293b' }}>
                        <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '1.125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Active Members ({users.length})
                        </h3>
                        <button onClick={fetchUsers} disabled={loading} style={{ color: '#60a5fa', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ background: '#0f1219', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>User</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Role</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Attendance</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: 'white' }}>
                                {users.map((user) => (
                                    <tr key={user.id || user.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'white', flexShrink: 0 }}>
                                                    {user.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{user.email}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            {user.role === 'admin' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                    <Crown size={12} /> Admin
                                                </span>
                                            ) : user.role === 'power_user' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                                    <Shield size={12} /> Power User
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    <Eye size={12} /> Viewer
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '150px' }}>
                                                {user.role === 'admin' ? (
                                                    <span style={{ fontSize: '0.65rem', color: '#60a5fa' }}>All Tabs Granted</span>
                                                ) : (
                                                    Object.entries(user.permissions || {})
                                                        .filter(([_, value]) => value)
                                                        .map(([key]) => (
                                                            <span key={key} style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem', color: '#94a3b8' }}>
                                                                {key.charAt(0).toUpperCase() + key.slice(1)}
                                                            </span>
                                                        ))
                                                )}
                                                {(!user.permissions || Object.values(user.permissions).every(v => !v)) && user.role !== 'admin' && (
                                                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>None</span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Removed Joined Date to save space if needed, or keeping it but with less padding */}
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteUser(user.email)}
                                                style={{ color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.25rem', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                                            No active members found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Status Toast - Fixed */}
            {status.message && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '0.75rem 1rem', borderRadius: '0.375rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 50, fontSize: '0.875rem', fontWeight: 500, background: status.type === 'error' ? '#dc2626' : '#059669', color: 'white' }}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span>{status.message}</span>
                    <button onClick={() => setStatus({ type: 'idle', message: '' })} style={{ marginLeft: '0.5rem', opacity: 0.8, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            )}
        </div>
    );
};

export default AdminUserAccess;
