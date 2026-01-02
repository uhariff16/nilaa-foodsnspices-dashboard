import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseExcelFile } from '../../utils/excelParser';
import { parseProductionFile } from '../../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers, RefreshCw, FileSpreadsheet, CloudLightning, FolderInput, File, PlayCircle, StopCircle, Radio, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminDataIngestion = () => {
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [loading, setLoading] = useState(false);
    const [dbReport, setDbReport] = useState(null);
    const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'folder'

    // File States
    const [salesFile, setSalesFile] = useState(null);
    const [productionFile, setProductionFile] = useState(null);

    // Watcher State
    const [isWatching, setIsWatching] = useState(false);
    const [watcherHandle, setWatcherHandle] = useState(null);
    const [watchLogs, setWatchLogs] = useState([]);

    // Refs
    const salesFileRef = useRef(null);
    const prodFileRef = useRef(null);
    const prodFolderRef = useRef(null);
    const watcherIntervalRef = useRef(null);

    // Clean up watcher on unmount
    useEffect(() => {
        return () => {
            if (watcherIntervalRef.current) clearInterval(watcherIntervalRef.current);
        };
    }, []);

    // DB Check Logic
    const checkDbStatus = async () => {
        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        try {
            const { count: txCount, error: txError } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
            const { count: plCount, error: plError } = await supabase.from('production_logs').select('*', { count: 'exact', head: true });

            if (txError) throw txError;
            if (plError) throw plError;

            setDbReport({ transactions: txCount, production: plCount });
            setStatus({ type: 'success', message: "Database connection healthy." });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: "DB Connection Failed: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    // --- File Selection Handlers ---
    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'sales') setSalesFile(file);
        if (type === 'production') setProductionFile(file);

        // Reset input so same file can be selected again if needed
        e.target.value = null;
        setStatus({ type: 'idle', message: '' });
    };

    // --- Test / Debug Mode ---
    const [testReport, setTestReport] = useState(null);

    const analyzeFile = async () => {
        const file = productionFile;
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'idle', message: 'Analyzing file structure...' });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0]; // Analyze first sheet
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                // Run actual parser to get logs
                const parserResult = await parseProductionFile([file]); // Use existing logic

                setTestReport({
                    fileName: file.name,
                    sheetName: sheetName,
                    previewRows: jsonData.slice(0, 10), // Top 10 rows raw
                    parserDebug: parserResult.debugLog,
                    parsedCounts: {
                        stockIn: parserResult.stockIn.length,
                        preProd: parserResult.preProduction.length,
                        postProd: parserResult.postProduction.length
                    }
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


    // --- Upload Execution Handlers ---
    const executeUpload = async (type) => {
        const file = type === 'sales' ? salesFile : productionFile;
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'idle', message: `Processing ${file.name}...` });

        try {
            let data = [];
            if (type === 'sales') {
                // Returns object { transactions: [], items: [], customers: [] }
                const result = await parseExcelFile([file]);
                data = result.transactions || [];

                if (!data || data.length === 0) throw new Error("No valid transactions found in file.");

                // Map to DB Schema
                // Map to DB Schema
                const formattedData = data.map(record => ({
                    date: record.parsedDate,
                    amount: record.parsedAmount,
                    payment_mode: record.parsedType, // 'Sales' or 'Expense'
                    item_name: record.originalDesc,
                    invoice_no: record.invoiceNo,
                    quantity: record.parsedQty || 1 // Use parsed Qty or Default to 1
                })).filter(r => r.date && r.amount && r.item_name); // Filter out invalid rows

                if (formattedData.length === 0) {
                    const debugInfo = result.debugLog ? result.debugLog.join('\n') : 'No debug info available.';
                    throw new Error(`No valid records found after filtering.\n\nDebug Info:\n${debugInfo}`);
                }

                const { error } = await supabase.from('transactions').insert(formattedData);
                if (error) throw error;
            } else if (type === 'production') {
                data = await parseProductionFile([file]);

                // Debug Check: If Pre-Production is empty, trigger error to show logs (since user reported this specific issue)
                if (data.preProduction.length === 0) {
                    const debugInfo = data.debugLog ? data.debugLog.join('\n') : 'No debug info';
                    throw new Error(`DEBUG MODE: Stock-in found (${data.stockIn.length}), but Pre-Production is empty.\n\nDebug Info:\n${debugInfo}`);
                }

                if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) throw new Error("No valid production logs found.");

                if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) throw new Error("No valid production logs found.");

                // STRATEGY: Content-Based Deduplication (Smart Sync)
                // 1. Calculate Date Range of the new data
                const allDates = [
                    ...data.stockIn.map(d => d.date),
                    ...data.preProduction.map(d => d.date),
                    ...data.postProduction.map(d => d.date)
                ].filter(d => d).sort();

                if (allDates.length === 0) throw new Error("No dates found in data.");
                const minDate = allDates[0];
                const maxDate = allDates[allDates.length - 1];

                // 2. Fetch Existing Records in this Range
                const { data: existingLogs, error: fetchError } = await supabase
                    .from('production_logs')
                    .select('date, material, weight, type')
                    .gte('date', minDate)
                    .lte('date', maxDate);

                if (fetchError) throw new Error("Dedup Check Error: " + fetchError.message);

                // 3. Create Signatures for Existing Records
                const createSig = (d) => `${d.date}|${String(d.material).trim().toLowerCase()}|${Number(d.weight).toFixed(2)}|${d.type}`;
                const existingSet = new Set(existingLogs.map(createSig));

                // 4. Filter New Data
                const filterNew = (items, type) => {
                    return items
                        .map(i => ({ ...i, type })) // Add type first
                        .filter(i => {
                            const sig = createSig(i);
                            return !existingSet.has(sig);
                        })
                        .map(({ id, source_sheet, ...rest }) => rest); // Clean for insert
                };

                const newStockIn = filterNew(data.stockIn, 'stock_in');
                const newPreProd = filterNew(data.preProduction, 'usage');
                const newPostProd = filterNew(data.postProduction, 'production');

                const totalNew = newStockIn.length + newPreProd.length + newPostProd.length;

                if (totalNew === 0) {
                    setStatus({ type: 'success', message: `Upload Skipped: All ${allDates.length} records already exist.` });
                    setLoading(false);
                    return; // Exit early
                }

                // 5. Insert Only New Records
                if (newStockIn.length) await supabase.from('production_logs').insert(newStockIn);
                if (newPreProd.length) await supabase.from('production_logs').insert(newPreProd);
                if (newPostProd.length) await supabase.from('production_logs').insert(newPostProd);

                let successMsg = `Synced ${file.name}. Added ${totalNew} new records.`;
                if (type === 'production') {
                    successMsg += ` (Stock-In: ${newStockIn.length}, Pre-Prod: ${newPreProd.length}, Post-Prod: ${newPostProd.length})`;
                }
                setStatus({ type: 'success', message: successMsg });

            } // End production block

            // Shared Success Cleanup
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

    // --- Folder Upload (Direct Execution) ---
    const handleFolderUpload = async (e, type) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        setLoading(true);
        setStatus({ type: 'idle', message: 'Scanning directory...' });

        let successCount = 0;
        let failCount = 0;
        let errors = [];

        const excelFiles = files.filter(f =>
            (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) && !f.name.startsWith('~$')
        );

        if (excelFiles.length === 0) {
            setStatus({ type: 'error', message: "No Excel files found in selected folder." });
            setLoading(false);
            return;
        }

        for (const file of excelFiles) {
            try {
                if (type === 'production') {
                    const data = await parseProductionFile([file]);
                    let inserted = 0;
                    if (data.stockIn.length) { await supabase.from('production_logs').insert(data.stockIn.map(d => ({ ...d, type: 'stock_in' }))); inserted++; }
                    if (data.preProduction.length) { await supabase.from('production_logs').insert(data.preProduction.map(d => ({ ...d, type: 'usage' }))); inserted++; }
                    if (data.postProduction.length) { await supabase.from('production_logs').insert(data.postProduction.map(d => ({ ...d, type: 'production' }))); inserted++; }

                    if (inserted > 0) successCount++;
                    else throw new Error("No data parsed");
                }
            } catch (err) {
                failCount++;
                errors.push(`${file.name}: ${err.message}`);
            }
        }

        setLoading(false);
        checkDbStatus();
        if (prodFolderRef.current) prodFolderRef.current.value = "";
        setStatus({
            type: failCount === 0 ? 'success' : 'error',
            message: `Batch Complete. Success: ${successCount}, Failed: ${failCount}`
        });
    };

    // --- Watcher Logic (Unchanged) ---
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
        <div className="p-8 space-y-8 bg-[#1a1f2e] min-h-[calc(100vh-140px)] rounded-2xl">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                        <Database className="text-blue-500" size={28} />
                        Data Ingestion
                    </h2>
                    <p className="text-slate-400 text-sm">Upload bulk data from Excel files for analysis.</p>
                </div>

                {/* Global Controls */}
                <div className="flex gap-3">
                    <div className="flex bg-[#0f1219] p-1 rounded-lg border border-white/5 mr-4">
                        <button onClick={() => setUploadMode('file')} disabled={isWatching} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${uploadMode === 'file' ? 'bg-[#2563eb] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            <File size={14} /> Single File
                        </button>
                        <button onClick={() => setUploadMode('folder')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${uploadMode === 'folder' ? 'bg-[#2563eb] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            <FolderInput size={14} /> Folder Mode
                        </button>
                    </div>
                    <button onClick={checkDbStatus} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-[#252b3b] hover:bg-[#2d3345] text-slate-300 rounded-lg transition-all border border-white/5 text-sm font-medium">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            {dbReport && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-[#0f1219] p-6 rounded-xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Transactions</p>
                            <p className="text-3xl font-bold text-white">{dbReport.transactions.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                            <FileText className="text-blue-500" size={24} />
                        </div>
                    </div>
                    <div className="bg-[#0f1219] p-6 rounded-xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Production Logs</p>
                            <p className="text-3xl font-bold text-white">{dbReport.production.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                            <Layers className="text-emerald-500" size={24} />
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Areas */}
            <div className="grid lg:grid-cols-2 gap-6">

                {/* Sales Upload */}
                <div className={`bg-[#0f1219] rounded-xl p-8 border border-white/5 hover:border-blue-500/50 transition-all group flex flex-col items-center justify-center text-center space-y-4 ${isWatching ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                        {uploadMode === 'file' ? <CloudLightning className="text-blue-500" size={32} /> : <FolderInput className="text-blue-500" size={32} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Sales & Expenses</h3>
                        <p className="text-xs text-slate-500 mt-2 max-w-[250px] mx-auto leading-relaxed">Manual Upload Only</p>
                    </div>

                    {uploadMode === 'file' ? (
                        <div className="w-full flex flex-col items-center gap-3">
                            {salesFile ? (
                                <div className="w-full max-w-xs bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-blue-500/30">
                                    <span className="text-xs text-slate-300 truncate max-w-[180px]">{salesFile.name}</span>
                                    <button onClick={() => setSalesFile(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                                </div>
                            ) : null}

                            <div className="flex gap-2">
                                <label className="cursor-pointer">
                                    <input type="file" ref={salesFileRef} accept=".xlsx, .xls" onChange={(e) => handleFileSelect(e, 'sales')} disabled={loading} className="hidden" />
                                    <div className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                                        <FileSpreadsheet size={16} /> {salesFile ? 'Change File' : 'Select File'}
                                    </div>
                                </label>
                                <button
                                    onClick={() => executeUpload('sales')}
                                    disabled={!salesFile || loading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                                    Upload
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="mt-4 cursor-pointer">
                            <input type="file" webkitdirectory="" directory="" multiple onChange={(e) => handleFolderUpload(e, 'sales')} disabled={loading} className="hidden" />
                            <div className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                                <FolderInput size={16} /> Select & Upload Folder
                            </div>
                        </label>
                    )}
                </div>

                {/* Production Upload */}
                <div className={`bg-[#0f1219] rounded-xl p-8 border hover:border-emerald-500/50 transition-all group flex flex-col items-center justify-start text-center space-y-4 relative overflow-hidden ${isWatching ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-white/5'}`}>
                    {isWatching && (
                        <div className="absolute top-2 right-2 flex items-center gap-2 animate-pulse">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Live</span>
                        </div>
                    )}
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                        {uploadMode === 'file' ? <FileSpreadsheet className="text-emerald-500" size={32} /> : <Radio className="text-emerald-500" size={32} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Production Logs {uploadMode === 'folder' && '(Auto-Sync)'}</h3>
                        <p className="text-xs text-slate-500 mt-2 max-w-[250px] mx-auto leading-relaxed">
                            {uploadMode === 'file' ? 'Upload stock ledger manually.' : 'Select a folder. Use "Auto-Sync" to watch for new files automatically.'}
                        </p>
                    </div>

                    {uploadMode === 'file' ? (
                        <div className="w-full flex flex-col items-center gap-3">
                            {productionFile ? (
                                <div className="w-full max-w-xs bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-emerald-500/30">
                                    <span className="text-xs text-slate-300 truncate max-w-[180px]">{productionFile.name}</span>
                                    <button onClick={() => setProductionFile(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                                </div>
                            ) : null}

                            <div className="flex gap-2">
                                <label className="cursor-pointer">
                                    <input type="file" ref={prodFileRef} accept=".xlsx, .xls" onChange={(e) => handleFileSelect(e, 'production')} disabled={loading} className="hidden" />
                                    <div className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                                        <FileSpreadsheet size={16} /> {productionFile ? 'Change File' : 'Select File'}
                                    </div>
                                </label>
                                <button
                                    onClick={() => executeUpload('production')}
                                    disabled={!productionFile || loading}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                                    Upload
                                </button>
                                {/* Debug Button */}
                                {productionFile && (
                                    <button
                                        onClick={analyzeFile}
                                        disabled={loading}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-colors"
                                        title="Troubleshoot File structure"
                                    >
                                        <CloudLightning size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 w-full max-w-[200px] mt-4">
                            {!isWatching ? (
                                <>
                                    <label className="cursor-pointer w-full">
                                        <input type="file" ref={prodFolderRef} webkitdirectory="" directory="" multiple onChange={(e) => handleFolderUpload(e, 'production')} disabled={loading} className="hidden" />
                                        <div className="px-6 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 w-full">
                                            <FolderInput size={16} /> Scan Once
                                        </div>
                                    </label>
                                    <button onClick={startWatcher} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 w-full">
                                        <PlayCircle size={16} /> Start Auto-Sync
                                    </button>
                                </>
                            ) : (
                                <button onClick={stopWatcher} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 w-full animate-in zoom-in duration-300">
                                    <StopCircle size={16} /> Stop Watching
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Watcher Logs */}
            {isWatching && (
                <div className="bg-black/40 rounded-xl border border-emerald-500/20 p-4 animate-in fade-in slide-in-from-bottom-4">
                    <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Radio size={12} className="animate-pulse" /> Live Watcher Logs
                    </h4>
                    <div className="h-32 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1 custom-scrollbar">
                        {watchLogs.map((log, i) => (
                            <div key={i} className="border-b border-white/5 pb-1">{log}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Toast */}
            {status.message && !isWatching && (
                <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border ${status.type === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
                    {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span className="font-medium text-sm">{status.message}</span>
                </div>
            )}

            {/* DEBUG REPORT UI */}
            {testReport && (
                <div className="mt-8 p-6 bg-slate-900 rounded-xl border border-blue-500/30 font-mono text-xs text-slate-300 overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">📂 Diagnostic Report: {testReport.fileName}</h3>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-black/50 p-3 rounded border border-white/10">
                            <span className="block text-slate-500 mb-1">Stock In</span>
                            <span className="text-xl text-white font-bold">{testReport.parsedCounts.stockIn}</span>
                        </div>
                        <div className="bg-black/50 p-3 rounded border border-white/10">
                            <span className="block text-slate-500 mb-1">Pre-Prod</span>
                            <span className={`text-xl font-bold ${testReport.parsedCounts.preProd === 0 ? 'text-red-500' : 'text-white'}`}>{testReport.parsedCounts.preProd}</span>
                        </div>
                        <div className="bg-black/50 p-3 rounded border border-white/10">
                            <span className="block text-slate-500 mb-1">Post-Prod</span>
                            <span className="text-xl text-white font-bold">{testReport.parsedCounts.postProd}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-[400px]">
                        <div className="flex flex-col h-full">
                            <h4 className="font-bold text-blue-400 mb-2">1. Raw Excel Data (Top 10 Rows)</h4>
                            <div className="flex-1 bg-black p-4 rounded overflow-auto border border-white/10 whitespace-pre">
                                {JSON.stringify(testReport.previewRows, null, 2)}
                            </div>
                        </div>
                        <div className="flex flex-col h-full">
                            <h4 className="font-bold text-emerald-400 mb-2">2. Parser Logs</h4>
                            <div className="flex-1 bg-black p-4 rounded overflow-auto border border-white/10 whitespace-pre text-emerald-500/80">
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
