import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/admin/AdminPanel';
import Login from './components/Login';
import AttendancePage from './components/AttendancePage';
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
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.5rem' }}>Access Denied: Admins Only</div>
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
    const [data, setData] = useState({ transactions: [], items: [], customers: [], receivables: [], attendance: [] });
    const [productionData, setProductionData] = useState({ stockIn: [], preProduction: [], postProduction: [] });
    const [purchaseData, setPurchaseData] = useState([]);
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

    const loadData = async () => {
        console.log("Starting loadData...");
        setLoading(true);
        try {
            console.log("Fetching data from Supabase DB...");
            const batchSize = 1000;

            // 1. Fetch Transactions
            let allTxns = [];
            let tFrom = 0;
            while (true) {
                const { data, error } = await supabase.from('transactions')
                    .select('*').order('date', { ascending: false }).range(tFrom, tFrom + batchSize - 1);
                if (error) throw error;
                allTxns = [...allTxns, ...data];
                if (data.length < batchSize) break;
                tFrom += batchSize;
            }

            // Deduplication Logic
            const uniqueTxnsMap = new Map();
            allTxns.forEach(t => {
                // [FIX] Deduplication Strategy - Content Based
                // We ignore the DB ID for unique check because re-uploads might generate new IDs for the same data.
                // We create a composite key from the business data fields.
                // Including item_name in the key ensures that different types of expenses (e.g., Water vs Salary) on the same day with the same amount aren't merged.
                const key = `${t.date}-${t.invoice_no}-${Number(t.amount).toFixed(2)}-${Number(t.quantity || 0)}-${t.customer_name}-${t.item_name}`;

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

            // 2. Fetch Production Logs
            let allLogs = [];
            let pFrom = 0;
            while (true) {
                const { data, error } = await supabase.from('production_logs')
                    .select('*').order('date', { ascending: true }).range(pFrom, pFrom + batchSize - 1);
                if (error) throw error;
                allLogs = [...allLogs, ...data];
                if (data.length < batchSize) break;
                pFrom += batchSize;
            }

            // 3. Fetch Customer Stats
            let allCusts = [];
            let cFrom = 0;
            while (true) {
                const { data, error } = await supabase.from('customer_stats')
                    .select('*').order('date', { ascending: true }).range(cFrom, cFrom + batchSize - 1);
                if (error) { console.error("Error fetching customers:", error); break; }
                allCusts = [...allCusts, ...data];
                if (data.length < batchSize) break;
                cFrom += batchSize;
            }

            const mappedCustomers = allCusts.map(c => ({
                id: c.id,
                name: c.customer_name,
                revenue: Number(c.revenue),
                profit: Number(c.profit),
                parsedDate: c.date,
                date: c.date,
                createdAt: c.created_at // Pass timestamp
            }));

            // 4. Fetch Attendance Data
            let allAttendance = [];
            try {
                let aFrom = 0;
                while (true) {
                    const { data: aData, error: aError } = await supabase.from('employee_attendance')
                        .select('*').order('date', { ascending: false }).range(aFrom, aFrom + batchSize - 1);
                    if (aError) break;
                    allAttendance = [...allAttendance, ...aData];
                    if (aData.length < batchSize) break;
                    aFrom += batchSize;
                }
            } catch (e) {
                console.warn("employee_attendance table might be empty or missing:", e);
            }

            // 5. Fetch Customer Receivables (Provision)
            let allReceivables = [];
            try {
                const { data: recData, error: recError } = await supabase.from('customer_receivables').select('*');
                if (!recError && recData) {
                    allReceivables = recData;
                }
            } catch (e) {
                console.warn("Receivables table might not exist yet:", e);
            }

            // Split logs
            const newProdData = { stockIn: [], preProduction: [], postProduction: [] };
            allLogs.forEach(log => {
                const entry = { id: log.id, date: log.date, createdAt: log.created_at, material: log.material, weight: Number(log.weight), source: 'Database' };
                if (log.type === 'stock_in') newProdData.stockIn.push(entry);
                else if (log.type === 'usage') newProdData.preProduction.push(entry);
                else if (log.type === 'production') newProdData.postProduction.push(entry);
            });

            // 6. Fetch Item Master
            let allItemMaster = [];
            try {
                const { data: imData, error: imError } = await supabase.from('item_master').select('*');
                if (!imError && imData) {
                    allItemMaster = imData;
                }
            } catch (e) {
                console.warn("item_master table might not exist yet:", e);
            }

            // Update State
            setData(prev => ({
                ...prev,
                transactions: mappedTransactions,
                customers: mappedCustomers,
                receivables: allReceivables,
                attendance: allAttendance, // [NEW] Pass attendance to Dashboard
                itemMaster: allItemMaster // [NEW] Pass Item Master to Dashboard
            }));
            setProductionData(newProdData);
            setPurchaseData(mappedTransactions.filter(t => t.parsedType === 'Expense' || t.parsedType === 'Purchase'));

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
            transactions: [...prev.transactions, ...(newData.transactions || [])],
            customers: [...prev.customers, ...(newData.customers || [])]
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
            onSync={handleSync}
            isSyncing={isSyncing}
            debugError={debugError}
            isAdmin={role === 'admin'}
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
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute adminOnly={true}>
                                        <AdminPanel />
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
