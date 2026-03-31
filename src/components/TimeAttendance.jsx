import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Upload, Users, Clock, DollarSign, Calendar, FileText, Download, ArrowLeft, TrendingUp, Trash2, UserCheck, UserMinus, Pencil, User, LogOut, Plus, Sun, Moon, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import PayslipGenerator from './PayslipGenerator';

// Initial helper for global use
const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val || 0);
};



// Moved helpers outside component to be reused
const getDecimalHours = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
        return val.getHours() + (val.getMinutes() / 60);
    }
    if (typeof val === 'number') {
        const fraction = val - Math.floor(val);
        return fraction * 24;
    }
    if (typeof val === 'string') {
        const parts = val.trim().split(':');
        if (parts.length >= 2) {
            let h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (val.toLowerCase().includes('pm') && h < 12) h += 12;
            if (val.toLowerCase().includes('am') && h === 12) h = 0;
            return h + (m / 60);
        }
    }
    return null;
};

const formatTimeFromDec = (decHours) => {
    if (decHours === null) return '-';
    const h = Math.floor(decHours);
    const m = Math.round((decHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const formatDuration = (decHours) => {
    if (decHours === null || decHours === undefined || isNaN(decHours)) return '-';
    const totalMinutes = Math.round(decHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
};

const getSpecialDayType = (dateStr, holidays = []) => {
    if (!dateStr) return { type: 'none', reason: '' };
    const date = new Date(dateStr);
    const day = date.getDay();
    // getDay() returns 0 for Sunday
    const isSunday = day === 0;
    const holidayEntry = Array.isArray(holidays) ? holidays.find(h => (typeof h === 'string' ? h : (h?.date || '')) === dateStr) : null;

    if (holidayEntry) return { type: 'holiday', reason: (typeof holidayEntry === 'string' ? 'Holiday' : holidayEntry.reason) };
    if (isSunday) return { type: 'sunday', reason: 'Sunday' };
    return { type: 'none', reason: '' };
};

const isSpecialDay = (dateStr, holidays = []) => getSpecialDayType(dateStr, holidays).type !== 'none';

const TimeAttendance = ({ onBack, hideBack = false }) => {
    const { user, role, logout: authLogout, canAccessPayouts, hasPermission } = useAuth();
    const canViewPayouts = role === 'admin' || hasPermission('attendance.payouts') || hasPermission('attendance.salaries');
    const { theme, toggleTheme } = useTheme();
    const [attendanceData, setAttendanceData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [payrollConfig, setPayrollConfig] = useState({
        standard_daily_hours: 8,
        ot_multiplier: 1.5,
        default_hourly_rate: 100,
        national_holidays: []
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
    const [editingRecord, setEditingRecord] = useState(null);
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'payments'

    // Deletion Request States
    const [showDeleteRequest, setShowDeleteRequest] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [recordToRequest, setRecordToRequest] = useState(null);
    const [paymentData, setPaymentData] = useState([]);
    const [isPayslipOpen, setIsPayslipOpen] = useState(false);

    // Initial Load from DB
    useEffect(() => {
        fetchAttendance();
        fetchPayments();
    }, [monthFilter, yearFilter]);

    useEffect(() => {
        fetchEmployees();
        fetchPayrollConfig();
    }, []);

    const fetchPayrollConfig = async () => {
        try {
            const { data, error } = await supabase.from('payroll_config').select('*').eq('id', 1).single();
            if (error) throw error;
            if (data) setPayrollConfig(data);
        } catch (err) {
            console.error("Fetch Payroll Config Error:", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase.from('employees').select('*').eq('is_active', true);
            if (error) throw error;
            if (data) setEmployees(data);
        } catch (err) {
            console.error("Fetch Employees Error:", err);
        }
    };

    const fetchAttendance = async () => {
        try {
            let query = supabase
                .from('employee_attendance')
                .select('*')
                .order('date', { ascending: false });

            if (monthFilter && yearFilter) {
                const startDate = `${yearFilter}-${String(monthFilter).padStart(2, '0')}-01`;
                const endDate = `${yearFilter}-${String(monthFilter).padStart(2, '0')}-${new Date(yearFilter, monthFilter, 0).getDate()}`;
                query = query.gte('date', startDate).lte('date', endDate);
            } else {
                query = query.limit(1000); // Default larger limit
            }

            const { data, error } = await query;

            if (error) throw error;
            if (data) {
                const formatted = data.map(item => {

                    // Self-Healing: Recalculate hours if 0 but shifts exist
                    let hoursWorked = parseFloat(item.total_hours || 0);
                    let regularHours = parseFloat(item.regular_hours || 0);
                    let otHours = parseFloat(item.ot_hours || 0);
                    let dailyWage = parseFloat(item.daily_wage || 0);
                    const breakHours = parseFloat(item.break_hours || 0);

                    if (hoursWorked === 0 && item.shifts && Array.isArray(item.shifts)) {
                        let recalcH = 0;
                        let hasValidShift = false;
                        item.shifts.forEach(s => {
                            const inH = getDecimalHours(s.in);
                            const outH = getDecimalHours(s.out);
                            if (inH !== null && outH !== null) {
                                let diff = outH - inH;
                                if (diff < 0) diff += 24;
                                recalcH += diff;
                                hasValidShift = true;
                            }
                        });

                        if (hasValidShift) {
                            recalcH = Math.max(0, recalcH - breakHours);
                            if (recalcH > 0) {
                                hoursWorked = recalcH;
                                // Recalculate derived metrics
                                const isSpecial = isSpecialDay(item.date, payrollConfig.national_holidays);
                                regularHours = isSpecial ? 0 : Math.min(hoursWorked, payrollConfig.standard_daily_hours);
                                otHours = isSpecial ? hoursWorked : Math.max(0, hoursWorked - payrollConfig.standard_daily_hours);
                                const r = parseFloat(item.rate || payrollConfig.default_hourly_rate);
                                dailyWage = (regularHours * r) + (otHours * r * payrollConfig.ot_multiplier);
                            }
                        }
                    } else if (hoursWorked > 0) {
                        // Force-Fix for Special Days if they were saved with regular hours before
                        const isSpecial = isSpecialDay(item.date, payrollConfig.national_holidays);
                        if (isSpecial && regularHours > 0) {
                            regularHours = 0;
                            otHours = hoursWorked;
                            const r = parseFloat(item.rate || payrollConfig.default_hourly_rate);
                            dailyWage = (otHours * r * payrollConfig.ot_multiplier);
                        }
                    }

                    return {
                        ...item,
                        shifts: item.shifts || [],
                        inTime: item.shifts[0]?.in || '-',
                        outTime: item.shifts[0]?.out || '-',
                        inTime2: item.shifts[1]?.in || '-',
                        outTime2: item.shifts[1]?.out || '-',
                        inTime3: item.shifts[2]?.in || '-',
                        outTime3: item.shifts[2]?.out || '-',
                        inTime4: item.shifts[3]?.in || '-',
                        outTime4: item.shifts[3]?.out || '-',
                        hoursWorked,
                        regularHours,
                        otHours,
                        breakHours,
                        dailyWage,
                        rate: parseFloat(item.rate || 0),
                        deductions: parseFloat(item.deductions || 0),
                        deductionReason: item.deduction_reason || '',
                        empId: item.emp_id,
                        name: item.emp_name,
                        attendance_status: item.attendance_status || 'Present',
                        leave_reason: item.leave_reason || ''
                    };
                });
                setAttendanceData(formatted);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    const fetchPayments = async () => {
        try {
            let query = supabase
                .from('employee_payments')
                .select('*')
                .order('date', { ascending: false });

            if (monthFilter && yearFilter) {
                const startDate = `${yearFilter}-${String(monthFilter).padStart(2, '0')}-01`;
                const endDate = `${yearFilter}-${String(monthFilter).padStart(2, '0')}-${new Date(yearFilter, monthFilter, 0).getDate()}`;
                query = query.gte('date', startDate).lte('date', endDate);
            }

            const { data, error } = await query;

            if (error) throw error;
            if (data) setPaymentData(data);
        } catch (err) {
            console.error("Fetch Payments Error:", err);
        }
    };

    const deletePayment = async (id) => {
        if (!window.confirm("Are you sure you want to delete this payment record?")) return;
        try {
            const { error } = await supabase.from('employee_payments').delete().eq('id', id);
            if (error) throw error;
            fetchPayments();
        } catch (err) {
            console.error("Delete Payment Error:", err);
            alert("Failed to delete record: " + err.message);
        }
    };

    const submitDeletionRequest = async () => {
        if (!deleteReason.trim()) return alert("Please provide a reason for deletion.");
        try {
            const { error } = await supabase
                .from('employee_attendance')
                .update({
                    deletion_status: 'Pending Deletion',
                    deletion_remarks: deleteReason,
                    requested_by: user.email
                })
                .match({ date: recordToRequest.date, emp_id: recordToRequest.empId });

            if (error) throw error;
            setShowDeleteRequest(false);
            setDeleteReason('');
            fetchAttendance();
        } catch (err) {
            alert("Error requesting deletion: " + err.message);
        }
    };

    const handleRejectDelete = async (row) => {
        try {
            const { error } = await supabase
                .from('employee_attendance')
                .update({
                    deletion_status: null,
                    deletion_remarks: null,
                    requested_by: null
                })
                .match({ date: row.date, emp_id: row.empId });

            if (error) throw error;
            fetchAttendance();
        } catch (err) {
            alert("Error rejecting request: " + err.message);
        }
    };

    const handleDelete = async (row, isApproved = false) => {
        if (isApproved || window.confirm(`Are you sure you want to delete the attendance log for ${row.name} on ${row.date}?`)) {
            try {
                const { error } = await supabase
                    .from('employee_attendance')
                    .delete()
                    .match({ date: row.date, emp_id: row.empId });

                if (error) throw error;
                fetchAttendance();
            } catch (err) {
                console.error("Delete Error:", err);
                alert("Failed to delete record: " + err.message);
            }
        }
    };

    // Handle File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const processFile = (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });

            // 1. Parse Employee Master
            let employeeMaster = {};
            const masterSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('employee') || n.toLowerCase().includes('master'));
            if (masterSheetName) {
                const masterWs = wb.Sheets[masterSheetName];
                const masterData = XLSX.utils.sheet_to_json(masterWs);
                masterData.forEach(row => {
                    const id = String(row['Emp ID'] || row['ID'] || '').trim();
                    if (id) {
                        employeeMaster[id] = {
                            name: row['Emp Name'] || row['Name'],
                            rate: parseFloat(row['Hourly Rate'] || row['Rate'] || payrollConfig.default_hourly_rate)
                        };
                    }
                });
            }

            // 2. Parse Attendance
            const attendanceSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('attendance')) || wb.SheetNames[0];
            const ws = wb.Sheets[attendanceSheetName];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
            parseAttendanceData(data, employeeMaster);
        };
        reader.readAsBinaryString(file);
    };

    const parseAttendanceData = (rows, masterMap = {}) => {
        // Headers: Date | Emp ID | Emp Name | In 1 | Out 1 | ... | In 4 | Out 4 | Break (min)
        if (rows.length < 2) return;

        const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const idIdx = headers.findIndex(h => h.includes('id'));

        // Helper to find column index with strict matching
        const findCol = (keywords, exact = false) => {
            return headers.findIndex(h => {
                if (exact) return keywords.some(k => h === k);
                return keywords.some(k => h.includes(k) && !h.includes('reason') && !h.includes('id') && !h.includes('name'));
            });
        };

        // Find all In/Out indices
        const shiftIndices = [];
        for (let s = 1; s <= 4; s++) {
            const suffix = s === 1 ? '' : ` ${s}`;
            const sStr = String(s);

            shiftIndices.push({
                in: findCol([`in ${s}`, `in${s}`, `start ${s}`, `start${s}`], true) !== -1
                    ? findCol([`in ${s}`, `in${s}`, `start ${s}`, `start${s}`], true)
                    : (s === 1 ? findCol(['time in', 'check in', 'clock in', 'in'], true) : -1),

                out: findCol([`out ${s}`, `out${s}`, `end ${s}`, `end${s}`], true) !== -1
                    ? findCol([`out ${s}`, `out${s}`, `end ${s}`, `end${s}`], true)
                    : (s === 1 ? findCol(['time out', 'check out', 'clock out', 'out'], true) : -1)
            });

            // Fallback: If strictly failed, try slightly broader but safe matching
            if (shiftIndices[s - 1].in === -1) {
                shiftIndices[s - 1].in = headers.findIndex(h => (h.includes(`in`) && h.includes(`${s}`)) || (s === 1 && (h === 'in' || h === 'check in')));
            }
            if (shiftIndices[s - 1].out === -1) {
                shiftIndices[s - 1].out = headers.findIndex(h => (h.includes(`out`) && h.includes(`${s}`)) || (s === 1 && (h === 'out' || h === 'check out')));
            }
        }
        const breakIdx = headers.findIndex(h => h.includes('break'));
        const deductionIdx = headers.findIndex(h => h.includes('deduction') && !h.includes('reason'));
        const deductionReasonIdx = headers.findIndex(h => h.includes('deduction') && h.includes('reason'));

        const parsed = rows.slice(1).map((row, index) => {
            const empId = String(row[idIdx] || '').trim().toUpperCase();
            const masterInfo = masterMap[empId] || {};
            const empName = masterInfo.name || "Unknown";

            if (!empId) return null;



            // Parse Shifts
            let totalWorkHours = 0;
            const shifts = [];

            shiftIndices.forEach((idx, sIdx) => {
                const inH = getDecimalHours(row[idx.in]);
                const outH = getDecimalHours(row[idx.out]);
                if (inH !== null && outH !== null) {
                    let diff = outH - inH;
                    if (diff < 0) diff += 24;
                    totalWorkHours += diff;
                    shifts.push({ in: formatTimeFromDec(inH), out: formatTimeFromDec(outH) });
                } else {
                    shifts.push({ in: '-', out: '-' });
                }
            });

            const breakMins = parseFloat(row[breakIdx] || 0) || 0;
            totalWorkHours = Math.max(0, totalWorkHours - (breakMins / 60));

            // Date Parsing
            let dateStr = row[dateIdx];
            if (typeof dateStr === 'number') {
                const d = new Date(1899, 11, 30 + Math.floor(dateStr));
                dateStr = d.toISOString().split('T')[0];
            } else if (dateStr instanceof Date) {
                dateStr = dateStr.toISOString().split('T')[0];
            } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
                // If it's already DD-MM-YYYY, convert to YYYY-MM-DD for DB
                const parts = dateStr.split('-');
                if (parts[0].length === 2) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }

            const isSpecial = isSpecialDay(dateStr, payrollConfig.national_holidays);
            const regularHours = isSpecial ? 0 : Math.min(totalWorkHours, payrollConfig.standard_daily_hours);
            const otHours = isSpecial ? totalWorkHours : Math.max(0, totalWorkHours - payrollConfig.standard_daily_hours);
            const rate = masterInfo.rate || payrollConfig.default_hourly_rate;
            const dailyWage = (regularHours * rate) + (otHours * rate * payrollConfig.ot_multiplier);
            const deductions = parseFloat(row[deductionIdx] || 0) || 0;
            const deductionReason = row[deductionReasonIdx] || '';

            return {
                id: index,
                empId,
                date: dateStr,
                name: empName,
                shifts,
                inTime: shifts[0].in,
                outTime: shifts[0].out,
                inTime2: shifts[1].in,
                outTime2: shifts[1].out,
                inTime3: shifts[2].in,
                outTime3: shifts[2].out,
                inTime4: shifts[3].in,
                outTime4: shifts[3].out,
                breakHours: breakMins / 60,
                hoursWorked: (isNaN(totalWorkHours) || totalWorkHours === null) ? 0 : totalWorkHours,
                regularHours,
                otHours,
                rate,
                dailyWage,
                deductions,
                deductionReason
            };
        }).filter(Boolean);

        setAttendanceData(parsed);
        if (parsed.length > 0) {
            autoSyncToDatabase(parsed);
        }
    };

    const autoSyncToDatabase = async (data) => {
        setIsSaving(true);
        try {
            const records = data.map(row => ({
                date: row.date,
                emp_id: row.empId,
                emp_name: row.name,
                shifts: row.shifts,
                total_hours: (row.hoursWorked === null || isNaN(row.hoursWorked)) ? 0 : row.hoursWorked,
                regular_hours: row.regularHours,
                ot_hours: row.otHours,
                break_hours: row.breakHours,
                daily_wage: row.dailyWage,
                rate: row.rate,
                deductions: row.deductions || 0,
                deduction_reason: row.deductionReason || ''
            }));

            const { error } = await supabase
                .from('employee_attendance')
                .upsert(records, { onConflict: 'date,emp_id' });

            if (error) throw error;
            console.log("Automatic Sync Successful!");
            fetchAttendance(); // Refresh to ensure data matches DB
        } catch (err) {
            console.error("Auto-Sync Error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAttendance = useMemo(() => {
        return attendanceData.filter(row => {
            const matchesSearch = row.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (!row.date) return false;
            const [y, m, d] = row.date.split('-');
            const matchesMonth = !monthFilter || parseInt(m) === monthFilter;
            const matchesYear = !yearFilter || parseInt(y) === yearFilter;

            return matchesSearch && matchesMonth && matchesYear;
        });
    }, [attendanceData, searchTerm, monthFilter, yearFilter]);

    const filteredPayments = useMemo(() => {
        return paymentData.filter(row => {
            const matchesSearch = row.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (row.emp_name || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!row.date) return false;
            const [y, m, d] = row.date.split('-');
            const matchesMonth = !monthFilter || parseInt(m) === monthFilter;
            const matchesYear = !yearFilter || parseInt(y) === yearFilter;

            return matchesSearch && matchesMonth && matchesYear;
        });
    }, [paymentData, searchTerm, monthFilter, yearFilter]);

    const paymentStats = useMemo(() => {
        const stats = {
            totalSalary: 0,
            totalAdvance: 0,
            totalWages: 0,
            totalEarned: 0
        };

        // 1. Calculate Payments
        filteredPayments.forEach(p => {
            const amt = parseFloat(p.amount) || 0;
            if (p.type === 'Salary') stats.totalSalary += amt;
            else if (p.type === 'Advance') stats.totalAdvance += amt;
            else if (p.type === 'Wages') stats.totalWages += amt;
        });

        // 2. Calculate Total Earned from matching attendance records
        // Using all attendanceData to find the total earned for the filtered employees/dates
        attendanceData.forEach(row => {
            const matchesSearch = row.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.name.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesDate = false;
            if (row.date) {
                const [y, m, d] = row.date.split('-');
                const matchesMonth = !monthFilter || parseInt(m) === monthFilter;
                const matchesYear = !yearFilter || parseInt(y) === yearFilter;
                matchesDate = matchesMonth && matchesYear;
            }

            if (matchesSearch && matchesDate) {
                const dailyWage = parseFloat(row.daily_wage || row.dailyWage || 0);
                const bonus = parseFloat(row.bonus || 0);
                const deductions = parseFloat(row.deductions || 0);
                stats.totalEarned += (dailyWage + bonus - deductions);
            }
        });

        stats.balance = stats.totalEarned - (stats.totalSalary + stats.totalAdvance + stats.totalWages);

        return stats;
    }, [filteredPayments, attendanceData, searchTerm, monthFilter, yearFilter, payrollConfig]);

    // Employee specific balances for the table
    const employeeBalances = useMemo(() => {
        const balances = {};

        // Accumulate earnings
        attendanceData.forEach(row => {
            if (!balances[row.empId]) balances[row.empId] = { earned: 0, paid: 0 };
            const dailyWage = parseFloat(row.daily_wage || row.dailyWage || 0);
            const bonus = parseFloat(row.bonus || 0);
            const deductions = parseFloat(row.deductions || 0);
            balances[row.empId].earned += (dailyWage + bonus - deductions);
        });

        // Accumulate payments
        paymentData.forEach(p => {
            if (!balances[p.emp_id]) balances[p.emp_id] = { earned: 0, paid: 0 };
            balances[p.emp_id].paid += (parseFloat(p.amount) || 0);
        });

        return balances;
    }, [attendanceData, paymentData, payrollConfig]);

    // Stats
    const stats = useMemo(() => {
        // Context Date: Today (Local)
        const contextDate = new Date().toISOString().split('T')[0];

        // Precise Workforce Overview from master list
        const totalEmployees = employees.length;

        // Count attendance for the specific Context Date
        const dailyLogs = attendanceData.filter(r => r.date === contextDate);
        const todayPresentCount = dailyLogs.filter(r => (r.attendance_status || 'Present') === 'Present').length;
        const todayLeaveCount = dailyLogs.filter(r => ['Casual Leave', 'Medical Leave'].includes(r.attendance_status)).length;

        // Staff type specific counts for Today
        const todayTempPresentCount = dailyLogs.filter(r => {
            const emp = employees.find(e => e.emp_id === r.empId);
            return (r.attendance_status || 'Present') === 'Present' && emp?.staff_type === 'Temporary';
        }).length;

        // Absent count logic for Today
        const todayAbsentCount = Math.max(0, totalEmployees - (todayPresentCount + todayLeaveCount));

        // staff type metrics for current view
        let totalHours = 0;
        let totalOTHours = 0;
        let totalOTPay = 0;
        let totalCost = 0;
        let totalDeductions = 0;
        let totalBonus = 0;

        let tempTotalHours = 0;
        let tempTotalOTHours = 0;
        let tempTotalOTPay = 0;
        let tempTotalCost = 0;
        let tempTotalDeductions = 0;
        let tempTotalBonus = 0;

        let permTotalHours = 0;
        let permTotalOTHours = 0;
        let permTotalOTPay = 0;
        let permTotalCost = 0;
        let permTotalDeductions = 0;
        let permTotalBonus = 0;
        let permPresentCount = 0;
        let tempPresentCount = 0;
        let presentCount = 0;
        let leaveCount = 0;
        let absentCount = 0;

        const currentLogs = filteredAttendance;
        currentLogs.forEach(d => {
            const emp = employees.find(e => e.emp_id === d.empId);
            const rate = parseFloat(emp?.hourly_rate || payrollConfig?.default_hourly_rate || 23);
            const otRate = rate * parseFloat(payrollConfig?.ot_multiplier || 1.5);
            const cost = parseFloat(d.daily_wage || 0);
            const bonus = parseFloat(d.bonus || 0);
            const deductions = parseFloat(d.deductions || 0);
            const ot = parseFloat(d.ot_hours || 0);
            const hours = parseFloat(d.total_hours || 0);
            const otPay = ot * otRate;
            
            if (d.attendance_status === 'Present') presentCount++;
            else if (d.attendance_status === 'Absent') absentCount++;
            else if (d.attendance_status?.toLowerCase().includes('leave')) leaveCount++;

            totalHours += hours;
            totalOTHours += ot;
            totalOTPay += otPay;
            totalDeductions += deductions;
            totalBonus += bonus;
            totalCost += cost;

            if (emp?.staff_type === 'Temporary') {
                tempPresentCount++;
                tempTotalHours += hours;
                tempTotalOTHours += ot;
                tempTotalOTPay += otPay;
                tempTotalCost += cost;
                tempTotalDeductions += deductions;
                tempTotalBonus += bonus;
            } else {
                permPresentCount++;
                permTotalHours += hours;
                permTotalOTHours += ot;
                permTotalOTPay += otPay;
                permTotalCost += cost;
                permTotalDeductions += deductions;
                permTotalBonus += bonus;
            }
        });

        // [LOGICAL FIX] Include standalone Bonus Payouts from employee_payments
        filteredPayments.forEach(p => {
            if (p.type === 'Bonus') {
                const emp = employees.find(e => e.emp_id === p.emp_id);
                const amt = parseFloat(p.amount) || 0;
                totalBonus += amt;
                if (emp?.staff_type === 'Temporary') {
                    tempTotalBonus += amt;
                } else {
                    permTotalBonus += amt;
                }
            }
        });

        const grossPay = totalCost;
        const netPayout = grossPay + totalBonus - totalDeductions;
        const permGrossPay = permTotalCost;
        const permNetPayout = permGrossPay + permTotalBonus - permTotalDeductions;
        const tempGrossPay = tempTotalCost;
        const tempNetPayout = tempGrossPay + tempTotalBonus - tempTotalDeductions;

        const s = {
            totalEmployees, totalHours, totalOTHours, totalOTPay, totalCost, netPayout, grossPay,
            presentCount: todayPresentCount, 
            leaveCount: todayLeaveCount, 
            absentCount: todayAbsentCount, 
            contextDate, totalDeductions, totalBonus,
            tempPresentCount: todayTempPresentCount,
            tempTotalHours, tempTotalOTHours, tempTotalOTPay, tempTotalCost, tempTotalDeductions, tempTotalBonus, tempNetPayout, tempGrossPay,
            permTotalHours, permTotalOTHours, permTotalOTPay, permTotalCost, permTotalDeductions, permTotalBonus, permNetPayout, permGrossPay
        };
        localStorage.setItem('last_attendance_stats', JSON.stringify(s));
        return s;
    }, [filteredAttendance, attendanceData, employees, payrollConfig]);


    // Download Template
    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();

        // --- Date Logic for Current Month ---
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        const monthName = now.toLocaleString('default', { month: 'short' });
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const monthDates = [];
        for (let d = 1; d <= daysInMonth; d++) {
            monthDates.push(new Date(year, month, d));
        }

        // 1. Employee Master Sheet
        const masterSheet = workbook.addWorksheet('Employee Details');
        masterSheet.columns = [
            { header: 'Emp ID', key: 'id', width: 15 },
            { header: 'Emp Name', key: 'name', width: 25 },
            { header: 'Hourly Rate', key: 'rate', width: 15 },
            { header: 'Staff Type', key: 'type', width: 15 }
        ];
        masterSheet.addRows(employees.map(e => ({ id: e.emp_id, name: e.name, rate: e.hourly_rate || payrollConfig.default_hourly_rate, type: e.staff_type || 'Permanent' })));

        // 2. Reference Lists Sheet (Hidden)
        const listSheet = workbook.addWorksheet('Lists');
        listSheet.state = 'hidden';

        // Add Month Dates to Reference
        listSheet.getColumn(1).values = ['Dates', ...monthDates];
        listSheet.getColumn(1).numFmt = 'DD-MM-YYYY';

        // Generate Times (15 min intervals)
        const times = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                times.push([timeStr]);
            }
        }
        listSheet.getColumn(2).values = ['Times', ...times.map(t => t[0])];

        // 3. Attendance Log Sheet
        const attendanceSheet = workbook.addWorksheet('Attendance Log');
        attendanceSheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Emp ID', key: 'id', width: 15 },
            { header: 'Emp Name', key: 'name', width: 25 },
            { header: 'In 1', key: 'in1', width: 10 },
            { header: 'Out 1', key: 'out1', width: 10 },
            { header: 'In 2', key: 'in2', width: 10 },
            { header: 'Out 2', key: 'out2', width: 10 },
            { header: 'In 3', key: 'in3', width: 10 },
            { header: 'Out 3', key: 'out3', width: 10 },
            { header: 'In 4', key: 'in4', width: 10 },
            { header: 'Out 4', key: 'out4', width: 10 },
            { header: 'Work Hours', key: 'hours', width: 12 },
            { header: 'OT Hours', key: 'ot', width: 10 },
            { header: 'Break (min)', key: 'break', width: 12 },
            { header: 'Salary Advance', key: 'salaryAdvance', width: 15 },
            { header: 'Other Deductions', key: 'deductions', width: 15 },
            { header: 'Bonus (₹)', key: 'bonus', width: 12 },
            { header: 'Daily Wage', key: 'wage', width: 12 },
            { header: 'Net Earned', key: 'net', width: 15 },
            { header: 'Deduction Reason', key: 'deductionReason', width: 25 }
        ];

        // Prepare data for summary
        const employeeSummary = employees.reduce((acc, emp) => {
            acc[emp.emp_id] = { id: emp.emp_id, name: emp.name, hours: 0, ot: 0, wages: 0, bonuses: 0, deductions: 0, net: 0 };
            return acc;
        }, {});

        // Add Existing Attendance Data
        attendanceData.forEach((rec) => {
            const isAdvance = rec.deduction_reason === 'Salary Advance' || rec.deductionReason === 'Salary Advance';
            const bonus = parseFloat(rec.bonus || 0);
            const deductions = parseFloat(rec.deductions || 0);
            const wage = parseFloat(rec.daily_wage || rec.dailyWage || 0);
            const net = wage + bonus - (isAdvance ? deductions : deductions); // Simplified as deductions already include advance in this context if specified but usually they are separate fields in the DB. Actually in this code deductions is the only field.
            
            // For report consistency, we'll use advance and other deductions separately if possible, 
            // but the current logic puts everything in rec.deductions.
            const adv = isAdvance ? deductions : 0;
            const otherDed = isAdvance ? 0 : deductions;

            attendanceSheet.addRow({
                date: new Date(rec.date),
                id: rec.empId,
                name: rec.name,
                in1: rec.shifts?.[0]?.in === '-' ? null : rec.shifts?.[0]?.in,
                out1: rec.shifts?.[0]?.out === '-' ? null : rec.shifts?.[0]?.out,
                in2: rec.shifts?.[1]?.in === '-' ? null : rec.shifts?.[1]?.in,
                out2: rec.shifts?.[1]?.out === '-' ? null : rec.shifts?.[1]?.out,
                in3: rec.shifts?.[2]?.in === '-' ? null : rec.shifts?.[2]?.in,
                out3: rec.shifts?.[2]?.out === '-' ? null : rec.shifts?.[2]?.out,
                in4: rec.shifts?.[3]?.in === '-' ? null : rec.shifts?.[3]?.in,
                out4: rec.shifts?.[3]?.out === '-' ? null : rec.shifts?.[3]?.out,
                hours: parseFloat(rec.hoursWorked || 0).toFixed(2),
                ot: parseFloat(rec.otHours || 0).toFixed(2),
                break: Math.round((rec.breakHours || 0) * 60),
                salaryAdvance: adv,
                deductions: otherDed,
                bonus: bonus,
                wage: wage,
                net: wage + bonus - deductions,
                deductionReason: rec.deductionReason || rec.deduction_reason || ''
            });

            // Update Summary
            if (employeeSummary[rec.empId]) {
                employeeSummary[rec.empId].hours += parseFloat(rec.hoursWorked || 0);
                employeeSummary[rec.empId].ot += parseFloat(rec.otHours || 0);
                employeeSummary[rec.empId].wages += wage;
                employeeSummary[rec.empId].bonuses += bonus;
                employeeSummary[rec.empId].deductions += deductions;
                employeeSummary[rec.empId].net += (wage + bonus - deductions);
            }
        });

        // 4. Monthly Summary Sheet
        const summarySheet = workbook.addWorksheet('Monthly Summary');
        summarySheet.columns = [
            { header: 'Emp ID', key: 'id', width: 15 },
            { header: 'Emp Name', key: 'name', width: 25 },
            { header: 'Total Hours', key: 'hours', width: 15 },
            { header: 'OT Hours', key: 'ot', width: 15 },
            { header: 'Total Wages', key: 'wages', width: 15 },
            { header: 'Total Bonuses', key: 'bonuses', width: 15 },
            { header: 'Total Deductions', key: 'deductions', width: 18 },
            { header: 'Net Payout (Target)', key: 'net', width: 18 }
        ];

        Object.values(employeeSummary).forEach(s => {
            if (s.hours > 0 || s.net !== 0) {
                summarySheet.addRow({
                    id: s.id,
                    name: s.name,
                    hours: s.hours.toFixed(1),
                    ot: s.ot.toFixed(1),
                    wages: s.wages,
                    bonuses: s.bonuses,
                    deductions: s.deductions,
                    net: s.net
                });
            }
        });

        // Styling for all sheets
        [attendanceSheet, summarySheet, masterSheet].forEach(sheet => {
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo background
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).height = 25;

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                row.height = 20;
                row.eachCell((cell, colNumber) => {
                    // Default alignment: Left for text, Center for dates, Right for numbers
                    const colKey = sheet.getColumn(colNumber).key;
                    if (['id', 'name', 'deductionReason'].includes(colKey)) {
                        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                    } else if (['date'].includes(colKey)) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
                    }
                    
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            });
        });

        // Add dropdowns and formatting for Attendance Log blank rows
        for (let i = 0; i < 50; i++) attendanceSheet.addRow({});
        const totalSheetRows = attendanceSheet.rowCount;
        const breakOptions = [];
        for (let m = 0; m <= 240; m += 15) breakOptions.push(m);
        const deductionReasons = ['Salary Advance', 'Late Arrival', 'Damage Recovery', 'Loan Repayment', 'Other'];

        for (let rowNumber = 2; rowNumber <= totalSheetRows; rowNumber++) {
            const row = attendanceSheet.getRow(rowNumber);
            row.getCell(1).numFmt = 'DD-MM-YYYY';
            row.getCell(1).dataValidation = {
                type: 'list', allowBlank: true, formulae: [`'Lists'!$A$2:$A$${monthDates.length + 1}`]
            };
            row.getCell(2).dataValidation = {
                type: 'list', allowBlank: true, formulae: ["'Employee Details'!$A$2:$A$1000"]
            };
            if (!row.getCell(3).formula) {
                row.getCell(3).value = {
                    formula: `=IF(B${rowNumber}="","",VLOOKUP(B${rowNumber},'Employee Details'!$A$2:$B$1000,2,FALSE))`,
                    result: undefined
                };
            }
            for (let col = 4; col <= 11; col++) {
                row.getCell(col).numFmt = 'HH:mm';
                row.getCell(col).dataValidation = { type: 'list', allowBlank: true, formulae: ["'Lists'!$B$2:$B$98"] };
            }
            // Work Hours (12) and OT Hours (13) - Numeric
            [12, 13].forEach(col => {
                row.getCell(col).numFmt = '0.00';
            });
            // Break (14)
            row.getCell(14).dataValidation = {
                type: 'list', allowBlank: true, formulae: [`'Lists'!$C$2:$C$${breakOptions.length + 1}`]
            };
            // Col 20 is Deduction Reason
            row.getCell(20).dataValidation = {
                type: 'list', allowBlank: true, formulae: [`'Lists'!$D$2:$D$${deductionReasons.length + 1}`]
            };
            // Add currency formatting for Cols 15-19
            [15, 16, 17, 18, 19].forEach(col => {
                row.getCell(col).numFmt = '"₹"#,##0';
            });
        }

        // Currency formatting for summary sheet
        summarySheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            [5, 6, 7, 8].forEach(col => {
                row.getCell(col).numFmt = '"₹"#,##0';
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `NILAA_Attendance_Report_${monthName}_${year}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };


    return (
        <div className="attendance-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid var(--glass-border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    {!hideBack && onBack && (
                        <button onClick={onBack} className="btn-icon" style={{
                            background: 'var(--glass-highlight)',
                            padding: '0.6rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 style={{
                            margin: 0,
                            fontSize: '2rem',
                            fontWeight: 800,
                            letterSpacing: '-0.5px',
                            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>NFS Time & Attendance</h1>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Management Dashboard
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {/* Action Group */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {hasPermission('attendance.tracking.write') && (
                            <>
                                <button onClick={() => setShowManualEntry(true)} className="btn-action btn-outline" style={{ borderRadius: '0.75rem', padding: '0.6rem 1rem' }}>
                                    <FileText size={18} />
                                    Manual Entry
                                </button>
                                <button onClick={() => document.getElementById('attendance-upload').click()} className="btn-action btn-outline" style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderColor: 'rgba(59, 130, 246, 0.2)',
                                    color: 'var(--accent-primary)',
                                    borderRadius: '0.75rem',
                                    padding: '0.6rem 1rem'
                                }}>
                                    <Upload size={18} />
                                    Upload Sheet
                                </button>
                            </>
                        )}
                        <button onClick={() => setIsPayslipOpen(true)} className="btn-action btn-outline" title="Generate Monthly Payslips" style={{ borderRadius: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                            <FileText size={18} />
                            Payslips
                        </button>
                        <button onClick={downloadTemplate} className="btn-action btn-outline" style={{ borderRadius: '0.75rem', padding: '0.6rem 1rem' }}>
                            <Download size={18} />
                            Report
                        </button>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '40px', background: 'var(--glass-border)' }} />

                    {/* User Profile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {user?.email?.split('@')[0]}
                            </div>
                            <div style={{
                                fontSize: '0.7rem',
                                color: role === 'admin' ? '#f59e0b' : 'var(--accent-primary)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {role || 'Viewer'}
                            </div>
                        </div>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-primary)'
                        }}>
                            <User size={22} />
                        </div>
                        <button
                            onClick={authLogout}
                            className="btn-icon"
                            style={{
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.1)',
                                padding: '0.6rem',
                                borderRadius: '10px'
                            }}
                            title="Log Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                    {isSaving && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem' }}>
                            <Clock className="animate-spin" size={16} />
                            Syncing...
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="attendance-upload"
            />

            {/* Tab Selection */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
                {hasPermission('attendance.tracking') && (
                    <button
                        onClick={() => setActiveTab('attendance')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'attendance' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'attendance' ? '2px solid #3b82f6' : 'none',
                            color: activeTab === 'attendance' ? '#3b82f6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Attendance Tracking
                    </button>
                )}
                {hasPermission('attendance.payouts') && (
                    <button
                        onClick={() => setActiveTab('payouts')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'payouts' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'payouts' ? '2px solid #10b981' : 'none',
                            color: activeTab === 'payouts' ? '#10b981' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Payout & Financials
                    </button>
                )}
                {hasPermission('attendance.salaries') && (
                    <button
                        onClick={() => setActiveTab('payments')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'payments' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'payments' ? '2px solid #3b82f6' : 'none',
                            color: activeTab === 'payments' ? '#3b82f6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Salaries & Advances
                    </button>
                )}
            </div>

            {(activeTab === 'attendance' || activeTab === 'payouts') && (
                <>
                    {activeTab === 'attendance' && (
                        <>
                            {/* Workforce Status */}
                            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={16} /> Workforce Overview
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Employees</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.totalEmployees}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        Incl. {employees.filter(e => e.staff_type === 'Temporary').length} Temporary
                                    </div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                    <div style={{ color: '#10b981', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Present ({stats.contextDate})</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{stats.presentCount}</div>
                                    {stats.tempPresentCount > 0 && (
                                        <div style={{ fontSize: '0.65rem', color: '#10b981', opacity: 0.8, marginTop: '0.25rem' }}>
                                            {stats.tempPresentCount} Temporary
                                        </div>
                                    )}
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                                    <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>On Leave ({stats.contextDate})</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.leaveCount}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Absent ({stats.contextDate})</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.absentCount}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'payouts' && canViewPayouts && (
                        <>
                            {/* Overall Summary */}
                            <div style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
                                Overall Summary (All Staff)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                                <div className="glass-panel" style={{ padding: '1rem' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Total Hours</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{stats.totalHours.toFixed(1)}h</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1rem' }}>
                                    <div style={{ color: '#f97316', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Total OT Hours</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f97316' }}>{stats.totalOTHours.toFixed(1)}h</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1rem' }}>
                                    <div style={{ color: '#f59e0b', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Total OT Pay</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(stats.totalOTPay)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1rem' }}>
                                    <div style={{ color: '#a855f7', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Total Bonus</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a855f7' }}>{formatCurrency(stats.totalBonus)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1rem' }}>
                                    <div style={{ color: '#10b981', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Total Pay (Gross)</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stats.grossPay)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '3px solid #3b82f6' }}>
                                    <div style={{ color: '#3b82f6', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Net Payout</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatCurrency(stats.netPayout)}</div>
                                </div>
                            </div>

                            {/* Temporary Staff Metrics */}
                            <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
                                Temporary Staff (Field Metrics)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.02)' }}>
                                    <div style={{ color: 'rgba(245, 158, 11, 0.8)', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Hours</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.tempTotalHours.toFixed(1)}h</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.02)' }}>
                                    <div style={{ color: '#f97316', fontSize: '0.65rem', marginBottom: '0.2rem' }}>OT Hours</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f97316' }}>{stats.tempTotalOTHours.toFixed(1)}h</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.02)' }}>
                                    <div style={{ color: '#f59e0b', fontSize: '0.65rem', marginBottom: '0.2rem' }}>OT Pay</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(stats.tempTotalOTPay)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.02)' }}>
                                    <div style={{ color: '#a855f7', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Bonus</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#a855f7' }}>{formatCurrency(stats.tempTotalBonus)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.02)' }}>
                                    <div style={{ color: '#10b981', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Gross Pay</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stats.tempGrossPay)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid #f59e0b' }}>
                                    <div style={{ color: '#f59e0b', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Net Payout</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{formatCurrency(stats.tempNetPayout)}</div>
                                </div>
                            </div>

                            {/* Permanent Staff Metrics */}
                            <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
                                Permanent Staff (Core Team)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(59, 130, 246, 0.02)' }}>
                                    <div style={{ color: 'rgba(59, 130, 246, 0.8)', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Hours</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.permTotalHours.toFixed(1)}h</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(59, 130, 246, 0.02)' }}>
                                    <div style={{ color: '#60a5fa', fontSize: '0.65rem', marginBottom: '0.2rem' }}>OT Hours</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#60a5fa' }}>{stats.permTotalOTHours.toFixed(1)}h</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(59, 130, 246, 0.02)' }}>
                                    <div style={{ color: '#3b82f6', fontSize: '0.65rem', marginBottom: '0.2rem' }}>OT Pay</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(stats.permTotalOTPay)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(59, 130, 246, 0.02)' }}>
                                    <div style={{ color: '#a855f7', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Bonus</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#a855f7' }}>{formatCurrency(stats.permTotalBonus)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(59, 130, 246, 0.02)' }}>
                                    <div style={{ color: '#10b981', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Gross Pay</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stats.permGrossPay)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '3px solid #3b82f6' }}>
                                    <div style={{ color: '#3b82f6', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Net Payout</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{formatCurrency(stats.permNetPayout)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Table (Shared Search UI across both tabs) */}
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Attendance Log</h3>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Showing {filteredAttendance.length} of {attendanceData.length} entries</div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                        <Users size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search by ID or Name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        value={monthFilter}
                                        onChange={(e) => setMonthFilter(e.target.value ? parseInt(e.target.value) : '')}
                                        style={{
                                            padding: '0.6rem 0.75rem',
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="" style={{ color: '#1e293b' }}>All Months</option>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m} style={{ color: '#1e293b' }}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={yearFilter}
                                        onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : '')}
                                        style={{
                                            padding: '0.6rem 0.75rem',
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="" style={{ color: '#1e293b' }}>All Years</option>
                                        {[...Array(5)].map((_, i) => {
                                            const y = new Date().getFullYear() - 2 + i;
                                            return <option key={y} value={y} style={{ color: '#1e293b' }}>{y}</option>;
                                        })}
                                    </select>
                                </div>
                                {(searchTerm || monthFilter !== '' || yearFilter !== '') && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setMonthFilter(new Date().getMonth() + 1); setYearFilter(new Date().getFullYear()); }}
                                        style={{
                                            padding: '0.6rem 1rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '0.5rem',
                                            color: '#ef4444',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: '500px', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '2rem', minWidth: 'max-content', paddingBottom: '1rem' }}>

                                {activeTab === 'attendance' && (
                                    <div style={{ flex: 1 }}>
                                        <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '2px solid var(--accent-primary)', display: 'inline-block' }}>
                                            Shift Details & Working Hours
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem' }}>
                                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
                                                <tr style={{ textAlign: 'left' }}>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Date</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Emp ID</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Employee</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 1</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 2</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 3</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Shift 4</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Break</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: '#f59e0b' }}>Total Hours</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Non OT Hrs</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>OT Hours</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAttendance.map((row, i) => {
                                                    const emp = employees.find(e => e.emp_id === row.empId);
                                                    const isTemp = emp?.staff_type === 'Temporary';
                                                    const selectSpecial = getSpecialDayType(row.date, payrollConfig.national_holidays);
                                                    const dayOfWeek = row.date ? new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';

                                                    let rowBg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                                                    if (selectSpecial.type === 'holiday') rowBg = 'rgba(225, 29, 72, 0.08)';
                                                    else if (selectSpecial.type === 'sunday') rowBg = 'rgba(79, 70, 229, 0.08)';
                                                    else if (isTemp) rowBg = 'rgba(245, 158, 11, 0.05)';

                                                    return (
                                                        <tr key={i} style={{
                                                            height: '85px',
                                                            borderBottom: '1px solid var(--glass-border)',
                                                            background: rowBg
                                                        }}>
                                                            <td style={{ padding: '1rem', whiteSpace: 'nowrap', borderRight: '1px solid var(--glass-border)' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <div style={{ fontWeight: 600 }}>{row.date}</div>
                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: selectSpecial.type === 'holiday' ? '#f43f5e' : (selectSpecial.type === 'sunday' ? '#6366f1' : 'var(--text-secondary)') }}>
                                                                        {selectSpecial.type === 'holiday' ? selectSpecial.reason.toUpperCase() : dayOfWeek}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{row.empId}</td>
                                                            <td style={{ padding: '1rem', fontWeight: 500, borderRight: '1px solid var(--glass-border)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    {row.name}
                                                                    {isTemp && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '0.25rem', fontWeight: 700 }}>TEMP</span>}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{
                                                                    padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
                                                                    background: (row.attendance_status || 'Present') === 'Present' ? 'rgba(16, 185, 129, 0.1)' : (row.attendance_status === 'Absent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                                                    color: (row.attendance_status || 'Present') === 'Present' ? '#10b981' : (row.attendance_status === 'Absent' ? '#ef4444' : '#f59e0b'),
                                                                    border: (row.attendance_status || 'Present') === 'Present' ? '1px solid rgba(16, 185, 129, 0.2)' : (row.attendance_status === 'Absent' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)')
                                                                }}>{row.attendance_status || 'Present'}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem' }}><div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime}</div><div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime}</div></td>
                                                            <td style={{ padding: '1rem' }}><div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime2}</div><div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime2}</div></td>
                                                            <td style={{ padding: '1rem' }}><div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime3}</div><div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime3}</div></td>
                                                            <td style={{ padding: '1rem', borderRight: '1px solid var(--glass-border)' }}><div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime4}</div><div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime4}</div></td>
                                                            <td style={{ padding: '1rem' }}>{Math.round(row.breakHours * 60)}m</td>
                                                            <td style={{ padding: '1rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.03)' }}>{formatDuration(row.hoursWorked)}</td>
                                                            <td style={{ padding: '1rem' }}>
                                                                {(() => {
                                                                    const total = parseFloat(row.hoursWorked) || 0;
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    const nonOT = Math.max(0, total - displayOT);
                                                                    return <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatDuration(nonOT)}</div>;
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                                                                {(() => {
                                                                    const total = (parseFloat(row.hoursWorked) || 0);
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    return displayOT > 0 ? (
                                                                        <span style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                                            +{formatDuration(displayOT)}
                                                                        </span>
                                                                    ) : '-';
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                    <button onClick={() => { setEditingRecord(row); setShowManualEntry(true); }} style={{ padding: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: '0.4rem', color: '#3b82f6', cursor: 'pointer', transition: 'all 0.2s' }} title="Edit Log"><Pencil size={18} /></button>
                                                                    <button onClick={() => handleDelete(row)} style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '0.4rem', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }} title="Delete Log"><Trash2 size={18} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredAttendance.length === 0 && (
                                                    <tr><td colSpan={13} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data loaded.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'payouts' && (role === 'admin' || hasPermission('attendance.payouts')) && (
                                    <div style={{ flex: 1 }}>
                                        <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '2px solid #10b981', display: 'inline-block' }}>
                                            Payout Details
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem' }}>
                                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
                                                <tr style={{ textAlign: 'left' }}>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Date</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Emp ID</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Employee</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>Status</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: '#f59e0b' }}>Total Hours</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Non OT Hrs</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>OT Hrs</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Non OT Pay</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>OT Pay</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Total Pay</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: '#a855f7' }}>Bonus</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Deductions</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: '#60a5fa', borderRight: '1px solid var(--glass-border)' }}>Net Pay</th>
                                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAttendance.map((row, i) => {
                                                    const emp = employees.find(e => e.emp_id === row.empId);
                                                    const isTemp = emp?.staff_type === 'Temporary';
                                                    const specialType = getSpecialDayType(row.date, payrollConfig.national_holidays);
                                                    const dayOfWeek = row.date ? new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';

                                                    let rowBg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                                                    if (specialType.type === 'holiday') rowBg = 'rgba(225, 29, 72, 0.08)';
                                                    else if (specialType.type === 'sunday') rowBg = 'rgba(79, 70, 229, 0.08)';
                                                    else if (isTemp) rowBg = 'rgba(245, 158, 11, 0.05)';

                                                    return (
                                                        <tr key={i} style={{
                                                            height: '85px',
                                                            borderBottom: '1px solid var(--glass-border)',
                                                            background: rowBg
                                                        }}>
                                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--glass-border)' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.date}</div>
                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: specialType.type === 'holiday' ? '#f43f5e' : (specialType.type === 'sunday' ? '#6366f1' : 'var(--text-secondary)') }}>
                                                                        {specialType.type === 'holiday' ? specialType.reason.toUpperCase() : dayOfWeek}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                                {row.empId}
                                                            </td>
                                                            <td style={{ padding: '1rem', fontWeight: 500, borderRight: '1px solid var(--glass-border)' }}>
                                                                {row.name}
                                                            </td>
                                                            <td style={{ padding: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                                                                <div style={{
                                                                    padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
                                                                    background: (row.attendance_status || 'Present') === 'Present' ? 'rgba(16, 185, 129, 0.1)' : (row.attendance_status === 'Absent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                                                    color: (row.attendance_status || 'Present') === 'Present' ? '#10b981' : (row.attendance_status === 'Absent' ? '#ef4444' : '#f59e0b'),
                                                                    border: (row.attendance_status || 'Present') === 'Present' ? '1px solid rgba(16, 185, 129, 0.2)' : (row.attendance_status === 'Absent' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)')
                                                                }}>{row.attendance_status || 'Present'}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.03)' }}>
                                                                {formatDuration(parseFloat(row.hoursWorked) || 0)}
                                                            </td>
                                                            <td style={{ padding: '1rem' }}>
                                                                {(() => {
                                                                    const total = parseFloat(row.hoursWorked) || 0;
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    const nonOT = Math.max(0, total - displayOT);
                                                                    return <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatDuration(nonOT)}</div>;
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                                                                {(() => {
                                                                    const total = (parseFloat(row.hoursWorked) || 0);
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    return displayOT > 0 ? (
                                                                        <span style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                                            +{formatDuration(displayOT)}
                                                                        </span>
                                                                    ) : '-';
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                                {(() => {
                                                                    const total = parseFloat(row.hoursWorked) || 0;
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    const rate = parseFloat(row.rate) || parseFloat(payrollConfig.default_hourly_rate || 100);
                                                                    const otPay = displayOT * rate * parseFloat(payrollConfig.ot_multiplier || 1.5);
                                                                    const totalBackend = parseFloat(row.daily_wage || row.dailyWage) || 0;

                                                                    let nonOtBase = 0;
                                                                    if (totalBackend > 0 && !isSpecial) {
                                                                        // If backend already calculated total cost, extract base by subtracting OT
                                                                        nonOtBase = Math.max(0, totalBackend - otPay);
                                                                    } else if (!isSpecial) {
                                                                        // If backend is missing data (e.g. live ongoing shift), calculate base normally
                                                                        const regH = Math.min((parseFloat(row.hoursWorked) || 0), parseFloat(payrollConfig.standard_daily_hours || 8));
                                                                        nonOtBase = regH * rate;
                                                                    } else {
                                                                        // Special Day - Base is 0
                                                                        nonOtBase = 0;
                                                                    }

                                                                    return formatCurrency(nonOtBase);
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem' }}>
                                                                {(() => {
                                                                    const total = parseFloat(row.hoursWorked) || 0;
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    const rate = parseFloat(row.rate) || parseFloat(payrollConfig.default_hourly_rate || 100);
                                                                    const otPay = displayOT * rate * parseFloat(payrollConfig.ot_multiplier || 1.5);
                                                                    return otPay > 0 ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>{formatCurrency(otPay)}</span> : '-';
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                                {(() => {
                                                                    const total = parseFloat(row.hoursWorked) || 0;
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    const rate = parseFloat(row.rate) || parseFloat(payrollConfig.default_hourly_rate || 100);
                                                                    const otPay = displayOT * rate * parseFloat(payrollConfig.ot_multiplier || 1.5);

                                                                    let totalPay = parseFloat(row.daily_wage || row.dailyWage) || 0;
                                                                    if (totalPay === 0 || isSpecial) {
                                                                        // Fallback if backend hasn't processed or if Special day rule applies
                                                                        const regH = isSpecial ? 0 : Math.min(total, parseFloat(payrollConfig.standard_daily_hours || 8));
                                                                        totalPay = (regH * rate) + otPay;
                                                                    }
                                                                    return formatCurrency(totalPay);
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', color: '#a855f7', fontWeight: 600 }}>{row.bonus > 0 ? `+${formatCurrency(row.bonus)}` : '-'}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>{row.deductions > 0 ? `-${formatCurrency(row.deductions)}` : '-'}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', fontSize: '0.95rem', borderRight: '1px solid var(--glass-border)' }}>
                                                                {(() => {
                                                                    const total = parseFloat(row.hoursWorked) || 0;
                                                                    const isSpecial = isSpecialDay(row.date, payrollConfig.national_holidays);
                                                                    const displayOT = isSpecial ? total : (parseFloat(row.otHours) || Math.max(0, total - parseFloat(payrollConfig.standard_daily_hours || 8)));
                                                                    const rate = parseFloat(row.rate) || parseFloat(payrollConfig.default_hourly_rate || 100);
                                                                    const otPay = displayOT * rate * parseFloat(payrollConfig.ot_multiplier || 1.5);

                                                                    let totalPay = parseFloat(row.daily_wage || row.dailyWage) || 0;
                                                                    if (totalPay === 0 || isSpecial) {
                                                                        const regH = isSpecial ? 0 : Math.min(total, parseFloat(payrollConfig.standard_daily_hours || 8));
                                                                        totalPay = (regH * rate) + otPay;
                                                                    }
                                                                    const bonus = parseFloat(row.bonus) || 0;
                                                                    const deductions = parseFloat(row.deductions) || 0;
                                                                    return formatCurrency(Math.max(0, totalPay + bonus - deductions));
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                    <button onClick={() => { setEditingRecord(row); setShowManualEntry(true); }} style={{ padding: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: '0.4rem', color: '#3b82f6', cursor: 'pointer', transition: 'all 0.2s' }} title="Edit Log"><Pencil size={18} /></button>
                                                                    <button onClick={() => handleDelete(row)} style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '0.4rem', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }} title="Delete Log"><Trash2 size={18} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredAttendance.length === 0 && (
                                                    <tr><td colSpan={13} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data loaded.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'payments' && (role === 'admin' || hasPermission('attendance.salaries')) && (
                <>
                    {/* Payment Stats */}
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} /> Financial Overview (Filtered)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Salary Paid</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(paymentStats.totalSalary)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Advances</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(paymentStats.totalAdvance)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                            <div style={{ color: '#10b981', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Wages</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(paymentStats.totalWages)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}>
                            <div style={{ color: '#a78bfa', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Net Financial Outflow</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(paymentStats.totalSalary + paymentStats.totalAdvance + paymentStats.totalWages)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899', background: 'rgba(236, 72, 153, 0.05)' }}>
                            <div style={{ color: '#f472b6', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Earned (Attendance)</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(paymentStats.totalEarned)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${paymentStats.balance >= 0 ? '#10b981' : '#ef4444'}`, background: paymentStats.balance >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                            <div style={{ color: paymentStats.balance >= 0 ? '#10b981' : '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Balance Salary Pending</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: paymentStats.balance >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(paymentStats.balance)}</div>
                        </div>
                    </div>

                    {/* Payments Table */}
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Payment Register (Salaries & Advances)</h3>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {hasPermission('attendance.payouts.write') && (
                                        <button onClick={() => setShowManualEntry(true)} className="btn-action btn-primary" style={{ background: '#3b82f6', borderRadius: '0.5rem' }}>
                                            <Plus size={18} /> Register Payment
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                        <Users size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search by ID or Name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        value={monthFilter}
                                        onChange={(e) => setMonthFilter(e.target.value ? parseInt(e.target.value) : '')}
                                        style={{
                                            padding: '0.6rem 0.75rem',
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="" style={{ color: '#1e293b' }}>All Months</option>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m} style={{ color: '#1e293b' }}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={yearFilter}
                                        onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : '')}
                                        style={{
                                            padding: '0.6rem 0.75rem',
                                            background: 'var(--glass-highlight)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="" style={{ color: '#1e293b' }}>All Years</option>
                                        {[...Array(5)].map((_, i) => {
                                            const y = new Date().getFullYear() - 2 + i;
                                            return <option key={y} value={y} style={{ color: '#1e293b' }}>{y}</option>;
                                        })}
                                    </select>
                                </div>
                                {(searchTerm || monthFilter !== '' || yearFilter !== '') && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setMonthFilter(new Date().getMonth() + 1); setYearFilter(new Date().getFullYear()); }}
                                        style={{
                                            padding: '0.6rem 1rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontWeight: 500
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
                                    <tr style={{ textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', borderRight: '1px solid var(--glass-border)' }}>Date</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', borderRight: '1px solid var(--glass-border)' }}>Emp ID</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', borderRight: '1px solid var(--glass-border)' }}>Employee Name</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', borderRight: '1px solid var(--glass-border)' }}>Type</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', textAlign: 'right', color: '#60a5fa', borderRight: '1px solid var(--glass-border)' }}>Amount</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', borderRight: '1px solid var(--glass-border)' }}>Remarks</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-highlight)', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map((row, i) => {
                                        const selectSpecial = getSpecialDayType(row.date, payrollConfig.national_holidays);
                                        const dayOfWeek = row.date ? new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';
                                        
                                        let rowBg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                                        if (selectSpecial.type === 'holiday') rowBg = 'rgba(225, 29, 72, 0.08)';
                                        else if (selectSpecial.type === 'sunday') rowBg = 'rgba(79, 70, 229, 0.08)';

                                        return (
                                            <tr key={row.id} style={{ borderBottom: '1px solid var(--glass-border)', background: rowBg }}>
                                                <td style={{ padding: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ fontWeight: 600 }}>{row.date}</div>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: selectSpecial.type === 'holiday' ? '#f43f5e' : (selectSpecial.type === 'sunday' ? '#6366f1' : 'var(--text-secondary)') }}>
                                                            {selectSpecial.type === 'holiday' ? selectSpecial.reason.toUpperCase() : dayOfWeek}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--glass-border)' }}>{row.emp_id}</td>
                                                <td style={{ padding: '1rem', fontWeight: 500, borderRight: '1px solid var(--glass-border)' }}>{row.emp_name}</td>
                                                <td style={{ padding: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '1rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        background: row.type === 'Salary' ? 'rgba(59, 130, 246, 0.1)' : (row.type === 'Advance' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                                                        color: row.type === 'Salary' ? '#3b82f6' : (row.type === 'Advance' ? '#f59e0b' : '#10b981'),
                                                        border: `1px solid ${row.type === 'Salary' ? 'rgba(59, 130, 246, 0.2)' : (row.type === 'Advance' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)')}`
                                                    }}>
                                                        {row.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', borderRight: '1px solid var(--glass-border)' }}>{formatCurrency(row.amount)}</td>
                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', borderRight: '1px solid var(--glass-border)' }}>{row.remarks || '-'}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    {hasPermission('attendance.payouts.delete') && (
                                                        <button
                                                            onClick={() => deletePayment(row.id)}
                                                            style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '0.4rem', color: '#ef4444', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredPayments.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No payment records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Manual Entry Modal */}
            {(showManualEntry || editingRecord) && (
                <ManualEntryModal
                    onClose={() => { setShowManualEntry(false); setEditingRecord(null); }}
                    onSave={() => { fetchAttendance(); fetchEmployees(); fetchPayments(); }}
                    config={payrollConfig}
                    employees={employees}
                    initialData={editingRecord}
                    activeTab={activeTab}
                />
            )}

            <PayslipGenerator
                isOpen={isPayslipOpen}
                onClose={() => setIsPayslipOpen(false)}
                employees={employees}
                attendanceData={attendanceData}
                paymentData={paymentData}
                payrollConfig={payrollConfig}
            />

            {/* Deletion Request Modal */}
            {showDeleteRequest && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
                    <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#f59e0b' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '1rem' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Request Deletion</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Explain why this log should be removed</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Reason for deletion</label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="e.g. Mistake in manual entry, double entry, etc."
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1rem', color: 'var(--text-primary)', fontSize: '0.9rem', minHeight: '120px', outline: 'none', resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setShowDeleteRequest(false)} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={submitDeletionRequest} style={{ flex: 1, padding: '0.8rem', background: '#f59e0b', border: 'none', color: 'white', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Submit Request</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ManualEntryModal = ({ onClose, onSave, config, employees, initialData, activeTab = 'attendance' }) => {
    const isPaymentTab = activeTab === 'payments';
    const [formData, setFormData] = useState({
        date: initialData?.date || new Date().toISOString().split('T')[0],
        empId: initialData?.emp_id || initialData?.empId || '',
        empName: initialData?.emp_name || initialData?.name || '',
        shifts: initialData?.shifts?.length > 0
            ? [...initialData.shifts, ...Array.from({ length: Math.max(0, 4 - initialData.shifts.length) }, () => ({ in: '', out: '' }))].slice(0, 4)
            : Array.from({ length: 4 }, () => ({ in: '', out: '' })),
        breakMins: initialData?.break_hours ? initialData.break_hours * 60 : 0,
        rate: initialData?.rate || config.default_hourly_rate,
        bonus: initialData?.bonus || 0,
        bonusReason: initialData?.bonus_reason || '',
        deductions: initialData?.deductions || 0,
        deductionReason: initialData?.deduction_reason || '',
        attendance_status: initialData?.attendance_status || 'Present',
        leave_reason: initialData?.leave_reason || '',
        isNewTemp: false,
        // Payment specific
        paymentType: initialData?.type || 'Advance',
        paymentAmount: initialData?.amount || 0,
        paymentRemarks: initialData?.remarks || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Auto-fill name and rate when ID changes
    const handleIdChange = (id) => {
        const emp = (employees || []).find(e => e.emp_id === id);
        if (emp) {
            setFormData(prev => ({
                ...prev,
                empId: id.toUpperCase(),
                empName: emp.name,
                rate: emp.hourly_rate || config.default_hourly_rate,
                isNewTemp: false // If found, it's not a NEW temp (might be existing temp)
            }));
        } else {
            setFormData(prev => ({ ...prev, empId: id.toUpperCase() }));
        }
    };

    // Unified ID Logic for Temporary Staff
    useEffect(() => {
        if (formData.isNewTemp && !initialData) {
            const allIds = (employees || []).map(e => {
                const match = e.emp_id.match(/(\d{4,})$/);
                return match ? parseInt(match[0]) : null;
            }).filter(n => n !== null);

            const maxId = allIds.length > 0 ? Math.max(...allIds) : 1000;
            const nextId = `NFS-TEMP-${maxId + 1}`;

            setFormData(prev => ({
                ...prev,
                empId: nextId,
                empName: prev.empName || '',
                rate: prev.rate || config.default_hourly_rate
            }));
        }
    }, [formData.isNewTemp, employees, initialData, config.default_hourly_rate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isPaymentTab) {
                const record = {
                    date: formData.date,
                    emp_id: formData.empId,
                    emp_name: formData.empName,
                    type: formData.paymentType === 'Salary Payout' ? 'Salary' : formData.paymentType,
                    amount: parseFloat(formData.paymentAmount),
                    remarks: formData.paymentType === 'Salary Payout' || formData.paymentType === 'Bonus'
                        ? (formData.paymentRemarks ? `${formData.paymentType} Payout - ${formData.paymentRemarks}` : `${formData.paymentType} Payout`)
                        : formData.paymentRemarks
                };

                const { error } = await supabase
                    .from('employee_payments')
                    .insert([record]);

                if (error) throw error;
                onSave();
                onClose();
                return;
            }

            const isPresent = formData.attendance_status === 'Present';

            const existingEmp = (employees || []).find(e => e.emp_id === formData.empId);

            // --- Strict Creation Validation ---
            if (!existingEmp && !initialData) {
                if (!formData.isNewTemp) {
                    alert("Employee ID not found. Only Temporary staff can be created here.\n\nFor Permanent staff (ID format: NFS-XXXX), please use the Employee Master in Admin Console.");
                    setIsSaving(false);
                    return;
                }

                const { error: empError } = await supabase
                    .from('employees')
                    .insert([{
                        emp_id: formData.empId,
                        name: formData.empName,
                        hourly_rate: parseFloat(formData.rate),
                        staff_type: 'Temporary',
                        is_active: true
                    }]);
                if (empError) throw new Error("Could not create temporary employee: " + empError.message);
            }

            let totalH = 0;
            let regH = 0;
            let otH = 0;
            let wage = 0;
            let rate = parseFloat(formData.rate);

            if (isPresent) {
                formData.shifts.forEach(s => {
                    const inD = getDecimalHours(s.in);
                    const outD = getDecimalHours(s.out);
                    if (inD !== null && outD !== null) {
                        let diff = outD - inD;
                        if (diff < 0) diff += 24;
                        totalH += diff;
                    }
                });

                totalH = Math.max(0, totalH - (formData.breakMins / 60));
                
                const isSpecial = isSpecialDay(formData.date, config.national_holidays);
                regH = isSpecial ? 0 : Math.min(totalH, config.standard_daily_hours);
                otH = isSpecial ? totalH : Math.max(0, totalH - config.standard_daily_hours);
                wage = (regH * rate) + (otH * rate * config.ot_multiplier);
            }

            const record = {
                date: formData.date,
                emp_id: formData.empId,
                emp_name: formData.empName,
                shifts: isPresent ? formData.shifts.filter(s => s.in && s.out) : [],
                total_hours: (isNaN(totalH) || totalH === null) ? 0 : totalH,
                regular_hours: regH,
                ot_hours: otH,
                break_hours: isPresent ? formData.breakMins / 60 : 0,
                daily_wage: wage,
                rate: rate,
                bonus: parseFloat(formData.bonus || 0),
                bonus_reason: formData.bonusReason,
                deductions: parseFloat(formData.deductions || 0),
                deduction_reason: formData.deductionReason,
                attendance_status: formData.attendance_status,
                leave_reason: formData.leave_reason
            };

            const { error } = await supabase
                .from('employee_attendance')
                .upsert([record], { onConflict: 'date,emp_id' });

            if (error) throw error;
            onSave();
            onClose();
        } catch (err) {
            alert("Error saving: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', position: 'relative' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>
                    {isPaymentTab ? (initialData ? 'Edit Payment' : 'Register Payment') : (initialData ? 'Edit Attendance Log' : 'Manual Attendance Entry')}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: isPaymentTab ? '1fr 1fr' : '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Emp ID</label>
                            <input
                                type="text"
                                list="emp-list"
                                required
                                disabled={!!initialData || formData.isNewTemp}
                                value={formData.empId}
                                onChange={e => handleIdChange(e.target.value)}
                                placeholder={formData.isNewTemp ? "Generating..." : "e.g. NFS-1001"}
                                style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem', opacity: (initialData || formData.isNewTemp) ? 0.7 : 1 }}
                            />
                            {!initialData && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isNewTemp}
                                        onChange={e => setFormData({ ...formData, isNewTemp: e.target.checked })}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    New Temporary Employee
                                </label>
                            )}
                            <datalist id="emp-list">
                                {employees.map(e => <option key={e.id} value={e.emp_id}>{e.name}</option>)}
                            </datalist>
                        </div>
                        {!isPaymentTab && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</label>
                                <select
                                    value={formData.attendance_status}
                                    onChange={e => setFormData({ ...formData, attendance_status: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem', outline: 'none' }}
                                >
                                    <option value="Present" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Present</option>
                                    <option value="Absent" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Absent</option>
                                    <option value="Casual Leave" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Casual Leave</option>
                                    <option value="Medical Leave" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Medical Leave</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isPaymentTab ? '1fr' : '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Employee Name</label>
                            <input type="text" required value={formData.empName} onChange={e => setFormData({ ...formData, empName: e.target.value })} placeholder="Full Name" style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                        </div>
                        {!isPaymentTab && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hourly Rate (₹)</label>
                                <input type="number" required value={formData.rate} onChange={e => setFormData({ ...formData, rate: e.target.value })} style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                            </div>
                        )}
                    </div>

                    {isPaymentTab ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Payment Type</label>
                                <select
                                    value={formData.paymentType}
                                    onChange={e => setFormData({ ...formData, paymentType: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem', outline: 'none' }}
                                >
                                    <option value="Advance" style={{ background: 'var(--bg-secondary)' }}>Salary Advance</option>
                                    <option value="Salary" style={{ background: 'var(--bg-secondary)' }}>Salary Installment</option>
                                    <option value="Wages" style={{ background: 'var(--bg-secondary)' }}>Wages</option>
                                    <option value="Bonus" style={{ background: 'var(--bg-secondary)' }}>Bonus Payout</option>
                                    <option value="Salary Payout" style={{ background: 'var(--bg-secondary)' }}>Salary Payout</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Amount (₹)</label>
                                <input type="number" required value={formData.paymentAmount} onChange={e => setFormData({ ...formData, paymentAmount: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Remarks</label>
                                <input type="text" value={formData.paymentRemarks} onChange={e => setFormData({ ...formData, paymentRemarks: e.target.value })} placeholder="Any notes..." style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Deductions / Advance (₹)</label>
                                    <input type="number" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason / Remark</label>
                                    <select
                                        value={formData.deductionReason}
                                        onChange={e => setFormData({ ...formData, deductionReason: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem', outline: 'none' }}
                                    >
                                        <option value="" style={{ background: 'var(--bg-secondary)' }}>Select Reason...</option>
                                        <option value="Salary Advance" style={{ background: 'var(--bg-secondary)' }}>Salary Advance</option>
                                        <option value="Late Arrival" style={{ background: 'var(--bg-secondary)' }}>Late Arrival</option>
                                        <option value="Damage Recovery" style={{ background: 'var(--bg-secondary)' }}>Damage Recovery</option>
                                        <option value="Loan Repayment" style={{ background: 'var(--bg-secondary)' }}>Loan Repayment</option>
                                        <option value="Other" style={{ background: 'var(--bg-secondary)' }}>Other</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bonus Payout (₹)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="number" value={formData.bonus} onChange={e => setFormData({ ...formData, bonus: e.target.value })} placeholder="0" style={{ flex: 1, padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                                        <input type="text" value={formData.bonusReason} onChange={e => setFormData({ ...formData, bonusReason: e.target.value })} placeholder="Reason for bonus..." style={{ flex: 2, padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem' }} />
                                    </div>
                                </div>
                            </div>
                            {/* ... existing attendance details section ... */}
                        </>
                    )}

                    {(() => {
                        const existingEmp = (employees || []).find(e => e.emp_id === formData.empId);
                        const empToDisplay = existingEmp || null;
                        const isTemp = empToDisplay?.staff_type === 'Temporary' || formData.isNewTemp;

                        return (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                background: isTemp ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.02)',
                                borderRadius: '0.4rem',
                                border: isTemp ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Employee Details</h4>
                                    {isTemp && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '0.1rem 0.4rem',
                                            background: '#f59e0b',
                                            color: '#000',
                                            borderRadius: '1rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase'
                                        }}>Temporary Staff</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Role / Designation</div>
                                        <div style={{ fontSize: '0.9rem' }}>{empToDisplay?.role || (formData.isNewTemp ? 'Casual Worker' : 'Not specified')}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Department</div>
                                        <div style={{ fontSize: '0.9rem' }}>{empToDisplay?.department || (formData.isNewTemp ? 'Production' : 'Not specified')}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {!isPaymentTab && (formData.attendance_status === 'Present' ? (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Work Shifts</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Break (min):</label>
                                    <input type="number" value={formData.breakMins} onChange={e => setFormData({ ...formData, breakMins: e.target.value })} style={{ width: '60px', padding: '0.3rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.3rem', textAlign: 'center' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {formData.shifts.map((shift, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Shift {i + 1}</span>
                                            <Clock size={12} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <input type="time" title="In Time" value={shift.in} onChange={e => {
                                                    const news = [...formData.shifts];
                                                    news[i].in = e.target.value;
                                                    setFormData({ ...formData, shifts: news });
                                                }} style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.3rem', fontSize: '0.85rem' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input type="time" title="Out Time" value={shift.out} onChange={e => {
                                                    const news = [...formData.shifts];
                                                    news[i].out = e.target.value;
                                                    setFormData({ ...formData, shifts: news });
                                                }} style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.3rem', fontSize: '0.85rem' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason / Remark</label>
                            <textarea
                                value={formData.leave_reason}
                                onChange={e => setFormData({ ...formData, leave_reason: e.target.value })}
                                placeholder="Casual leave / medical leave reason..."
                                style={{ width: '100%', height: '80px', padding: '0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '0.4rem', resize: 'none' }}
                            />
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn-action btn-outline">Cancel</button>
                        <button type="submit" disabled={isSaving} className="btn-action btn-primary" style={{ background: '#3b82f6' }}>
                            {isSaving ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TimeAttendance;
