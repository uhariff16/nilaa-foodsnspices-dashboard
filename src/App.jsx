import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AdminUpload from './components/AdminUpload'; // Import Admin Page
import { supabase } from './lib/supabaseClient'; // Import Supabase Client

// Legacy Parsers (Optional - can be removed later)
// import { parseExcelFile } from './utils/excelParser';
// import { parseProductionFile } from './utils/productionParser'; 


function App() {
    // Basic Routing: Check if URL has ?admin
    const isAdmin = window.location.search.includes('admin');

    if (isAdmin) {
        return <AdminUpload />;
    }

    const [data, setData] = useState({ transactions: [], items: [], customers: [] });
    const [productionData, setProductionData] = useState({ stockIn: [], preProduction: [], postProduction: [] });
    const [purchaseData, setPurchaseData] = useState([]);
    const [summaryData, setSummaryData] = useState([]); // New State
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Auto-load files from src/data
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

    const loadData = async () => {
        setLoading(true);
        try {
            console.log("Fetching data from Supabase DB...");

            // 1. Fetch Sales (Transactions) - Increase limit to handle history
            const { data: dbTxns, error: txnError } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false })
                .range(0, 9999); // Fetch up to 10k rows to bypass default 1000 limit

            if (txnError) {
                console.error("Error fetching transactions:", txnError);
                throw txnError;
            }

            // Map DB Schema -> App Legacy Schema
            const mappedTransactions = (dbTxns || []).map(t => ({
                id: t.id,
                parsedDate: t.date,
                parsedAmount: Number(t.amount),
                parsedType: t.payment_mode === 'Expense' ? 'Expense' : 'Sales',
                originalDesc: t.item_name || 'Item',
                invoiceNo: t.invoice_no
            }));

            // 2. Fetch Stock (Production Logs)
            const { data: dbLogs, error: logError } = await supabase
                .from('production_logs')
                .select('*')
                .order('date', { ascending: true })
                .range(0, 9999); // Fix 1000 row limit for production logs too

            if (logError) {
                console.error("Error fetching logs:", logError);
                throw logError;
            }

            // Split into categories
            const newProdData = {
                stockIn: [],
                preProduction: [],
                postProduction: []
            };

            (dbLogs || []).forEach(log => {
                const entry = {
                    id: log.id,
                    date: log.date,
                    material: log.material,
                    weight: Number(log.weight),
                    source: 'Database'
                };
                if (log.type === 'stock_in') newProdData.stockIn.push(entry);
                else if (log.type === 'usage') newProdData.preProduction.push(entry);
                else if (log.type === 'production') newProdData.postProduction.push(entry);
            });

            // 3. Update State
            setData(prev => ({
                ...prev,
                transactions: mappedTransactions,
                items: [],
                customers: []
            }));

            setProductionData(newProdData);

            // Populate purchaseData from Expense Transactions (Legacy Support)
            const purchaseFromExpenses = mappedTransactions.filter(t => t.parsedType === 'Expense');
            setPurchaseData(purchaseFromExpenses);

            console.log(`Loaded ${mappedTransactions.length} transactions and ${dbLogs.length} logs from DB.`);

        } catch (error) {
            console.error("Supabase Load Error:", error);
            // alert("Failed to load data from database. Check console details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAppendData = (newData) => {
        setData(prevData => {
            if (!prevData) return newData;

            const existingTxnIds = new Set(prevData.transactions.map(t => t.id).filter(Boolean));
            const existingItemIds = new Set(prevData.items.map(i => i.id).filter(Boolean));
            const existingCustIds = new Set(prevData.customers.map(c => c.id).filter(Boolean));

            const uniqueTxns = (newData.transactions || []).filter(t => !t.id || !existingTxnIds.has(t.id));
            const uniqueItems = (newData.items || []).filter(i => !i.id || !existingItemIds.has(i.id));
            const uniqueCusts = (newData.customers || []).filter(c => !c.id || !existingCustIds.has(c.id));

            console.log(`Deduped: Skipped ${newData.transactions.length - uniqueTxns.length} duplicate transactions.`);

            return {
                transactions: [...prevData.transactions, ...uniqueTxns],
                items: [...prevData.items, ...uniqueItems],
                customers: [...prevData.customers, ...uniqueCusts],
            };
        });
    };

    const handleProductionData = (pData) => {
        // Simple dedupe for production based on composite key (Date + Material + Weight + Source)
        // Since we didn't add IDs to production parser yet, we use content hashing
        const createHash = (item) => `${item.date || ''}-${item.material || item.item || ''}-${item.weight || item.qty || ''}`;

        setProductionData(prev => {
            const existingStockIn = new Set(prev.stockIn.map(createHash));
            const existingPre = new Set(prev.preProduction.map(createHash));
            const existingPost = new Set(prev.postProduction.map(createHash));

            const newStockIn = pData.stockIn.filter(i => !existingStockIn.has(createHash(i)));
            const newPre = pData.preProduction.filter(i => !existingPre.has(createHash(i)));
            const newPost = pData.postProduction.filter(i => !existingPost.has(createHash(i)));

            return {
                stockIn: [...prev.stockIn, ...newStockIn],
                preProduction: [...prev.preProduction, ...newPre],
                postProduction: [...prev.postProduction, ...newPost]
            };
        });
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/sync');
            const result = await res.json();
            if (result.success) {
                console.log(`Sync successful. Files updated: ${result.count}`);
                alert(`Sync Complete! ${result.count} files updated.`);
                // Reload data after sync
                await loadData();
            } else {
                console.error("Sync failed:", result.message);
                alert(`Sync Failed: ${result.message}`);
            }
        } catch (error) {
            console.error("Error calling sync API:", error);
            alert("Error calling sync API. Make sure the dev server is running.");
        } finally {
            setIsSyncing(false);
        }
    };

    // Show loading or Dashboard if data exists (either from auto-load or manual upload later)
    // Note: If auto-load finds nothing, we still want to show FileUpload or empty Dashboard?
    // Current logic: !data shows FileUpload. "data" is initialized with empty arrays, so we need to check if it's "populated".
    // Actually, the original code initialized data with { ...: [] }, so '!data' check on line 30 was likely checking if it was null? 
    // Wait, line 6: useState({ ... }). Truthy.
    // Line 30: {!data ? ...}. Since data is essentially always truthy object, it might have been flawed or I misread.
    // Let's assume we want to show Dashboard if we have ANY data, or FileUpload if empty?
    // Actually, the user might want to start fresh.
    // Let's keep the existing structure but maybe hide FileUpload if we found something?
    // Original code: `const [data, setData] = useState({ ... })`. `!data` is false. So it ALWAYS showed Dashboard?
    // Ah, wait. checking previous `view_file` of App.jsx:
    // `const [data, setData] = useState({ transactions: [], ... });`
    // `{!data ? ... : ...}`
    // Since `data` is an object, `!data` is false. So it immediately rendered `Dashboard`.
    // The `FileUpload` component was likely never shown unless `setData(null)` was called?
    // Or maybe originally it was `useState(null)`.
    // Let's look at `App.jsx` again from step 542.
    // Line 6: `const [data, setData] = useState({ transactions: [], ... });`
    // Line 30: `{!data ? (`
    // Yes, this defaults to showing the Dashboard immediately with empty data.
    // So my changes just populate that data.

    return (
        <div className="container">
            <ErrorBoundary>
                {/* Use a simple check: if loading, show a loader? Or just render. */}
                {/* If we want to show FileUpload initially if NO data is found, we can check lengths. */}

                {(!data.transactions.length && !productionData.stockIn.length && !loading) ? (
                    /* Only show FileUpload if NOT loading AND effectively empty? 
                       Actually, Dashboard has "Add Files" buttons too. 
                       Let's stick to the original behavior (always showing Dashboard) 
                       unless the user specifically implemented a landing page.
                       However, looking at the code, it seems it MIGHT have been intended to be null initially?
                       But the code I read had explicit empty arrays.
                       I will preserve the structure. */
                    <FileUpload onDataLoaded={setData} onProductionLoaded={setProductionData} />
                ) : (
                    <Dashboard
                        data={data}
                        productionData={productionData}
                        onReset={() => {
                            setData({ transactions: [], items: [], customers: [] });
                            setProductionData({ stockIn: [], preProduction: [], postProduction: [] });
                            setPurchaseData([]);
                        }}
                        onRefresh={loadData}
                        onAppendData={handleAppendData}
                        onProductionData={handleProductionData}
                        purchaseData={purchaseData}
                        onSync={handleSync}
                        isSyncing={isSyncing}
                    />
                )}
            </ErrorBoundary>
        </div>
    );
}

export default App;
