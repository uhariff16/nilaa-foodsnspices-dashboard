import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Upload, Users, Clock, DollarSign, Calendar, FileText, Download, ArrowLeft, TrendingUp, Trash2, UserCheck, UserMinus, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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

const TimeAttendance = ({ onBack, hideBack = false }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [payrollConfig, setPayrollConfig] = useState({
        standard_daily_hours: 8,
        ot_multiplier: 1.5,
        default_hourly_rate: 100
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [editingRecord, setEditingRecord] = useState(null);

    // Initial Load from DB
    useEffect(() => {
        fetchAttendance();
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
            const { data, error } = await supabase
                .from('employee_attendance')
                .select('*')
                .order('date', { ascending: false })
                .limit(100);

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
                                regularHours = Math.min(hoursWorked, payrollConfig.standard_daily_hours);
                                otHours = Math.max(0, hoursWorked - payrollConfig.standard_daily_hours);
                                const r = parseFloat(item.rate || payrollConfig.default_hourly_rate);
                                dailyWage = (regularHours * r) + (otHours * r * payrollConfig.ot_multiplier);
                            }
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

    const handleDelete = async (row) => {
        if (!window.confirm(`Are you sure you want to delete the attendance log for ${row.name} on ${row.date}?`)) return;

        try {
            const { error } = await supabase
                .from('employee_attendance')
                .delete()
                .match({ date: row.date, emp_id: row.empId });

            if (error) throw error;
            console.log("Delete Successful");
            fetchAttendance();
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete record: " + err.message);
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

            const regularHours = Math.min(totalWorkHours, payrollConfig.standard_daily_hours);
            const otHours = Math.max(0, totalWorkHours - payrollConfig.standard_daily_hours);
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
            const matchesDate = !dateFilter || row.date === dateFilter;
            return matchesSearch && matchesDate;
        });
    }, [attendanceData, searchTerm, dateFilter]);

    // Stats
    const stats = useMemo(() => {
        // Context Date: Filter date if selected, otherwise Today (Local)
        const contextDate = dateFilter || new Date().toISOString().split('T')[0];

        // Precise Workforce Overview from master list
        const totalEmployees = employees.length;

        // Count attendance for the specific Context Date
        // We use attendanceData (raw) here to ensure cards reflect the specific day even if table is seaerched
        const dailyLogs = attendanceData.filter(r => r.date === contextDate);
        const presentCount = dailyLogs.filter(r => (r.attendance_status || 'Present') === 'Present').length;
        const leaveCount = dailyLogs.filter(r => ['Casual Leave', 'Medical Leave'].includes(r.attendance_status)).length;

        // Absent count logic: Total - (Present + Leave) for that specific date
        // This accounts for both manual "Absent" logs and inferred absences
        const absentCount = Math.max(0, totalEmployees - (presentCount + leaveCount));

        // General metrics for the current table view (filteredAttendance)
        const currentLogs = filteredAttendance;
        const totalHours = currentLogs.reduce((sum, r) => sum + (parseFloat(r.hoursWorked) || 0), 0);

        let totalOTPay = 0;
        const totalOTHours = currentLogs.reduce((sum, r) => {
            const rowOT = parseFloat(r.otHours) || Math.max(0, (parseFloat(r.hoursWorked) || 0) - parseFloat(payrollConfig.standard_daily_hours || 8));
            const rowRate = parseFloat(r.rate) || parseFloat(payrollConfig.default_hourly_rate || 100);
            const rowOTPay = rowOT * rowRate * parseFloat(payrollConfig.ot_multiplier || 1.5);
            totalOTPay += rowOTPay;
            return sum + rowOT;
        }, 0);
        const totalCost = currentLogs.reduce((sum, r) => sum + (parseFloat(r.daily_wage || r.dailyWage) || 0), 0);

        const totalDeductions = currentLogs.reduce((sum, r) => sum + (parseFloat(r.deductions) || 0), 0);
        const netPayout = totalCost - totalDeductions;

        const s = { totalEmployees, totalHours, totalOTHours, totalOTPay, totalCost, netPayout, presentCount, leaveCount, absentCount, contextDate, totalDeductions };
        localStorage.setItem('last_attendance_stats', JSON.stringify(s));
        return s;
    }, [filteredAttendance, attendanceData, employees, payrollConfig, dateFilter]);


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
            { header: 'Hourly Rate', key: 'rate', width: 15 }
        ];
        masterSheet.addRows(employees.map(e => ({ id: e.emp_id, name: e.name, rate: e.hourly_rate || payrollConfig.default_hourly_rate })));

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
            { header: 'In 1', key: 'in1', width: 12 },
            { header: 'Out 1', key: 'out1', width: 12 },
            { header: 'In 2', key: 'in2', width: 12 },
            { header: 'Out 2', key: 'out2', width: 12 },
            { header: 'In 3', key: 'in3', width: 12 },
            { header: 'Out 3', key: 'out3', width: 12 },
            { header: 'In 4', key: 'in4', width: 12 },
            { header: 'Out 4', key: 'out4', width: 12 },
            { header: 'Break (min)', key: 'break', width: 15 },
            { header: 'Deductions', key: 'deductions', width: 15 },
            { header: 'Deduction Reason', key: 'deductionReason', width: 20 }
        ];

        // Prepare Break Dropdown list (0-240 mins)
        const breakOptions = [];
        for (let m = 0; m <= 240; m += 15) breakOptions.push(m);
        listSheet.getColumn(3).values = ['BreakOptions', ...breakOptions];

        const deductionReasons = ['Salary Advance', 'Late Arrival', 'Damage Recovery', 'Loan Repayment', 'Other'];
        listSheet.getColumn(4).values = ['DeductionReasons', ...deductionReasons];

        // Add Existing Attendance Data
        attendanceData.forEach((rec) => {
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
                break: Math.round((rec.breakHours || 0) * 60),
                break: Math.round((rec.breakHours || 0) * 60),
                deductions: rec.deductions || 0,
                deductionReason: rec.deductionReason || ''
            });
        });

        // Add blank rows
        for (let i = 0; i < 50; i++) attendanceSheet.addRow({});

        // Apply formatting and validation (1-based index)
        const totalSheetRows = attendanceSheet.rowCount;
        for (let rowNumber = 2; rowNumber <= totalSheetRows; rowNumber++) {
            const row = attendanceSheet.getRow(rowNumber);

            // Date Dropdown
            row.getCell(1).numFmt = 'DD-MM-YYYY';
            row.getCell(1).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Lists'!$A$2:$A$${monthDates.length + 1}`]
            };

            // ID Dropdown
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ["'Employee Details'!$A$2:$A$1000"]
            };

            // Name Lookup
            if (!row.getCell(3).value) {
                row.getCell(3).value = {
                    formula: `=IF(B${rowNumber}="","",VLOOKUP(B${rowNumber},'Employee Details'!$A$2:$B$1000,2,FALSE))`,
                    result: undefined
                };
            }

            // Shift Time Dropdowns (Cols 4-11)
            for (let col = 4; col <= 11; col++) {
                row.getCell(col).numFmt = 'HH:mm';
                row.getCell(col).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ["'Lists'!$B$2:$B$98"]
                };
            }

            // Break Dropdown (Col 12)
            row.getCell(12).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Lists'!$C$2:$C$${breakOptions.length + 1}`]
            };

            // Deduction Reason Dropdown (Col 14)
            row.getCell(14).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Lists'!$D$2:$D$${deductionReasons.length + 1}`]
            };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Attendance_Logs_${monthName}_${year}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };


    return (
        <div className="attendance-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: '#fff' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {!hideBack && onBack && (
                        <button onClick={onBack} className="btn-icon">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>NFS Time & Attendance</h1>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setShowManualEntry(true)} className="btn-action btn-outline">
                        <FileText size={18} />
                        Manual Entry
                    </button>
                    <button onClick={() => document.getElementById('attendance-upload').click()} className="btn-action btn-outline" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                        <Upload size={18} />
                        Upload Sheet
                    </button>
                    <button onClick={downloadTemplate} className="btn-action btn-outline">
                        <Download size={18} />
                        Download Attendance Logs
                    </button>
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

            {/* Stats Cards */}
            {/* Workforce Status */}
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} /> Workforce Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Employees</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.totalEmployees}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ color: '#10b981', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Present ({stats.contextDate})</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{stats.presentCount}</div>
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

            {/* Metrics & Impact */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} /> Workload Metrics
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Hours</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.totalHours.toFixed(1)}h</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ color: '#f97316', fontSize: '0.75rem', marginBottom: '0.5rem' }}>OT Hours</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>{stats.totalOTHours.toFixed(1)}h</div>
                        </div>
                    </div>
                </div>
                <div>
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} /> Financial Impact
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total OT Pay</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(stats.totalOTPay)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ color: '#10b981', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Total Pay</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stats.totalCost)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ color: '#3b82f6', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Net Pay</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(stats.netPayout)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
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
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                style={{
                                    padding: '0.6rem 0.75rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        {(searchTerm || dateFilter) && (
                            <button
                                onClick={() => { setSearchTerm(''); setDateFilter(''); }}
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
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Emp ID</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Employee</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 1</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 2</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 3</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Shift 4</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Break</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Total Hours</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>OT Hours</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>OT Pay</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Total Pay</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Deductions</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Net Pay</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttendance.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{row.date}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{row.empId}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{row.name}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'inline-block',
                                            background: (row.attendance_status || 'Present') === 'Present' ? 'rgba(16, 185, 129, 0.1)' : (row.attendance_status === 'Absent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                            color: (row.attendance_status || 'Present') === 'Present' ? '#10b981' : (row.attendance_status === 'Absent' ? '#ef4444' : '#f59e0b'),
                                            border: (row.attendance_status || 'Present') === 'Present' ? '1px solid rgba(16, 185, 129, 0.2)' : (row.attendance_status === 'Absent' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)')
                                        }}>
                                            {row.attendance_status || 'Present'}
                                        </div>
                                        {row.leave_reason && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.leave_reason}>{row.leave_reason}</div>}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime2}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime2}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime3}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime3}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#10b981' }}>{row.inTime4}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{row.outTime4}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{Math.round(row.breakHours * 60)}m</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>{(row.hoursWorked || 0).toFixed(2)}h</div>
                                        {(row.attendance_status === 'Present' || !row.attendance_status) && row.hoursWorked < payrollConfig.standard_daily_hours && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>Short Shift</span>}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {(() => {
                                            const displayOT = parseFloat(row.otHours) || Math.max(0, (parseFloat(row.hoursWorked) || 0) - parseFloat(payrollConfig.standard_daily_hours || 8));
                                            return displayOT > 0 ? (
                                                <span style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                    +{displayOT.toFixed(2)}h
                                                </span>
                                            ) : '-';
                                        })()}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {(() => {
                                            const displayOT = parseFloat(row.otHours) || Math.max(0, (parseFloat(row.hoursWorked) || 0) - parseFloat(payrollConfig.standard_daily_hours || 8));
                                            const rate = parseFloat(row.rate) || parseFloat(payrollConfig.default_hourly_rate || 100);
                                            const otPay = displayOT * rate * parseFloat(payrollConfig.ot_multiplier || 1.5);
                                            return otPay > 0 ? (
                                                <span style={{ color: '#f59e0b' }}>{formatCurrency(otPay)}</span>
                                            ) : '-';
                                        })()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatCurrency(row.daily_wage || row.dailyWage)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: '#ef4444' }}>{row.deductions > 0 ? `-${formatCurrency(row.deductions)}` : '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>{formatCurrency((row.daily_wage || row.dailyWage) - (row.deductions || 0))}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => { setEditingRecord(row); setShowManualEntry(true); }}
                                                style={{
                                                    padding: '0.4rem',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '0.4rem',
                                                    color: '#3b82f6',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Edit Log"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(row)}
                                                style={{
                                                    padding: '0.4rem',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '0.4rem',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Delete Log"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAttendance.length === 0 && (
                                <tr>
                                    <td colSpan={13} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <div style={{ marginBottom: '1rem' }}>No data loaded.</div>
                                        <div style={{ fontSize: '0.8rem' }}>Please upload an Excel file or use Manual Entry.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {(showManualEntry || editingRecord) && (
                <ManualEntryModal
                    onClose={() => { setShowManualEntry(false); setEditingRecord(null); }}
                    onSave={fetchAttendance}
                    config={payrollConfig}
                    employees={employees}
                    initialData={editingRecord}
                />
            )}
        </div>
    );
};

const ManualEntryModal = ({ onClose, onSave, config, employees, initialData }) => {
    const [formData, setFormData] = useState({
        date: initialData?.date || new Date().toISOString().split('T')[0],
        empId: initialData?.empId || '',
        empName: initialData?.name || '',
        shifts: initialData?.shifts?.length > 0 ? [...initialData.shifts, ...Array(Math.max(0, 4 - initialData.shifts.length)).fill({ in: '', out: '' })].slice(0, 4) : [
            { in: '', out: '' },
            { in: '', out: '' },
            { in: '', out: '' },
            { in: '', out: '' }
        ],
        breakMins: initialData?.break_hours ? initialData.break_hours * 60 : 0,
        rate: initialData?.rate || config.default_hourly_rate,
        deductions: initialData?.deductions || 0,
        deductionReason: initialData?.deduction_reason || '',
        attendance_status: initialData?.attendance_status || 'Present',
        leave_reason: initialData?.leave_reason || ''
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
                rate: emp.hourly_rate || config.default_hourly_rate
            }));
        } else {
            setFormData(prev => ({ ...prev, empId: id.toUpperCase() }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // ... (rest of the logic stays the same but uses formData.rate)
            // const getDec = (time) => ... // Removed local simulation


            const isPresent = formData.attendance_status === 'Present';
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
                regH = Math.min(totalH, config.standard_daily_hours);
                otH = Math.max(0, totalH - config.standard_daily_hours);
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
                <h2 style={{ marginBottom: '1.5rem' }}>{initialData ? 'Edit Attendance Log' : 'Manual Attendance Entry'}</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Emp ID</label>
                            <input type="text" list="emp-list" required disabled={!!initialData} value={formData.empId} onChange={e => handleIdChange(e.target.value)} placeholder="e.g. NFS1001" style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem', opacity: initialData ? 0.7 : 1 }} />
                            <datalist id="emp-list">
                                {employees.map(e => <option key={e.id} value={e.emp_id}>{e.name}</option>)}
                            </datalist>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</label>
                            <select
                                value={formData.attendance_status}
                                onChange={e => setFormData({ ...formData, attendance_status: e.target.value })}
                                style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem', outline: 'none' }}
                            >
                                <option value="Present" style={{ background: '#1e293b', color: '#fff' }}>Present</option>
                                <option value="Absent" style={{ background: '#1e293b', color: '#fff' }}>Absent</option>
                                <option value="Casual Leave" style={{ background: '#1e293b', color: '#fff' }}>Casual Leave</option>
                                <option value="Medical Leave" style={{ background: '#1e293b', color: '#fff' }}>Medical Leave</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Employee Name</label>
                            <input type="text" required value={formData.empName} onChange={e => setFormData({ ...formData, empName: e.target.value })} placeholder="Full Name" style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hourly Rate (₹)</label>
                            <input type="number" required value={formData.rate} onChange={e => setFormData({ ...formData, rate: e.target.value })} style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Deductions / Advance (₹)</label>
                            <input type="number" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason / Remark</label>
                            <select
                                value={formData.deductionReason}
                                onChange={e => setFormData({ ...formData, deductionReason: e.target.value })}
                                style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem', outline: 'none' }}
                            >
                                <option value="" style={{ background: '#1e293b' }}>Select Reason...</option>
                                <option value="Salary Advance" style={{ background: '#1e293b' }}>Salary Advance</option>
                                <option value="Late Arrival" style={{ background: '#1e293b' }}>Late Arrival</option>
                                <option value="Damage Recovery" style={{ background: '#1e293b' }}>Damage Recovery</option>
                                <option value="Loan Repayment" style={{ background: '#1e293b' }}>Loan Repayment</option>
                                <option value="Other" style={{ background: '#1e293b' }}>Other</option>
                            </select>
                        </div>
                    </div>

                    {(employees || []).find(e => e.emp_id === formData.empId) && (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Role / Designation</div>
                                <div style={{ fontSize: '0.9rem' }}>{employees.find(e => e.emp_id === formData.empId).role || 'Not specified'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Department</div>
                                <div style={{ fontSize: '0.9rem' }}>{employees.find(e => e.emp_id === formData.empId).department || 'Not specified'}</div>
                            </div>
                        </div>
                    )}

                    {formData.attendance_status === 'Present' ? (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Work Shifts</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Break (min):</label>
                                    <input type="number" value={formData.breakMins} onChange={e => setFormData({ ...formData, breakMins: e.target.value })} style={{ width: '60px', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.3rem', textAlign: 'center' }} />
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
                                                }} style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '0.3rem', fontSize: '0.85rem' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input type="time" title="Out Time" value={shift.out} onChange={e => {
                                                    const news = [...formData.shifts];
                                                    news[i].out = e.target.value;
                                                    setFormData({ ...formData, shifts: news });
                                                }} style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '0.3rem', fontSize: '0.85rem' }} />
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
                                style={{ width: '100%', height: '80px', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '0.4rem', resize: 'none' }}
                            />
                        </div>
                    )}

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
