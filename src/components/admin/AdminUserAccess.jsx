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
                role: newUserRole
            }]);

            if (error) throw error;

            setStatus({ type: 'success', message: `Full access granted to ${newUserEmail}.` });
            setNewUserEmail('');
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

    return (
        <div className="p-6 space-y-6 bg-[#0f1219] min-h-[calc(100vh-140px)]">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Users className="text-blue-500" size={24} />
                    User Access Management
                </h2>
                <p className="text-slate-400">Control who has access to the dashboard and data.</p>
            </div>

            {/* Grant Access Card - Clean & Solid */}
            <div className="bg-[#1e293b] p-6 rounded-lg border border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-blue-500/10 rounded-md text-blue-400">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
                        <p className="text-slate-500 text-xs">Grant access via email address.</p>
                    </div>
                </div>

                <form onSubmit={handleAddUser} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    className="w-full bg-[#0f1219] border border-slate-700 rounded-md py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-slate-600"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign Role</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('viewer')}
                                    className={`p-3 rounded-lg border text-left transition-all ${newUserRole === 'viewer'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-[#0f1219] border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm">Viewer</span>
                                        {newUserRole === 'viewer' && <CheckCircle size={14} />}
                                    </div>
                                    <div className={`text-[10px] ${newUserRole === 'viewer' ? 'text-blue-200' : 'text-slate-500'}`}>Read-only access</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('admin')}
                                    className={`p-3 rounded-lg border text-left transition-all ${newUserRole === 'admin'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-[#0f1219] border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm">Admin</span>
                                        {newUserRole === 'admin' && <CheckCircle size={14} />}
                                    </div>
                                    <div className={`text-[10px] ${newUserRole === 'admin' ? 'text-blue-200' : 'text-slate-500'}`}>Full access</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading || !newUserEmail}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <RefreshCw className="animate-spin" size={14} />}
                            {loading ? 'Processing...' : 'Grant Access'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Current Users List (Table Layout for robustness) */}
            <div className="bg-[#1e293b] rounded-lg border border-slate-700 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#1e293b]">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        Active Members ({users.length})
                    </h3>
                    <button onClick={fetchUsers} disabled={loading} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors">
                        <RefreshCw size={12} className={loading && 'animate-spin'} /> Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#0f1219] text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Joined</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map((user) => (
                                <tr key={user.id || user.email} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                                {user.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-white font-medium">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === 'admin' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                <Crown size={12} /> Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <Eye size={12} /> Viewer
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(user.email)}
                                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-all"
                                            title="Revoke Access"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        No active members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Toast - Simple */}
            {status.message && (
                <div className={`fixed bottom-8 right-8 px-4 py-3 rounded shadow-lg flex items-center gap-3 z-50 text-sm font-medium ${status.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span>{status.message}</span>
                    <button onClick={() => setStatus({ type: 'idle', message: '' })} className="ml-2 opacity-80 hover:opacity-100"><X size={14} /></button>
                </div>
            )}
        </div>
    );
};

export default AdminUserAccess;
