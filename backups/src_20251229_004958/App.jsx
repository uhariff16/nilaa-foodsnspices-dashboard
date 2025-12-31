import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';

// Import parsers
import { parseExcelFile } from './utils/excelParser';
import { parseProductionFile } from './utils/productionParser';
import { parsePurchaseFile } from './utils/purchaseParser';

function App() {
    const [data, setData] = useState({ transactions: [], items: [], customers: [] });
    const [productionData, setProductionData] = useState({ stockIn: [], preProduction: [], postProduction: [] });
    const [purchaseData, setPurchaseData] = useState([]);
    const [loading, setLoading] = useState(true);

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
            // Glob all xlsx/xls files in src/data AND subdirectories
            // The ** pattern matches any number of subdirectories
            const dataFiles = import.meta.glob('/src/data/**/*.{xlsx,xls}', { as: 'url', eager: true });
            const urls = Object.values(dataFiles);

            if (urls.length > 0) {
                console.log("Found auto-load files:", urls);

                const filePromises = urls.map(async (url) => {
                    // Cache-busting to ensure we get fresh content if file changed
                    const fetchUrl = `${url}?t=${new Date().getTime()}`;
                    const response = await fetch(fetchUrl);
                    const blob = await response.blob();
                    // Extract filename from URL (decodeURI in case of spaces)
                    const fileName = decodeURIComponent(url.split('/').pop());
                    return new File([blob], fileName, {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                });

                const files = await Promise.all(filePromises);

                // Process parsers independently so one failure doesn't block the other

                // 1. Try passing to Production Parser
                try {
                    const pData = await parseProductionFile(files);
                    if (pData.stockIn.length > 0 || pData.preProduction.length > 0 || pData.postProduction.length > 0) {
                        setProductionData(prev => ({
                            stockIn: pData.stockIn, // Replace or Append? User implies "Refresh" -> typically Replace for auto-load to avoid dupes?
                            // Wait, previous logic was APPEND logic (prev => [...prev, ...new]). 
                            // If we strictly "Refresh", we should probably overwrite the *auto-loaded* part.
                            // But `productionData` mixes manual and auto. 
                            // For now, let's Stick to "Reload" = "Reset then Load" effectively.
                            // Or simpler: The user wants to pull latest. If I append, I get duplicates every time they click refresh.
                            // I MUST Reset state before loading in this function if it's a "Refresh".
                            preProduction: pData.preProduction,
                            postProduction: pData.postProduction
                        }));
                    }
                } catch (err) {
                    console.warn("Production parser skipped some files or encountered an error:", err);
                }

                // 2. Try passing to Purchase Parser
                try {
                    const pPurchases = await parsePurchaseFile(files);
                    if (pPurchases.length > 0) {
                        setPurchaseData(pPurchases);
                    }
                } catch (err) {
                    console.warn("Purchase parser skipped some files:", err);
                }

                // 3. Try passing to Excel/Sales Parser
                try {
                    const eData = await parseExcelFile(files);
                    if (eData.transactions.length > 0 || eData.items.length > 0 || eData.customers.length > 0) {
                        setData({
                            transactions: eData.transactions || [],
                            items: eData.items || [],
                            customers: eData.customers || []
                        });
                    }
                } catch (err) {
                    console.warn("Excel parser skipped some files or encountered an error:", err);
                }
            }
        } catch (error) {
            console.error("Critical error loading files:", error);
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
            return {
                transactions: [...prevData.transactions, ...(newData.transactions || [])],
                items: [...prevData.items, ...(newData.items || [])],
                customers: [...prevData.customers, ...(newData.customers || [])],
            };
        });
    };

    const handleProductionData = (pData) => {
        setProductionData(prev => ({
            stockIn: [...prev.stockIn, ...pData.stockIn],
            preProduction: [...prev.preProduction, ...pData.preProduction],
            postProduction: [...prev.postProduction, ...pData.postProduction]
        }));
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
                    />
                )}
            </ErrorBoundary>
        </div>
    );
}

export default App;
