import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { 
    AlertTriangle, 
    CheckCircle2, 
    XCircle, 
    ChevronDown, 
    ChevronUp, 
    Check, 
    X, 
    RotateCcw, 
    Clock, 
    ArrowRight, 
    FileText, 
    DollarSign, 
    Layers, 
    Filter,
    History
} from 'lucide-react';

export const TransactionAmendmentBanner = ({ selectedMonth, selectedYear, onRefreshData }) => {
    const [amendments, setAmendments] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
    const [filterType, setFilterType] = useState('all'); // 'all' | 'Sales' | 'Purchase'
    const [feedbackMessage, setFeedbackMessage] = useState(null);

    // Fetch pending amendments and historical audits
    const fetchAmendments = useCallback(async () => {
        try {
            setLoading(true);
            // 1. Fetch pending
            const { data: pendingData, error: pendingErr } = await supabase
                .from('transaction_amendments')
                .select('*')
                .eq('status', 'pending_acknowledgment')
                .order('created_at', { ascending: false });

            if (pendingErr) throw pendingErr;
            setAmendments(pendingData || []);

            // 2. Fetch recent history (acknowledged / rejected / reverted)
            const { data: histData, error: histErr } = await supabase
                .from('transaction_amendments')
                .select('*')
                .in('status', ['acknowledged', 'rejected', 'reverted'])
                .order('acknowledged_at', { ascending: false })
                .limit(50);

            if (!histErr && histData) {
                setHistoryList(histData);
            }
        } catch (err) {
            console.error('Error fetching transaction amendments:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAmendments();

        // Listen for custom amendment refresh events
        const handleRefresh = () => fetchAmendments();
        window.addEventListener('amendmentsUpdated', handleRefresh);
        return () => window.removeEventListener('amendmentsUpdated', handleRefresh);
    }, [fetchAmendments]);

    // Apply & Acknowledge a single amendment
    const handleAcknowledge = async (item) => {
        try {
            setProcessingId(item.id);
            setFeedbackMessage(null);

            // Try atomic RPC function first
            const { error: rpcErr } = await supabase.rpc('acknowledge_transaction_amendment', {
                p_amendment_id: item.id,
                p_actor: 'Admin Manager'
            });

            if (rpcErr) {
                console.warn('RPC acknowledgment fallback to direct update:', rpcErr);
                if (item.transaction_id) {
                    const updatePayload = { updated_at: new Date().toISOString() };
                    if (item.field_name === 'amount' && item.new_value !== null) {
                        updatePayload.amount = parseFloat(item.new_value);
                    } else if (item.field_name === 'quantity' && item.new_value !== null) {
                        updatePayload.quantity = parseFloat(item.new_value);
                    } else if (item.field_name === 'date' && item.new_value !== null) {
                        updatePayload.date = item.new_value;
                    } else if (item.field_name === 'customer_name' && item.new_value !== null) {
                        updatePayload.customer_name = item.new_value;
                    }

                    const { error: txnErr } = await supabase
                        .from('transactions')
                        .update(updatePayload)
                        .eq('id', item.transaction_id);
                    if (txnErr) console.warn('Direct txn update error:', txnErr);
                }

                const { error: amendErr } = await supabase
                    .from('transaction_amendments')
                    .update({
                        status: 'acknowledged',
                        acknowledged_at: new Date().toISOString(),
                        acknowledged_by: 'Admin Manager'
                    })
                    .eq('id', item.id);
                if (amendErr) throw amendErr;
            }

            setFeedbackMessage({ type: 'success', text: `Amendment on ${item.invoice_no} acknowledged & committed to database!` });
            await fetchAmendments();
            if (onRefreshData) onRefreshData();
            window.dispatchEvent(new Event('amendmentsUpdated'));
        } catch (err) {
            console.error('Failed to acknowledge amendment:', err);
            setFeedbackMessage({ type: 'error', text: `Failed: ${err.message}` });
        } finally {
            setProcessingId(null);
        }
    };

    // Revert an acknowledged amendment back to original state
    const handleRevert = async (item) => {
        if (!window.confirm(`Revert amendment on ${item.invoice_no} back to original value of ₹${parseFloat(item.old_value || 0).toLocaleString()}? This will update the accounting ledger back to the original baseline.`)) {
            return;
        }

        try {
            setProcessingId(item.id);
            setFeedbackMessage(null);

            const { error: rpcErr } = await supabase.rpc('revert_transaction_amendment', {
                p_amendment_id: item.id,
                p_actor: 'Admin Manager'
            });

            if (rpcErr) {
                console.warn('RPC revert fallback to direct update:', rpcErr);
                if (item.transaction_id && item.old_value !== null) {
                    const updatePayload = { updated_at: new Date().toISOString() };
                    if (item.field_name === 'amount') {
                        updatePayload.amount = parseFloat(item.old_value);
                    }
                    await supabase.from('transactions').update(updatePayload).eq('id', item.transaction_id);
                }

                const { error: amendErr } = await supabase
                    .from('transaction_amendments')
                    .update({
                        status: 'reverted',
                        acknowledged_at: new Date().toISOString(),
                        acknowledged_by: 'Admin Manager',
                        notes: (item.notes ? item.notes + ' | ' : '') + 'Reverted back to original by manager'
                    })
                    .eq('id', item.id);
                if (amendErr) throw amendErr;
            }

            setFeedbackMessage({ type: 'info', text: `Amendment on ${item.invoice_no} successfully reverted back to original ₹${parseFloat(item.old_value || 0).toLocaleString()}!` });
            await fetchAmendments();
            if (onRefreshData) onRefreshData();
            window.dispatchEvent(new Event('amendmentsUpdated'));
        } catch (err) {
            console.error('Failed to revert amendment:', err);
            setFeedbackMessage({ type: 'error', text: `Revert failed: ${err.message}` });
        } finally {
            setProcessingId(null);
        }
    };

    // Reject an amendment (retains original DB record untouched)
    const handleReject = async (item) => {
        if (!window.confirm(`Reject this amendment on ${item.invoice_no}? The existing database values will remain unchanged.`)) {
            return;
        }

        try {
            setProcessingId(item.id);
            setFeedbackMessage(null);

            const { error: rpcErr } = await supabase.rpc('reject_transaction_amendment', {
                p_amendment_id: item.id,
                p_actor: 'Admin Manager',
                p_reason: 'Rejected by manager'
            });

            if (rpcErr) {
                console.warn('RPC reject fallback to direct update:', rpcErr);
                const { error } = await supabase
                    .from('transaction_amendments')
                    .update({
                        status: 'rejected',
                        acknowledged_at: new Date().toISOString(),
                        acknowledged_by: 'Admin Manager',
                        notes: (item.notes ? item.notes + ' | ' : '') + 'Rejected by manager'
                    })
                    .eq('id', item.id);
                if (error) throw error;
            }

            setFeedbackMessage({ type: 'info', text: `Amendment on ${item.invoice_no} rejected. Existing record preserved.` });
            await fetchAmendments();
            window.dispatchEvent(new Event('amendmentsUpdated'));
        } catch (err) {
            console.error('Failed to reject amendment:', err);
            setFeedbackMessage({ type: 'error', text: `Failed: ${err.message}` });
        } finally {
            setProcessingId(null);
        }
    };

    // Bulk Acknowledge All Pending
    const handleAcknowledgeAll = async () => {
        const filtered = amendments.filter(a => filterType === 'all' || a.transaction_type === filterType);
        if (!window.confirm(`Acknowledge and apply all ${filtered.length} pending amendments to the production ledger?`)) {
            return;
        }

        try {
            setLoading(true);
            setFeedbackMessage(null);

            for (const item of filtered) {
                await supabase.rpc('acknowledge_transaction_amendment', {
                    p_amendment_id: item.id,
                    p_actor: 'Admin Manager (Bulk)'
                });
            }

            setFeedbackMessage({ type: 'success', text: `Successfully acknowledged and applied all ${filtered.length} amendments!` });
            await fetchAmendments();
            if (onRefreshData) onRefreshData();
            window.dispatchEvent(new Event('amendmentsUpdated'));
        } catch (err) {
            console.error('Bulk acknowledgment error:', err);
            setFeedbackMessage({ type: 'error', text: `Bulk error: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const filteredAmendments = amendments.filter(a => filterType === 'all' || a.transaction_type === filterType);
    const salesCount = amendments.filter(a => a.transaction_type === 'Sales').length;
    const purchaseCount = amendments.filter(a => a.transaction_type === 'Purchase' || a.transaction_type === 'Expense').length;

    // Render nothing if no pending amendments and modal is closed
    if (amendments.length === 0 && !isModalOpen) {
        return null;
    }

    return (
        <>
            {/* Top Alert Banner */}
            {amendments.length > 0 && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.18), rgba(194, 65, 12, 0.14))',
                    border: '1px solid rgba(234, 88, 12, 0.5)',
                    borderRadius: '0.75rem',
                    padding: '0.9rem 1.25rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            background: 'rgba(234, 88, 12, 0.25)',
                            color: '#fb923c',
                            padding: '0.55rem',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: '#ffedd5', fontSize: '0.95rem' }}>
                                    {amendments.length} Pending Invoice & Bill Amendment{amendments.length > 1 ? 's' : ''} Require Acknowledgment
                                </span>
                                {salesCount > 0 && (
                                    <span style={{
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        border: '1px solid rgba(34, 197, 94, 0.4)',
                                        color: '#86efac',
                                        fontSize: '0.75rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '999px',
                                        fontWeight: 600
                                    }}>
                                        {salesCount} Sales
                                    </span>
                                )}
                                {purchaseCount > 0 && (
                                    <span style={{
                                        background: 'rgba(168, 85, 247, 0.2)',
                                        border: '1px solid rgba(168, 85, 247, 0.4)',
                                        color: '#d8b4fe',
                                        fontSize: '0.75rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '999px',
                                        fontWeight: 600
                                    }}>
                                        {purchaseCount} Purchases / Bills
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: '0.25rem 0 0', color: 'rgba(254, 215, 170, 0.8)', fontSize: '0.82rem' }}>
                                Values in updated records differ from current database entries. Review before-and-after diffs to approve or reject changes.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                                border: 'none',
                                color: '#ffffff',
                                padding: '0.55rem 1.15rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <FileText size={16} /> Review & Acknowledge
                        </button>
                    </div>
                </div>
            )}

            {/* Centered Modal using createPortal to document.body */}
            {isModalOpen && createPortal(
                <div 
                    onClick={() => setIsModalOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem',
                        boxSizing: 'border-box'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#16191f',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            borderRadius: '1rem',
                            width: '100%',
                            maxWidth: '920px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                            overflow: 'hidden',
                            margin: 'auto'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    background: 'rgba(234, 88, 12, 0.2)',
                                    color: '#fb923c',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem'
                                }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
                                        Invoice & Purchase Bill Amendment Center
                                    </h3>
                                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        Track, audit, and approve amendments before they modify accounting ledger totals.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '0.4rem',
                                    borderRadius: '0.4rem'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Subheader: Tabs & Filter Bar */}
                        <div style={{
                            padding: '0.75rem 1.5rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.25)'
                        }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    style={{
                                        background: activeTab === 'pending' ? 'rgba(234, 88, 12, 0.25)' : 'transparent',
                                        border: activeTab === 'pending' ? '1px solid rgba(234, 88, 12, 0.5)' : '1px solid transparent',
                                        color: activeTab === 'pending' ? '#fb923c' : '#94a3b8',
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    <Clock size={15} /> Pending Acknowledgment ({amendments.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    style={{
                                        background: activeTab === 'history' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                                        border: activeTab === 'history' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                                        color: activeTab === 'history' ? '#60a5fa' : '#94a3b8',
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    <History size={15} /> Audit History ({historyList.length})
                                </button>
                            </div>

                            {activeTab === 'pending' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <Filter size={14} /> Filter:
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            style={{
                                                background: '#23272f',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#e2e8f0',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.4rem',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            <option value="all">All Types</option>
                                            <option value="Sales">Sales Invoices</option>
                                            <option value="Purchase">Purchase Bills / Expenses</option>
                                        </select>
                                    </div>

                                    {filteredAmendments.length > 1 && (
                                        <button
                                            onClick={handleAcknowledgeAll}
                                            disabled={loading}
                                            style={{
                                                background: 'rgba(34, 197, 94, 0.2)',
                                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                                color: '#86efac',
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '0.4rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}
                                        >
                                            <Check size={14} /> Acknowledge All ({filteredAmendments.length})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Feedback Toast */}
                        {feedbackMessage && (
                            <div style={{
                                padding: '0.65rem 1.5rem',
                                background: feedbackMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : feedbackMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: feedbackMessage.type === 'success' ? '#86efac' : feedbackMessage.type === 'error' ? '#fca5a5' : '#93c5fd',
                                fontSize: '0.82rem',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                {feedbackMessage.text}
                            </div>
                        )}

                        {/* Modal Body: Content Table */}
                        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                            {activeTab === 'pending' ? (
                                filteredAmendments.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                                        <CheckCircle2 size={44} style={{ color: '#22c55e', margin: '0 auto 0.75rem', opacity: 0.85 }} />
                                        <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>No Pending Amendments</h4>
                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                                            All sales invoices and purchase bills in the active ledger are verified and acknowledged.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                        {filteredAmendments.map((item) => {
                                            const isSales = item.transaction_type === 'Sales';
                                            const delta = parseFloat(item.amount_delta || 0);

                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '0.75rem',
                                                        padding: '1.1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: '1rem'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '280px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            <span style={{
                                                                background: isSales ? 'rgba(34, 197, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                                                color: isSales ? '#86efac' : '#d8b4fe',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                padding: '0.15rem 0.45rem',
                                                                borderRadius: '0.3rem',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {item.transaction_type}
                                                            </span>
                                                            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                                                                {item.invoice_no}
                                                            </span>
                                                            {item.item_name && (
                                                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                                                    • {item.item_name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Before vs After Diff Pill */}
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.65rem',
                                                            background: 'rgba(0, 0, 0, 0.35)',
                                                            padding: '0.4rem 0.85rem',
                                                            borderRadius: '0.5rem',
                                                            marginTop: '0.25rem',
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            <span style={{ color: '#94a3b8' }}>
                                                                Original: <span style={{ textDecoration: 'line-through', color: '#f87171', fontWeight: 600 }}>₹{parseFloat(item.old_value || 0).toLocaleString()}</span>
                                                            </span>
                                                            <ArrowRight size={14} style={{ color: '#94a3b8' }} />
                                                            <span style={{ color: '#e2e8f0' }}>
                                                                Amended: <span style={{ color: '#4ade80', fontWeight: 700 }}>₹{parseFloat(item.new_value || 0).toLocaleString()}</span>
                                                            </span>
                                                            {delta !== 0 && (
                                                                <span style={{
                                                                    color: delta > 0 ? '#4ade80' : '#f87171',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.8rem',
                                                                    marginLeft: '0.35rem'
                                                                }}>
                                                                    ({delta > 0 ? '+' : ''}₹{delta.toLocaleString()})
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.notes && (
                                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                                                                Source: {item.source_file || 'Excel / Ingestion'} • {item.notes}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Row Action Buttons */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <button
                                                            onClick={() => handleAcknowledge(item)}
                                                            disabled={processingId === item.id}
                                                            style={{
                                                                background: '#16a34a',
                                                                border: 'none',
                                                                color: '#ffffff',
                                                                padding: '0.5rem 1rem',
                                                                borderRadius: '0.5rem',
                                                                fontSize: '0.82rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem',
                                                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)'
                                                            }}
                                                        >
                                                            <Check size={15} /> Acknowledge & Apply
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(item)}
                                                            disabled={processingId === item.id}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                color: '#f87171',
                                                                padding: '0.5rem 0.85rem',
                                                                borderRadius: '0.5rem',
                                                                fontSize: '0.82rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem'
                                                            }}
                                                        >
                                                            <X size={15} /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                /* Audit History Tab */
                                historyList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                                        <History size={44} style={{ color: '#60a5fa', margin: '0 auto 0.75rem', opacity: 0.85 }} />
                                        <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>No Audit History Recorded</h4>
                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                                            Past acknowledgments, rejections, and reversions will appear here permanently.
                                        </p>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: '#e2e8f0' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Status</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Invoice / Bill</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Type</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Original</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Amended</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Reviewed By</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Date & Time</th>
                                                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Revert Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyList.map(h => {
                                                const isReverted = h.status === 'reverted';
                                                const isAck = h.status === 'acknowledged';

                                                return (
                                                    <tr key={h.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                        <td style={{ padding: '0.65rem 0.75rem' }}>
                                                            <span style={{
                                                                background: isAck ? 'rgba(34, 197, 94, 0.2)' : isReverted ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                                color: isAck ? '#86efac' : isReverted ? '#fde047' : '#fca5a5',
                                                                padding: '0.15rem 0.45rem',
                                                                borderRadius: '0.3rem',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {h.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{h.invoice_no}</td>
                                                        <td style={{ padding: '0.65rem 0.75rem' }}>{h.transaction_type}</td>
                                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#94a3b8' }}>₹{parseFloat(h.old_value || 0).toLocaleString()}</td>
                                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: isAck ? '#4ade80' : '#94a3b8' }}>
                                                            ₹{parseFloat(h.new_value || 0).toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.75rem', color: '#cbd5e1' }}>{h.acknowledged_by || 'Admin'}</td>
                                                        <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                                                            {h.acknowledged_at ? new Date(h.acknowledged_at).toLocaleString() : 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                                            {isAck && (
                                                                <button
                                                                    onClick={() => handleRevert(h)}
                                                                    disabled={processingId === h.id}
                                                                    style={{
                                                                        background: 'rgba(234, 179, 8, 0.15)',
                                                                        border: '1px solid rgba(234, 179, 8, 0.35)',
                                                                        color: '#fde047',
                                                                        padding: '0.3rem 0.65rem',
                                                                        borderRadius: '0.4rem',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.3rem'
                                                                    }}
                                                                >
                                                                    <RotateCcw size={13} /> Revert to Original
                                                                </button>
                                                            )}
                                                            {isReverted && (
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                                    Reverted
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.015)'
                        }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                Acknowledging updates the active database record. You can revert any acknowledged change at any time from Audit History.
                            </span>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#e2e8f0',
                                    padding: '0.45rem 1rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default TransactionAmendmentBanner;
