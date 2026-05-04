import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Calendar, Clock, DollarSign, TrendingUp, HelpCircle, Briefcase, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(val || 0);
};

const isSpecialDay = (dateStr, holidays = []) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const day = date.getDay();
    const isSunday = day === 0;
    const holidayEntry = Array.isArray(holidays) ? holidays.find(h => (typeof h === 'string' ? h : (h?.date || '')) === dateStr) : null;
    return !!holidayEntry || isSunday;
};

const getWorkingDaysInMonth = (year, month, holidays = []) => {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!isSpecialDay(dateStr, holidays)) {
            count++;
        }
    }
    return count;
};

const SalarySimulator = () => {
    const [config, setConfig] = useState({
        standard_daily_hours: 8,
        ot_multiplier: 1.5,
        national_holidays: []
    });
    const [monthlySalary, setMonthlySalary] = useState(25000);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [projectedOT, setProjectedOT] = useState(10);
    const [dailyHours, setDailyHours] = useState(8);
    const [otMultiplier, setOtMultiplier] = useState(1.5);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: conf } = await supabase.from('payroll_config').select('*').eq('id', 1).single();
        if (conf) {
            setConfig(conf);
            setDailyHours(conf.standard_daily_hours);
            setOtMultiplier(conf.ot_multiplier);
        }
        const { data: emps } = await supabase.from('employees').select('id, name, emp_id, monthly_salary, payout_type').eq('is_active', true);
        if (emps) setEmployees(emps.filter(e => e.payout_type === 'Monthly'));
    };

    const handleEmpSelect = (id) => {
        const emp = employees.find(e => e.emp_id === id);
        if (emp) {
            setSelectedEmp(id);
            setMonthlySalary(emp.monthly_salary || 0);
        } else {
            setSelectedEmp('');
        }
    };

    const results = useMemo(() => {
        const holidayList = [];
        let workingDays = 0;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(dateStr);
            const dayName = dateObj.toLocaleString('default', { weekday: 'short' });
            
            // Sunday check
            const isSunday = dateObj.getDay() === 0;
            
            // Holiday check
            const holidayEntry = Array.isArray(config.national_holidays) 
                ? config.national_holidays.find(h => (typeof h === 'string' ? h : h?.date) === dateStr) 
                : null;
            
            if (isSunday || holidayEntry) {
                holidayList.push({
                    date: dateStr,
                    day: d,
                    dayName,
                    type: isSunday ? 'Sunday' : 'Holiday',
                    reason: typeof holidayEntry === 'object' ? holidayEntry.reason : (isSunday ? 'Weekly Off' : 'Public Holiday')
                });
            } else {
                workingDays++;
            }
        }

        const totalFixedHours = workingDays * dailyHours;
        const hourlyRate = totalFixedHours > 0 ? monthlySalary / totalFixedHours : 0;
        const otRate = hourlyRate * otMultiplier;
        const otPay = projectedOT * otRate;
        const totalPayout = monthlySalary + otPay;

        return {
            workingDays,
            totalFixedHours,
            hourlyRate,
            otRate,
            otPay,
            totalPayout,
            holidayList,
            monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
        };
    }, [monthlySalary, month, year, projectedOT, dailyHours, otMultiplier, config]);

    return (
        <div className="animate-slide-up" style={{ color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                
                {/* Inputs Section */}
                <div style={{ flex: '1 1 400px' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6366f1' }}>
                            <Calculator size={20} />
                            Simulation Parameters
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Employee Quick Select */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Load from Employee</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <select
                                        value={selectedEmp}
                                        onChange={(e) => handleEmpSelect(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Manual Entry...</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.emp_id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                                {e.name} ({e.emp_id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Monthly Salary (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="number"
                                            value={monthlySalary}
                                            onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)}
                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Daily Fixed Hours</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="number"
                                            value={dailyHours}
                                            onChange={(e) => setDailyHours(parseFloat(e.target.value) || 0)}
                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Month / Year</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(parseInt(e.target.value))}
                                            style={{ flex: 1, padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                                    {new Date(2026, i).toLocaleString('default', { month: 'short' })}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={year}
                                            onChange={(e) => setYear(parseInt(e.target.value))}
                                            style={{ width: '90px', padding: '0.75rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>OT Multiplier</label>
                                    <div style={{ position: 'relative' }}>
                                        <TrendingUp size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={otMultiplier}
                                            onChange={(e) => setOtMultiplier(parseFloat(e.target.value) || 0)}
                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>Projected OT Hours for the Month</label>
                                    <input
                                        type="number"
                                        value={projectedOT}
                                        onChange={(e) => setProjectedOT(parseFloat(e.target.value) || 0)}
                                        style={{ width: '80px', padding: '0.3rem 0.5rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.4rem', color: '#60a5fa', fontWeight: 700, textAlign: 'center', outline: 'none' }}
                                    />
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="300"
                                    step="0.5"
                                    value={projectedOT > 300 ? 300 : projectedOT}
                                    onChange={(e) => setProjectedOT(parseFloat(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span>0h</span>
                                    <span>300h+ (Manual input allowed)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Holidays & Off-days List */}
                    <div className="glass-panel" style={{ marginTop: '1rem', padding: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={16} />
                            Holidays & Sundays ({results.monthName})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {results.holidayList.length > 0 ? (
                                results.holidayList.map((h, i) => (
                                    <div key={i} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '0.6rem 0.8rem', 
                                        background: h.type === 'Sunday' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
                                        borderRadius: '0.5rem',
                                        border: `1px solid ${h.type === 'Sunday' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ 
                                                fontSize: '0.85rem', 
                                                fontWeight: 700, 
                                                color: h.type === 'Sunday' ? '#6366f1' : '#ef4444',
                                                minWidth: '2.5rem'
                                            }}>
                                                {h.day} {h.dayName}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>{h.reason}</div>
                                        </div>
                                        <div style={{ 
                                            fontSize: '0.65rem', 
                                            padding: '0.2rem 0.5rem', 
                                            borderRadius: '1rem', 
                                            background: h.type === 'Sunday' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: h.type === 'Sunday' ? '#6366f1' : '#ef4444',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>
                                            {h.type}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                    No holidays or Sundays in this month.
                                </div>
                            )}
                        </div>
                        <p style={{ margin: '1rem 0 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
                            These days are excluded from the "Working Days" count for hourly rate calculation.
                        </p>
                    </div>
                </div>

                {/* Results Section */}
                <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', flex: 1, border: '1px solid rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                            <TrendingUp size={20} />
                            Calculation Results ({results.monthName} {year})
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Working Days</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{results.workingDays} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>Days</span></div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Excl. Sundays & Holidays</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Fixed Hours</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{results.totalFixedHours} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>Hrs</span></div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Threshold for OT</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <DollarSign size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Hourly Base Rate</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Monthly Salary / Fixed Hours</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatCurrency(results.hourlyRate)}/hr</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                        <TrendingUp size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>OT Hourly Rate</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Base Rate × {otMultiplier}x</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(results.otRate)}/hr</div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Fixed Base Salary</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(monthlySalary)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Projected OT Pay ({projectedOT} hrs)</span>
                                <span style={{ fontWeight: 600, color: '#10b981' }}>+ {formatCurrency(results.otPay)}</span>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total Monthly Payout</span>
                                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>{formatCurrency(results.totalPayout)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalarySimulator;
