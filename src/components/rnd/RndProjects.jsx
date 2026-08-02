import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const RndProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        project_no: '', name: '', category: '', objective: '', project_leader: '',
        target_shelf_life: '', target_cost: '', target_ph: '', target_aw: '', target_packaging: '',
        status: 'Draft'
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching projects:", error);
            } else if (data) {
                setProjects(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('rnd_projects').insert([formData]);
            if (error) throw error;
            setShowForm(false);
            fetchProjects();
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save project.");
        }
    };

    if (showForm) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Create New Project</h2>
                    <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                </div>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Project No</label>
                            <input type="text" value={formData.project_no} onChange={e => setFormData({...formData, project_no: e.target.value})} required style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Project Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Category</label>
                            <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Project Leader</label>
                            <input type="text" value={formData.project_leader} onChange={e => setFormData({...formData, project_leader: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Target Shelf Life</label>
                            <input type="text" value={formData.target_shelf_life} onChange={e => setFormData({...formData, target_shelf_life: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Target Cost / kg</label>
                            <input type="number" step="0.01" value={formData.target_cost} onChange={e => setFormData({...formData, target_cost: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Target pH</label>
                            <input type="text" value={formData.target_ph} onChange={e => setFormData({...formData, target_ph: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Target Aw</label>
                            <input type="text" value={formData.target_aw} onChange={e => setFormData({...formData, target_aw: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Objective</label>
                        <textarea value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} rows="3" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', resize: 'vertical' }} />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Save Project</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>R&D Projects</h2>
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> New Project
                </button>
            </div>
            
            {loading ? (
                <p>Loading projects...</p>
            ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No projects found. Create your first R&D project!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Project No</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(proj => (
                                <tr key={proj.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{proj.project_no}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{proj.name}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{proj.category}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                            {proj.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: '0.5rem' }}><Edit2 size={16} /></button>
                                        <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RndProjects;
