import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const RndIngredients = () => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIngredients();
    }, []);

    const fetchIngredients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rnd_ingredients')
                .select('*')
                .order('name', { ascending: true });
            
            if (error && error.code !== '42P01') {
                console.error("Error fetching ingredients:", error);
            } else if (data) {
                setIngredients(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Ingredient Database</h2>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Add Ingredient
                </button>
            </div>
            
            {loading ? (
                <p>Loading ingredients...</p>
            ) : ingredients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No ingredients found. Add your first R&D ingredient!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Supplier</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Cost / kg</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ingredients.map(ing => (
                                <tr key={ing.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{ing.code}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{ing.name}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{ing.supplier || '-'}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>₹{ing.cost}</td>
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

export default RndIngredients;
