import React, { useState, useMemo, useRef } from 'react';
import { Download, X, Printer } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
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

const PayslipGenerator = ({ isOpen, onClose, employees, attendanceData, paymentData, payrollConfig }) => {
    const [selectedEmp, setSelectedEmp] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const printRef = useRef(null);

    // Compute Payslip Data based on selection
    const payslipData = useMemo(() => {
        if (!selectedEmp || !selectedMonth || !selectedYear) return null;

        const employee = employees.find(e => e.emp_id === selectedEmp);
        if (!employee) return null;

        // Filter Attendance Records
        const monthAttendance = attendanceData.filter(record => {
            if (record.empId !== selectedEmp) return false;
            if (!record.date) return false;
            const d = new Date(record.date);
            return (d.getMonth() + 1) === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);
        });

        // Filter Payment Records
        const monthPayments = paymentData.filter(record => {
            if (record.emp_id !== selectedEmp) return false;
            if (!record.date) return false;
            const d = new Date(record.date);
            return (d.getMonth() + 1) === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);
        });

        let totalWorkedHours = 0;
        let totalOTHours = 0;
        let totalDeductions = 0;
        let totalDailyWageEarned = 0; // The already calced daily_wage (which includes OT)
        let totalBaseWage = 0; // Without OT
        let totalOTPay = 0;
        let totalBonusPoints = 0;
        let daysPresent = 0;

        const isSelectedMonthBeforeMay2026 = parseInt(selectedYear) < 2026 || (parseInt(selectedYear) === 2026 && parseInt(selectedMonth) < 5);
        const isMonthly = employee.payout_type === 'Monthly' && !isSelectedMonthBeforeMay2026;
        
        let dynamicRate = parseFloat(employee.hourly_rate || payrollConfig?.default_hourly_rate || 23);
        if (isMonthly) {
            const workingDays = getWorkingDaysInMonth(selectedYear, selectedMonth, payrollConfig?.national_holidays || []);
            const totalFixedHours = workingDays * (payrollConfig?.standard_daily_hours || 8);
            if (totalFixedHours > 0) {
                dynamicRate = parseFloat(employee.monthly_salary || 0) / totalFixedHours;
            }
        }

        let daysAbsent = 0;

        monthAttendance.forEach(att => {
            const status = (att.attendance_status || 'Present').toLowerCase();
            const units = (att.shift_type === 'Half Day' ? 0.5 : 1);

            if (status.includes('present')) {
                daysPresent += units;
                if (units === 0.5 && !isSpecialDay(att.date, payrollConfig?.national_holidays)) daysAbsent += 0.5;

                const worked = parseFloat(att.total_hours || att.hoursWorked || 0);
                const ot = parseFloat(att.ot_hours || 0); // Strictly use ot_hours to match dashboard
                const reg = worked - ot;

                totalWorkedHours += worked;
                totalOTHours += ot;
                totalBonusPoints += parseFloat(att.bonus || 0);
                totalDeductions += parseFloat(att.deductions || 0);

                const rate = dynamicRate;
                const otMultiplier = parseFloat(payrollConfig?.ot_multiplier || 1.5);
                const otRate = rate * otMultiplier;
                
                const dailyTotal = parseFloat(att.daily_wage || att.dailyWage || 0);
                const otPay = ot * otRate;

                totalDailyWageEarned += dailyTotal;
                totalOTPay += otPay;
                if (!isMonthly) {
                    totalBaseWage += Math.max(0, dailyTotal - otPay);
                }
            } else if (status === 'absent') {
                daysAbsent += 1;
            } else if (status.includes('leave')) {
                if (units === 0.5) daysAbsent += 0.5;
            }
        });

        const monthlySalary = parseFloat(employee.monthly_salary || 0);
        let absentDeduction = 0;

        if (isMonthly) {
            const workingDays = getWorkingDaysInMonth(selectedYear, selectedMonth, payrollConfig?.national_holidays || []);
            const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
            absentDeduction = daysAbsent * dailyRate;
        }

        let grossEarned = totalBaseWage + totalOTPay;

        if (isMonthly) {
            grossEarned += monthlySalary;
        }

        let totalAdvancesStr = 0;
        let totalSalariesPaidStr = 0;
        let totalWagesPaidStr = 0;

        let lifetimeTotalAdvances = 0;

        paymentData.forEach(p => {
            if (p.emp_id !== selectedEmp) return;
            const amt = parseFloat(p.amount) || 0;
            if (!p.type) return;
            const typeLower = p.type.toLowerCase();
            const remarks = p.remarks || '';

            // Track lifetime advances
            if (typeLower.includes('advance') || (typeLower === 'bonus' && remarks.includes('[DEDUCTIBLE]'))) {
                lifetimeTotalAdvances += amt;
            }

            // Only count towards THIS month if date matches
            if (!p.date) return;
            const d = new Date(p.date);
            const isThisMonth = (d.getMonth() + 1) === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);

            if (isThisMonth) {
                if (typeLower.includes('advance')) {
                    totalAdvancesStr += amt;
                } else if (typeLower === 'bonus') {
                    // [LOGIC UPDATE]: ALL bonuses (Deductible or Gift) are EARNINGS.
                    // They all contribute to paying off or balancing the advances.
                    totalBonusPoints += amt;
                } else if (typeLower.includes('wages')) {
                    totalWagesPaidStr += amt;
                } else {
                    totalSalariesPaidStr += amt; // Everything else
                }
            }
        });

        const netEarningsForMonth = grossEarned + totalBonusPoints - totalDeductions - absentDeduction;
        const totalDisbursed = totalSalariesPaidStr + totalWagesPaidStr;
        
        // Consistent Settlement Logic matching Portal Dashboard
        // Balance = Earnings - (Advances + Salaries + Wages)
        const currentStandingBalance = netEarningsForMonth - (totalAdvancesStr + totalDisbursed);

        const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

        return {
            employee,
            monthName,
            year: selectedYear,
            daysPresent,
            daysAbsent,
            absentDeduction,
            totalOTHours: totalOTHours.toFixed(1),
            totalRegHours: (totalWorkedHours - totalOTHours).toFixed(1),
            totalBaseWage,
            totalOTPay,
            grossEarned,
            totalBonus: totalBonusPoints,
            totalDeductions,
            netPayoutTarget: netEarningsForMonth,
            totalAdvancesTaken: totalAdvancesStr,
            totalSalariesDisbursed: totalDisbursed,
            finalBalanceForMonth: currentStandingBalance,
            isMonthly,
            monthlySalary,
            generatedDate: new Date().toLocaleDateString('en-IN')
        };

    }, [selectedEmp, selectedMonth, selectedYear, employees, attendanceData, paymentData, payrollConfig]);

    const handlePrint = () => {
        if (!printRef.current) return;

        // Use browser print functionality isolating the print component
        const printContent = printRef.current.outerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Reload to restore React state cleanly after DOM override
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* Header / Controls */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Printer size={20} color="#3b82f6" />
                        Generate Payslip
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Filters */}
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Select Employee</label>
                        <select
                            value={selectedEmp}
                            onChange={(e) => setSelectedEmp(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', outline: 'none' }}
                        >
                            <option value="" style={{ color: '#1e293b' }}>-- Choose --</option>
                            {(employees || []).map(e => (
                                <option key={e.emp_id || e.id} value={e.emp_id} style={{ color: '#1e293b' }}>{e.name} ({e.emp_id})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ width: '150px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Month</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', outline: 'none' }}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m} style={{ color: '#1e293b' }}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ width: '120px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Year</label>
                        <input
                            type="number"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Payslip Preview */}
                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', background: '#e2e8f0', color: '#0f172a' }}>

                    {payslipData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '700px' }}>
                                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                                    <Download size={16} /> Print / Download PDF
                                </button>
                            </div>

                            {/* PRINTABLE AREA */}
                            <div className="payslip-print-container" ref={printRef} style={{
                                width: '100%',
                                background: '#ffffff',
                                padding: '1.5rem',
                                color: '#1e293b',
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}>
                                <style type="text/css">
                                    {`
                                      @media print {
                                        @page { 
                                            size: A5; 
                                            margin: 0; 
                                        } /* Removes browser headers and sets A5 vertical */
                                        html, body { 
                                          background: #ffffff !important; /* Force true white */
                                          color: #000000 !important;
                                          margin: 0 !important;
                                          padding: 0 !important;
                                          width: 100% !important;
                                          height: 100% !important;
                                          overflow: hidden !important;
                                          -webkit-print-color-adjust: exact !important; 
                                          print-color-adjust: exact !important; 
                                        }
                                        /* Destroy any glowing orbs, blobs or gradients from global layout */
                                        html::before, html::after, body::before, body::after, #root::before, #root::after {
                                            display: none !important;
                                            content: none !important;
                                            background: none !important;
                                            opacity: 0 !important;
                                        }
                                        /* Internal margin for the document to simulate 0.2in physical paper margin */
                                        .payslip-print-container {
                                            padding: 0.2in !important;
                                            box-sizing: border-box !important;
                                            height: 100vh !important;
                                        }
                                      }
                                    `}
                                </style>

                                {/* Company Header */}
                                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                                    <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>NILAA FOODS & SPICES</h1>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>Official Employee Payslip</div>
                                </div>

                                {/* Payslip Meta */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.5rem' }}>{payslipData.monthName} {payslipData.year}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}><span style={{ color: '#64748b', width: '60px' }}>Date:</span> <strong>{payslipData.generatedDate}</strong></div>
                                    </div>
                                    <div style={{ textAlign: 'right', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.2rem' }}>{payslipData.employee.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Designation: <span style={{ color: '#0f172a', fontWeight: 600 }}>{payslipData.employee.role || 'Staff'}</span></div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Emp ID: <span style={{ color: '#0f172a', fontWeight: 600 }}>{payslipData.employee.emp_id}</span></div>
                                        {payslipData.employee.staff_type && (
                                            <div style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.65rem', background: payslipData.employee.staff_type === 'Temporary' ? '#fef3c7' : '#dbeafe', color: payslipData.employee.staff_type === 'Temporary' ? '#d97706' : '#2563eb', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 700 }}>
                                                {payslipData.employee.staff_type.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attendance Summary */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Time & Attendance</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.1rem' }}>Reg. Hours</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{payslipData.totalRegHours}h</div>
                                        </div>
                                        <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginBottom: '0.1rem' }}>Overtime Hrs</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{payslipData.totalOTHours}h</div>
                                        </div>
                                        <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#10b981', marginBottom: '0.1rem' }}>Total Hours</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{(parseFloat(payslipData.totalRegHours) + parseFloat(payslipData.totalOTHours)).toFixed(1)}h</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Details */}
                                <div>
                                    <h3 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Earnings & Deductions</h3>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                        <tbody>
                                            {!payslipData.isMonthly && (
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.4rem 0', color: '#475569' }}>
                                                        Base Wages (Reg. Hours)
                                                    </td>
                                                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(payslipData.totalBaseWage)}</td>
                                                </tr>
                                            )}
                                            {payslipData.isMonthly && (
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.4rem 0', color: '#475569' }}>Monthly Fixed Salary</td>
                                                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(payslipData.monthlySalary)}</td>
                                                </tr>
                                            )}
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.4rem 0', color: '#475569' }}>Overtime Pay</td>
                                                <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(payslipData.totalOTPay)}</td>
                                            </tr>
                                            {payslipData.isMonthly && payslipData.daysAbsent > 0 && (
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.4rem 0', color: '#ef4444' }}>Absent Deduction ({payslipData.daysAbsent} days)</td>
                                                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>-{formatCurrency(payslipData.absentDeduction)}</td>
                                                </tr>
                                            )}
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.4rem 0', color: '#475569' }}>Bonus Payout</td>
                                                <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600, color: '#a855f7' }}>{payslipData.totalBonus > 0 ? `+${formatCurrency(payslipData.totalBonus)}` : '₹0'}</td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                <td style={{ padding: '0.4rem 0.5rem', fontWeight: 700, color: '#0f172a' }}>Gross Earnings (Total)</td>
                                                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{formatCurrency(payslipData.grossEarned + payslipData.totalBonus - (payslipData.absentDeduction || 0))}</td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.4rem 0', color: '#475569', paddingTop: '0.6rem' }}>Penalties / Deductions</td>
                                                <td style={{ padding: '0.4rem 0', textAlign: 'right', color: '#ef4444', fontWeight: 600, paddingTop: '0.6rem' }}>{payslipData.totalDeductions > 0 ? `-${formatCurrency(payslipData.totalDeductions)}` : '₹0'}</td>
                                            </tr>
                                            <tr style={{ background: 'rgba(59, 130, 246, 0.03)', borderBottom: '2px solid #3b82f6' }}>
                                                <td style={{ padding: '0.5rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>Net Earned For Month</td>
                                                <td style={{ padding: '0.5rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(payslipData.netPayoutTarget)}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* Advance Settlement Section */}
                                    <h3 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem', marginTop: '1.25rem' }}>Settlement & Balance</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.4rem 0', color: '#475569' }}>Total Advances (This Month)</td>
                                                <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(payslipData.totalAdvancesTaken)}</td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.4rem 0', color: '#475569' }}>Salary/Wages Paid (Cash)</td>
                                                <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(payslipData.totalSalariesDisbursed)}</td>
                                            </tr>
                                            <tr style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                                                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>Closing Standing / Balance</td>
                                                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 900, fontSize: '0.95rem', color: payslipData.finalBalanceForMonth < 0 ? '#ef4444' : '#10b981' }}>
                                                    {formatCurrency(payslipData.finalBalanceForMonth)}
                                                    <span style={{ fontSize: '0.65rem', marginLeft: '0.3rem', fontWeight: 600 }}>
                                                        {payslipData.finalBalanceForMonth < 0 ? '(DEBT)' : '(CREDIT)'}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                                    This is a system generated payslip and does not require a physical signature.
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Select an Employee to preview their Payslip</div>
                            <div>Ensure there are attendance logs available for the selected month to generate an accurate payslip.</div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PayslipGenerator;
