import React, { useState, useEffect } from 'react';
import { RefreshCw, Calculator, DollarSign, Info } from 'lucide-react';

const CostSimulator = ({ previousMonthStats, selectedMonth }) => {
    // State for inputs
    const [inputs, setInputs] = useState({
        gingerKg: 50,
        gingerRate: 0,
        garlicKg: 50,
        garlicRate: 0,
        labourCost: 0,
        overheadCost: 0,
        gingerWastage: 10,
        garlicWastage: 20,
        waterPercentage: 20, // Default 20% water
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
            // Calculate projected output based on current inputs
            const gingerNet = inputs.gingerKg * (1 - inputs.gingerWastage / 100);
            const garlicNet = inputs.garlicKg * (1 - inputs.garlicWastage / 100);
            const waterWeight = (inputs.gingerKg + inputs.garlicKg) * (inputs.waterPercentage / 100);
            const projectedOutput = gingerNet + garlicNet + waterWeight;

            // Apply Previous Month's Per-KG operational costs
            const estLabour = projectedOutput * (previousMonthStats.labourPerKg || 0);
            const estOverhead = projectedOutput * (previousMonthStats.overheadPerKg || 0);

            setInputs(prev => ({
                ...prev,
                labourCost: Math.round(estLabour),
                overheadCost: Math.round(estOverhead)
            }));
        }
    }, [inputs.gingerKg, inputs.garlicKg, inputs.gingerWastage, inputs.garlicWastage, inputs.waterPercentage, inputs.useSmartDefaults, previousMonthStats]);

    // Calculation Logic
    useEffect(() => {
        const gingerCost = inputs.gingerKg * inputs.gingerRate;
        const garlicCost = inputs.garlicKg * inputs.garlicRate;
        const totalMaterialCost = gingerCost + garlicCost;
        const totalMfgCost = totalMaterialCost + Number(inputs.labourCost) + Number(inputs.overheadCost);

        const gingerNet = inputs.gingerKg * (1 - inputs.gingerWastage / 100);
        const garlicNet = inputs.garlicKg * (1 - inputs.garlicWastage / 100);

        // Water is added based on Raw Input Weight
        const waterWeight = (Number(inputs.gingerKg) + Number(inputs.garlicKg)) * (inputs.waterPercentage / 100);

        const totalOutput = gingerNet + garlicNet + waterWeight;

        const costPerKg = totalOutput > 0 ? totalMfgCost / totalOutput : 0;
        const recPrice = costPerKg * (1 + (inputs.profitMargin || 0) / 100);
        // Yield can now be mixed (input vs output)
        const totalInput = Number(inputs.gingerKg) + Number(inputs.garlicKg);
        const yieldPct = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;

        setResults({
            totalInputKg: totalInput,
            totalOutputKg: totalOutput,
            totalCost: totalMfgCost,
            costPerKg: costPerKg,
            recPrice: recPrice,
            yieldPercent: yieldPct
        });
    }, [inputs]);

    const handleInput = (key, value) => {
        setInputs(prev => ({
            ...prev,
            [key]: parseFloat(value) || 0
        }));
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

    return (
        <div className="animate-fade-in responsive-sidebar-layout">
            <div className="flex flex-col h-full gap-6">

                {/* Header */}
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calculator size={24} color="#f59e0b" />
                            Production Cost Simulator
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

                                {/* Garlic Row */}
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
                                            Based on {previousMonthStats.month} actuals ({previousMonthStats.labourPerKg?.toFixed(2)}/kg, {previousMonthStats.overheadPerKg?.toFixed(2)}/kg)
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Labour (Total)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.labourCost}
                                            onChange={(e) => {
                                                handleInput('labourCost', e.target.value);
                                                setInputs(prev => ({ ...prev, useSmartDefaults: false }));
                                            }}
                                            style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                                            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--glass-border)';
                                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Overhead (Total)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.overheadCost}
                                            onChange={(e) => {
                                                handleInput('overheadCost', e.target.value);
                                                setInputs(prev => ({ ...prev, useSmartDefaults: false }));
                                            }}
                                            style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                                            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--glass-border)';
                                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#a855f7', marginBottom: '0.5rem' }}>Total Op. Cost</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#a855f7' }}>₹</span>
                                        <input
                                            type="number"
                                            value={inputs.labourCost + inputs.overheadCost}
                                            readOnly
                                            style={{ ...inputStyle, paddingLeft: '1.5rem', color: '#a855f7', fontWeight: 'bold', background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Wastage & Water Section */}
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--glass-highlight)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                Yield & Process Factors
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Water</span>
                                            <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>(Added)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <input
                                                type="number"
                                                value={inputs.waterPercentage}
                                                onChange={(e) => handleInput('waterPercentage', e.target.value)}
                                                style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontWeight: 'bold', width: '50px', fontSize: '1.2rem', textAlign: 'right', outline: 'none' }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>%</span>
                                        </div>
                                    </div>
                                </div>
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
                            </div>
                        </div>

                    </div>

                    {/* Right Panel: Results */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Main Results Card */}
                        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', flex: 1 }}>

                            {/* Glow Effects */}
                            <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                            <div style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>

                            <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>PRODUCTION COST</div>
                                <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--text-primary)', textShadow: '0 0 20px rgba(248, 250, 252, 0.1)', lineHeight: 1 }}>
                                    <span style={{ fontSize: '2rem', color: '#64748b', fontWeight: '400', marginRight: '0.25rem' }}>₹</span>
                                    {results.costPerKg.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>per Kg Output</div>

                                <div style={{ height: '1px', background: 'var(--glass-border)', width: '60%', margin: '2rem auto' }}></div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Output</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{results.totalOutputKg.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>kg</span></div>
                                        <div style={{ fontSize: '0.75rem', color: results.yieldPercent < 75 ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>{results.yieldPercent.toFixed(1)}% Yield</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Spend</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{results.totalCost.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>All Inclusive</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rec Price Card */}
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: '600', textTransform: 'uppercase' }}>REC. SELLING PRICE <br />(INC. MARGIN)</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input
                                        type="number"
                                        value={inputs.profitMargin}
                                        onChange={(e) => handleInput('profitMargin', e.target.value)}
                                        style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399', borderRadius: '4px', padding: '0.1rem 0.3rem', color: '#34d399', fontSize: '1rem', width: '50px', textAlign: 'center', outline: 'none' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>% Margin</span>
                                </div>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#34d399' }}>
                                ₹{results.recPrice.toFixed(2)}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CostSimulator;
