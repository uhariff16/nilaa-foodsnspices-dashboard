import React, { useState, useEffect } from 'react';
import { RefreshCw, Calculator, DollarSign, Info, Settings, Save, X } from 'lucide-react';

const CostSimulator = ({ previousMonthStats, selectedMonth }) => {
    // [NEW] Presets Logic
    const [showSettings, setShowSettings] = useState(false);
    const [presets, setPresets] = useState(() => {
        try {
            const saved = localStorage.getItem('simulator_presets');
            return saved ? JSON.parse(saved) : { gingerRate: 0, garlicRate: 0, waterRate: 0 };
        } catch (e) {
            return { gingerRate: 0, garlicRate: 0, waterRate: 0 };
        }
    });

    // State for inputs
    const [inputs, setInputs] = useState({
        salesChannel: 'retail', // 'retail', 'wholesale'
        productType: 'paste', // 'paste', 'ginger_peeled', 'garlic_peeled'
        pasteVariant: 'mix', // 'mix', 'ginger', 'garlic' (Only for productType === 'paste')
        gingerKg: 100,
        gingerRate: presets.gingerRate || 0, // Load Preset
        garlicKg: 100,
        garlicRate: presets.garlicRate || 0, // Load Preset
        labourCost: 15, // Default estimate
        billsCost: 5,   // Portion of Overhead (Bills)
        otherCost: 5,   // Portion of Overhead (Other)
        packagingCost: 0, // Packaging Cost
        gingerWastage: 10,
        garlicWastage: 20,
        waterLiters: 40, // Default ~20% of 200kg
        waterRate: presets.waterRate || 0, // Load Preset
        profitMargin: 30, // Default 30% margin
        useSmartDefaults: true // Toggle to enable/disable auto-calc
    });

    const [results, setResults] = useState({
        totalInputKg: 0,
        totalOutputKg: 0,
        totalCost: 0,
        costPerKg: 0,
        recPrice: 0,
        yieldPercent: 0
    });

    // Smart Defaults Logic
    useEffect(() => {
        if (inputs.useSmartDefaults && previousMonthStats) {
            let projectedOutput = 0;

            if (inputs.productType === 'paste') {
                const gingerNet = inputs.gingerKg * (1 - inputs.gingerWastage / 100);
                const garlicNet = inputs.garlicKg * (1 - inputs.garlicWastage / 100);

                let baseWeight = 0;
                if (inputs.pasteVariant === 'mix') {
                    baseWeight = inputs.gingerKg + inputs.garlicKg;
                    projectedOutput = gingerNet + garlicNet + Number(inputs.waterLiters);
                } else if (inputs.pasteVariant === 'ginger') {
                    baseWeight = inputs.gingerKg;
                    projectedOutput = gingerNet + Number(inputs.waterLiters);
                } else if (inputs.pasteVariant === 'garlic') {
                    baseWeight = inputs.garlicKg;
                    projectedOutput = garlicNet + Number(inputs.waterLiters);
                }

            } else if (inputs.productType === 'ginger_peeled') {
                projectedOutput = inputs.gingerKg * (1 - inputs.gingerWastage / 100);
            } else if (inputs.productType === 'garlic_peeled') {
                projectedOutput = inputs.garlicKg * (1 - inputs.garlicWastage / 100);
            }

            // Apply Previous Month's Per-KG operational costs
            // [FIX] Capped Logic for Labour as well
            const capLabour = previousMonthStats.avgMonthlyLabour || Infinity;
            const rateLabour = projectedOutput * (previousMonthStats.labourPerKg || 0);
            const estLabour = Math.min(rateLabour, capLabour);

            // [FIX] Capped Logic: Scale linearly but Cap at Monthly Average
            // If output is small -> Use Rate. If output is huge -> Use Total Monthly Bill (Cap).
            const capBills = previousMonthStats.avgMonthlyBills || Infinity;
            const rateBills = projectedOutput * (previousMonthStats.billsPerKg || 0);
            const estBills = Math.min(rateBills, capBills);

            // [FIX] Other Expenses are VARIABLE (e.g. Fuel, repairs often scale) - User Request to Uncap
            const estOther = projectedOutput * (previousMonthStats.otherPerKg || 0);

            const estPackaging = projectedOutput * (previousMonthStats.packagingPerKg || 0);

            setInputs(prev => ({
                ...prev,
                labourCost: Math.round(estLabour),
                billsCost: Math.round(estBills),
                otherCost: Math.round(estOther),
                packagingCost: Math.round(estPackaging)
            }));
        }
    }, [inputs.gingerKg, inputs.garlicKg, inputs.gingerWastage, inputs.garlicWastage, inputs.waterLiters, inputs.useSmartDefaults, previousMonthStats, inputs.productType, inputs.pasteVariant]);

    // Calculation Logic
    useEffect(() => {
        let totalMaterialCost = 0;
        let totalOutput = 0;
        let totalInput = 0;

        if (inputs.productType === 'paste') {
            const gingerCost = inputs.gingerKg * inputs.gingerRate;
            const garlicCost = inputs.garlicKg * inputs.garlicRate;

            const gingerNet = inputs.gingerKg * (1 - inputs.gingerWastage / 100);
            const garlicNet = inputs.garlicKg * (1 - inputs.garlicWastage / 100);

            const waterCost = inputs.waterLiters * inputs.waterRate;

            if (inputs.pasteVariant === 'mix') {
                totalMaterialCost = gingerCost + garlicCost + waterCost;
                totalOutput = gingerNet + garlicNet + Number(inputs.waterLiters);
                totalInput = Number(inputs.gingerKg) + Number(inputs.garlicKg) + Number(inputs.waterLiters);
            } else if (inputs.pasteVariant === 'ginger') {
                totalMaterialCost = gingerCost + waterCost;
                totalOutput = gingerNet + Number(inputs.waterLiters);
                totalInput = Number(inputs.gingerKg) + Number(inputs.waterLiters);
            } else if (inputs.pasteVariant === 'garlic') {
                totalMaterialCost = garlicCost + waterCost;
                totalOutput = garlicNet + Number(inputs.waterLiters);
                totalInput = Number(inputs.garlicKg) + Number(inputs.waterLiters);
            }

        } else if (inputs.productType === 'ginger_peeled') {
            totalMaterialCost = inputs.gingerKg * inputs.gingerRate;
            totalOutput = inputs.gingerKg * (1 - inputs.gingerWastage / 100);
            totalInput = Number(inputs.gingerKg);

        } else if (inputs.productType === 'garlic_peeled') {
            totalMaterialCost = inputs.garlicKg * inputs.garlicRate;
            totalOutput = inputs.garlicKg * (1 - inputs.garlicWastage / 100);
            totalInput = Number(inputs.garlicKg);
        }

        // Operational Cost Logic
        let effectiveOverhead = Number(inputs.billsCost) + Number(inputs.otherCost);
        // Retail: Add Packaging. Wholesale: Exclude Packaging (Separate line item in reality, but for cost calc per kg?)
        // Logic: Retail Cost = Labour + (Bills + Other + Pkg)
        //        Wholesale Cost = Labour + (Bills + Other) --> Pkg is separate usually? Or just excluded from "Overhead" bucket? 
        // Based on previous logic: 
        if (inputs.salesChannel === 'retail') {
            effectiveOverhead += Number(inputs.packagingCost);
        }

        const totalMfgCost = totalMaterialCost + Number(inputs.labourCost) + effectiveOverhead;
        const costPerKg = totalOutput > 0 ? totalMfgCost / totalOutput : 0;
        const suggestedPrice = totalOutput > 0 ? (totalMfgCost * (1 + inputs.profitMargin / 100)) / totalOutput : 0;

        setResults({
            totalInputKg: totalInput,
            totalOutputKg: totalOutput,
            totalCost: totalMfgCost,
            costPerKg: costPerKg,
            recPrice: suggestedPrice, // Renamed to suggestedPrice in calculation, but state key is recPrice
            yieldPercent: totalInput > 0 ? (totalOutput / totalInput) * 100 : 0
        });
    }, [inputs]);

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

    const inputStyle = {
        background: 'var(--glass-highlight)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-primary)',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s',
        textAlign: 'right'
    };

    const focusStyle = {
        borderColor: 'var(--accent-primary)',
        background: 'rgba(255, 255, 255, 0.08)'
    };

    // Helper to check active inputs
    const showGinger = (inputs.productType === 'paste' && (inputs.pasteVariant === 'mix' || inputs.pasteVariant === 'ginger')) || inputs.productType === 'ginger_peeled';
    const showGarlic = (inputs.productType === 'paste' && (inputs.pasteVariant === 'mix' || inputs.pasteVariant === 'garlic')) || inputs.productType === 'garlic_peeled';
    const showWater = inputs.productType === 'paste';

    return (
        <div className="animate-fade-in responsive-sidebar-layout">
            <div className="flex flex-col h-full gap-6">

                {/* Header */}
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calculator size={24} color="#f59e0b" />
                            Production Cost Simulator
                            {/* [NEW] Settings Button */}
                            <button
                                onClick={() => setShowSettings(true)}
                                style={{
                                    background: 'var(--glass-highlight)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    marginLeft: '0.5rem',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title="Default Rates"
                            >
                                <Settings size={18} />
                            </button>
                        </h2>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Forecasting for: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedMonth}</span>
                            {previousMonthStats ? (
                                <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.25rem' }}>
                                    ✓ Auto-filling operational costs from previous month averages.
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                    ⚠ No history available for auto-fill.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sales Channel Toggle */}
                    <div style={{ display: 'flex', background: 'var(--glass-highlight)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                        {['retail', 'wholesale'].map(channel => (
                            <button
                                key={channel}
                                onClick={() => handleInput('salesChannel', channel)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.35rem',
                                    border: 'none',
                                    background: inputs.salesChannel === channel ? 'var(--accent-primary)' : 'transparent',
                                    color: inputs.salesChannel === channel ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: inputs.salesChannel === channel ? '600' : 'normal',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {channel}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>

                    {/* Main Type Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                        {[
                            { id: 'paste', label: 'Paste' },
                            { id: 'ginger_peeled', label: 'Ginger Peeled' },
                            { id: 'garlic_peeled', label: 'Garlic Peeled' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleInput('productType', type.id)}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid',
                                    borderColor: inputs.productType === type.id ? 'var(--accent-primary)' : 'transparent',
                                    background: inputs.productType === type.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                    color: inputs.productType === type.id ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: inputs.productType === type.id ? '600' : 'normal',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    {/* Sub-Variant Tabs (Only for Paste) */}
                    {inputs.productType === 'paste' && (
                        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.5rem' }}>
                            <div style={{ height: '20px', width: '1px', background: 'var(--glass-border)' }}></div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Variant:</span>
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
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            border: '1px solid',
                                            borderColor: inputs.pasteVariant === variant.id ? 'rgba(96, 165, 250, 0.5)' : 'transparent',
                                            background: inputs.pasteVariant === variant.id ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                                            color: inputs.pasteVariant === variant.id ? '#60a5fa' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: inputs.pasteVariant === variant.id ? '600' : 'normal',
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

                {/* Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                    {/* Left Panel: Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Material Section */}
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--glass-highlight)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span>
                                Raw Material Inputs
                            </h3>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {/* Ginger Row */}
                                {showGinger && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ginger (Kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.gingerKg}
                                                onChange={(e) => handleInput('gingerKg', e.target.value)}
                                                style={inputStyle}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Rate (₹/Kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.gingerRate}
                                                onChange={(e) => handleInput('gingerRate', e.target.value)}
                                                style={{ ...inputStyle, color: '#f59e0b', fontWeight: '500' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Garlic Row */}
                                {showGarlic && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Garlic (Kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.garlicKg}
                                                onChange={(e) => handleInput('garlicKg', e.target.value)}
                                                style={inputStyle}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Rate (₹/Kg)</label>
                                            <input
                                                type="number"
                                                value={inputs.garlicRate}
                                                onChange={(e) => handleInput('garlicRate', e.target.value)}
                                                style={{ ...inputStyle, color: '#f59e0b', fontWeight: '500' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            />
                                        </div>
                                    </div>

                                )}

                                {/* Water Row */}
                                {showWater && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Water (Liters)</label>
                                            <input
                                                type="number"
                                                value={inputs.waterLiters}
                                                onChange={(e) => handleInput('waterLiters', e.target.value)}
                                                style={{ ...inputStyle, color: '#60a5fa' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Rate (₹/L)</label>
                                            <input
                                                type="number"
                                                value={inputs.waterRate}
                                                onChange={(e) => handleInput('waterRate', e.target.value)}
                                                style={{ ...inputStyle, color: '#f59e0b', fontWeight: '500' }}
                                                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Operational Section */}
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--glass-highlight)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }}></span>
                                        Operational Costs
                                    </h3>
                                    {inputs.useSmartDefaults && previousMonthStats && (
                                        <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '0.25rem' }}>
                                            Based on {previousMonthStats.month} actuals ({previousMonthStats.labourPerKg?.toFixed(2)}/kg, {previousMonthStats.overheadPerKg?.toFixed(2)}/kg{previousMonthStats.packagingPerKg ? `, Pkg: ${previousMonthStats.packagingPerKg.toFixed(2)}/kg` : ''})
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={inputs.useSmartDefaults}
                                        onChange={(e) => setInputs(prev => ({ ...prev, useSmartDefaults: e.target.checked }))}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auto-fill</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', alignItems: 'start' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Labour</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.labourCost}
                                            onChange={(e) => {
                                                handleInput('labourCost', e.target.value);
                                                setInputs(prev => ({ ...prev, useSmartDefaults: false }));
                                            }}
                                            style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                                        />
                                    </div>
                                    {previousMonthStats && inputs.useSmartDefaults && (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textAlign: 'right' }}>
                                            Rate: ₹{previousMonthStats.labourPerKg?.toFixed(2)}/kg <br />
                                            Cap: ₹{Math.round(previousMonthStats.avgMonthlyLabour || 0)}<br />
                                            <span style={{ color: '#60a5fa' }}>Eff: ₹{(results.totalOutputKg > 0 ? inputs.labourCost / results.totalOutputKg : 0).toFixed(2)}/kg</span>
                                        </div>
                                    )}
                                </div>
                                {/* Overhead Group: Bills & Other */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Bills & Rent</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.billsCost}
                                            onChange={(e) => {
                                                handleInput('billsCost', e.target.value);
                                                setInputs(prev => ({ ...prev, useSmartDefaults: false }));
                                            }}
                                            style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                                        />
                                    </div>
                                    {previousMonthStats && inputs.useSmartDefaults && (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textAlign: 'right' }}>
                                            Rate: ₹{previousMonthStats.billsPerKg?.toFixed(2)}/kg <br />
                                            Cap: ₹{Math.round(previousMonthStats.avgMonthlyBills || 0)} <br />
                                            <span style={{ color: '#60a5fa' }}>Eff: ₹{(results.totalOutputKg > 0 ? inputs.billsCost / results.totalOutputKg : 0).toFixed(2)}/kg</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Other Exp</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.otherCost}
                                            onChange={(e) => {
                                                handleInput('otherCost', e.target.value);
                                                setInputs(prev => ({ ...prev, useSmartDefaults: false }));
                                            }}
                                            style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                                        />
                                    </div>
                                    {previousMonthStats && inputs.useSmartDefaults && (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textAlign: 'right' }}>
                                            Rate: ₹{previousMonthStats.otherPerKg?.toFixed(2)}/kg (Var)
                                        </div>
                                    )}
                                </div>

                                {/* Packaging Component Input */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Pkg Cost</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.packagingCost}
                                            onChange={(e) => handleInput('packagingCost', e.target.value)}
                                            style={{ ...inputStyle, paddingLeft: '1.5rem', borderColor: inputs.salesChannel === 'wholesale' ? 'var(--accent-primary)' : 'var(--glass-border)' }}
                                        />
                                    </div>
                                    {previousMonthStats && inputs.useSmartDefaults && (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textAlign: 'right' }}>
                                            Rate: ₹{previousMonthStats.packagingPerKg?.toFixed(2)}/kg
                                        </div>
                                    )}
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a78bfa', marginBottom: '0.35rem' }}>Total Op. Cost</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#a78bfa', fontSize: '0.9rem' }}>₹</span>
                                        <input
                                            type="text"
                                            readOnly
                                            value={(inputs.salesChannel === 'wholesale' ? (Number(inputs.labourCost) + Number(inputs.billsCost) + Number(inputs.otherCost)) : (Number(inputs.labourCost) + Number(inputs.billsCost) + Number(inputs.otherCost) + Number(inputs.packagingCost))).toFixed(0)}
                                            style={{ ...inputStyle, background: 'rgba(167, 139, 250, 0.1)', borderColor: '#a78bfa', color: '#a78bfa', paddingLeft: '1.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {inputs.salesChannel === 'wholesale' && Number(inputs.packagingCost) > 0 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: '0.5rem', textAlign: 'right' }}>
                                    * Wholesale: Subtracting packaging (₹{inputs.packagingCost}) from overhead.
                                </div>
                            )}
                        </div>

                        {/* Wastage & Water Section */}
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--glass-highlight)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                Yield & Process Factors
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                                {showWater && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Water</span>
                                                <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>(Added)</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
                                                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontWeight: 'bold', width: '50px', fontSize: '1.2rem', textAlign: 'right', outline: 'none' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {showGinger && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ginger</span>
                                                <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>(Waste)</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <input
                                                    type="number"
                                                    value={inputs.gingerWastage}
                                                    onChange={(e) => handleInput('gingerWastage', e.target.value)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', width: '50px', fontSize: '1.2rem', textAlign: 'right', outline: 'none' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {showGarlic && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Garlic</span>
                                                <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>(Waste)</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <input
                                                    type="number"
                                                    value={inputs.garlicWastage}
                                                    onChange={(e) => handleInput('garlicWastage', e.target.value)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', width: '50px', fontSize: '1.2rem', textAlign: 'right', outline: 'none' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Panel: Results */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Main Results Card */}
                        <div className="glass-panel" style={{
                            padding: '2.5rem 2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
                            border: '1px solid var(--glass-border)',
                            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '1.5rem'
                        }}>

                            {/* Glow Effects */}
                            <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }}></div>

                            <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '600', marginBottom: '1rem' }}>
                                    Production Cost
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', lineHeight: 1, marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '2.5rem', color: '#64748b', fontWeight: '400', marginTop: '0.5rem', marginRight: '0.25rem' }}>₹</span>
                                    <span style={{ fontSize: '5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', textShadow: '0 0 30px rgba(248, 250, 252, 0.2)' }}>
                                        {results.costPerKg.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>per Kg Output</div>

                                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent)', width: '80%', margin: '2.5rem auto' }}></div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Output</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                            {results.totalOutputKg.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#64748b' }}>kg</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: results.yieldPercent < 75 ? '#ef4444' : '#10b981', marginTop: '0.25rem', fontWeight: '500' }}>
                                            {results.yieldPercent.toFixed(1)}% Yield
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Spend</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                            ₹{Math.round(results.totalCost).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>All Inclusive</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rec Price Card */}
                        <div style={{
                            padding: '1.5rem 2rem',
                            background: 'rgba(5, 150, 105, 0.1)',
                            border: '1px solid rgba(5, 150, 105, 0.3)',
                            borderRadius: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Rec. Selling Price
                                    <br />
                                    <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>(Inc. Margin)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={inputs.profitMargin}
                                            onChange={(e) => handleInput('profitMargin', e.target.value)}
                                            style={{
                                                background: 'rgba(6, 78, 59, 0.4)',
                                                border: '1px solid rgba(52, 211, 153, 0.4)',
                                                borderRadius: '0.5rem',
                                                padding: '0.25rem 0.5rem',
                                                color: '#34d399',
                                                fontSize: '1.1rem',
                                                width: '60px',
                                                textAlign: 'center',
                                                outline: 'none',
                                                fontWeight: '600'
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#d1fae5', fontWeight: '500' }}>% Margin</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#34d399', lineHeight: 1, textShadow: '0 0 20px rgba(52, 211, 153, 0.3)' }}>
                                    <span style={{ fontSize: '1.5rem', verticalAlign: 'top', marginRight: '0.25rem', opacity: 0.8 }}>₹</span>
                                    {results.recPrice.toFixed(2)}
                                </div>
                            </div>
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
                                <button
                                    onClick={() => {
                                        const gRate = parseFloat(document.getElementById('preset-ginger').value) || 0;
                                        const gaRate = parseFloat(document.getElementById('preset-garlic').value) || 0;
                                        const wRate = parseFloat(document.getElementById('preset-water').value) || 0;
                                        savePresets({ gingerRate: gRate, garlicRate: gaRate, waterRate: wRate });
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
        </div >
    );
};

export default CostSimulator;
