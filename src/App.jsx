import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/admin/AdminPanel';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import AttendancePage from './components/AttendancePage';
import RnDDashboard from './components/rnd/RnDDashboard';
import { supabase } from './lib/supabaseClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';


// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'red', background: '#1a1a1a', height: '100vh' }}>
                    <h1>Something went wrong.</h1>
                    <pre>{this.state.error && this.state.error.toString()}</pre>
                    <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

// Protected Route Wrapper
const ProtectedRoute = ({ children, adminOnly = false, attendanceOnly = false, dashboardOnly = false }) => {
    const { user, role, loading, canAccessAttendance, canViewDashboard, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (loading) {
        return <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>Authenticating...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && role !== 'admin') {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', color: 'white' }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.5rem' }}>Access Denied: Master Admin Only</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => window.location.href = '/'} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Back to Dashboard</button>
                    <button onClick={logout} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout & Change User</button>
                </div>
            </div>
        );
    }

    if (attendanceOnly && !canAccessAttendance) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', color: 'white' }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.5rem' }}>Access Denied: Attendance Access Required</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => window.location.href = '/'} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Back to Dashboard</button>
                    <button onClick={logout} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout & Change User</button>
                </div>
            </div>
        );
    }

    if (dashboardOnly && !canViewDashboard) {
        if (location.pathname === '/' && canAccessAttendance) {
            // Intelligent auto-redirect for Viewers who only have Attendance access
            return <Navigate to="/attendance" replace />;
        }

        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', color: 'white' }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.5rem' }}>Access Denied: Dashboard Access Required</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {canAccessAttendance && <button onClick={() => navigate('/attendance')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Go to Attendance</button>}
                    <button onClick={logout} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout & Change User</button>
                </div>
            </div>
        );
    }

    return children;
};

// Main App Logic (Dashboard + Data Loading)
const DashboardLayout = () => {
    const [data, setData] = useState({ transactions: [], items: [], attendance: [] });
    const [productionData, setProductionData] = useState({ stockIn: [], preProduction: [], postProduction: [] });
    const [purchaseData, setPurchaseData] = useState([]);
    const [supplierPayments, setSupplierPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [debugError, setDebugError] = useState(null);
    const location = useLocation();

    const isAdminParam = location.search.includes('admin');
    const { role } = useAuth();
    const navigate = useNavigate();

    // Redirect /?admin to /admin
    useEffect(() => {
        if (isAdminParam) {
            navigate('/admin');
        }
    }, [isAdminParam, navigate]);

    const fetchAllRows = async (table, select = '*', orderBy = 'date', ascending = false) => {
        let allRows = [];
        let from = 0;
        const batchSize = 1000;
        
        // Safety: If orderBy is 'date', check if it exists or fallback to id
        let sortCol = orderBy;
        
        while (true) {
            let query = supabase.from(table).select(select);
            if (sortCol) {
                query = query.order(sortCol, { ascending });
            }
            const { data, error } = await query.range(from, from + batchSize - 1);
            
            if (error) {
                // If 'date' column doesn't exist, retry once without sorting
                if (error.code === '42703' && sortCol === 'date') {
                    console.warn(`Column 'date' missing in ${table}, retrying without sort.`);
                    sortCol = null;
                    continue; 
                }
                throw error;
            }
            allRows = [...allRows, ...data];
            if (data.length < batchSize) break;
            from += batchSize;
        }
        return allRows;
    };

    const loadData = async () => {
        console.log("Starting Optimized loadData (Parallel)...");
        setLoading(true);
        try {
            // Parallel fetch with individual error handling
            const [allTxns, allLogs, allAttendance, allItemMaster] = await Promise.all([
                fetchAllRows('transactions', '*', 'date', false).catch(e => { console.error("Txns Fetch Error:", e); return []; }),
                fetchAllRows('production_logs', '*', 'date', true).catch(e => { console.error("Logs Fetch Error:", e); return []; }),
                fetchAllRows('employee_attendance', '*', 'date', false).catch(e => { console.error("Attendance Fetch Error:", e); return []; }),
                fetchAllRows('item_master', '*', null).catch(e => { console.error("ItemMaster Fetch Error:", e); return []; })
            ]);
            const uniqueTxnsMap = new Map();
            allTxns.forEach(t => {
                // [STAGE 3Q] Controlled Frontend Deduplication
                // For Sales and Invoice Total transactions, preserve every distinct database row by its stable primary key (t.id).
                // This prevents legitimate repeated sales line items (multi-line invoices with identical product/price/qty) from being collapsed.
                // If a record appears multiple times with the same primary key (e.g. from pagination or merging), it is deduplicated.
                // For non-sales transactions (Expenses, Purchases, Supplier_Payments), preserve the established business key to protect procurement and settlement integrity.
                const isSales = t.payment_mode === 'Sales' || t.payment_mode === 'Invoice Total';
                let key;
                if (isSales) {
                    key = t.id || `${t.date}-${t.invoice_no}-${Number(t.amount).toFixed(2)}-${Number(t.quantity || 0)}-${t.customer_name}-${t.item_name}`;
                } else {
                    const invKey = t.payment_mode === 'Supplier_Payment' ? '' : t.invoice_no;
                    key = `${t.date}-${invKey}-${Number(t.amount).toFixed(2)}-${Number(t.quantity || 0)}-${t.customer_name}-${t.item_name}`;
                }

                if (!uniqueTxnsMap.has(key)) {
                    uniqueTxnsMap.set(key, t);
                }
            });
            const uniqueTxns = Array.from(uniqueTxnsMap.values());

            // Map DB Schema -> App Legacy Schema
            const mappedTransactions = uniqueTxns.map(t => ({
                id: t.id,
                parsedDate: t.date,
                createdAt: t.created_at, // Pass timestamp
                parsedAmount: Number(t.amount),
                parsedType: t.payment_mode, // [FIX] Trust DB value (includes 'ProfitSummary')
                originalDesc: t.item_name || 'Item',
                name: t.item_name, // [FIX] Map name for Dashboard
                profit: Number(t.profit || 0), // [FIX] Map Profit
                customerName: t.customer_name,
                invoiceNo: t.invoice_no,
                parsedQty: Number(t.quantity || 1)
            }));

            // Deduplication Logic



            // Split Production Logs
            const newProdData = { stockIn: [], preProduction: [], postProduction: [] };
            allLogs.forEach(log => {
                // [STAGE 3D] Filter approved soft-deleted records from operational state
                if (log.status === 'approved_deleted') return;
                const entry = { id: log.id, date: log.date, createdAt: log.created_at, material: log.material, weight: Number(log.weight), source: 'Database', status: log.status || 'active' };
                if (log.type === 'stock_in') newProdData.stockIn.push(entry);
                else if (log.type === 'usage') newProdData.preProduction.push(entry);
                else if (log.type === 'production') newProdData.postProduction.push(entry);
            });

            // Update State (Using functional update to prevent key loss)
            setData(prev => ({
                ...prev,
                transactions: mappedTransactions,
                attendance: allAttendance,
                itemMaster: allItemMaster
            }));
            setProductionData(newProdData);
            setPurchaseData(mappedTransactions.filter(t => t.parsedType === 'Expense' || t.parsedType === 'Purchase'));
            setSupplierPayments(mappedTransactions.filter(t => t.parsedType === 'Supplier_Payment'));

        } catch (error) {
            console.error("Supabase Load Error:", error);
            setDebugError("Load Error: " + (error.message || JSON.stringify(error)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("App Version: 2026-01-01 Force Update V2");
        loadData();
    }, []);

    const handleAppendData = (newData) => {
        // ... (Keep existing logic if needed, but DB is primary now)
        // For visual append only
        setData(prev => ({
            ...prev,
            transactions: [...prev.transactions, ...(newData.transactions || [])]
        }));
    };

    const handleProductionData = (pData) => {
        setProductionData(prev => ({
            stockIn: [...prev.stockIn, ...pData.stockIn],
            preProduction: [...prev.preProduction, ...pData.preProduction],
            postProduction: [...prev.postProduction, ...pData.postProduction]
        }));
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/sync');
            const result = await res.json();
            if (result.success) {
                alert(`Sync Complete! ${result.count} files updated.`);
                await loadData();
            } else {
                alert(`Sync Failed: ${result.message}`);
            }
        } catch (error) {
            console.error(error);
            alert("Error calling sync API.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Dashboard
            data={data}
            productionData={productionData}
            onReset={() => { }} // No-op for now as we pull from DB
            onRefresh={loadData}
            onAppendData={handleAppendData}
            onProductionData={handleProductionData}
            purchaseData={purchaseData}
            supplierPayments={supplierPayments}
            onSync={handleSync}
            isSyncing={isSyncing}
            debugError={debugError}
            isAdmin={role === 'admin'}
            loading={loading}
        />
    );
};

const App = () => {
    console.log("App Component Reloaded - Debug Check");
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <ErrorBoundary>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute adminOnly={true}>
                                        <AdminPanel />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/rnd"
                                element={
                                    <ProtectedRoute adminOnly={true}>
                                        <RnDDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/attendance"
                                element={
                                    <ProtectedRoute attendanceOnly={true}>
                                        <AttendancePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute dashboardOnly={true}>
                                        <DashboardLayout />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </ErrorBoundary>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
