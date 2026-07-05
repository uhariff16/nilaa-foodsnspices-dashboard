
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    Briefcase, 
    Plus, 
    Calendar, 
    IndianRupee, 
    HardHat, 
    TrendingUp, 
    Users, 
    Search,
    Trash2,
    Info,
    CheckCircle2,
    AlertCircle,
    Edit
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const InvestmentsDashboard = ({ isAdmin, canWrite = false }) => {
    const hasWriteAccess = isAdmin || canWrite;
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [assets, setAssets] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [stakeholders, setStakeholders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showInvestmentModal, setShowInvestmentModal] = useState(false);
    
    // Edit States
    const [editingAssetId, setEditingAssetId] = useState(null);
    const [editingInvestmentId, setEditingInvestmentId] = useState(null);

    // Form States
    const [assetForm, setAssetForm] = useState({ name: '', category: 'Machinery', purchase_date: new Date().toISOString().split('T')[0], total_cost: '', description: '' });
    const [investmentForm, setInvestmentForm] = useState({ stakeholder_id: '', asset_id: '', amount: '', investment_date: new Date().toISOString().split('T')[0], notes: '', partnership_percentage: '' });
    const [partnerShares, setPartnerShares] = useState({});
    const [paidUpfront, setPaidUpfront] = useState(false);
    const [upfrontPayerId, setUpfrontPayerId] = useState('');
    const [selectedAssetIds, setSelectedAssetIds] = useState([]);
    const [gstAmount, setGstAmount] = useState('');
    const [showGlobalSettlementModal, setShowGlobalSettlementModal] = useState(false);
    const [globalSettlement, setGlobalSettlement] = useState({ payerId: '', payerName: '', debtorId: '', debtorName: '', outstanding: 0 });
    const [settlementAmount, setSettlementAmount] = useState('');
    const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
    const [settlementNotes, setSettlementNotes] = useState('');
    const [selectedInvestmentIds, setSelectedInvestmentIds] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'investment_date', direction: 'desc' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assetsRes, investmentsRes, stakeholdersRes] = await Promise.all([
                supabase.from('business_assets').select('*').order('purchase_date', { ascending: false }),
                supabase.from('partner_investments').select('*, business_assets(name, total_cost), profit_stakeholders(name)').order('investment_date', { ascending: false }),
                supabase.from('profit_stakeholders').select('*').eq('is_active', true)
            ]);

            if (assetsRes.data) setAssets(assetsRes.data);
            if (investmentsRes.data) setInvestments(investmentsRes.data);
            if (stakeholdersRes.data) setStakeholders(stakeholdersRes.data);
        } catch (error) {
            console.error("Error fetching investment data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAsset = async (e) => {
        e.preventDefault();
        try {
            if (editingAssetId) {
                const { error } = await supabase.from('business_assets').update(assetForm).eq('id', editingAssetId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('business_assets').insert([assetForm]);
                if (error) throw error;
            }
            setShowAssetModal(false);
            setEditingAssetId(null);
            setAssetForm({ name: '', category: 'Machinery', purchase_date: new Date().toISOString().split('T')[0], total_cost: '', description: '' });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleAddInvestment = async (e) => {
        e.preventDefault();
        try {
            const isDistribution = ['all', 'unequal'].includes(investmentForm.stakeholder_id);
            const totalAmount = Number(investmentForm.amount);
            const gstVal = Number(gstAmount) || 0;
            const totalCapital = totalAmount + gstVal;

            let upfrontPrefix = '';
            if (isDistribution && paidUpfront && upfrontPayerId) {
                const payerName = stakeholders.find(s => s.id === upfrontPayerId)?.name || 'Partner';
                upfrontPrefix = `[PaidUpfrontBy:${upfrontPayerId}:${payerName}]`;
            }

            if (isDistribution) {
                if (investmentForm.stakeholder_id === 'unequal') {
                    if (editingInvestmentId) {
                        const payload = {
                            stakeholder_id: investmentForm.stakeholder_id,
                            asset_id: investmentForm.asset_id || null,
                            amount: totalCapital,
                            partnership_percentage: 100,
                            investment_date: investmentForm.investment_date,
                            notes: `[GST: ${gstVal}][Total: ${totalCapital}] ${investmentForm.notes}`.trim()
                        };
                        const { error } = await supabase.from('partner_investments').update(payload).eq('id', editingInvestmentId);
                        if (error) throw error;
                    } else {
                        // Distribute to active partners unequally across selected assets (or null if general)
                        const assetIdList = selectedAssetIds.length > 0 ? selectedAssetIds : [null];
                        const promises = [];
                        
                        assetIdList.forEach((assetId) => {
                            const assetTotal = assetId 
                                ? Number(assets.find(a => a.id === assetId)?.total_cost || 0)
                                : totalAmount;
                            const ratio = (assetId && totalAmount > 0) ? (assetTotal / totalAmount) : 1;
                            const assetGst = Math.round(gstVal * ratio);
                            const assetGrandTotal = assetTotal + assetGst;

                            stakeholders.forEach((partner) => {
                                const partnerTotalAmount = Number(partnerShares[partner.id]) || 0;
                                const partnerAmount = Math.round(partnerTotalAmount * (assetGrandTotal / totalAmount));
                                if (partnerAmount === 0) return;
                                
                                const pct = Number(((partnerAmount / assetGrandTotal) * 100).toFixed(2));
                                const payload = {
                                    stakeholder_id: partner.id,
                                    asset_id: assetId,
                                    amount: partnerAmount,
                                    partnership_percentage: pct,
                                    investment_date: investmentForm.investment_date,
                                    notes: `${upfrontPrefix}[GST: ${assetGst}][Total: ${assetGrandTotal}] ${investmentForm.notes}`.trim()
                                };
                                promises.push(supabase.from('partner_investments').insert([payload]));
                            });
                        });
                        const results = await Promise.all(promises);
                        for (const res of results) {
                            if (res && res.error) throw res.error;
                        }
                    }
                } else {
                    if (editingInvestmentId) {
                        const pct = Number((100 / stakeholders.length).toFixed(2));
                        const partnerAmount = Math.round(totalCapital / stakeholders.length);
                        const payload = {
                            stakeholder_id: investmentForm.stakeholder_id,
                            asset_id: investmentForm.asset_id || null,
                            amount: partnerAmount,
                            partnership_percentage: pct,
                            investment_date: investmentForm.investment_date,
                            notes: `[GST: ${gstVal}][Total: ${totalCapital}] ${investmentForm.notes}`.trim()
                        };
                        const { error } = await supabase.from('partner_investments').update(payload).eq('id', editingInvestmentId);
                        if (error) throw error;
                    } else {
                        // Distribute to all active partners equally across selected assets (or null if general)
                        const assetIdList = selectedAssetIds.length > 0 ? selectedAssetIds : [null];
                        const promises = [];
                        
                        assetIdList.forEach((assetId) => {
                            const assetTotal = assetId 
                                ? Number(assets.find(a => a.id === assetId)?.total_cost || 0)
                                : totalAmount;
                            const ratio = (assetId && totalAmount > 0) ? (assetTotal / totalAmount) : 1;
                            const assetGst = Math.round(gstVal * ratio);
                            const assetGrandTotal = assetTotal + assetGst;
                            
                            const pct = Number((100 / stakeholders.length).toFixed(2));
                            const partnerAmount = Math.round(assetGrandTotal / stakeholders.length);

                            stakeholders.forEach((partner) => {
                                const payload = {
                                    stakeholder_id: partner.id,
                                    asset_id: assetId,
                                    amount: partnerAmount,
                                    partnership_percentage: pct,
                                    investment_date: investmentForm.investment_date,
                                    notes: `${upfrontPrefix}[GST: ${assetGst}][Total: ${assetGrandTotal}] ${investmentForm.notes}`.trim()
                                };
                                promises.push(supabase.from('partner_investments').insert([payload]));
                            });
                        });
                        const results = await Promise.all(promises);
                        for (const res of results) {
                            if (res.error) throw res.error;
                        }
                    }
                }
            } else {
                if (editingInvestmentId) {
                    let pct = investmentForm.partnership_percentage ? Number(investmentForm.partnership_percentage) : 0;
                    const payload = { 
                        stakeholder_id: investmentForm.stakeholder_id,
                        asset_id: investmentForm.asset_id || null,
                        amount: totalCapital,
                        partnership_percentage: pct,
                        investment_date: investmentForm.investment_date,
                        notes: `[GST: ${gstVal}][Total: ${totalCapital}] ${investmentForm.notes}`.trim()
                    };
                    const { error } = await supabase.from('partner_investments').update(payload).eq('id', editingInvestmentId);
                    if (error) throw error;
                } else {
                    const assetIdList = selectedAssetIds.length > 0 ? selectedAssetIds : [null];
                    const promises = assetIdList.map((assetId) => {
                        const assetTotal = assetId 
                            ? Number(assets.find(a => a.id === assetId)?.total_cost || 0)
                            : totalAmount;
                        const ratio = (assetId && totalAmount > 0) ? (assetTotal / totalAmount) : 1;
                        const assetGst = Math.round(gstVal * ratio);
                        const assetGrandTotal = assetTotal + assetGst;

                        const pct = investmentForm.partnership_percentage ? Number(investmentForm.partnership_percentage) : 0;
                        const payload = {
                            stakeholder_id: investmentForm.stakeholder_id,
                            asset_id: assetId,
                            amount: assetGrandTotal,
                            partnership_percentage: pct,
                            investment_date: investmentForm.investment_date,
                            notes: `[GST: ${assetGst}][Total: ${assetGrandTotal}] ${investmentForm.notes}`.trim()
                        };
                        return supabase.from('partner_investments').insert([payload]);
                    });
                    const results = await Promise.all(promises);
                    for (const res of results) {
                        if (res && res.error) throw res.error;
                    }
                }
            }
            setShowInvestmentModal(false);
            setEditingInvestmentId(null);
            setInvestmentForm({ stakeholder_id: '', asset_id: '', amount: '', investment_date: new Date().toISOString().split('T')[0], notes: '', partnership_percentage: '' });
            setPartnerShares({});
            setSelectedAssetIds([]);
            setGstAmount('');
            setPaidUpfront(false);
            setUpfrontPayerId('');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleMarkSettled = async (inv) => {
        try {
            const nextNotes = `[Settled]${inv.notes}`;
            const { error } = await supabase.from('partner_investments').update({ notes: nextNotes }).eq('id', inv.id);
            if (error) throw error;
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleSaveGlobalSettlement = async (e) => {
        e.preventDefault();
        if (!globalSettlement.payerId || !globalSettlement.debtorId) return;
        try {
            const enteredAmount = Number(settlementAmount);
            if (enteredAmount <= 0) throw new Error('Please enter a valid amount.');
            if (enteredAmount > globalSettlement.outstanding) {
                throw new Error(`Entered amount exceeds remaining outstanding of ${globalSettlement.outstanding}`);
            }

            // Find all investments where debtor is the stakeholder and payer paid upfront
            const debtorInvestments = investments.filter(inv => {
                const upfrontMatch = inv.notes?.match(/\[PaidUpfrontBy:([^:]+):([^\]]+)\]/);
                if (upfrontMatch) {
                    const payerId = upfrontMatch[1];
                    const reimbMatch = inv.notes?.match(/\[Reimbursed:\s*(\d+)\]/);
                    const rowReimbAmt = reimbMatch ? Number(reimbMatch[1]) : 0;
                    const rowOwed = Number(inv.amount) - rowReimbAmt;
                    const isSettled = inv.notes?.includes('[Settled]') || rowOwed <= 0;
                    const isPayer = inv.stakeholder_id === payerId;
                    
                    return inv.stakeholder_id === globalSettlement.debtorId && payerId === globalSettlement.payerId && !isPayer && !isSettled;
                }
                return false;
            });

            // Sort by date ascending (oldest first)
            debtorInvestments.sort((a, b) => new Date(a.investment_date || 0) - new Date(b.investment_date || 0));

            let remainingPayment = enteredAmount;
            const promises = [];
            const appliedList = [];

            for (const inv of debtorInvestments) {
                if (remainingPayment <= 0) break;

                const reimbMatch = inv.notes?.match(/\[Reimbursed:\s*(\d+)\]/);
                const currentReimbursed = reimbMatch ? Number(reimbMatch[1]) : 0;
                const rowOwed = Number(inv.amount) - currentReimbursed;

                if (rowOwed <= 0) continue;

                const paymentForThisRow = Math.min(remainingPayment, rowOwed);
                const nextReimbursed = currentReimbursed + paymentForThisRow;
                
                appliedList.push(`${inv.id}=${paymentForThisRow}`);

                let nextNotes = inv.notes || '';
                // Remove existing [Reimbursed: X] tag
                nextNotes = nextNotes.replace(/\[Reimbursed:\s*\d+\]/, '');
                // Prepend new [Reimbursed: X] tag
                nextNotes = `[Reimbursed: ${nextReimbursed}]${nextNotes.replace(/\[Settled\]/, '').trim()}`;

                if (nextReimbursed >= Number(inv.amount)) {
                    nextNotes = `[Settled]${nextNotes}`;
                }

                promises.push(supabase.from('partner_investments').update({ notes: nextNotes }).eq('id', inv.id));
                remainingPayment -= paymentForThisRow;
            }

            const results = await Promise.all(promises);
            for (const res of results) {
                if (res && res.error) throw res.error;
            }

            // Create a payment log entry in partner_investments
            const paymentNotes = `[ReimbursementPayment:${enteredAmount}:${globalSettlement.payerId}:${globalSettlement.payerName}:${appliedList.join(',')}] ${settlementNotes.trim()}`;
            const paymentPayload = {
                stakeholder_id: globalSettlement.debtorId,
                asset_id: null,
                amount: 0,
                investment_date: settlementDate,
                notes: paymentNotes
            };

            const { error: insertError } = await supabase.from('partner_investments').insert([paymentPayload]);
            if (insertError) throw insertError;

            setShowGlobalSettlementModal(false);
            setGlobalSettlement({ payerId: '', payerName: '', debtorId: '', debtorName: '', outstanding: 0 });
            setSettlementAmount('');
            setSettlementDate(new Date().toISOString().split('T')[0]);
            setSettlementNotes('');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedInvestments = () => {
        const filtered = investments.filter(inv => !inv.notes?.includes('[ReimbursementPayment:'));
        const sorted = [...filtered];
        sorted.sort((a, b) => {
            let valA, valB;

            switch (sortConfig.key) {
                case 'investment_date':
                    valA = new Date(a.investment_date || 0);
                    valB = new Date(b.investment_date || 0);
                    break;
                case 'partner':
                    valA = a.profit_stakeholders?.name || '';
                    valB = b.profit_stakeholders?.name || '';
                    break;
                case 'asset':
                    valA = a.business_assets?.name || 'General Capital';
                    valB = b.business_assets?.name || 'General Capital';
                    break;
                case 'total_capital':
                    const totalCostMatchA = a.notes?.match(/\[Total:\s*(\d+)\]/);
                    valA = totalCostMatchA ? Number(totalCostMatchA[1]) : (a.business_assets?.total_cost ? Number(a.business_assets.total_cost) : 0);
                    const totalCostMatchB = b.notes?.match(/\[Total:\s*(\d+)\]/);
                    valB = totalCostMatchB ? Number(totalCostMatchB[1]) : (b.business_assets?.total_cost ? Number(b.business_assets.total_cost) : 0);
                    break;
                case 'amount':
                    valA = Number(a.amount || 0);
                    valB = Number(b.amount || 0);
                    break;
                case 'partnership_percentage':
                    valA = Number(a.partnership_percentage || 0);
                    valB = Number(b.partnership_percentage || 0);
                    break;
                default:
                    valA = a[sortConfig.key];
                    valB = b[sortConfig.key];
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    };

    const handleEditAssetClick = (asset) => {
        setAssetForm({
            name: asset.name,
            category: asset.category || 'Machinery',
            purchase_date: asset.purchase_date,
            total_cost: asset.total_cost,
            description: asset.description || ''
        });
        setEditingAssetId(asset.id);
        setShowAssetModal(true);
    };

    const handleEditInvestmentClick = (inv) => {
        let formAmount = inv.amount;
        const isGeneral = !inv.asset_id;
        if (isGeneral) {
            const totalCostMatch = inv.notes?.match(/\[Total:\s*(\d+)\]/);
            if (totalCostMatch) {
                formAmount = totalCostMatch[1];
            } else if (inv.partnership_percentage && Number(inv.partnership_percentage) > 0) {
                formAmount = Math.round(Number(inv.amount) / (Number(inv.partnership_percentage) / 100)).toString();
            }
        }

        const gstMatch = inv.notes?.match(/\[GST:\s*(\d+)\]/);
        const gstVal = gstMatch ? gstMatch[1] : '';
        setGstAmount(gstVal);

        setInvestmentForm({
            stakeholder_id: inv.stakeholder_id,
            asset_id: inv.asset_id || '',
            amount: formAmount,
            investment_date: inv.investment_date,
            notes: inv.notes ? inv.notes.replace(/\[GST:\s*\d+\]/, '').replace(/\[Total:\s*\d+\]/, '').replace(/\[PaidUpfrontBy:[^\]]+\]/, '').trim() : '',
            partnership_percentage: inv.partnership_percentage || ''
        });
        setSelectedAssetIds(inv.asset_id ? [inv.asset_id] : []);
        setEditingInvestmentId(inv.id);
        setShowInvestmentModal(true);
    };

    const handleAssetChange = (assetId) => {
        const selectedAsset = assets.find(a => a.id === assetId);
        let amount = investmentForm.amount;
        if (selectedAsset && investmentForm.partnership_percentage) {
            const pct = Number(investmentForm.partnership_percentage);
            if (!isNaN(pct) && pct > 0) {
                amount = Math.round((Number(selectedAsset.total_cost) * pct) / 100).toString();
            }
        }
        setInvestmentForm(prev => ({
            ...prev,
            asset_id: assetId,
            amount: amount
        }));
    };

    const handlePercentageChange = (pctValue) => {
        let amount = investmentForm.amount;
        const selectedAsset = assets.find(a => a.id === investmentForm.asset_id);
        if (selectedAsset && pctValue) {
            const pct = Number(pctValue);
            if (!isNaN(pct) && pct > 0) {
                amount = Math.round((Number(selectedAsset.total_cost) * pct) / 100).toString();
            }
        }
        setInvestmentForm(prev => ({
            ...prev,
            partnership_percentage: pctValue,
            amount: amount
        }));
    };

    const handleDeleteAsset = async (id) => {
        if (!window.confirm("Are you sure? This will not delete related investments but will unlinked them.")) return;
        await supabase.from('business_assets').delete().eq('id', id);
        fetchData();
    };

    const handleDeleteInvestment = async (id) => {
        const inv = investments.find(i => i.id === id);
        const isPayment = inv?.notes?.includes('[ReimbursementPayment:');

        if (isPayment) {
            if (!window.confirm("Delete this payment record? This will revert the outstanding balances of the affected investments.")) return;
            try {
                const match = inv.notes.match(/\[ReimbursementPayment:([^:]+):([^:]+):([^:]+):([^\]]*)\]/);
                if (match) {
                    const appliedDebtsStr = match[4];
                    if (appliedDebtsStr) {
                        const appliedDebts = appliedDebtsStr.split(',');
                        const updatePromises = [];
                        
                        for (const debt of appliedDebts) {
                            const [debtId, paidAmtStr] = debt.split('=');
                            const paidAmt = Number(paidAmtStr);
                            
                            const debtInv = investments.find(i => i.id === debtId);
                            if (debtInv) {
                                const originalNotes = debtInv.notes || '';
                                const reimbMatch = originalNotes.match(/\[Reimbursed:\s*(\d+)\]/);
                                const currentReimb = reimbMatch ? Number(reimbMatch[1]) : 0;
                                const nextReimb = Math.max(0, currentReimb - paidAmt);
                                
                                let nextNotes = originalNotes.replace(/\[Reimbursed:\s*\d+\]/, '');
                                nextNotes = nextNotes.replace(/\[Settled\]/, '');
                                
                                if (nextReimb > 0) {
                                    nextNotes = `[Reimbursed: ${nextReimb}]${nextNotes.trim()}`;
                                } else {
                                    nextNotes = nextNotes.trim();
                                }
                                
                                updatePromises.push(supabase.from('partner_investments').update({ notes: nextNotes }).eq('id', debtId));
                            }
                        }
                        const results = await Promise.all(updatePromises);
                        for (const res of results) {
                            if (res && res.error) throw res.error;
                        }
                    }
                }
            } catch (err) {
                alert(`Failed to revert payment: ${err.message}`);
                return;
            }
        } else {
            if (!window.confirm("Delete this investment record?")) return;
        }

        const { error } = await supabase.from('partner_investments').delete().eq('id', id);
        if (error) {
            alert(`Failed to delete record: ${error.message}`);
        } else {
            fetchData();
        }
    };

    const handleBulkDeleteInvestments = async () => {
        if (selectedInvestmentIds.length === 0) return;
        if (!window.confirm(`Delete the ${selectedInvestmentIds.length} selected contribution records?`)) return;
        try {
            const { error } = await supabase.from('partner_investments').delete().in('id', selectedInvestmentIds);
            if (error) throw error;
            setSelectedInvestmentIds([]);
            fetchData();
        } catch (err) {
            alert(`Failed to delete records: ${err.message}`);
        }
    };

    // Calculations
    const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.total_cost), 0);
    const totalInvested = investments.reduce((sum, i) => sum + Number(i.amount), 0);
    
    // Capital Allocation splits (linked to 100%)
    const assetLinkedInvested = investments.filter(i => i.asset_id !== null).reduce((sum, i) => sum + Number(i.amount), 0);
    const generalCapitalInvested = investments.filter(i => i.asset_id === null).reduce((sum, i) => sum + Number(i.amount), 0);
    const assetPct = totalInvested > 0 ? (assetLinkedInvested / totalInvested) * 100 : 0;
    const generalPct = totalInvested > 0 ? (generalCapitalInvested / totalInvested) * 100 : 0;

    // Asset Funding Health Summary
    const assetFundingStats = assets.reduce((stats, asset) => {
        const funded = investments.filter(i => i.asset_id === asset.id).reduce((s, i) => s + Number(i.amount), 0);
        const pct = asset.total_cost > 0 ? (funded / asset.total_cost) * 100 : 0;
        if (pct >= 99.9) {
            stats.fullyFunded += 1;
        } else {
            stats.partiallyFunded += 1;
        }
        stats.totalFundingPct += Math.min(100, pct);
        return stats;
    }, { fullyFunded: 0, partiallyFunded: 0, totalFundingPct: 0 });
    const avgFundingPct = assets.length > 0 ? (assetFundingStats.totalFundingPct / assets.length) : 0;

    // Outstanding partner reimbursement summary
    const reimbursementSummary = {};
    investments.forEach(inv => {
        const upfrontMatch = inv.notes?.match(/\[PaidUpfrontBy:([^:]+):([^\]]+)\]/);
        if (upfrontMatch) {
            const payerId = upfrontMatch[1];
            const payerName = upfrontMatch[2];
            const reimbMatch = inv.notes?.match(/\[Reimbursed:\s*(\d+)\]/);
            const rowReimbAmt = reimbMatch ? Number(reimbMatch[1]) : 0;
            const rowOwed = Number(inv.amount) - rowReimbAmt;
            const isSettled = inv.notes?.includes('[Settled]') || rowOwed <= 0;
            const isPayer = inv.stakeholder_id === payerId;
            
            if (!isPayer && !isSettled) {
                const debtorName = inv.profit_stakeholders?.name || 'Partner';
                if (!reimbursementSummary[payerName]) {
                    reimbursementSummary[payerName] = {};
                }
                if (!reimbursementSummary[payerName][debtorName]) {
                    reimbursementSummary[payerName][debtorName] = 0;
                }
                reimbursementSummary[payerName][debtorName] += rowOwed;
            }
        }
    });

    const partnerTotals = stakeholders.map(s => {
        const total = investments.filter(i => i.stakeholder_id === s.id).reduce((sum, i) => sum + Number(i.amount), 0);
        return { name: s.name, value: total };
    }).filter(p => p.value > 0);

    // Partner Capital distribution splits (Asset vs General)
    const partnerCapitalData = stakeholders.map(s => {
        const assetCap = investments.filter(i => i.stakeholder_id === s.id && i.asset_id).reduce((sum, i) => sum + Number(i.amount), 0);
        const generalCap = investments.filter(i => i.stakeholder_id === s.id && !i.asset_id).reduce((sum, i) => sum + Number(i.amount), 0);
        return {
            name: s.name,
            'Asset Capital': assetCap,
            'General Capital': generalCap,
            total: assetCap + generalCap
        };
    }).filter(p => p.total > 0);

    // Capital Inflow monthly trend grouping with Cumulative Growth
    const getMonthlyInflowData = () => {
        const monthlyMap = {};
        const sortedInvs = [...investments].sort((a, b) => new Date(a.investment_date) - new Date(b.investment_date));
        sortedInvs.forEach(inv => {
            if (!inv.investment_date) return;
            const date = new Date(inv.investment_date);
            const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            monthlyMap[monthLabel] = (monthlyMap[monthLabel] || 0) + Number(inv.amount);
        });
        
        let cumulative = 0;
        return Object.keys(monthlyMap).map(key => {
            const inflow = monthlyMap[key];
            cumulative += inflow;
            return {
                month: key,
                'Monthly Inflow': inflow,
                'Total Capital Growth': cumulative
            };
        });
    };
    const monthlyInflowData = getMonthlyInflowData();

    const assetBreakdown = assets.map(a => ({
        name: a.name,
        cost: Number(a.total_cost),
        invested: investments.filter(i => i.asset_id === a.id).reduce((sum, i) => sum + Number(i.amount), 0)
    }));

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    const formatCompactCurrency = (val) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
        return `₹${val}`;
    };

    if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Investments Data...</div>;

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header Cards */}
            <div className="responsive-grid-4" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Asset Value</p>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(totalAssetValue)}</h2>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <HardHat color="#3b82f6" size={24} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        Registered physical machinery assets
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Partner Capital</p>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(totalInvested)}</h2>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <TrendingUp color="#10b981" size={24} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        Cumulative partner funds recorded
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Machinery & Health</p>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{assets.length} Items</h2>
                        </div>
                        <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                            <Briefcase color="#8b5cf6" size={20} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        <span>Fully Funded: {assetFundingStats.fullyFunded}</span>
                        <span>Avg: {avgFundingPct.toFixed(0)}%</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Capital Allocation</p>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'baseline', gap: '0.35rem', color: '#f59e0b' }}>
                                <span>Asset: {assetPct.toFixed(0)}%</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>|</span>
                                <span>Gen: {generalPct.toFixed(0)}%</span>
                            </h2>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                            <Users color="#f59e0b" size={20} />
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', width: '100%', height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '0.25rem 0', background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ width: `${assetPct}%`, background: '#3b82f6' }} title={`Asset-Linked: ${assetPct.toFixed(1)}%`} />
                            <div style={{ width: `${generalPct}%`, background: '#10b981' }} title={`General Capital: ${generalPct.toFixed(1)}%`} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>{formatCurrency(assetLinkedInvested)}</span>
                            <span>{formatCurrency(generalCapitalInvested)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Users size={18} color="#3b82f6" /> Partner Equity Share
                    </h3>
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={partnerTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => `${e.name} (${((e.value/totalInvested)*100).toFixed(1)}%)`}>
                                    {partnerTotals.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '0.5rem', color: 'white' }} itemStyle={{ color: 'white' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Users size={18} color="#8b5cf6" /> Partner Capital Breakdown
                    </h3>
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={partnerCapitalData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                                <YAxis stroke="var(--text-secondary)" fontSize={11} tickFormatter={formatCompactCurrency} />
                                <Tooltip formatter={(val) => formatCurrency(val)} cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '0.5rem', color: 'white' }} itemStyle={{ color: 'white' }} />
                                <Bar dataKey="Asset Capital" name="Asset Capital" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="General Capital" name="General Capital" stackId="a" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Briefcase size={18} color="#10b981" /> Investment vs Asset Cost
                    </h3>
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetBreakdown.slice(0, 5)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} angle={-15} textAnchor="end" height={45} tickFormatter={(name) => name.length > 15 ? name.substring(0, 13) + '...' : name} />
                                <YAxis stroke="var(--text-secondary)" fontSize={11} tickFormatter={formatCompactCurrency} />
                                <Tooltip formatter={(val) => formatCurrency(val)} cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '0.5rem', color: 'white' }} itemStyle={{ color: 'white' }} />
                                <Bar dataKey="cost" name="Asset Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="invested" name="Partner Funding" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Calendar size={18} color="#3b82f6" /> Capital Inflow & Growth Trend
                    </h3>
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyInflowData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                                <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={11} tickFormatter={formatCompactCurrency} />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={11} tickFormatter={formatCompactCurrency} />
                                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '0.5rem', color: 'white' }} itemStyle={{ color: 'white' }} />
                                <Bar yAxisId="left" dataKey="Monthly Inflow" name="Monthly Inflow" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="Total Capital Growth" name="Total Capital Growth" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Asset Management */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HardHat size={20} color="#8b5cf6" /> Asset & Machinery Ledger
                    </h3>
                    {hasWriteAccess && (
                        <button onClick={() => { setEditingAssetId(null); setAssetForm({ name: '', category: 'Machinery', purchase_date: new Date().toISOString().split('T')[0], total_cost: '', description: '' }); setShowAssetModal(true); }} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={16} /> Add Asset
                        </button>
                    )}
                </div>
                <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Asset Name</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Category</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Purchase Date</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Total Cost</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Funding %</th>
                                {hasWriteAccess && <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map(asset => {
                                const funded = investments.filter(i => i.asset_id === asset.id).reduce((s, i) => s + Number(i.amount), 0);
                                const pct = (funded / asset.total_cost) * 100;
                                return (
                                    <tr key={asset.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{asset.name}</td>
                                        <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{asset.category}</span></td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(asset.purchase_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{formatCurrency(asset.total_cost)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '4px' }}>
                                                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: pct >= 100 ? '#10b981' : '#f59e0b', borderRadius: '3px' }} />
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pct.toFixed(0)}% Funded</span>
                                        </td>
                                        {hasWriteAccess && (
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                    <button onClick={() => handleEditAssetClick(asset)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteAsset(asset.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Investment Records */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <TrendingUp size={20} color="#10b981" /> Partner Contribution History
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {hasWriteAccess && selectedInvestmentIds.length > 0 && (
                            <button 
                                onClick={handleBulkDeleteInvestments} 
                                style={{ 
                                    background: '#ef4444', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '0.5rem', 
                                    padding: '0.5rem 1rem', 
                                    cursor: 'pointer', 
                                    fontWeight: 600, 
                                    fontSize: '0.875rem',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Trash2 size={16} /> Delete Selected ({selectedInvestmentIds.length})
                            </button>
                        )}
                        {hasWriteAccess && (
                            <button onClick={() => { setEditingInvestmentId(null); setInvestmentForm({ stakeholder_id: 'all', asset_id: '', amount: '', investment_date: new Date().toISOString().split('T')[0], notes: '', partnership_percentage: '' }); setPartnerShares({}); setPaidUpfront(false); setUpfrontPayerId(''); setShowInvestmentModal(true); }} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={16} /> Record Investment
                            </button>
                        )}
                    </div>
                </div>
                {Object.keys(reimbursementSummary).length > 0 && (
                    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.02)' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                            <TrendingUp size={16} /> Outstanding Partner Reimbursements (Pending Settlements)
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                            {Object.entries(reimbursementSummary).map(([payer, debtors]) => (
                                <div key={payer} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        To be received by <span style={{ color: '#10b981' }}>{payer}</span>:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {Object.entries(debtors).map(([debtor, amt]) => (
                                            <div key={debtor} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.15rem 0' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>• from {debtor}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(amt)}</span>
                                                    {hasWriteAccess && (
                                                        <button 
                                                            onClick={() => {
                                                                const payerId = stakeholders.find(s => s.name === payer)?.id;
                                                                const debtorId = stakeholders.find(s => s.name === debtor)?.id;
                                                                if (payerId && debtorId) {
                                                                    setGlobalSettlement({
                                                                        payerId,
                                                                        payerName: payer,
                                                                        debtorId,
                                                                        debtorName: debtor,
                                                                        outstanding: amt
                                                                    });
                                                                    setSettlementAmount(amt.toString());
                                                                    setShowGlobalSettlementModal(true);
                                                                }
                                                            }}
                                                            style={{
                                                                background: '#f59e0b',
                                                                color: '#1e293b',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                padding: '2px 8px',
                                                                fontSize: '0.7rem',
                                                                cursor: 'pointer',
                                                                fontWeight: 700,
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            Settle / Pay
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                {hasWriteAccess && (
                                    <th style={{ padding: '1rem', width: '40px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={getSortedInvestments().length > 0 && selectedInvestmentIds.length === getSortedInvestments().length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedInvestmentIds(getSortedInvestments().map(i => i.id));
                                                } else {
                                                    setSelectedInvestmentIds([]);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                )}
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('investment_date')}>
                                    Date {sortConfig.key === 'investment_date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('partner')}>
                                    Partner {sortConfig.key === 'partner' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('asset')}>
                                    Purpose / Asset {sortConfig.key === 'asset' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('total_capital')}>
                                    Total Capital {sortConfig.key === 'total_capital' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                                    Amount {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('partnership_percentage')}>
                                    Partnership % {sortConfig.key === 'partnership_percentage' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Notes</th>
                                {hasWriteAccess && <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedInvestments().map(inv => {
                                const totalCostMatch = inv.notes?.match(/\[Total:\s*(\d+)\]/);
                                const totalCapitalVal = totalCostMatch ? Number(totalCostMatch[1]) : (inv.business_assets?.total_cost ? Number(inv.business_assets.total_cost) : null);
                                const gstMatch = inv.notes?.match(/\[GST:\s*(\d+)\]/);
                                const rowGst = gstMatch ? Number(gstMatch[1]) : null;
                                const rowReimbAmt = inv.notes?.match(/\[Reimbursed:\s*(\d+)\]/) ? Number(inv.notes.match(/\[Reimbursed:\s*(\d+)\]/)[1]) : 0;
                                const rowOwed = Number(inv.amount) - rowReimbAmt;
                                const isSettled = inv.notes?.includes('[Settled]') || rowOwed <= 0;
                                const displayNotes = inv.notes 
                                    ? inv.notes.replace(/\[Settled\]/, '').replace(/\[PaidUpfrontBy:[^\]]+\]/, '').replace(/\[Total:\s*\d+\]/, '').replace(/\[GST:\s*\d+\]/, '').replace(/\[Reimbursed:\s*\d+\]/, '').trim() 
                                    : '';
                                const upfrontMatch = inv.notes?.match(/\[PaidUpfrontBy:([^:]+):([^\]]+)\]/);
                                const payerId = upfrontMatch ? upfrontMatch[1] : null;
                                const payerName = upfrontMatch ? upfrontMatch[2] : '';
                                const isPayer = payerId && inv.stakeholder_id === payerId;

                                // Calculate payer remaining reimbursement to be received
                                let payerRemainingRecv = 0;
                                let allPeersSettled = false;
                                if (isPayer && upfrontMatch) {
                                    const cleanNotesVal = inv.notes ? inv.notes.replace(/\[Settled\]/, '').replace(/\[PaidUpfrontBy:[^\]]+\]/, '').replace(/\[Reimbursed:\s*\d+\]/, '').trim() : '';
                                    const peerRows = investments.filter(i => i.id !== inv.id && i.investment_date === inv.investment_date && (i.notes ? i.notes.replace(/\[Settled\]/, '').replace(/\[PaidUpfrontBy:[^\]]+\]/, '').replace(/\[Reimbursed:\s*\d+\]/, '').trim() : '') === cleanNotesVal);
                                    const unpaidPeers = peerRows.filter(i => {
                                        const peerReimbAmt = i.notes?.match(/\[Reimbursed:\s*(\d+)\]/) ? Number(i.notes.match(/\[Reimbursed:\s*(\d+)\]/)[1]) : 0;
                                        const peerOwed = Number(i.amount) - peerReimbAmt;
                                        return !i.notes?.includes('[Settled]') && peerOwed > 0;
                                    });
                                    payerRemainingRecv = unpaidPeers.reduce((sum, i) => {
                                        const peerReimbAmt = i.notes?.match(/\[Reimbursed:\s*(\d+)\]/) ? Number(i.notes.match(/\[Reimbursed:\s*(\d+)\]/)[1]) : 0;
                                        return sum + (Number(i.amount) - peerReimbAmt);
                                    }, 0);
                                    allPeersSettled = peerRows.length > 0 && unpaidPeers.length === 0;
                                }

                                return (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {hasWriteAccess && (
                                            <td style={{ padding: '1rem', width: '40px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedInvestmentIds.includes(inv.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedInvestmentIds(prev => [...prev, inv.id]);
                                                        } else {
                                                            setSelectedInvestmentIds(prev => prev.filter(id => id !== inv.id));
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                        )}
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(inv.investment_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{inv.profit_stakeholders?.name}</span>
                                                {upfrontMatch && (
                                                    isPayer ? (
                                                        allPeersSettled ? (
                                                            <span style={{ 
                                                                fontSize: '0.7rem', 
                                                                color: '#10b981', 
                                                                background: 'rgba(16, 185, 129, 0.1)', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '4px', 
                                                                width: 'fit-content',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                fontWeight: 600
                                                            }}>
                                                                ✓ All Settled
                                                            </span>
                                                        ) : (
                                                            <span style={{ 
                                                                fontSize: '0.7rem', 
                                                                color: '#10b981', 
                                                                background: 'rgba(16, 185, 129, 0.1)', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '4px', 
                                                                width: 'fit-content',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                fontWeight: 500
                                                            }}>
                                                                Paid Upfront (To Recv ₹{payerRemainingRecv.toLocaleString()})
                                                            </span>
                                                        )
                                                    ) : (
                                                        isSettled ? (
                                                            <span style={{ 
                                                                fontSize: '0.7rem', 
                                                                color: '#10b981', 
                                                                background: 'rgba(16, 185, 129, 0.1)', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '4px', 
                                                                width: 'fit-content',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                fontWeight: 600
                                                            }}>
                                                                ✓ Settled with {payerName}
                                                            </span>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.7rem', 
                                                                    color: '#f59e0b', 
                                                                    background: 'rgba(245, 158, 11, 0.1)', 
                                                                    padding: '2px 6px', 
                                                                    borderRadius: '4px', 
                                                                    width: 'fit-content',
                                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                                    fontWeight: 500
                                                                }}>
                                                                    Owes ₹{rowOwed.toLocaleString()} to {payerName} {rowReimbAmt > 0 && `(Paid ₹${rowReimbAmt.toLocaleString()})`}
                                                                </span>
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{inv.business_assets?.name || <span style={{ color: '#10b981' }}>General Capital</span>}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>{totalCapitalVal ? formatCurrency(totalCapitalVal) : '-'}</span>
                                                {rowGst && rowGst > 0 && (
                                                    <span style={{ fontSize: '0.72rem', color: '#a8a29e', fontWeight: 400, marginTop: '2px' }}>
                                                        (incl. GST ₹{rowGst.toLocaleString()})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(inv.amount)}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.partnership_percentage ? `${inv.partnership_percentage}%` : '-'}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{displayNotes || '-'}</td>
                                        {hasWriteAccess && (
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                    <button onClick={() => handleEditInvestmentClick(inv)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteInvestment(inv.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Partner Payment History */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IndianRupee size={20} color="#10b981" /> Partner Reimbursement Payment History
                    </h3>
                </div>
                {investments.filter(inv => inv.notes?.includes('[ReimbursementPayment:')).length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        No reimbursement payments recorded yet.
                    </div>
                ) : (
                    <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Payment Date</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>From (Debtor)</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>To (Receiver)</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Amount Paid</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Notes / Remarks</th>
                                    {hasWriteAccess && <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {investments
                                    .filter(inv => inv.notes?.includes('[ReimbursementPayment:'))
                                    .sort((a, b) => new Date(b.investment_date || 0) - new Date(a.investment_date || 0))
                                    .map(inv => {
                                        const match = inv.notes.match(/\[ReimbursementPayment:([^:]+):([^:]+):([^:]+):([^\]]*)\]/);
                                        const amtPaid = match ? Number(match[1]) : 0;
                                        const receiverName = match ? match[3] : 'Partner';
                                        const displayPaymentNotes = inv.notes.replace(/\[ReimbursementPayment:[^\]]+\]/, '').trim();

                                        return (
                                            <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(inv.investment_date).toLocaleDateString()}</td>
                                                <td style={{ padding: '1rem', fontWeight: 600, color: '#3b82f6' }}>{inv.profit_stakeholders?.name}</td>
                                                <td style={{ padding: '1rem', fontWeight: 600, color: '#10b981' }}>{receiverName}</td>
                                                <td style={{ padding: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(amtPaid)}</td>
                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{displayPaymentNotes || '-'}</td>
                                                {hasWriteAccess && (
                                                    <td style={{ padding: '1rem' }}>
                                                        <button onClick={() => handleDeleteInvestment(inv.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete payment log & restore outstanding debt balances"><Trash2 size={16} /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAssetModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: isMobile ? '95%' : '450px', padding: isMobile ? '1.5rem' : '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingAssetId ? 'Edit Asset Details' : 'Record New Asset'}</h2>
                        <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Asset Name</label>
                                <input required type="text" className="glass-input" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} placeholder="e.g. Grinder Machine" />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Category</label>
                                    <select className="glass-input" value={assetForm.category} onChange={e => setAssetForm({...assetForm, category: e.target.value})}>
                                        <option>Machinery</option>
                                        <option>Vehicle</option>
                                        <option>Furniture</option>
                                        <option>Building</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Purchase Date</label>
                                    <input required type="date" className="glass-input" value={assetForm.purchase_date} onChange={e => setAssetForm({...assetForm, purchase_date: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Total Cost (₹)</label>
                                <input required type="number" className="glass-input" value={assetForm.total_cost} onChange={e => setAssetForm({...assetForm, total_cost: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => { setShowAssetModal(false); setEditingAssetId(null); }} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: '#3b82f6', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>{editingAssetId ? 'Update Asset' : 'Save Asset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showInvestmentModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: isMobile ? '95%' : '450px', padding: isMobile ? '1.5rem' : '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingInvestmentId ? 'Edit Partner Investment' : 'Record Partner Investment'}</h2>
                        <form onSubmit={handleAddInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Partner</label>
                                <select 
                                    required 
                                    className="glass-input" 
                                    value={investmentForm.stakeholder_id} 
                                    disabled={editingInvestmentId}
                                    onChange={e => setInvestmentForm({...investmentForm, stakeholder_id: e.target.value})}
                                >
                                    {editingInvestmentId ? (
                                        stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                    ) : (
                                        <>
                                            <option value="all">All Partners (Equally Distributed)</option>
                                            <option value="unequal">All Partners (Unequal Distribution)</option>
                                            <optgroup label="Individual Partners">
                                                {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    {editingInvestmentId ? 'Linked Asset (Optional)' : 'Linked Asset(s) (Optional - Check multiple to bundle)'}
                                </label>
                                {editingInvestmentId ? (
                                    <select className="glass-input" value={investmentForm.asset_id} onChange={e => {
                                        const nextAssetId = e.target.value;
                                        setInvestmentForm(prev => ({ ...prev, asset_id: nextAssetId }));
                                        handleAssetChange(nextAssetId);
                                    }}>
                                        <option value="">General Investment (Working Capital)</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} (₹{a.total_cost})</option>)}
                                    </select>
                                ) : (
                                    <div style={{ 
                                        maxHeight: '120px', 
                                        overflowY: 'auto', 
                                        border: '1px solid var(--glass-border)', 
                                        borderRadius: '0.5rem', 
                                        padding: '0.5rem',
                                        background: 'rgba(0,0,0,0.2)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem'
                                    }} className="custom-scrollbar">
                                        {assets.length === 0 ? (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No assets registered yet.</span>
                                        ) : (
                                            assets.map(a => {
                                                const isChecked = selectedAssetIds.includes(a.id);
                                                return (
                                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            id={`asset-chk-${a.id}`}
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                setSelectedAssetIds(prev => {
                                                                    const next = prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id];
                                                                    const totalCost = next.reduce((sum, id) => {
                                                                        const asset = assets.find(as => as.id === id);
                                                                        return sum + (asset ? Number(asset.total_cost) : 0);
                                                                    }, 0);
                                                                    const defaultGst = next.length > 0 ? Math.round(totalCost * 0.18) : 0;
                                                                    setGstAmount(defaultGst > 0 ? defaultGst.toString() : '');
                                                                    if (next.length > 0) {
                                                                        setInvestmentForm(f => ({ ...f, amount: totalCost.toString(), asset_id: next[0] }));
                                                                    } else {
                                                                        setInvestmentForm(f => ({ ...f, amount: '', asset_id: '' }));
                                                                    }
                                                                    return next;
                                                                });
                                                            }}
                                                        />
                                                        <label htmlFor={`asset-chk-${a.id}`} style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'white' }}>
                                                            {a.name} (₹{Number(a.total_cost).toLocaleString()})
                                                        </label>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                            {['all', 'unequal'].includes(investmentForm.stakeholder_id) && !editingInvestmentId && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input 
                                            type="checkbox" 
                                            id="paidUpfrontCheck"
                                            checked={paidUpfront} 
                                            onChange={e => {
                                                setPaidUpfront(e.target.checked);
                                                if (!e.target.checked) setUpfrontPayerId('');
                                            }} 
                                        />
                                        <label htmlFor="paidUpfrontCheck" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>Paid Upfront by Single Partner (Reimbursement Mode)</label>
                                    </div>
                                    {paidUpfront && (
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Who paid this upfront?</label>
                                            <select 
                                                required={paidUpfront}
                                                className="glass-input" 
                                                style={{ padding: '0.4rem' }}
                                                value={upfrontPayerId} 
                                                onChange={e => setUpfrontPayerId(e.target.value)}
                                            >
                                                <option value="">Select Payer...</option>
                                                {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                            {investmentForm.stakeholder_id === 'unequal' && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Partner Share Amounts (₹)</label>
                                    {stakeholders.map(partner => (
                                        <div key={partner.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'white' }}>{partner.name}</span>
                                            <input 
                                                type="number" 
                                                required={investmentForm.stakeholder_id === 'unequal'}
                                                className="glass-input" 
                                                style={{ width: '150px', padding: '0.5rem' }} 
                                                placeholder="Amount (₹)"
                                                value={partnerShares[partner.id] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setPartnerShares(prev => {
                                                        const next = { ...prev, [partner.id]: val };
                                                        const total = Object.values(next).reduce((sum, v) => sum + (Number(v) || 0), 0);
                                                        setInvestmentForm(f => ({ ...f, amount: total.toString() }));
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        {investmentForm.stakeholder_id === 'unequal' 
                                            ? 'Total Capital (Auto-calculated) (₹)' 
                                            : (selectedAssetIds.length > 0 ? 'Total Cost (Auto-calculated) (₹)' : 'Total General Capital (₹)')}
                                    </label>
                                    <input 
                                        required 
                                        type="number" 
                                        className="glass-input" 
                                        value={investmentForm.amount} 
                                        disabled={investmentForm.stakeholder_id === 'unequal' || (!editingInvestmentId && selectedAssetIds.length > 0)}
                                        onChange={e => setInvestmentForm({...investmentForm, amount: e.target.value})} 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        Partnership % {['all', 'unequal'].includes(investmentForm.stakeholder_id) ? '(Auto)' : '(Optional)'}
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0" 
                                        max="100" 
                                        className="glass-input" 
                                        placeholder={['all', 'unequal'].includes(investmentForm.stakeholder_id) ? 'Auto-distributed' : 'e.g. 12.5'} 
                                        disabled={['all', 'unequal'].includes(investmentForm.stakeholder_id)}
                                        value={['all', 'unequal'].includes(investmentForm.stakeholder_id) ? '' : investmentForm.partnership_percentage} 
                                        onChange={e => handlePercentageChange(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>GST Paid Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        className="glass-input" 
                                        value={gstAmount} 
                                        placeholder="e.g. 16020"
                                        onChange={e => setGstAmount(e.target.value)} 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Grand Total (incl. GST) (₹)</label>
                                    <input 
                                        type="text" 
                                        className="glass-input" 
                                        disabled 
                                        style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}
                                        value={(Number(investmentForm.amount) + (Number(gstAmount) || 0)).toLocaleString()} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Date</label>
                                <input required type="date" className="glass-input" value={investmentForm.investment_date} onChange={e => setInvestmentForm({...investmentForm, investment_date: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Notes</label>
                                <textarea className="glass-input" value={investmentForm.notes} onChange={e => setInvestmentForm({...investmentForm, notes: e.target.value})} placeholder="Any additional details..." rows={2} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => { setShowInvestmentModal(false); setEditingInvestmentId(null); }} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: '#10b981', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>{editingInvestmentId ? 'Update Record' : 'Save Record'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showGlobalSettlementModal && globalSettlement.debtorId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: isMobile ? '95%' : '420px', padding: isMobile ? '1.5rem' : '2rem' }}>
                        <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Record Partner Payment</h2>
                        
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Debtor (Payer):</span>
                                <span style={{ fontWeight: 600, color: '#f59e0b' }}>{globalSettlement.debtorName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Paid to (Receiver):</span>
                                <span style={{ fontWeight: 600, color: '#10b981' }}>{globalSettlement.payerName}</span>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.25rem 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                <span style={{ color: 'white', fontWeight: 600 }}>Total Outstanding:</span>
                                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(globalSettlement.outstanding)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSaveGlobalSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Payment Amount (₹)</label>
                                <input 
                                    required 
                                    type="number" 
                                    className="glass-input" 
                                    max={globalSettlement.outstanding}
                                    value={settlementAmount} 
                                    onChange={e => setSettlementAmount(e.target.value)} 
                                    placeholder={`Max ₹${globalSettlement.outstanding}`}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Payment Date</label>
                                <input 
                                    required 
                                    type="date" 
                                    className="glass-input" 
                                    value={settlementDate} 
                                    onChange={e => setSettlementDate(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Notes / Remarks (Optional)</label>
                                <textarea 
                                    className="glass-input" 
                                    value={settlementNotes} 
                                    onChange={e => setSettlementNotes(e.target.value)} 
                                    placeholder="e.g. Bank transfer transaction ID"
                                    rows={2}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => { setShowGlobalSettlementModal(false); setGlobalSettlement({ payerId: '', payerName: '', debtorId: '', debtorName: '', outstanding: 0 }); setSettlementAmount(''); setSettlementDate(new Date().toISOString().split('T')[0]); setSettlementNotes(''); }} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: '#10b981', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Save Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .glass-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    border-radius: 0.5rem;
                    padding: 0.75rem;
                    color: white;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .glass-input:focus { border-color: var(--accent-primary); background: rgba(255, 255, 255, 0.1); }
                .glass-input option {
                    background: #1e293b;
                    color: white;
                }
                .btn-primary {
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
            `}</style>
        </div>
    );
};

export default InvestmentsDashboard;
