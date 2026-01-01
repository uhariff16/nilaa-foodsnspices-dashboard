import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, UserPlus, Trash2, Mail, Shield, AlertCircle, CheckCircle, Search, RefreshCw, X } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Add User Form
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
            // Check if user already exists
            const { data: existing } = await supabase.from('user_roles').select('id').eq('email', newUserEmail).single();
            if (existing) throw new Error("User with this email already exists.");

            // Insert new user
            const { error } = await supabase.from('user_roles').insert([{
                email: newUserEmail,
                role: newUserRole
            }]);

            if (error) throw error;

            setStatus({ type: 'success', message: `${newUserEmail} added successfully.` });
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
            setStatus({ type: 'success', message: "User removed." });
            fetchUsers();
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-[#1a1f2e] min-h-[calc(100vh-140px)] rounded-2xl flex flex-col md:flex-row gap-8">

            {/* Left Column: Add User */}
            <div className="w-full md:w-1/3 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                        <Users className="text-emerald-500" size={28} />
                        Staff Access
                    </h2>
                    <p className="text-slate-400 text-sm">Manage who can access this dashboard.</p>
                </div>

                <div className="bg-[#0f1219] p-6 rounded-xl border border-white/5 shadow-inner">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                        <UserPlus size={16} className="text-blue-500" />
                        Grant Access
                    </h3>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-white transition-colors" size={16} />
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Role Permission</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('viewer')}
                                    className={`p-3 rounded-lg border text-left transition-all ${newUserRole === 'viewer'
                                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                            : 'bg-[#1a1f2e] border-white/5 text-slate-500 hover:border-white/10'
                                        }`}
                                >
                                    <div className="font-bold text-xs mb-1">Viewer</div>
                                    <div className="text-[10px] opacity-80">Read-Only access to dashboards.</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('admin')}
                                    className={`p-3 rounded-lg border text-left transition-all ${newUserRole === 'admin'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#1a1f2e] border-white/5 text-slate-500 hover:border-white/10'
                                        }`}
                                >
                                    <div className="font-bold text-xs mb-1">Admin</div>
                                    <div className="text-[10px] opacity-80">Full access to edit and delete.</div>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !newUserEmail}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-lg shadow-emerald-900/20 transition-all mt-2"
                        >
                            {loading ? 'Adding...' : 'Grant Access'}
                        </button>
                    </form>

                    {status.message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-xs border ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            }`}>
                            {status.type === 'error' ? <AlertCircle size={14} className="mt-0.5" /> : <CheckCircle size={14} className="mt-0.5" />}
                            <span>{status.message}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: User List */}
            <div className="flex-1 bg-[#0f1219] rounded-xl border border-white/5 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#151923]">
                    <h3 className="font-bold text-slate-300 text-sm flex items-center gap-2">
                        <Users size={16} className="text-slate-500" />
                        Current Staff ({users.length})
                    </h3>
                    <button onClick={fetchUsers} disabled={loading} className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="overflow-auto flex-1 custom-scrollbar p-2 space-y-1">
                    {users.map((user) => (
                        <div key={user.id || user.email} className="group flex items-center justify-between p-3 rounded-lg hover:bg-[#1a1f2e] transition-colors border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.role === 'admin' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                                    }`}>
                                    {user.email.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{user.email}</p>
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Shield size={10} />
                                        {user.role === 'admin' ? 'Administrator' : 'Viewer'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteUser(user.email)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Revoke Access"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {users.length === 0 && !loading && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No staff members found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
