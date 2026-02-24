import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, UserPlus, Trash2, Mail, Shield, AlertCircle, CheckCircle, RefreshCw, X, Eye, Crown } from 'lucide-react';

const AdminUserAccess = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Add User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('viewer'); // 'viewer' | 'admin'
    const [canAccessAttendance, setCanAccessAttendance] = useState(false);

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
                can_access_attendance: newUserRole === 'admin' || canAccessAttendance
            }]);

            if (error) throw error;

            setStatus({ type: 'success', message: `Access granted to ${newUserEmail}.` });
            setNewUserEmail('');
            setCanAccessAttendance(false);
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
            const { error } = await supabase
                .from('user_roles')
                .update({ can_access_attendance: !user.can_access_attendance })
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
                                        onClick={() => setNewUserRole('viewer')}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', transition: 'all 0.2s', border: newUserRole === 'viewer' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)', background: newUserRole === 'viewer' ? '#2563eb' : '#0f1219', color: 'white', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Viewer</span>
                                            {newUserRole === 'viewer' && <CheckCircle size={14} />}
                                        </div>
                                        <div style={{ fontSize: '0.625rem', color: newUserRole === 'viewer' ? '#bfdbfe' : '#64748b' }}>Read-only access</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNewUserRole('admin')}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', transition: 'all 0.2s', border: newUserRole === 'admin' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)', background: newUserRole === 'admin' ? '#2563eb' : '#0f1219', color: 'white', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Admin</span>
                                            {newUserRole === 'admin' && <CheckCircle size={14} />}
                                        </div>
                                        <div style={{ fontSize: '0.625rem', color: newUserRole === 'admin' ? '#bfdbfe' : '#64748b' }}>Full access</div>
                                    </button>
                                </div>
                            </div>

                            {/* Attendance Access Toggle for non-admins */}
                            {newUserRole === 'viewer' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#0f1219', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <input
                                        type="checkbox"
                                        id="attendanceAccess"
                                        checked={canAccessAttendance}
                                        onChange={(e) => setCanAccessAttendance(e.target.checked)}
                                        style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="attendanceAccess" style={{ color: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
                                        Grant access to Time & Attendance
                                    </label>
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
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    <Eye size={12} /> Viewer
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div
                                                onClick={() => user.role !== 'admin' && toggleAttendanceAccess(user)}
                                                style={{
                                                    cursor: user.role === 'admin' ? 'default' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    color: (user.can_access_attendance || user.role === 'admin') ? '#34d399' : '#64748b'
                                                }}
                                            >
                                                {(user.can_access_attendance || user.role === 'admin') ? (
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
