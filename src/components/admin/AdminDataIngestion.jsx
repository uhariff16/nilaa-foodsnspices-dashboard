import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseExcelFile } from '../../utils/excelParser';
import { parseProductionFile } from '../../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers, RefreshCw, FileSpreadsheet, CloudLightning, FolderInput, File, PlayCircle, StopCircle, Radio, X, Users, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminDataIngestion = () => {
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [loading, setLoading] = useState(false);
    const [dbReport, setDbReport] = useState(null);
    const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'folder'

    const [salesFile, setSalesFile] = useState(null);
    const [productionFile, setProductionFile] = useState(null);

    const [isWatching, setIsWatching] = useState(false);
    const [watcherHandle, setWatcherHandle] = useState(null);
    const [watchLogs, setWatchLogs] = useState([]);

    const salesFileRef = useRef(null);
    const prodFileRef = useRef(null);
    const prodFolderRef = useRef(null);
    const watcherIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (watcherIntervalRef.current) clearInterval(watcherIntervalRef.current);
        };
    }, []);

    const checkDbStatus = async () => {
        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        try {
            const { count: txCount, error: txError } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
            const { count: custCount, error: cError } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).not('customer_name', 'is', null);
            const { count: plCount, error: plError } = await supabase.from('production_logs').select('*', { count: 'exact', head: true });

            if (txError) throw txError;
            if (plError) throw plError;

            setDbReport({ transactions: txCount, production: plCount, customers: custCount || 0 });
            setStatus({ type: 'success', message: "Database connection healthy." });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: "DB Connection Failed: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'sales') setSalesFile(file);
        if (type === 'production') setProductionFile(file);
        e.target.value = null;
        setStatus({ type: 'idle', message: '' });
    };

    const [testReport, setTestReport] = useState(null);

    const analyzeFile = async () => {
        const file = salesFile || productionFile;
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'idle', message: 'Analyzing file structure...' });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                let parserResult;
                let counts = {};

                if (salesFile) {
                    const res = await parseExcelFile([file]);
                    parserResult = res;
                    counts = { transactions: res.transactions.length, customers: res.customers.length, items: res.items.length };
                } else {
                    const res = await parseProductionFile([file]);
                    parserResult = res;
                    counts = { stockIn: res.stockIn.length, preProd: res.preProduction.length, postProd: res.postProduction.length };
                }

                setTestReport({
                    fileName: file.name,
                    sheetName: sheetName,
                    previewRows: jsonData.slice(0, 15),
                    parserDebug: parserResult.debugLog || ["No debug log returned"],
                    parsedCounts: counts
                });
                setStatus({ type: 'success', message: 'Analysis Complete. Check Debug Report below.' });
                setLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            setStatus({ type: 'error', message: 'Analysis Failed: ' + err.message });
            setLoading(false);
        }
    };


    const executeUpload = async (type) => {
        const file = type === 'sales' ? salesFile : productionFile;
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'idle', message: `Processing ${file.name}...` });

        try {
            let data = [];
            if (type === 'sales') {
                const result = await parseExcelFile([file]);
                data = result.transactions || [];
                const totalParsed = data.reduce((sum, t) => sum + (t.parsedAmount || 0), 0);
                alert(`Parser Verification:\nFound ${data.length} transactions.\nTotal Sales Amount: ${totalParsed.toFixed(2)}\n\nIf this matches your file, the upload is correct.`);

                if (!data || data.length === 0) throw new Error("No valid transactions found in file.");

                const formattedData = data.map(record => ({
                    date: record.parsedDate,
                    amount: record.parsedAmount,
                    payment_mode: record.parsedType,
                    item_name: record.originalDesc,
                    customer_name: record.customerName,
                    invoice_no: record.invoiceNo,
                    quantity: record.parsedQty || 1,
                    profit: record.parsedProfit || 0
                })).filter(r => r.date && r.amount && r.item_name);

                if (formattedData.length === 0) {
                    const debugInfo = result.debugLog ? result.debugLog.join('\n') : 'No debug info available.';
                    throw new Error(`No valid records found after filtering.\n\nDebug Info:\n${debugInfo}`);
                }

                const { error } = await supabase.from('transactions').insert(formattedData);
                if (error) throw error;

                const customerData = result.customers || [];
                if (customerData.length > 0) {
                    const mappedCustomers = customerData.map(c => ({
                        customer_name: c.name,
                        revenue: c.revenue,
                        profit: c.profit,
                        date: c.parsedDate
                    }));
                    const { error: custError } = await supabase.from('customer_stats').insert(mappedCustomers);
                    if (custError) {
                        console.error("Customer Stats Insert Error:", custError);
                        alert("Warning: Transactions saved, but Customer Profit data failed to save: " + custError.message);
                    }
                }
            } else if (type === 'production') {
                data = await parseProductionFile([file]);
                if (data.preProduction.length === 0) {
                    const debugInfo = data.debugLog ? data.debugLog.join('\n') : 'No debug info';
                    throw new Error(`DEBUG MODE: Stock-in found (${data.stockIn.length}), but Pre-Production is empty.\n\nDebug Info:\n${debugInfo}`);
                }
                if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) throw new Error("No valid production logs found.");

                const allDates = [...data.stockIn.map(d => d.date), ...data.preProduction.map(d => d.date), ...data.postProduction.map(d => d.date)].filter(d => d).sort();
                if (allDates.length === 0) throw new Error("No dates found in data.");
                const minDate = allDates[0];
                const maxDate = allDates[allDates.length - 1];

                const { data: existingLogs, error: fetchError } = await supabase
                    .from('production_logs')
                    .select('date, material, weight, type')
                    .gte('date', minDate)
                    .lte('date', maxDate);

                if (fetchError) throw new Error("Dedup Check Error: " + fetchError.message);

                const createSig = (d) => `${d.date}|${String(d.material).trim().toLowerCase()}|${Number(d.weight).toFixed(2)}|${d.type}`;
                const existingSet = new Set(existingLogs.map(createSig));

                const filterNew = (items, type) => {
                    return items
                        .map(i => ({ ...i, type }))
                        .filter(i => {
                            const sig = createSig(i);
                            return !existingSet.has(sig);
                        })
                        .map(({ id, source_sheet, ...rest }) => rest);
                };

                const newStockIn = filterNew(data.stockIn, 'stock_in');
                const newPreProd = filterNew(data.preProduction, 'usage');
                const newPostProd = filterNew(data.postProduction, 'production');
                const totalNew = newStockIn.length + newPreProd.length + newPostProd.length;

                if (totalNew === 0) {
                    setStatus({ type: 'success', message: `Upload Skipped: All ${allDates.length} records already exist.` });
                    setLoading(false);
                    return;
                }

                if (newStockIn.length) await supabase.from('production_logs').insert(newStockIn);
                if (newPreProd.length) await supabase.from('production_logs').insert(newPreProd);
                if (newPostProd.length) await supabase.from('production_logs').insert(newPostProd);

                let successMsg = `Synced ${file.name}. Added ${totalNew} new records.`;
                if (type === 'production') {
                    successMsg += ` (Stock-In: ${newStockIn.length}, Pre-Prod: ${newPreProd.length}, Post-Prod: ${newPostProd.length})`;
                }
                setStatus({ type: 'success', message: successMsg });
            }

            if (type === 'sales') {
                setSalesFile(null);
                setStatus({ type: 'success', message: `Successfully uploaded ${file.name}` });
            }
            if (type === 'production') setProductionFile(null);
            checkDbStatus();

        } catch (error) {
            console.error("Upload Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };


    const handleFolderUpload = async (e, type) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;
        setLoading(true);
        setStatus({ type: 'idle', message: 'Scanning directory...' });

        const excelFiles = files.filter(f => (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) && !f.name.startsWith('~$'));
        if (excelFiles.length === 0) {
            setStatus({ type: 'error', message: "No Excel files found in selected folder." });
            setLoading(false);
            return;
        }
        setStatus({ type: 'idle', message: `Processing ${excelFiles.length} files...` });

        try {
            if (type === 'production') {
                const data = await parseProductionFile(excelFiles);
                if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) {
                    throw new Error("No valid production logs found in any file.");
                }

                const allDates = [...data.stockIn.map(d => d.date), ...data.preProduction.map(d => d.date), ...data.postProduction.map(d => d.date)].filter(d => d).sort();
                if (allDates.length === 0) throw new Error("No dates found in batch data.");
                const minDate = allDates[0];
                const maxDate = allDates[allDates.length - 1];

                const { data: existingLogs, error: fetchError } = await supabase
                    .from('production_logs')
                    .select('date, material, weight, type')
                    .gte('date', minDate)
                    .lte('date', maxDate);

                if (fetchError) throw new Error("Dedup Check Error: " + fetchError.message);

                const createSig = (d) => `${d.date}|${String(d.material).trim().toLowerCase()}|${Number(d.weight).toFixed(2)}|${d.type}`;
                const existingSet = new Set(existingLogs.map(createSig));

                const filterNew = (items, type) => {
                    return items
                        .map(i => ({ ...i, type }))
                        .filter(i => {
                            const sig = createSig(i);
                            return !existingSet.has(sig);
                        })
                        .map(({ id, source_sheet, source_file, ...rest }) => rest);
                };

                const newStockIn = filterNew(data.stockIn, 'stock_in');
                const newPreProd = filterNew(data.preProduction, 'usage');
                const newPostProd = filterNew(data.postProduction, 'production');
                const totalNew = newStockIn.length + newPreProd.length + newPostProd.length;

                if (totalNew === 0) {
                    setStatus({ type: 'success', message: `Batch Skipped: All ${allDates.length} records in these ${excelFiles.length} files already exist.` });
                    setLoading(false);
                    return;
                }

                if (newStockIn.length) await supabase.from('production_logs').insert(newStockIn);
                if (newPreProd.length) await supabase.from('production_logs').insert(newPreProd);
                if (newPostProd.length) await supabase.from('production_logs').insert(newPostProd);

                setStatus({
                    type: 'success',
                    message: `Batch Sync Complete. Added ${totalNew} new records from ${excelFiles.length} files.`
                });

            } else if (type === 'sales') {
                const result = await parseExcelFile(excelFiles);
                const data = result.transactions || [];
                if (data.length === 0) throw new Error("No valid transactions found in batch.");
                const formattedData = data.map(record => ({
                    date: record.parsedDate,
                    amount: record.parsedAmount,
                    payment_mode: record.parsedType,
                    item_name: record.originalDesc,
                    invoice_no: record.invoiceNo,
                    quantity: record.parsedQty || 1
                })).filter(r => r.date && r.amount && r.item_name);

                if (formattedData.length === 0) throw new Error("No valid records found after filtering.");
                const { error } = await supabase.from('transactions').insert(formattedData);
                if (error) throw error;
                setStatus({ type: 'success', message: `Batch Upload Complete. Uploaded ${formattedData.length} transactions from ${excelFiles.length} files.` });
            }
            checkDbStatus();
            if (prodFolderRef.current) prodFolderRef.current.value = "";
        } catch (err) {
            console.error("Batch Upload Error:", err);
            setStatus({ type: 'error', message: "Batch Failed: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    const startWatcher = async () => {
        try {
            const handle = await window.showDirectoryPicker();
            setWatcherHandle(handle);
            setIsWatching(true);
            setWatchLogs(prev => [`Started watching: ${handle.name}`, ...prev]);
            watcherIntervalRef.current = setInterval(async () => { await scanFolder(handle); }, 60000);
            await scanFolder(handle);
        } catch (err) {
            setStatus({ type: 'error', message: "Could not start watcher: " + err.message });
        }
    };

    const stopWatcher = () => {
        if (watcherIntervalRef.current) clearInterval(watcherIntervalRef.current);
        setIsWatching(false);
        setWatcherHandle(null);
        setWatchLogs(prev => [`Stopped watcher.`, ...prev]);
    };

    const scanFolder = async (handle) => {
        try {
            setWatchLogs(prev => [`Scanning...`, ...prev]);
            const { data: processed, error } = await supabase.from('production_logs').select('source_file');
            if (error) throw error;
            const processedSet = new Set(processed.map(p => p.source_file));

            for await (const entry of handle.values()) {
                if (entry.kind === 'file' && (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls')) && !entry.name.startsWith('~$')) {
                    if (processedSet.has(entry.name)) continue;

                    setWatchLogs(prev => [`New file detected: ${entry.name}`, ...prev]);
                    const file = await entry.getFile();
                    const data = await parseProductionFile([file]);

                    let inserted = 0;
                    if (data.stockIn.length) { await supabase.from('production_logs').insert(data.stockIn.map(d => ({ ...d, type: 'stock_in' }))); inserted++; }
                    if (data.preProduction.length) { await supabase.from('production_logs').insert(data.preProduction.map(d => ({ ...d, type: 'usage' }))); inserted++; }
                    if (data.postProduction.length) { await supabase.from('production_logs').insert(data.postProduction.map(d => ({ ...d, type: 'production' }))); inserted++; }

                    if (inserted > 0) setWatchLogs(prev => [`✅ Uploaded: ${entry.name}`, ...prev]);
                    else setWatchLogs(prev => [`⚠️ Empty/Invalid: ${entry.name}`, ...prev]);
                }
            }
            checkDbStatus();
        } catch (err) {
            setWatchLogs(prev => [`❌ Scan Error: ${err.message}`, ...prev]);
        }
    };

    return (
        <div className="admin-wrapper">

            {/* Header Area */}
            <div className="admin-header">
                <div className="flex-center" style={{ marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'inline-flex' }}>
                        <Database color="#3b82f6" size={32} />
                    </div>
                </div>
                <h2 className="admin-title">Data Ingestion</h2>
                <p className="admin-subtitle">Upload sales records and production logs to populate your dashboard.</p>

                {/* Global Controls */}
                <div className="flex-center" style={{ marginTop: '1.5rem' }}>
                    <div className="btn-toggle-group">
                        <button onClick={() => setUploadMode('file')} disabled={isWatching} className={`btn-toggle ${uploadMode === 'file' ? 'active blue' : ''}`}>
                            <File size={16} /> Single File
                        </button>
                        <button onClick={() => setUploadMode('folder')} className={`btn-toggle ${uploadMode === 'folder' ? 'active blue' : ''}`}>
                            <FolderInput size={16} /> Folder Mode
                        </button>
                    </div>
                </div>
            </div>

            {/* Status Cards */}
            {dbReport && (
                <div className="stat-grid animate-fade-in">
                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{dbReport.transactions.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Transactions</p>
                    </div>

                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{dbReport.customers.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#d8b4fe', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Customers</p>
                    </div>

                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{dbReport.production.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Production Logs</p>
                    </div>
                </div>
            )}

            {/* Upload Areas */}
            <div className="admin-grid">

                {/* Sales Upload */}
                <div className={`upload-card sales group ${isWatching ? 'style={{ opacity: 0.3, pointerEvents: "none", filter: "grayscale(1)" }}' : ''}`}>
                    <div className="upload-icon-box icon-sales">
                        {uploadMode === 'file' ? <CloudLightning size={32} /> : <FolderInput size={32} />}
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Sales & Expenses</h3>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Parses Invoicewise Excel Reports</p>
                    </div>

                    {uploadMode === 'file' ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                            {salesFile && (
                                <div style={{ padding: '0.5rem 1rem', background: 'rgba(30, 58, 138, 0.3)', color: '#bfdbfe', fontSize: '0.75rem', borderRadius: '9999px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="animate-fade-in">
                                    <FileSpreadsheet size={12} /> {salesFile.name}
                                    <button onClick={() => setSalesFile(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={12} /></button>
                                </div>
                            )}

                            <div className="file-input-wrapper">
                                <label className="file-label">
                                    <input type="file" ref={salesFileRef} accept=".xlsx, .xls" onChange={(e) => handleFileSelect(e, 'sales')} disabled={loading} className="hidden-input" />
                                    {salesFile ? 'Replace File' : 'Select File'}
                                </label>
                                <button
                                    onClick={() => executeUpload('sales')}
                                    disabled={!salesFile || loading}
                                    className="btn-action btn-sales"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                                    Upload
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Folder Mode Sales */
                        <label style={{ marginTop: '1rem', width: '100%', maxWidth: '200px', cursor: 'pointer' }}>
                            <input type="file" webkitdirectory="" directory="" multiple onChange={(e) => handleFolderUpload(e, 'sales')} disabled={loading} style={{ display: 'none' }} />
                            <div className="btn-action btn-sales" style={{ justifyContent: 'center', width: '100%' }}>
                                <FolderInput size={18} /> Upload Folder
                            </div>
                        </label>
                    )}
                </div>

                {/* Production Upload */}
                <div className={`upload-card production group ${isWatching ? 'watching' : ''}`} style={isWatching ? { borderColor: 'rgba(16, 185, 129, 0.5)', boxShadow: '0 0 40px rgba(16,185,129,0.1)' } : {}}>
                    {/* Live Indicator */}
                    {isWatching && (
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ position: 'relative', display: 'flex', height: '0.75rem', width: '0.75rem' }}>
                                <span style={{ animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', height: '100%', width: '100%', borderRadius: '50%', background: '#34d399', opacity: 0.75 }}></span>
                                <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '0.75rem', width: '0.75rem', background: '#10b981' }}></span>
                            </span>
                            <span style={{ fontSize: '0.625rem', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Sync</span>
                        </div>
                    )}

                    <div className="upload-icon-box icon-prod">
                        {uploadMode === 'file' ? <FileSpreadsheet size={32} /> : <Radio size={32} />}
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Production Logs</h3>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Stock In · Usage · Production Output</p>
                    </div>

                    {uploadMode === 'file' ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                            {productionFile && (
                                <div style={{ padding: '0.5rem 1rem', background: 'rgba(6, 78, 59, 0.3)', color: '#a7f3d0', fontSize: '0.75rem', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="animate-fade-in">
                                    <FileSpreadsheet size={12} /> {productionFile.name}
                                    <button onClick={() => setProductionFile(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={12} /></button>
                                </div>
                            )}

                            <div className="file-input-wrapper">
                                <label className="file-label">
                                    <input type="file" ref={prodFileRef} accept=".xlsx, .xls" onChange={(e) => handleFileSelect(e, 'production')} disabled={loading} className="hidden-input" />
                                    {productionFile ? 'Replace File' : 'Select File'}
                                </label>
                                <button
                                    onClick={() => executeUpload('production')}
                                    disabled={!productionFile || loading}
                                    className="btn-action btn-prod"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                                    Upload
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '200px', marginTop: '1rem' }}>
                            {!isWatching ? (
                                <>
                                    <label className="file-label" style={{ justifyContent: 'center' }}>
                                        <input type="file" ref={prodFolderRef} webkitdirectory="" directory="" multiple onChange={(e) => handleFolderUpload(e, 'production')} disabled={loading} className="hidden-input" />
                                        <FolderInput size={16} /> Scan Once
                                    </label>
                                    <button onClick={startWatcher} className="btn-action btn-prod" style={{ justifyContent: 'center' }}>
                                        <PlayCircle size={16} /> Start Auto-Sync
                                    </button>
                                </>
                            ) : (
                                <button onClick={stopWatcher} className="btn-action" style={{ background: '#ef4444', justifyContent: 'center' }}>
                                    <StopCircle size={16} /> Stop Watching
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Watcher Logs */}
            {isWatching && (
                <div style={{ marginTop: '2rem', width: '100%', maxWidth: '56rem', background: 'rgba(0,0,0,0.4)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', backdropFilter: 'blur(4px)' }} className="animate-fade-in">
                    <h4 style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Radio size={12} /> Live Watcher Logs
                    </h4>
                    <div className="custom-scrollbar" style={{ height: '8rem', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.625rem', color: '#94a3b8' }}>
                        {watchLogs.map((log, i) => (
                            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>{log}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Toast */}
            {status.message && !isWatching && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', zIndex: 50, backdropFilter: 'blur(12px)', border: status.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: status.type === 'error' ? '#fca5a5' : '#6ee7b7' }} className="animate-fade-in">
                    {status.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{status.message}</span>
                </div>
            )}

            {/* DEBUG REPORT UI */}
            {testReport && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#0f172a', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.3)', fontFamily: 'monospace', fontSize: '0.75rem', color: '#cbd5e1', overflow: 'hidden', width: '100%', maxWidth: '56rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>📂 Diagnostic Report: {testReport.fileName}</h3>

                    <div className="stat-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ display: 'block', color: '#64748b', marginBottom: '0.25rem' }}>Stock In</span>
                            <span style={{ fontSize: '1.25rem', color: 'white', fontWeight: 'bold' }}>{testReport.parsedCounts.stockIn}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ display: 'block', color: '#64748b', marginBottom: '0.25rem' }}>Pre-Prod</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: testReport.parsedCounts.preProd === 0 ? '#ef4444' : 'white' }}>{testReport.parsedCounts.preProd}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ display: 'block', color: '#64748b', marginBottom: '0.25rem' }}>Post-Prod</span>
                            <span style={{ fontSize: '1.25rem', color: 'white', fontWeight: 'bold' }}>{testReport.parsedCounts.postProd}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '400px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h4 style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>1. Raw Excel Data (Top 10 Rows)</h4>
                            <div style={{ flex: 1, background: 'black', padding: '1rem', borderRadius: '0.25rem', overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre' }}>
                                {JSON.stringify(testReport.previewRows, null, 2)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h4 style={{ fontWeight: 'bold', color: '#34d399', marginBottom: '0.5rem' }}>2. Parser Logs</h4>
                            <div style={{ flex: 1, background: 'black', padding: '1rem', borderRadius: '0.25rem', overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre', color: 'rgba(16, 185, 129, 0.8)' }}>
                                {testReport.parserDebug.join('\n')}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDataIngestion;
