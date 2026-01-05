import React from 'react';

const TransactionTable = ({ transactions, type }) => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Description</th>
                            <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem' }}>{t.parsedDate}</td>
                                <td style={{ padding: '1rem' }}>{t.originalDesc || type}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: (type || '').toLowerCase() === 'sales' ? '#10b981' : '#ef4444' }}>
                                    {(type || '').toLowerCase() === 'sales' ? '+' : '-'}
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(t.parsedAmount))}
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No {type} records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionTable;
