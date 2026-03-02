import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, UserPlus, Trash2, Mail, Shield, AlertCircle, CheckCircle, RefreshCw, X, Eye, Crown, Activity, DollarSign, LayoutDashboard } from 'lucide-react';

const AdminUserAccess = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Add User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('viewer'); // 'admin', 'executive', 'attendance_manager', 'financial_controller', 'viewer'
    const [canAccessAttendance, setCanAccessAttendance] = useState(false);
    const [canAccessPayouts, setCanAccessPayouts] = useState(false);
    const [canViewDashboard, setCanViewDashboard] = useState(false);

    const ROLES = [
        { id: 'admin', label: 'Master Admin', desc: 'Full access to all modules and settings' },
        { id: 'executive', label: 'Dashboard Executive', desc: 'View main Dashboard only' },
        { id: 'attendance_manager', label: 'Attendance Manager', desc: 'Manage Time & Attendance only' },
        { id: 'financial_controller', label: 'Financial Controller', desc: 'View Dashboard, Attendance, and Payouts' },
        { id: 'viewer', label: 'Custom Viewer', desc: 'Manually configure access permissions' }
    ];

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            const cleanedData = (data || []).map(u => ({ ...u, role: u.role === 'power_user' ? 'viewer' : u.role }));
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

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: 'idle', message: '' });

        try {
            const { data: existing } = await supabase.from('user_roles').select('id').eq('email', newUserEmail).single();
            if (existing) throw new Error("User with this email already exists.");

            let permissions = {
                can_access_attendance: false,
                can_access_payouts: false,
                can_view_dashboard: false,
                can_manage_users: false
            };

            if (newUserRole === 'admin') {
                permissions = { can_access_attendance: true, can_access_payouts: true, can_view_dashboard: true, can_manage_users: true };
            } else if (newUserRole === 'executive') {
                permissions = { can_access_attendance: false, can_access_payouts: false, can_view_dashboard: true, can_manage_users: false };
            } else if (newUserRole === 'attendance_manager') {
                permissions = { can_access_attendance: true, can_access_payouts: false, can_view_dashboard: false, can_manage_users: false };
            } else if (newUserRole === 'financial_controller') {
                permissions = { can_access_attendance: true, can_access_payouts: true, can_view_dashboard: true, can_manage_users: false };
            } else {
                permissions = {
                    can_access_attendance: canAccessAttendance,
                    can_access_payouts: canAccessPayouts,
                    can_view_dashboard: canViewDashboard,
                    can_manage_users: false
                };
            }

            const { error } = await supabase.from('user_roles').insert([{
                email: newUserEmail.toLowerCase(),
                role: newUserRole,
                ...permissions
            }]);

            if (error) throw error;

            setStatus({ type: 'success', message: `Access granted to ${newUserEmail}.` });
            setNewUserEmail('');
            setCanAccessAttendance(false);
            setCanAccessPayouts(false);
            setCanViewDashboard(false);
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
        try {
            let permissions = {
                can_access_attendance: false,
                can_access_payouts: false,
                can_view_dashboard: false,
                can_manage_users: false
            };

            if (newRole === 'admin') {
                permissions = { can_access_attendance: true, can_access_payouts: true, can_view_dashboard: true, can_manage_users: true };
            } else if (newRole === 'executive') {
                permissions = { can_access_attendance: false, can_access_payouts: false, can_view_dashboard: true, can_manage_users: false };
            } else if (newRole === 'attendance_manager') {
                permissions = { can_access_attendance: true, can_access_payouts: false, can_view_dashboard: false, can_manage_users: false };
            } else if (newRole === 'financial_controller') {
                permissions = { can_access_attendance: true, can_access_payouts: true, can_view_dashboard: true, can_manage_users: false };
            } else {
                permissions = {
                    can_access_attendance: user.can_access_attendance,
                    can_access_payouts: user.can_access_payouts,
                    can_view_dashboard: user.can_view_dashboard,
                    can_manage_users: false
                };
            }

            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole, ...permissions })
                .ilike('email', user.email);

            if (error) throw error;
            setStatus({ type: 'success', message: `Role updated to ${newRole}.` });
            fetchUsers();
        } catch (error) {
            console.error("Update Role Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (email) => {
        if (!window.confirm(`Are you sure you want to remove access for ${email}?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('user_roles').delete().ilike('email', email);
            if (error) throw error;
            setStatus({ type: 'success', message: "User access revoked." });
            fetchUsers();
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const toggleDashboardAccess = async (user) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ can_view_dashboard: !user.can_view_dashboard })
                .ilike('email', user.email);

            if (error) throw error;
            setStatus({ type: 'success', message: "Dashboard permission updated." });
            fetchUsers();
        } catch (error) {
            console.error("Update Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendanceAccess = async (user) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ can_access_attendance: !user.can_access_attendance })
                .ilike('email', user.email);

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

    const togglePayoutAccess = async (user) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ can_access_payouts: !user.can_access_payouts })
                .ilike('email', user.email);

            if (error) throw error;
            setStatus({ type: 'success', message: "Payout permission updated." });
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

            <div className="admin-grid-custom">
                {/* Grant Access Card - Clean & Solid */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.375rem', color: '#60a5fa' }}>
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Invite Team Member</h3>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Grant access via email address.</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Email Input */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#64748b' }} size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={newUserEmail}
                                        onChange={e => setNewUserEmail(e.target.value)}
                                        placeholder="colleague@example.com"
                                        style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '0.375rem', padding: '0.625rem 1rem 0.625rem 2.5rem', color: 'var(--text-primary)', outline: 'none', transition: 'border 0.2s', fontSize: '0.875rem' }}
                                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Assign Role</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {ROLES.map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setNewUserRole(r.id)}
                                            style={{ padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', transition: 'all 0.2s', border: newUserRole === r.id ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)', background: newUserRole === r.id ? '#2563eb' : 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{r.label}</span>
                                                {newUserRole === r.id && <CheckCircle size={14} />}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: newUserRole === r.id ? '#bfdbfe' : '#64748b' }}>{r.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Access Toggles for non-admins */}
                            {newUserRole === 'viewer' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.375rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            id="dashboardAccess"
                                            checked={canViewDashboard}
                                            onChange={(e) => setCanViewDashboard(e.target.checked)}
                                            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="dashboardAccess" style={{ color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}>
                                            Grant access to Dashboard
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            id="attendanceAccess"
                                            checked={canAccessAttendance}
                                            onChange={(e) => setCanAccessAttendance(e.target.checked)}
                                            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="attendanceAccess" style={{ color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}>
                                            Grant access to Time & Attendance
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            id="payoutAccess"
                                            checked={canAccessPayouts}
                                            onChange={(e) => setCanAccessPayouts(e.target.checked)}
                                            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="payoutAccess" style={{ color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}>
                                            Grant access to Financials & Payouts
                                        </label>
                                    </div>
                                </div>
                            )}
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
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Active Members ({users.length})
                        </h3>
                        <button onClick={fetchUsers} disabled={loading} style={{ color: '#60a5fa', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '30%' }}>User</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '25%' }}>Role</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '12%' }}>Dashboard</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '12%' }}>Attendance</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '12%' }}>Payouts</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '9%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: 'var(--text-primary)' }}>
                                {users.map((user) => (
                                    <tr key={user.id || user.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)', flexShrink: 0 }}>
                                                    {user.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={user.email}>{user.email}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <select
                                                value={user.role}
                                                onChange={(e) => changeUserRole(user, e.target.value)}
                                                disabled={loading || user.email === 'uhariff@gmail.com'}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: '0.375rem',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--glass-border)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    cursor: (loading || user.email === 'uhariff@gmail.com') ? 'not-allowed' : 'pointer',
                                                    outline: 'none',
                                                    width: '100%',
                                                    minWidth: '150px'
                                                }}
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r.id} value={r.id}>{r.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <div
                                                onClick={() => user.role === 'viewer' && toggleDashboardAccess(user)}
                                                style={{
                                                    cursor: user.role === 'viewer' ? 'pointer' : 'default',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    color: (user.can_view_dashboard || user.role === 'admin' || user.role === 'executive' || user.role === 'financial_controller') ? '#34d399' : '#64748b'
                                                }}
                                                title={user.role !== 'viewer' ? "Permission managed by role" : "Toggle access"}
                                            >
                                                {(user.can_view_dashboard || user.role === 'admin' || user.role === 'executive' || user.role === 'financial_controller') ? (
                                                    <CheckCircle size={18} />
                                                ) : (
                                                    <X size={18} />
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <div
                                                onClick={() => user.role === 'viewer' && toggleAttendanceAccess(user)}
                                                style={{
                                                    cursor: user.role === 'viewer' ? 'pointer' : 'default',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    color: (user.can_access_attendance || user.role === 'admin' || user.role === 'attendance_manager' || user.role === 'financial_controller') ? '#34d399' : '#64748b'
                                                }}
                                                title={user.role !== 'viewer' ? "Permission managed by role" : "Toggle access"}
                                            >
                                                {(user.can_access_attendance || user.role === 'admin' || user.role === 'attendance_manager' || user.role === 'financial_controller') ? (
                                                    <CheckCircle size={18} />
                                                ) : (
                                                    <X size={18} />
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <div
                                                onClick={() => user.role === 'viewer' && togglePayoutAccess(user)}
                                                style={{
                                                    cursor: user.role === 'viewer' ? 'pointer' : 'default',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    color: (user.can_access_payouts || user.role === 'admin' || user.role === 'financial_controller') ? '#34d399' : '#64748b'
                                                }}
                                                title={user.role !== 'viewer' ? "Permission managed by role" : "Toggle access"}
                                            >
                                                {(user.can_access_payouts || user.role === 'admin' || user.role === 'financial_controller') ? (
                                                    <CheckCircle size={18} />
                                                ) : (
                                                    <X size={18} />
                                                )}
                                            </div>
                                        </td>
                                        {/* Removed Joined Date to save space if needed, or keeping it but with less padding */}
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteUser(user.email)}
                                                style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.25rem', transition: 'all 0.2s' }}
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
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '0.75rem 1rem', borderRadius: '0.375rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 50, fontSize: '0.875rem', fontWeight: 500, background: status.type === 'error' ? '#dc2626' : '#059669', color: 'var(--text-primary)' }}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span>{status.message}</span>
                    <button onClick={() => setStatus({ type: 'idle', message: '' })} style={{ marginLeft: '0.5rem', opacity: 0.8, background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            )}
        </div>
    );
};

export default AdminUserAccess;
