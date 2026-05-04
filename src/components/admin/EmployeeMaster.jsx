import React, { useState, useEffect, useTransition, startTransition } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, Plus, Edit2, Trash2, Save, X, Search, RefreshCw, IndianRupee, AlertTriangle, CheckCircle } from 'lucide-react';

const EmployeeMaster = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, employeeId: null, employeeName: '' });
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'error' });
    const [isPending, startUpdateTransition] = useTransition();
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        emp_id: '',
        name: '',
        phone: '',
        role: '',
        department: '',
        joining_date: new Date().toISOString().split('T')[0],
        address: '',
        emergency_contact: '',
        aadhar_no: '',
        bank_name: '',
        account_no: '',
        ifsc_code: '',
        hourly_rate: '',
        payout_type: 'Hourly',
        monthly_salary: '',
        staff_type: 'Permanent',
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .order('emp_id', { ascending: true });
            if (empError) throw empError;
            setEmployees(empData || []);

            const { data: deptData } = await supabase.from('departments').select('name').order('name');
            const { data: roleData } = await supabase.from('roles').select('name').order('name');
            setDepartments(deptData || []);
            setRoles(roleData || []);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const getNextEmpId = (existingEmployees) => {
        if (!existingEmployees || existingEmployees.length === 0) return 'NFS-1001';

        // Extract numeric parts from IDs like "NFS-1001" or "NFS-TEMP-1001"
        const ids = existingEmployees
            .map(emp => {
                const match = emp.emp_id.match(/(\d{4,})$/);
                return match ? parseInt(match[0]) : null;
            })
            .filter(id => id !== null);

        if (ids.length === 0) return 'NFS-1001';

        const maxId = Math.max(...ids);
        return `NFS-${maxId + 1}`;
    };

    const handleOpenModal = (emp = null) => {
        if (emp) {
            setEditingEmployee(emp);
            setFormData({
                emp_id: emp.emp_id,
                name: emp.name,
                phone: emp.phone || '',
                role: emp.role || '',
                department: emp.department || '',
                joining_date: emp.joining_date || new Date().toISOString().split('T')[0],
                address: emp.address || '',
                emergency_contact: emp.emergency_contact || '',
                aadhar_no: emp.aadhar_no || '',
                bank_name: emp.bank_name || '',
                account_no: emp.account_no || '',
                ifsc_code: emp.ifsc_code || '',
                hourly_rate: emp.hourly_rate,
                payout_type: emp.payout_type || 'Hourly',
                monthly_salary: emp.monthly_salary || '',
                staff_type: emp.staff_type || 'Permanent',
                is_active: emp.is_active ?? true
            });
        } else {
            setEditingEmployee(null);
            const nextId = getNextEmpId(employees);
            setFormData({
                emp_id: nextId,
                name: '',
                phone: '',
                role: '',
                department: '',
                joining_date: new Date().toISOString().split('T')[0],
                address: '',
                emergency_contact: '',
                aadhar_no: '',
                bank_name: '',
                account_no: '',
                ifsc_code: '',
                hourly_rate: '',
                payout_type: 'Hourly',
                monthly_salary: '',
                staff_type: 'Permanent',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                phone: formData.phone,
                role: formData.role,
                department: formData.department,
                joining_date: formData.joining_date,
                address: formData.address,
                emergency_contact: formData.emergency_contact,
                aadhar_no: formData.aadhar_no,
                bank_name: formData.bank_name,
                account_no: formData.account_no,
                ifsc_code: formData.ifsc_code,
                hourly_rate: parseFloat(formData.hourly_rate),
                payout_type: formData.payout_type,
                monthly_salary: formData.payout_type === 'Monthly' ? parseFloat(formData.monthly_salary || 0) : 0,
                staff_type: formData.staff_type,
                is_active: formData.is_active
            };

            if (editingEmployee) {
                const { error } = await supabase
                    .from('employees')
                    .update(payload)
                    .eq('id', editingEmployee.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('employees')
                    .insert([{
                        ...payload,
                        emp_id: formData.emp_id
                    }]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            startTransition(() => {
                fetchData();
            });
        } catch (err) {
            setAlertConfig({ isOpen: true, message: "Error saving employee: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const id = confirmModal.employeeId;
        setConfirmModal({ isOpen: false, employeeId: null, employeeName: '' });
        setLoading(true);
        try {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', id);
            if (error) throw error;

            startTransition(() => {
                fetchData();
            });
        } catch (err) {
            setAlertConfig({ isOpen: true, message: "Error deleting employee: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Employee Master</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage staff database and hourly rates.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-action btn-primary"
                    style={{ background: '#3b82f6' }}
                >
                    <Plus size={18} />
                    Add Employee
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                    />
                </div>
                <button onClick={fetchData} className="btn-icon">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass-highlight)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Employee</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Designation</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Contact info</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Hourly Rate</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Type / Payout</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(emp => (
                            <tr key={emp.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontFamily: 'monospace' }}>{emp.emp_id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.role || '-'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{emp.department || '-'}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: emp.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: emp.is_active ? '#10b981' : '#ef4444',
                                        border: `1px solid ${emp.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        {emp.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{emp.phone || '-'}</div>
                                    {emp.aadhar_no && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>Aadhar: {emp.aadhar_no}</div>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                                        {emp.payout_type === 'Monthly' ? (
                                            <>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>₹{emp.monthly_salary}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>/ mo</span>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>₹{emp.hourly_rate}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>/ hr</span>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: emp.staff_type === 'Temporary' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                            color: emp.staff_type === 'Temporary' ? '#f59e0b' : '#a855f7',
                                            border: `1px solid ${emp.staff_type === 'Temporary' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                                            width: 'fit-content'
                                        }}>
                                            {emp.staff_type || 'Permanent'}
                                        </span>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: emp.payout_type === 'Monthly' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            color: emp.payout_type === 'Monthly' ? '#10b981' : '#3b82f6',
                                            border: `1px solid ${emp.payout_type === 'Monthly' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                                            width: 'fit-content'
                                        }}>
                                            {emp.payout_type || 'Hourly'}
                                            {emp.payout_type === 'Monthly' && ` (₹${emp.monthly_salary})`}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleOpenModal(emp)} className="btn-icon" title="Edit Employee">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({ isOpen: true, employeeId: emp.id, employeeName: emp.name })}
                                            className="btn-icon"
                                            style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                            title="Delete Employee"
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredEmployees.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={32} opacity={0.3} />
                                        <span>No staff records found matching your search.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Section 1: Employment Identity */}
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#3b82f6', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={16} /> Employment Details
                                    </h4>
                                    <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Employee ID</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={!!editingEmployee}
                                                value={formData.emp_id}
                                                onChange={e => setFormData({ ...formData, emp_id: e.target.value.toUpperCase() })}
                                                placeholder="e.g. NFS1001"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Joining Date</label>
                                            <input
                                                type="date"
                                                value={formData.joining_date}
                                                onChange={e => setFormData({ ...formData, joining_date: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="responsive-grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Designation / Role</label>
                                            <select
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            >
                                                <option value="" style={{ background: 'var(--bg-secondary)' }}>Select Role</option>
                                                {roles.map(r => (
                                                    <option key={r.name} value={r.name} style={{ background: 'var(--bg-secondary)' }}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Department</label>
                                            <select
                                                value={formData.department}
                                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            >
                                                <option value="" style={{ background: 'var(--bg-secondary)' }}>Select Department</option>
                                                {departments.map(d => (
                                                    <option key={d.name} value={d.name} style={{ background: 'var(--bg-secondary)' }}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Personal & Contact */}
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#10b981', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Plus size={16} /> Personal Information
                                    </h4>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter name"
                                            style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Phone Number</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="e.g. +91 98765 43210"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Emergency Contact</label>
                                            <input
                                                type="text"
                                                value={formData.emergency_contact}
                                                onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                                                placeholder="Name & Number"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Address</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="House No, Street, City, State, ZIP"
                                            rows={2}
                                            style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', resize: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Section 3: Financial & ID */}
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f97316', borderBottom: '1px solid rgba(249, 115, 22, 0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <IndianRupee size={16} /> Financial & Identity
                                    </h4>
                                    <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Aadhar Number</label>
                                            <input
                                                type="text"
                                                value={formData.aadhar_no}
                                                onChange={e => setFormData({ ...formData, aadhar_no: e.target.value })}
                                                placeholder="12-digit Aadhar No"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Hourly Rate (₹)</label>
                                            <div style={{ position: 'relative' }}>
                                                <IndianRupee size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                <input
                                                    type="number"
                                                    required={formData.payout_type !== 'Monthly'}
                                                    disabled={formData.payout_type === 'Monthly'}
                                                    value={formData.payout_type === 'Monthly' ? '' : formData.hourly_rate}
                                                    onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })}
                                                    placeholder={formData.payout_type === 'Monthly' ? "Auto-calculated" : "100"}
                                                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.25rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', opacity: formData.payout_type === 'Monthly' ? 0.7 : 1 }}
                                                />
                                            </div>
                                            {formData.payout_type === 'Monthly' && (
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.65rem', color: '#10b981' }}>Derived from monthly salary & working days.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Bank Name</label>
                                        <input
                                            type="text"
                                            value={formData.bank_name}
                                            onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                            placeholder="e.g. HDFC Bank"
                                            style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Number</label>
                                            <input
                                                type="text"
                                                value={formData.account_no}
                                                onChange={e => setFormData({ ...formData, account_no: e.target.value })}
                                                placeholder="Enter account number"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>IFSC Code</label>
                                            <input
                                                type="text"
                                                value={formData.ifsc_code}
                                                onChange={e => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                                                placeholder="e.g. HDFC0001234"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>

                                    <h4 style={{ margin: '1.5rem 0 1rem 0', fontSize: '0.875rem', color: '#8b5cf6', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <RefreshCw size={16} /> Payout Configuration
                                    </h4>

                                    <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Payout Type</label>
                                            <select
                                                required
                                                value={formData.payout_type}
                                                onChange={e => setFormData({ ...formData, payout_type: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            >
                                                <option value="Hourly" style={{ background: 'var(--bg-secondary)' }}>Hourly (Shift Basis)</option>
                                                <option value="Monthly" style={{ background: 'var(--bg-secondary)' }}>Monthly (Fixed Salary)</option>
                                            </select>
                                        </div>
                                        {formData.payout_type === 'Monthly' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Monthly Fixed Salary (₹)</label>
                                                <div style={{ position: 'relative' }}>
                                                    <IndianRupee size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                    <input
                                                        type="number"
                                                        required={formData.payout_type === 'Monthly'}
                                                        value={formData.monthly_salary}
                                                        onChange={e => setFormData({ ...formData, monthly_salary: e.target.value })}
                                                        placeholder="25000"
                                                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.25rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Staff Type</label>
                                            <select
                                                required
                                                value={formData.staff_type}
                                                onChange={e => setFormData({ ...formData, staff_type: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                            >
                                                <option value="Permanent" style={{ background: 'var(--bg-secondary)' }}>Permanent Staff</option>
                                                <option value="Temporary" style={{ background: 'var(--bg-secondary)' }}>Temporary Staff</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={formData.is_active}
                                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                            />
                                            <label htmlFor="is_active" style={{ fontSize: '0.875rem', color: 'var(--text-primary)', cursor: 'pointer' }}>Active Employee</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn-action btn-primary" style={{ width: '100%', background: '#3b82f6', justifyContent: 'center', marginTop: '2rem' }}>
                                {loading ? 'Saving...' : <><Save size={18} /> Save Employee Details</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', margin: '0 auto 1.5rem' }}>
                            <AlertTriangle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Confirm Deletion</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Are you sure you want to delete <strong>{confirmModal.employeeName}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, employeeId: null, employeeName: '' })}
                                className="btn-action"
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn-action"
                                style={{ flex: 1, justifyContent: 'center', background: '#ef4444', color: 'white' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert */}
            {alertConfig.isOpen && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1200, animation: 'slideIn 0.3s ease-out' }}>
                    <div className="glass-panel" style={{
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        borderLeft: `4px solid ${alertConfig.type === 'error' ? '#ef4444' : '#10b981'}`,
                        minWidth: '300px'
                    }}>
                        {alertConfig.type === 'error' ? <AlertTriangle size={20} color="#ef4444" /> : <CheckCircle size={20} color="#10b981" />}
                        <span style={{ fontSize: '0.9rem', flex: 1 }}>{alertConfig.message}</span>
                        <button onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })} className="btn-icon" style={{ padding: '0.2rem' }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div >
    );
};

export default EmployeeMaster;
