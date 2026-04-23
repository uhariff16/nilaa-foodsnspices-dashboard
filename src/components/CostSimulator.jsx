// Production Cost Simulator - Vercel Build Trigger
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Calculator, DollarSign, Info, Settings, Save, X, Database, History, Trash2, CheckCircle2, Loader2, Zap, Percent } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const CostSimulator = ({ previousMonthStats, selectedMonth }) => {
    // [NEW] Presets Logic
    const [showSettings, setShowSettings] = useState(false);
    const [presets, setPresets] = useState(() => {
        try {
            const saved = localStorage.getItem('simulator_presets');
            return saved ? JSON.parse(saved) : { gingerRate: 0, garlicRate: 0, smallOnionRate: 0, waterRate: 0 };
        } catch (e) {
            return { gingerRate: 0, garlicRate: 0, smallOnionRate: 0, waterRate: 0 };
        }
    });

    // History and Status State


    // Constant for all product combinations
    const ALL_VARIANTS = [
        { productType: 'paste', pasteVariant: 'mix', label: 'Ginger Garlic Paste' },
        { productType: 'paste', pasteVariant: 'ginger', label: 'Ginger Paste' },
        { productType: 'paste', pasteVariant: 'garlic', label: 'Garlic Paste' },
        { productType: 'ginger_peeled', label: 'Ginger Peeled' },
        { productType: 'garlic_peeled', label: 'Garlic Peeled' },
        { productType: 'small_onion_peeled', label: 'Small Onion Peeled' }
    ];

    // State for inputs
    const [inputs, setInputs] = useState({
        salesChannel: 'retail', // 'retail', 'wholesale'
        productType: 'paste', // 'paste', 'ginger_peeled', 'garlic_peeled'
        pasteVariant: 'mix', // 'mix', 'ginger', 'garlic' (Only for productType === 'paste')
        gingerKg: 100,
        gingerRate: presets.gingerRate || 0,
        garlicKg: 100,
        garlicRate: presets.garlicRate || 0,
        smallOnionKg: 100,
        smallOnionRate: presets.smallOnionRate || 0,
        labourCost: 15,
        billsCost: 5,
        otherCost: 5,
        packagingCost: 0,
        gingerWastage: 10,
        garlicWastage: 20,
        smallOnionWastage: 25,
        waterLiters: 40,
        waterRate: presets.waterRate || 0,
        profitMargin: 30,
        useSmartDefaults: true
    });

    const [results, setResults] = useState({
        totalInputKg: 0,
        totalOutputKg: 0,
        totalCost: 0,
        costPerKg: 0,
        recPrice: 0,
        yieldPercent: 0
    });

    // [NEW] Shared logic for operational cost scaling
    const getEstimatedOverheads = (currentInputs, stats) => {
        if (!stats) return { labour: 0, bills: 0, other: 0, packaging: 0 };

        let projectedOutput = 0;
        if (currentInputs.productType === 'paste') {
            const gingerNet = currentInputs.gingerKg * (1 - currentInputs.gingerWastage / 100);
            const garlicNet = currentInputs.garlicKg * (1 - currentInputs.garlicWastage / 100);
            if (currentInputs.pasteVariant === 'mix') {
                projectedOutput = gingerNet + garlicNet + Number(currentInputs.waterLiters);
            } else if (currentInputs.pasteVariant === 'ginger') {
                projectedOutput = gingerNet + Number(currentInputs.waterLiters);
            } else if (currentInputs.pasteVariant === 'garlic') {
                projectedOutput = garlicNet + Number(currentInputs.waterLiters);
            }
        } else if (currentInputs.productType === 'ginger_peeled' || currentInputs.productType === 'garlic_peeled') {
            const weight = currentInputs.productType === 'ginger_peeled' ? currentInputs.gingerKg : currentInputs.garlicKg;
            const wastage = currentInputs.productType === 'ginger_peeled' ? currentInputs.gingerWastage : currentInputs.garlicWastage;
            projectedOutput = weight * (1 - wastage / 100);
        } else if (currentInputs.productType === 'small_onion_peeled') {
            projectedOutput = currentInputs.smallOnionKg * (1 - currentInputs.smallOnionWastage / 100);
        }

        const capLabour = stats.avgMonthlyLabour || Infinity;
        const estLabour = Math.min(projectedOutput * (stats.labourPerKg || 0), capLabour);

        const capBills = stats.avgMonthlyBills || Infinity;
        const estBills = Math.min(projectedOutput * (stats.billsPerKg || 0), capBills);

        const estOther = projectedOutput * (stats.otherPerKg || 0);
        const estPackaging = projectedOutput * (stats.packagingPerKg || 0);

        return {
            labour: Math.round(estLabour),
            bills: Math.round(estBills),
            other: Math.round(estOther),
            packaging: Math.round(estPackaging)
        };
    };

    // Smart Defaults Logic - Keep UI updated when inputs change
    useEffect(() => {
        if (inputs.useSmartDefaults && previousMonthStats) {
            const estimates = getEstimatedOverheads(inputs, previousMonthStats);
            setInputs(prev => ({
                ...prev,
                labourCost: estimates.labour,
                billsCost: estimates.bills,
                otherCost: estimates.other,
                packagingCost: estimates.packaging
            }));
        }
    }, [inputs.gingerKg, inputs.garlicKg, inputs.gingerWastage, inputs.garlicWastage, inputs.waterLiters, inputs.useSmartDefaults, previousMonthStats, inputs.productType, inputs.pasteVariant]);



    // [REFACTOR] Pure calculation function for reuse
    const calculateResults = (currentInputs, stats) => {
        let totalMaterialCost = 0;
        let totalOutput = 0;
        let totalInput = 0;

        if (currentInputs.productType === 'paste') {
            const gingerCost = currentInputs.gingerKg * currentInputs.gingerRate;
            const garlicCost = currentInputs.garlicKg * currentInputs.garlicRate;
            const gingerNet = currentInputs.gingerKg * (1 - currentInputs.gingerWastage / 100);
            const garlicNet = currentInputs.garlicKg * (1 - currentInputs.garlicWastage / 100);
            const waterCost = currentInputs.waterLiters * currentInputs.waterRate;

            if (currentInputs.pasteVariant === 'mix') {
                totalMaterialCost = gingerCost + garlicCost + waterCost;
                totalOutput = gingerNet + garlicNet + Number(currentInputs.waterLiters);
                totalInput = Number(currentInputs.gingerKg) + Number(currentInputs.garlicKg);
            } else if (currentInputs.pasteVariant === 'ginger') {
                totalMaterialCost = gingerCost + waterCost;
                totalOutput = gingerNet + Number(currentInputs.waterLiters);
                totalInput = Number(currentInputs.gingerKg);
            } else if (currentInputs.pasteVariant === 'garlic') {
                totalMaterialCost = garlicCost + waterCost;
                totalOutput = garlicNet + Number(currentInputs.waterLiters);
                totalInput = Number(currentInputs.garlicKg);
            }
        } else if (currentInputs.productType === 'ginger_peeled') {
            totalMaterialCost = currentInputs.gingerKg * currentInputs.gingerRate;
            totalOutput = currentInputs.gingerKg * (1 - currentInputs.gingerWastage / 100);
            totalInput = Number(currentInputs.gingerKg);
        } else if (currentInputs.productType === 'garlic_peeled') {
            totalMaterialCost = currentInputs.garlicKg * currentInputs.garlicRate;
            totalOutput = currentInputs.garlicKg * (1 - currentInputs.garlicWastage / 100);
            totalInput = Number(currentInputs.garlicKg);
        } else if (currentInputs.productType === 'small_onion_peeled') {
            totalMaterialCost = currentInputs.smallOnionKg * currentInputs.smallOnionRate;
            totalOutput = currentInputs.smallOnionKg * (1 - currentInputs.smallOnionWastage / 100);
            totalInput = Number(currentInputs.smallOnionKg);
        }

        // [FIX] Scaled Operational Costs for Batch Items
        let currentLabour = Number(currentInputs.labourCost);
        let currentBills = Number(currentInputs.billsCost);
        let currentOther = Number(currentInputs.otherCost);
        let currentPkg = Number(currentInputs.packagingCost);

        if (currentInputs.useSmartDefaults && stats) {
            const scaled = getEstimatedOverheads(currentInputs, stats);
            currentLabour = scaled.labour;
            currentBills = scaled.bills;
            currentOther = scaled.other;
            currentPkg = scaled.packaging;
        }

        let effectiveOverhead = currentBills + currentOther;
        if (currentInputs.salesChannel === 'retail') {
            effectiveOverhead += currentPkg;
        }

        const totalMfgCost = totalMaterialCost + currentLabour + effectiveOverhead;
        const costPerKg = totalOutput > 0 ? totalMfgCost / totalOutput : 0;
        const suggestedPrice = totalOutput > 0 ? (totalMfgCost * (1 + currentInputs.profitMargin / 100)) / totalOutput : 0;

        return {
            totalInputKg: totalInput,
            totalOutputKg: totalOutput,
            totalCost: totalMfgCost,
            costPerKg: costPerKg,
            recPrice: suggestedPrice,
            yieldPercent: totalInput > 0 ? (totalOutput / totalInput) * 100 : 0
        };
    };

    // Replace effect logic with refactored function
    useEffect(() => {
        const calculated = calculateResults(inputs, previousMonthStats);
        setResults(calculated);
    }, [inputs]);

    // History and Status State
    const [historyRetail, setHistoryRetail] = useState([]);
    const [historyWholesale, setHistoryWholesale] = useState([]);
    const [historyTab, setHistoryTab] = useState('retail'); // 'retail', 'wholesale'
    const [selectedIds, setSelectedIds] = useState([]); // Array of IDs selected in current tab
    const [isSaving, setIsSaving] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // Fetch saved simulations from split tables
    const fetchHistory = async () => {
        setLoadingHistory(true);
        setSelectedIds([]); // Clear selection on refresh
        try {
            const [retailRes, wholesaleRes] = await Promise.all([
                supabase.from('simulated_costs_retail').select('*').order('created_at', { ascending: false }),
                supabase.from('simulated_costs_wholesale').select('*').order('created_at', { ascending: false })
            ]);

            if (retailRes.error) throw retailRes.error;
            if (wholesaleRes.error) throw wholesaleRes.error;

            setHistoryRetail(retailRes.data || []);
            setHistoryWholesale(wholesaleRes.data || []);
        } catch (err) {
            console.error("Error fetching simulation history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleBatchSaveAll = async () => {
        setIsSaving(true);
        setSaveStatus(null);

        try {
            const retailData = [];
            const wholesaleData = [];

            for (const item of ALL_VARIANTS) {
                // Retail calculation
                const rInputs = { ...inputs, ...item, salesChannel: 'retail' };
                const rResults = calculateResults(rInputs, previousMonthStats);
                retailData.push({
                    item_name: item.label,
                    product_type: item.productType,
                    variant: item.pasteVariant || null,
                    total_output: rResults.totalOutputKg,
                    total_spend: rResults.totalCost,
                    unit_cost: rResults.costPerKg,
                    margin: inputs.profitMargin,
                    suggested_price: rResults.recPrice,
                    calculation_method: 'auto', // Batch is always auto-scaled
                    input_parameters: rInputs
                });

                // Wholesale calculation
                const wInputs = { ...inputs, ...item, salesChannel: 'wholesale' };
                const wResults = calculateResults(wInputs, previousMonthStats);
                wholesaleData.push({
                    item_name: item.label,
                    product_type: item.productType,
                    variant: item.pasteVariant || null,
                    total_output: wResults.totalOutputKg,
                    total_spend: wResults.totalCost,
                    unit_cost: wResults.costPerKg,
                    margin: inputs.profitMargin,
                    suggested_price: wResults.recPrice,
                    calculation_method: 'auto', // Batch is always auto-scaled
                    input_parameters: wInputs
                });
            }

            // Bulk Insert
            const [retailErr, wholesaleErr] = await Promise.all([
                supabase.from('simulated_costs_retail').insert(retailData),
                supabase.from('simulated_costs_wholesale').insert(wholesaleData)
            ]);

            if (retailErr.error) throw retailErr.error;
            if (wholesaleErr.error) throw wholesaleErr.error;

            setSaveStatus('success');
            fetchHistory();
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            console.error("Error batch saving simulations:", err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSimulation = async () => {
        setIsSaving(true);
        setSaveStatus(null);

        const variantLabel = inputs.productType === 'paste'
            ? (inputs.pasteVariant === 'mix' ? 'Ginger Garlic Paste' : inputs.pasteVariant === 'ginger' ? 'Ginger Paste' : 'Garlic Paste')
            : inputs.productType === 'ginger_peeled' ? 'Ginger Peeled' 
            : inputs.productType === 'garlic_peeled' ? 'Garlic Peeled'
            : 'Small Onion Peeled';

        const tableName = inputs.salesChannel === 'retail' ? 'simulated_costs_retail' : 'simulated_costs_wholesale';

        try {
            const { error } = await supabase
                .from(tableName)
                .insert([{
                    item_name: variantLabel,
                    product_type: inputs.productType,
                    variant: inputs.pasteVariant || null,
                    total_output: results.totalOutputKg,
                    total_spend: results.totalCost,
                    unit_cost: results.costPerKg,
                    margin: inputs.profitMargin,
                    suggested_price: results.recPrice,
                    calculation_method: inputs.useSmartDefaults ? 'auto' : 'manual',
                    input_parameters: inputs
                }]);

            if (error) throw error;

            setSaveStatus('success');
            fetchHistory();
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            console.error("Error saving simulation:", err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSimulation = async (id, channel) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        const tableName = channel === 'retail' ? 'simulated_costs_retail' : 'simulated_costs_wholesale';

        try {
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;
            fetchHistory();
        } catch (err) {
            console.error("Error deleting simulation:", err);
            alert("Failed to delete record.");
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) return;

        const tableName = historyTab === 'retail' ? 'simulated_costs_retail' : 'simulated_costs_wholesale';

        try {
            setIsSaving(true);
            const { error } = await supabase
                .from(tableName)
                .delete()
                .in('id', selectedIds);

            if (error) throw error;

            setSelectedIds([]);
            fetchHistory();
        } catch (err) {
            console.error("Error in bulk delete:", err);
            alert("Failed to delete selected records.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        const currentData = historyTab === 'retail' ? historyRetail : historyWholesale;
        if (selectedIds.length === currentData.length && currentData.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentData.map(d => d.id));
        }
    };

    const handleInput = (key, value) => {
        setInputs(prev => ({
            ...prev,
            [key]: (key === 'productType' || key === 'pasteVariant' || key === 'salesChannel') ? value : (parseFloat(value) || 0)
        }));
    };

    // [NEW] Save Presets
    const savePresets = (newPresets) => {
        try {
            localStorage.setItem('simulator_presets', JSON.stringify(newPresets));
            setPresets(newPresets);
            // Auto-update current inputs
            setInputs(prev => ({
                ...prev,
                gingerRate: newPresets.gingerRate,
                garlicRate: newPresets.garlicRate,
                waterRate: newPresets.waterRate
            }));
            setShowSettings(false);
        } catch (e) {
            console.error("Failed to save presets", e);
        }
    };

    const sectionStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    const cardStyle = {
        padding: '0.75rem',
        borderRadius: '0.85rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease'
    };

    const inputStyle = {
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#f8fafc',
        padding: '0.35rem 0.6rem',
        borderRadius: '0.5rem',
        width: '100%',
        maxWidth: '140px',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        textAlign: 'left',
        paddingLeft: '1.65rem',
        fontWeight: '500',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
    };

    const focusStyle = {
        borderColor: 'var(--accent-primary)',
        background: 'rgba(15, 23, 42, 0.8)',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2), inset 0 2px 4px rgba(0,0,0,0.1)'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.7rem',
        color: '#64748b',
        marginBottom: '0.35rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };

    const sectionHeaderStyle = (color) => ({
        fontSize: '0.85rem',
        fontWeight: '700',
        color: '#f1f5f9',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderLeft: `3px solid ${color}`,
        paddingLeft: '0.75rem',
        marginLeft: '-0.75rem'
    });

    // Helper to check active inputs
    const showGinger = (inputs.productType === 'paste' && (inputs.pasteVariant === 'mix' || inputs.pasteVariant === 'ginger')) || inputs.productType === 'ginger_peeled';
    const showGarlic = (inputs.productType === 'paste' && (inputs.pasteVariant === 'mix' || inputs.pasteVariant === 'garlic')) || inputs.productType === 'garlic_peeled';
    const showSmallOnion = inputs.productType === 'small_onion_peeled';
    const showWater = inputs.productType === 'paste';

    const totalOperationalCost = Number(inputs.labourCost) + Number(inputs.billsCost) + Number(inputs.otherCost) + Number(inputs.packagingCost);

    return (
        <div className="animate-fade-in responsive-sidebar-layout">
            <div className="flex flex-col h-full gap-6">

                {/* Header */}
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    background: 'rgba(30, 41, 59, 0.4)', 
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.6rem', borderRadius: '0.75rem', display: 'flex' }}>
                                <Calculator size={26} color="#f59e0b" />
                            </div>
                            Production Cost Simulator
                            <button
                                onClick={() => setShowSettings(true)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    marginLeft: '0.5rem',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                title="Default Rates"
                            >
                                <Settings size={18} />
                            </button>
                        </h2>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span>Forecasting for: <strong style={{ color: '#f1f5f9' }}>{selectedMonth}</strong></span>
                            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }}></div>
                            {previousMonthStats ? (
                                <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                                    <CheckCircle2 size={14} /> Smart Auto-fill Active
                                </span>
                            ) : (
                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                                    <Info size={14} /> Manual Mode Only
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Sales Channel Toggle */}
                    <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '0.35rem', borderRadius: '0.85rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        {['retail', 'wholesale'].map(channel => (
                            <button
                                key={channel}
                                onClick={() => handleInput('salesChannel', channel)}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '0.65rem',
                                    border: 'none',
                                    background: inputs.salesChannel === channel ? 'var(--accent-primary)' : 'transparent',
                                    color: inputs.salesChannel === channel ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {channel}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toolbar / Tabs */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1.5rem', 
                    background: 'rgba(15, 23, 42, 0.4)', 
                    padding: '0.85rem 1.5rem', 
                    borderRadius: '1.25rem', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { id: 'paste', label: 'Paste/Mix' },
                            { id: 'ginger_peeled', label: 'Ginger Peeled' },
                            { id: 'garlic_peeled', label: 'Garlic Peeled' },
                            { id: 'small_onion_peeled', label: 'Small Onion Peeled' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleInput('productType', type.id)}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '0.85rem',
                                    border: '1px solid',
                                    borderColor: inputs.productType === type.id ? 'var(--accent-primary)' : 'transparent',
                                    background: inputs.productType === type.id ? 'var(--accent-primary)' : 'transparent',
                                    color: inputs.productType === type.id ? '#fff' : '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    {/* Sub-Variant Tabs (Only for Paste) */}
                    {inputs.productType === 'paste' && (
                        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[
                                    { id: 'mix', label: 'G & G Paste' },
                                    { id: 'ginger', label: 'Ginger Paste' },
                                    { id: 'garlic', label: 'Garlic Paste' }
                                ].map(variant => (
                                    <button
                                        key={variant.id}
                                        onClick={() => handleInput('pasteVariant', variant.id)}
                                        style={{
                                            padding: '0.4rem 1rem',
                                            borderRadius: '999px',
                                            border: '1px solid',
                                            borderColor: inputs.pasteVariant === variant.id ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                                            background: inputs.pasteVariant === variant.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                            color: inputs.pasteVariant === variant.id ? '#60a5fa' : '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {variant.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Centered Content Wrapper */}
                <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
                    {/* Main Content Grid - 2 Column Layout */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(500px, 1.2fr) 400px',
                        gap: '1.5rem',
                        alignItems: 'start'
                    }}>
                    {/* Left Panel: Configuration */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px' }}>
                        
                        {/* 1. Raw Materials */}
                        <div style={sectionStyle}>
                            <h3 style={sectionHeaderStyle('#3b82f6')}>
                                <RefreshCw size={18} color="#3b82f6" />
                                Material Inputs
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {showGinger && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Ginger Weight (kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.gingerKg}
                                                onChange={(e) => handleInput('gingerKg', e.target.value)}
                                                style={inputStyle}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Ginger Rate (₹/kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.gingerRate}
                                                onChange={(e) => handleInput('gingerRate', e.target.value)}
                                                style={{ ...inputStyle, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {showGarlic && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Garlic Weight (kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.garlicKg}
                                                onChange={(e) => handleInput('garlicKg', e.target.value)}
                                                style={inputStyle}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Garlic Rate (₹/kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.garlicRate}
                                                onChange={(e) => handleInput('garlicRate', e.target.value)}
                                                style={{ ...inputStyle, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {showSmallOnion && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Onion Weight (kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.smallOnionKg}
                                                onChange={(e) => handleInput('smallOnionKg', e.target.value)}
                                                style={inputStyle}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Onion Rate (₹/kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.smallOnionRate}
                                                onChange={(e) => handleInput('smallOnionRate', e.target.value)}
                                                style={{ ...inputStyle, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {showWater && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Water Added (Liters)</label>
                                            <input
                                                type="number"
                                                value={inputs.waterLiters}
                                                onChange={(e) => handleInput('waterLiters', e.target.value)}
                                                style={{ ...inputStyle, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                        <div style={{ width: '140px' }}>
                                            <label style={labelStyle}>Water Rate (₹/L)</label>
                                            <input
                                                type="number"
                                                value={inputs.waterRate}
                                                onChange={(e) => handleInput('waterRate', e.target.value)}
                                                style={{ ...inputStyle, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(15, 23, 42, 0.6)' })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* 2. Operational Costs */}
                        <div style={sectionStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <h3 style={{ 
                                    fontSize: '0.85rem', 
                                    fontWeight: '700', 
                                    color: '#f1f5f9', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.1em', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.75rem' 
                                }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }}></div>
                                    Operational Costs
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="auto-fill-toggle"
                                        checked={inputs.useSmartDefaults}
                                        onChange={(e) => setInputs(prev => ({ ...prev, useSmartDefaults: e.target.checked }))}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                    />
                                    <label htmlFor="auto-fill-toggle" style={{ fontSize: '0.9rem', color: '#f1f5f9', cursor: 'pointer', fontWeight: '500' }}>Auto-fill</label>
                                </div>
                            </div>

                            {previousMonthStats && (
                                <div style={{ fontSize: '0.85rem', color: '#60a5fa', marginBottom: '1.5rem', fontWeight: '500', opacity: 0.9 }}>
                                    Based on {previousMonthStats.month} actuals 
                                    ({previousMonthStats.labourPerKg?.toFixed(2)}/kg, {previousMonthStats.billsPerKg?.toFixed(2)}/kg, Pkg: {previousMonthStats.packagingPerKg?.toFixed(2)}/kg)
                                </div>
                            )}

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                                {[
                                    { key: 'labourCost', label: 'Labour', rateKey: 'labourPerKg', capKey: 'avgMonthlyLabour' },
                                    { key: 'billsCost', label: 'Bills & Rent', rateKey: 'billsPerKg', capKey: 'avgMonthlyBills' },
                                    { key: 'otherCost', label: 'Other Exp', rateKey: 'otherPerKg', capKey: 'avgMonthlyOther', isVar: true },
                                    { key: 'packagingCost', label: 'Pkg Cost', rateKey: 'packagingPerKg' }
                                ].map(field => {
                                    const rate = previousMonthStats ? (previousMonthStats[field.rateKey] || 0) : 0;
                                    const cap = previousMonthStats ? (previousMonthStats[field.capKey] || 0) : 0;
                                    const eff = results.totalOutputKg > 0 ? (inputs[field.key] / results.totalOutputKg) : 0;

                                    return (
                                        <div key={field.key} style={{ flex: '1 1 160px', minWidth: '140px' }}>
                                            <label style={{ ...labelStyle, fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{field.label}</label>
                                            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                                <input
                                                    type="number"
                                                    value={inputs[field.key]}
                                                    onChange={(e) => {
                                                        handleInput(field.key, e.target.value);
                                                        if (inputs.useSmartDefaults) setInputs(prev => ({ ...prev, useSmartDefaults: false }));
                                                    }}
                                                    style={{ 
                                                        ...inputStyle, 
                                                        maxWidth: 'none',
                                                        padding: '0.65rem 1rem 0.65rem 2.25rem',
                                                        fontSize: '1.25rem',
                                                        textAlign: 'center',
                                                        background: 'rgba(30, 41, 59, 0.4)',
                                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '0.75rem'
                                                    }}
                                                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                    onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(30, 41, 59, 0.4)' })}
                                                />
                                                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#94a3b8' }}>₹</span>
                                            </div>
                                            
                                            {/* Labels below input */}
                                            {previousMonthStats && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.75rem', color: '#94a3b8', paddingRight: '0.5rem' }}>
                                                    <div style={{ fontWeight: '500' }}>Rate: ₹{rate.toFixed(2)}/kg{field.isVar ? ' (Var)' : ''}</div>
                                                    {cap > 0 && <div style={{ fontWeight: '500' }}>Cap: ₹{Math.round(cap)}</div>}
                                                    <div style={{ color: '#60a5fa', fontWeight: '600' }}>Eff: ₹{eff.toFixed(2)}/kg</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total Op Cost Summary Bar */}
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ ...labelStyle, color: '#a855f7', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'none' }}>Total Op. Cost</label>
                                <div style={{ 
                                    width: '100%',
                                    padding: '1rem 1.5rem', 
                                    background: 'rgba(168, 85, 247, 0.05)', 
                                    borderRadius: '0.85rem', 
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    <span style={{ fontSize: '1.25rem', color: '#a855f7', opacity: 0.8 }}>₹</span>
                                    <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#a855f7', letterSpacing: '0.02em' }}>
                                        {Math.round(totalOperationalCost).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Yield & Process Factors */}
                        <div style={sectionStyle}>
                            <h3 style={sectionHeaderStyle('#ef4444')}>
                                <Percent size={18} color="#ef4444" />
                                Yield & Process Factors
                            </h3>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                                {showGinger && (
                                    <div style={{ ...cardStyle, width: '140px' }}>
                                        <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Ginger Waste</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="number"
                                                value={inputs.gingerWastage}
                                                onChange={(e) => handleInput('gingerWastage', e.target.value)}
                                                style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0, fontSize: '1.5rem', color: '#ef4444' }}
                                            />
                                            <span style={{ color: '#ef4444', fontWeight: '700' }}>%</span>
                                        </div>
                                    </div>
                                )}
                                {showGarlic && (
                                    <div style={{ ...cardStyle, width: '140px' }}>
                                        <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Garlic Waste</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="number"
                                                value={inputs.garlicWastage}
                                                onChange={(e) => handleInput('garlicWastage', e.target.value)}
                                                style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0, fontSize: '1.5rem', color: '#ef4444' }}
                                            />
                                            <span style={{ color: '#ef4444', fontWeight: '700' }}>%</span>
                                        </div>
                                    </div>
                                )}
                                {showSmallOnion && (
                                    <div style={{ ...cardStyle, width: '140px' }}>
                                        <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Onion Waste</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="number"
                                                value={inputs.smallOnionWastage}
                                                onChange={(e) => handleInput('smallOnionWastage', e.target.value)}
                                                style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0, fontSize: '1.5rem', color: '#ef4444' }}
                                            />
                                            <span style={{ color: '#ef4444', fontWeight: '700' }}>%</span>
                                        </div>
                                    </div>
                                )}
                                {showWater && (
                                    <div style={{ ...cardStyle, width: '140px' }}>
                                        <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Water Added</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="number"
                                                value={(() => {
                                                    const totalSolid = (inputs.pasteVariant === 'mix' ? (inputs.gingerKg + inputs.garlicKg) :
                                                        inputs.pasteVariant === 'ginger' ? inputs.gingerKg :
                                                            inputs.pasteVariant === 'garlic' ? inputs.garlicKg : 0);
                                                    return totalSolid > 0 ? ((inputs.waterLiters / totalSolid) * 100).toFixed(0) : 0;
                                                })()}
                                                onChange={(e) => {
                                                    const pct = parseFloat(e.target.value) || 0;
                                                    const totalSolid = (inputs.pasteVariant === 'mix' ? (inputs.gingerKg + inputs.garlicKg) :
                                                        inputs.pasteVariant === 'ginger' ? inputs.gingerKg :
                                                            inputs.pasteVariant === 'garlic' ? inputs.garlicKg : 0);
                                                    const newLiters = (totalSolid * pct) / 100;
                                                    handleInput('waterLiters', newLiters.toFixed(2));
                                                }}
                                                style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0, fontSize: '1.5rem', color: '#60a5fa' }}
                                            />
                                            <span style={{ color: '#60a5fa', fontWeight: '700' }}>%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Results (Sticky) */}
                    <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Main Results Dashboard */}
                        <div style={{
                            ...sectionStyle,
                            padding: '2.5rem 1.5rem',
                            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: '700' }}>Production Cost</span>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                                    <span style={{ fontSize: '2rem', color: '#64748b', fontWeight: '500', marginTop: '0.75rem' }}>₹</span>
                                    <span style={{ fontSize: '5.5rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1, letterSpacing: '-0.03em', textShadow: '0 0 40px rgba(59, 130, 246, 0.3)' }}>
                                        {results.costPerKg.toFixed(2)}
                                    </span>
                                </div>
                                <span style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: '500' }}>per kilogram output</span>
                            </div>

                            <div style={{ width: '80%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent)' }}></div>

                            {/* Key Stats Grid */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ ...cardStyle, width: '140px' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Yield Output</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f1f5f9' }}>{results.totalOutputKg.toFixed(1)}kg</span>
                                    <div style={{ fontSize: '0.75rem', color: results.yieldPercent < 75 ? '#ef4444' : '#10b981', marginTop: '0.25rem', fontWeight: '600' }}>
                                        {results.yieldPercent.toFixed(1)}% Efficiency
                                    </div>
                                </div>
                                <div style={{ ...cardStyle, width: '140px' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Spend</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f1f5f9' }}>₹{Math.round(results.totalCost).toLocaleString()}</span>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Materials + Op.</div>
                                </div>
                            </div>
                        </div>

                        {/* Margin & Recommended Price */}
                        <div style={{
                            ...sectionStyle,
                            background: 'rgba(16, 185, 129, 0.05)',
                            borderColor: 'rgba(16, 185, 129, 0.2)',
                            padding: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rec. Selling Price</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                value={inputs.profitMargin}
                                                onChange={(e) => handleInput('profitMargin', e.target.value)}
                                                style={{
                                                    ...inputStyle,
                                                    width: '70px',
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    borderColor: 'rgba(16, 185, 129, 0.3)',
                                                    color: '#10b981',
                                                    fontSize: '1.25rem',
                                                    padding: '0.4rem',
                                                    textAlign: 'center'
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>% Margin</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '1.25rem', color: '#059669', fontWeight: '600', marginTop: '0.5rem' }}>₹</span>
                                        <span style={{ fontSize: '3.5rem', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>{results.recPrice.toFixed(2)}</span>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>per kg base price</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Zone */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={handleBatchSaveAll}
                                disabled={isSaving || results.totalCost === 0}
                                style={{
                                    width: '100%',
                                    padding: '1.25rem',
                                    borderRadius: '1.25rem',
                                    background: saveStatus === 'success' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : 'linear-gradient(135deg, var(--accent-primary) 0%, #2563eb 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '1rem',
                                    cursor: isSaving || results.totalCost === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: '800',
                                    fontSize: '1.05rem',
                                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: results.totalCost === 0 ? 0.5 : 1
                                }}
                                onMouseEnter={e => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={e => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={24} /> :
                                    saveStatus === 'success' ? <CheckCircle2 size={24} /> :
                                        saveStatus === 'error' ? <X size={24} /> : <Zap size={24} />}
                                {saveStatus === 'success' ? 'Calculated & Saved All' :
                                    saveStatus === 'error' ? 'Error Saving' : 'Process & Save All Variants'}
                            </button>

                            <button
                                onClick={handleSaveSimulation}
                                disabled={isSaving || results.totalCost === 0}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '1.25rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    cursor: isSaving || results.totalCost === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Save size={18} />
                                Save Current Selection
                            </button>
                        </div>
                    </div>
                </div>

                {/* Saved Simulations Table */}
                <div className="glass-panel" style={{ marginTop: '1rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                <History size={20} color="#60a5fa" />
                                Simulation History
                            </h3>

                            {/* Tab Switcher */}
                            <div style={{ display: 'flex', background: 'var(--glass-highlight)', padding: '0.2rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)' }}>
                                {['retail', 'wholesale'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => {
                                            setHistoryTab(t);
                                            setSelectedIds([]);
                                        }}
                                        style={{
                                            padding: '0.3rem 0.8rem',
                                            borderRadius: '0.3rem',
                                            border: 'none',
                                            background: historyTab === t ? 'var(--accent-primary)' : 'transparent',
                                            color: historyTab === t ? '#fff' : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '0.4rem',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Delete Selected ({selectedIds.length})
                                </button>
                            )}
                            {loadingHistory && <Loader2 className="animate-spin" size={18} color="var(--text-secondary)" />}
                        </div>
                    </div>

                    <div className="custom-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                        {(historyTab === 'retail' ? historyRetail : historyWholesale).length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid var(--glass-border)', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length > 0 && selectedIds.length === (historyTab === 'retail' ? historyRetail : historyWholesale).length}
                                                onChange={toggleAll}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>DATE</th>
                                        <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>ITEM</th>
                                        <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>OUTPUT</th>
                                        <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>PRODUCTION COST</th>
                                        <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>REC. SELLING PRICE</th>
                                        <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(historyTab === 'retail' ? historyRetail : historyWholesale).map(sim => (
                                        <tr key={sim.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(sim.id)}
                                                    onChange={() => toggleRow(sim.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                                {new Date(sim.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {sim.item_name}
                                                    <span style={{
                                                        fontSize: '0.6rem',
                                                        padding: '0.05rem 0.35rem',
                                                        borderRadius: '0.3rem',
                                                        background: sim.calculation_method === 'manual' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: sim.calculation_method === 'manual' ? '#f59e0b' : '#10b981',
                                                        border: `1px solid ${sim.calculation_method === 'manual' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                                        textTransform: 'uppercase',
                                                        fontWeight: '700',
                                                        letterSpacing: '0.02em'
                                                    }}>
                                                        {sim.calculation_method || 'auto'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{Number(sim.total_output).toFixed(1)} kg</td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>₹{Number(sim.unit_cost).toFixed(2)}/kg</td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>₹{Number(sim.suggested_price).toFixed(2)}/kg</td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleDeleteSimulation(sim.id, historyTab)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: 0.6 }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Database size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                No saved {historyTab} simulations yet.
                            </div>
                        )}
                    </div>
                    </div>
                </div>

                {/* [NEW] Settings Modal */}
                {showSettings && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                    }}>
                        <div className="glass-panel" style={{ width: '350px', padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Settings size={18} />
                                    Default Rates
                                </h3>
                                <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Default Ginger Rate (₹/Kg)</label>
                                    <input
                                        type="number"
                                        defaultValue={presets.gingerRate}
                                        id="preset-ginger"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Default Garlic Rate (₹/Kg)</label>
                                    <input
                                        type="number"
                                        defaultValue={presets.garlicRate}
                                        id="preset-garlic"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Default Water Rate (₹/L)</label>
                                    <input
                                        type="number"
                                        defaultValue={presets.waterRate}
                                        id="preset-water"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Default Onion Rate (₹/Kg)</label>
                                    <input
                                        type="number"
                                        defaultValue={presets.smallOnionRate}
                                        id="preset-onion"
                                        style={inputStyle}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const gRate = parseFloat(document.getElementById('preset-ginger').value) || 0;
                                        const glRate = parseFloat(document.getElementById('preset-garlic').value) || 0;
                                        const oRate = parseFloat(document.getElementById('preset-onion').value) || 0;
                                        const wRate = parseFloat(document.getElementById('preset-water').value) || 0;
                                        const newPresets = { gingerRate: gRate, garlicRate: glRate, smallOnionRate: oRate, waterRate: wRate };
                                        savePresets(newPresets);
                                    }}
                                    style={{
                                        marginTop: '1rem', width: '100%', padding: '0.75rem',
                                        background: 'var(--accent-primary)', color: 'var(--text-primary)', border: 'none',
                                        borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    <Save size={18} />
                                    Save & Apply
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CostSimulator;
