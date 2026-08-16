import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const PurchasePendingWidget = ({ purchases = [], supplierPayments = [], selectedMonth, selectedYear }) => {
    const [showPendingModal, setShowPendingModal] = useState(false);

    // Filter by Month/Year
    const getFilteredItems = (items) => {
        if (!items) return [];
        const getDate = (item) => item.date || item.parsedDate || ''; 

        if (selectedMonth === 'Overall') {
            if (selectedYear) {
                return items.filter(item => getDate(item).startsWith(selectedYear));
            }
            return items;
        }
        const [selMonth, selYear] = selectedMonth.split(' ');
        const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const targetPrefix = `${selYear}-${monthMap[selMonth]}`;
        return items.filter(item => getDate(item).startsWith(targetPrefix));
    };

    const allTimePurchases = useMemo(() => {
        return (purchases || []).filter(item => {
            const inv = String(item.invoice_no || item.invoiceNo || '').trim().toUpperCase();
            const desc = ((item.originalDesc || '') + ' ' + (item.supplier || '') + ' ' + (item.remarks || '')).toLowerCase();
            
            if (inv.startsWith('P')) return true;
            if (item.parsedType === 'Expense' && !inv) return false;

            const isPurchaseKeyword = item.parsedType === 'Purchase' || desc.includes('ginger') || desc.includes('garlic') || desc.includes('jayakodi') || /\bdesi\b/.test(desc) || desc.includes('naatu');
            const isExpense = desc.includes('exp') || desc.includes('marketing') || desc.includes('design');
            if (isExpense) return false;
            return isPurchaseKeyword;
        });
    }, [purchases]);

    const filteredPurchases = useMemo(() => getFilteredItems(allTimePurchases), [allTimePurchases, selectedMonth, selectedYear]);

    const totalSpent = filteredPurchases.reduce((sum, i) => sum + (i.parsedAmount || i.amount || 0), 0);

    const supplierSummary = useMemo(() => {
        const summary = allTimePurchases.reduce((acc, curr) => {
            const sName = String(curr.customerName || curr.supplier || curr.originalDesc || 'Unknown').toUpperCase().trim();
            if (!acc[sName]) acc[sName] = { amount: 0, invoiceSet: new Set(), paid: 0, balance: 0, payments: [] };
            acc[sName].amount += (curr.parsedAmount || curr.amount || 0);
            return acc;
        }, {});

        (supplierPayments || []).forEach(pay => {
            const sName = String(pay.customerName || pay.supplier || 'Unknown').toUpperCase().trim();
            if (!summary[sName]) summary[sName] = { amount: 0, invoiceSet: new Set(), paid: 0, balance: 0, payments: [] };
            summary[sName].paid += (pay.parsedAmount || 0);
        });

        Object.keys(summary).forEach(k => {
            summary[k].balance = summary[k].amount - summary[k].paid;
        });

        return Object.entries(summary);
    }, [allTimePurchases, supplierPayments]);

    return (
        <>
            <div style={{
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(20, 20, 25, 0.6))',
                borderRadius: '1rem',
                padding: '1.25rem',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '160px',
                height: '100%'
            }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>PURCHASE & PENDING</span>
                    <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        {filteredPurchases.length} Bills
                    </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 500 }}>Purchase Cost</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
                            ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    
                    <div 
                        style={{ 
                            textAlign: 'right', cursor: 'pointer', padding: '0.6rem 1rem', 
                            background: 'rgba(244, 63, 94, 0.1)', borderRadius: '0.5rem', 
                            border: '1px solid rgba(244, 63, 94, 0.3)', transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} 
                        onClick={() => setShowPendingModal(true)}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            Pending Payment <span style={{ fontSize: '1rem', lineHeight: 1 }}>↗</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', letterSpacing: '0.5px' }}>
                            ₹{supplierSummary.reduce((sum, [_, s]) => sum + (s.balance > 0 ? s.balance : 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Payment Breakdown Modal */}
            {showPendingModal && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div className="animate-fade-in" style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '1rem',
                        width: '100%', maxWidth: '500px',
                        border: '1px solid var(--glass-border)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        display: 'flex', flexDirection: 'column',
                        maxHeight: '80vh'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                                Pending Supplier Payments
                            </h3>
                            <button onClick={() => setShowPendingModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                        </div>
                        
                        <div className="custom-scrollbar" style={{ overflowY: 'auto', padding: '1rem', flex: 1 }}>
                            {supplierSummary.filter(([_, s]) => s.balance > 0).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No pending payments! 🎉
                                </div>
                            ) : (
                                supplierSummary
                                    .filter(([_, s]) => s.balance > 0)
                                    .sort((a, b) => b[1].balance - a[1].balance)
                                    .map(([supplier, stats], index) => (
                                        <div key={index} style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            padding: '0.75rem', 
                                            background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{supplier}</div>
                                            <div style={{ fontWeight: 700, color: '#f43f5e' }}>₹{stats.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                        </div>
                                    ))
                            )}
                        </div>
                        
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Pending</span>
                            <span style={{ fontWeight: 800, color: '#f43f5e', fontSize: '1.25rem' }}>
                                ₹{supplierSummary.reduce((sum, [_, s]) => sum + (s.balance > 0 ? s.balance : 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default PurchasePendingWidget;
