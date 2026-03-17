import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Package, Plus, Search, RefreshCw, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, List, Tag, Layers } from 'lucide-react';

const ItemMaster = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [formData, setFormData] = useState({
        name: '',
        category: 'Raw Material'
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('item_master')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error("Fetch error:", err);
            setStatus({ type: 'error', message: "Failed to load items. Make sure the table exists." });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                category: item.category
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                category: 'Raw Material'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: formData.name.toUpperCase().trim(),
                category: formData.category
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('item_master')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
                setStatus({ type: 'success', message: "Item updated successfully." });
            } else {
                const { error } = await supabase
                    .from('item_master')
                    .insert([payload]);
                if (error) throw error;
                setStatus({ type: 'success', message: "Item added successfully." });
            }
            
            setIsModalOpen(false);
            fetchItems();
        } catch (err) {
            console.error("Save error:", err);
            setStatus({ type: 'error', message: "Error saving item: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        
        setLoading(true);
        try {
            const { error } = await supabase
                .from('item_master')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setStatus({ type: 'success', message: "Item deleted successfully." });
            fetchItems();
        } catch (err) {
            setStatus({ type: 'error', message: "Error deleting item: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryBadgeStyle = (category) => {
        switch (category) {
            case 'Raw Material':
                return { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' };
            case 'Processed Item':
                return { background: 'rgba(168, 85, 247, 0.1)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.2)' };
            default: // Overhead
                return { background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' };
        }
    };

    return (
        <div style={{ color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <List size={24} color="#3b82f6" /> Item Master
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Define raw materials and processed items for automated dashboard categorization.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-action btn-primary"
                    style={{ background: '#3b82f6' }}
                >
                    <Plus size={18} />
                    Add Item
                </button>
            </div>

            {/* Controls */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search items by name or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                    />
                </div>
                <button onClick={fetchItems} className="btn-icon">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Status Messages */}
            {status.message && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                    color: status.type === 'error' ? '#fca5a5' : '#6ee7b7'
                }}>
                    {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span style={{ flex: 1 }}>{status.message}</span>
                    <button onClick={() => setStatus({ type: 'idle', message: '' })} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Items Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass-highlight)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Item Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Category</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>System ID</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                            <Package size={16} />
                                        </div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        ...getCategoryBadgeStyle(item.category)
                                    }}>
                                        {item.category}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <code style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>
                                        {item.id.substring(0, 8)}...
                                    </code>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleOpenModal(item)} className="btn-icon" title="Edit Item">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id, item.name)}
                                            className="btn-icon"
                                            style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                            title="Delete Item"
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <Package size={32} opacity={0.3} />
                                        <span>No items found in master list.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {editingItem ? <Edit2 size={20} /> : <Plus size={20} />}
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ITEM NAME (Case insensitive matching)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. GINGER, GARLIC PASTE..."
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CATEGORY</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                                        {['Raw Material', 'Processed Item', 'Overhead'].map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: cat })}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid',
                                                    borderColor: formData.category === cat ? '#3b82f6' : 'var(--glass-border)',
                                                    background: formData.category === cat ? 'rgba(59, 130, 246, 0.1)' : 'var(--glass-highlight)',
                                                    color: formData.category === cat ? '#3b82f6' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: formData.category === cat ? '#3b82f6' : '#64748b' }} />
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn-action btn-primary" style={{ width: '100%', background: '#3b82f6', justifyContent: 'center', marginTop: '2rem' }}>
                                {loading ? 'Saving...' : <><Save size={18} /> Save Item</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemMaster;
