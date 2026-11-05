import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';

export const ReconciliationDiscrepancyBanner = ({ selectedMonth, selectedYear, onNavigateToAdmin }) => {
    const [discrepancies, setDiscrepancies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Compute period string from selectedMonth (e.g. "Sep 2026" -> "2026-09-01")
    const getPeriodPrefix = useCallback(() => {
        if (!selectedMonth || selectedMonth === 'Overall') return null;
        const [selMonth, selYear] = selectedMonth.split(' ');
        const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        if (monthMap[selMonth] && selYear) {
            return `${selYear}-${monthMap[selMonth]}`;
        }
        return null;
    }, [selectedMonth]);

    const fetchDiscrepancies = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reconciliation_discrepancies')
                .select('*')
                .eq('resolution_status', 'open')
                .order('created_at', { ascending: false });

            if (!error && data) {
                const prefix = getPeriodPrefix();
                const filtered = prefix 
                    ? data.filter(d => (d.reporting_period && d.reporting_period.startsWith(prefix)) || (d.db_state && d.db_state.date && d.db_state.date.startsWith(prefix)))
                    : data;
                setDiscrepancies(filtered);
            } else {
                setDiscrepancies([]);
            }
        } catch (err) {
            // Table might not exist yet before migration
            setDiscrepancies([]);
        } finally {
            setLoading(false);
        }
    }, [getPeriodPrefix]);

    useEffect(() => {
        fetchDiscrepancies();
        // Listen for custom reconciliation events
        const handleRefresh = () => fetchDiscrepancies();
        window.addEventListener('reconciliationUpdated', handleRefresh);
        return () => window.removeEventListener('reconciliationUpdated', handleRefresh);
    }, [fetchDiscrepancies]);

    if (!discrepancies || discrepancies.length === 0) return null;

    return (
        <div style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(180, 83, 9, 0.12))',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.25)',
                        color: '#fbbf24',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: '#fef3c7', fontSize: '0.95rem' }}>
                                {discrepancies.length} Unresolved Reconciliation Discrepanc{discrepancies.length > 1 ? 'ies' : 'y'} Detected
                            </span>
                            <span style={{
                                background: 'rgba(245, 158, 11, 0.3)',
                                color: '#fde68a',
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                fontWeight: 600
                            }}>
                                {selectedMonth || 'All Periods'}
                            </span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0', color: 'rgba(254, 243, 199, 0.8)', fontSize: '0.8rem' }}>
                            Authoritative Excel workbook differs from database records. Pending missing records remain in operational totals until authorized.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#fef3c7',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                        }}
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {expanded ? 'Hide Details' : 'View Affected Records'}
                    </button>
                    {onNavigateToAdmin && (
                        <button
                            onClick={onNavigateToAdmin}
                            style={{
                                background: '#f59e0b',
                                border: 'none',
                                color: '#1e293b',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: 700
                            }}
                        >
                            <ExternalLink size={16} /> Review in Ingestion
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(245, 158, 11, 0.25)',
                    maxHeight: '220px',
                    overflowY: 'auto'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#fef3c7' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Material</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Weight (kg)</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Discrepancy Nature</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Remarks / Sheet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {discrepancies.map((d, i) => {
                                const st = d.db_state || {};
                                return (
                                    <tr key={d.id || i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '0.4rem 0.6rem' }}>{st.date || 'N/A'}</td>
                                        <td style={{ padding: '0.4rem 0.6rem', textTransform: 'capitalize' }}>{st.type || d.discrepancy_type}</td>
                                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{st.material || 'N/A'}</td>
                                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{st.weight || 0}</td>
                                        <td style={{ padding: '0.4rem 0.6rem', color: '#fbbf24' }}>
                                            {d.discrepancy_type === 'missing_in_file' ? 'Present in DB, missing in Excel' : d.discrepancy_type}
                                        </td>
                                        <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(254, 243, 199, 0.7)' }}>{st.remarks || d.worksheet_name || 'N/A'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReconciliationDiscrepancyBanner;
