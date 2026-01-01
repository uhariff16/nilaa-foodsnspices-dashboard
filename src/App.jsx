import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AdminUpload from './components/AdminUpload';
import Login from './components/Login';
import { supabase } from './lib/supabaseClient';
import { AuthProvider, useAuth } from './context/AuthContext';

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
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, role, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>Authenticating...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && role !== 'admin') {
        return <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '1.25rem' }}>Access Denied: Admins Only</div>;
    }

    return children;
};

// Main App Logic (Dashboard + Data Loading)
const DashboardLayout = () => {
    const [data, setData] = useState({ transactions: [], items: [], customers: [] });
    const [productionData, setProductionData] = useState({ stockIn: [], preProduction: [], postProduction: [] });
    const [purchaseData, setPurchaseData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [debugError, setDebugError] = useState(null);
    const location = useLocation();

    // Check if ?admin param exists (Legacy support or explicit override)
    // But now we prefer /admin route. We will support both for now.
    const isAdminParam = location.search.includes('admin');
    const { role } = useAuth();

    // If user requests admin via URL param but isn't admin role, show error?
    // Or just let the ProtectedRoute handle the /admin path.
    // Let's rely on the Route for AdminUpload.

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

            // Map DB Schema -> App Legacy Schema
            const mappedTransactions = allTxns.map(t => ({
                id: t.id,
                parsedDate: t.date,
                parsedAmount: Number(t.amount),
                parsedType: t.payment_mode === 'Expense' ? 'Expense' : 'Sales',
                originalDesc: t.item_name || 'Item',
                invoiceNo: t.invoice_no
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
                parsedDate: c.date
            }));

            // Split logs
            const newProdData = { stockIn: [], preProduction: [], postProduction: [] };
            allLogs.forEach(log => {
                const entry = { id: log.id, date: log.date, material: log.material, weight: Number(log.weight), source: 'Database' };
                if (log.type === 'stock_in') newProdData.stockIn.push(entry);
                else if (log.type === 'usage') newProdData.preProduction.push(entry);
                else if (log.type === 'production') newProdData.postProduction.push(entry);
            });

            // Update State
            setData(prev => ({ ...prev, transactions: mappedTransactions, customers: mappedCustomers }));
            setProductionData(newProdData);
            setPurchaseData(mappedTransactions.filter(t => t.parsedType === 'Expense'));

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
        />
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <ErrorBoundary>
                    <Routes>
                        <Route path="/login" element={<Navigate to="/" replace />} />
                        <Route path="/admin" element={<AdminUpload />} />
                        <Route path="/" element={<DashboardLayout />} />
                    </Routes>
                </ErrorBoundary>
            </Router>
        </AuthProvider>
    );
}

export default App;
