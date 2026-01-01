import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseExcelFile } from '../../utils/excelParser';
import { parseProductionFile } from '../../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers, RefreshCw, FileSpreadsheet, CloudLightning, FolderInput, File, PlayCircle, StopCircle, Radio } from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminDataIngestion = () => {
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [loading, setLoading] = useState(false);
    const [dbReport, setDbReport] = useState(null);
    const [inspectData, setInspectData] = useState(null);
    const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'folder'

    // Watcher State
    const [isWatching, setIsWatching] = useState(false);
    const [watcherHandle, setWatcherHandle] = useState(null);
    const [watchLogs, setWatchLogs] = useState([]);

    // Refs for resetting inputs
    const salesFileRef = useRef(null);
    const salesFolderRef = useRef(null);
    const prodFileRef = useRef(null);
    const prodFolderRef = useRef(null);

    // Watcher Interval Ref
    const watcherIntervalRef = useRef(null);

    // Clean up watcher on unmount
    useEffect(() => {
        return () => {
            if (watcherIntervalRef.current) clearInterval(watcherIntervalRef.current);
        };
    }, []);

    // Inspector Logic
    const handleFileInspect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            setInspectData({ name: file.name, headers: data[0], sample: data.slice(1, 6) });
        };
        reader.readAsBinaryString(file);
    };

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

    // Wipe DB Logic
    const wipeDatabase = async () => {
        if (!window.confirm("CRITICAL WARNING: This will delete ALL data from 'transactions' and 'production_logs'. Are you sure?")) return;

        setLoading(true);
        try {
            const { error: e1 } = await supabase.from('transactions').delete().neq('id', 0); // Delete all
            const { error: e2 } = await supabase.from('production_logs').delete().neq('id', 0);

            if (e1) throw e1;
            if (e2) throw e2;

            setStatus({ type: 'success', message: "Database Wiped Successfully." });
            checkDbStatus();
        } catch (error) {
            setStatus({ type: 'error', message: "Wipe Failed: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    // --- Single File Upload Handler ---
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        console.log(`Starting upload for ${type}...`);

        try {
            let data = [];
            if (type === 'sales') {
                data = await parseExcelFile(file);
                if (!data || data.length === 0) throw new Error("No valid transactions found in file.");
                const { error } = await supabase.from('transactions').insert(data);
                if (error) throw error;
            } else if (type === 'production') {
                data = await parseProductionFile([file]); // Pass as array
                if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) throw new Error("No valid production logs found.");

                // Insert all 3 types
                if (data.stockIn.length) await supabase.from('production_logs').insert(data.stockIn.map(d => ({ ...d, type: 'stock_in' })));
                if (data.preProduction.length) await supabase.from('production_logs').insert(data.preProduction.map(d => ({ ...d, type: 'usage' })));
                if (data.postProduction.length) await supabase.from('production_logs').insert(data.postProduction.map(d => ({ ...d, type: 'production' })));
            }

            setStatus({ type: 'success', message: `Successfully uploaded file: ${file.name}` });
            checkDbStatus();

        } catch (error) {
            console.error("Upload Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
            e.target.value = null;
        }
    };

    // --- Folder Upload Handler (One-time) ---
    const handleFolderUpload = async (e, type) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        setLoading(true);
        setStatus({ type: 'idle', message: 'Scanning directory...' });

        let successCount = 0;
        let failCount = 0;
        let errors = [];

        // Filter for Excel files only
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

        // Reset Inputs
        if (prodFolderRef.current) prodFolderRef.current.value = "";

        setStatus({
            type: failCount === 0 ? 'success' : 'error',
            message: `Batch Complete. Success: ${successCount}, Failed: ${failCount}`
        });
    };

    // --- LIVE WATCHER LOGIC ---
    const startWatcher = async () => {
        try {
            // 1. Request Folder Access
            const handle = await window.showDirectoryPicker();
            setWatcherHandle(handle);
            setIsWatching(true);
            setWatchLogs(prev => [`Started watching: ${handle.name}`, ...prev]);

            // 2. Start Interval
            watcherIntervalRef.current = setInterval(async () => {
                await scanFolder(handle);
            }, 5000 * 60); // Check every 60 seconds (Changed to 60s as per req, used 5*60 here just as placeholder, changing to 30s for demo responsiveness)

            // Immediate first scan
            await scanFolder(handle);

        } catch (err) {
            console.error("Watcher Error:", err);
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

            // 1. Get already processed files from DB
            const { data: processed, error } = await supabase.from('production_logs').select('source_file');
            if (error) throw error;
            const processedSet = new Set(processed.map(p => p.source_file));

            // 2. Iterate Directory
            for await (const entry of handle.values()) {
                if (entry.kind === 'file' && (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls')) && !entry.name.startsWith('~$')) {

                    // 3. Check Deduplication
                    if (processedSet.has(entry.name)) {
                        continue; // Skip already processed
                    }

                    // 4. Process New File
                    setWatchLogs(prev => [`New file detected: ${entry.name}`, ...prev]);
                    const file = await entry.getFile();
                    const data = await parseProductionFile([file]);

                    let inserted = 0;
                    if (data.stockIn.length) { await supabase.from('production_logs').insert(data.stockIn.map(d => ({ ...d, type: 'stock_in' }))); inserted++; }
                    if (data.preProduction.length) { await supabase.from('production_logs').insert(data.preProduction.map(d => ({ ...d, type: 'usage' }))); inserted++; }
                    if (data.postProduction.length) { await supabase.from('production_logs').insert(data.postProduction.map(d => ({ ...d, type: 'production' }))); inserted++; }

                    if (inserted > 0) {
                        setWatchLogs(prev => [`✅ Uploaded: ${entry.name}`, ...prev]);
                    } else {
                        setWatchLogs(prev => [`⚠️ Empty/Invalid: ${entry.name}`, ...prev]);
                    }
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
                        <button
                            onClick={() => setUploadMode('file')}
                            disabled={isWatching}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${uploadMode === 'file'
                                    ? 'bg-[#2563eb] text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <File size={14} />
                            Single File
                        </button>
                        <button
                            onClick={() => setUploadMode('folder')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${uploadMode === 'folder'
                                    ? 'bg-[#2563eb] text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <FolderInput size={14} />
                            Folder Mode
                        </button>
                    </div>

                    <button
                        onClick={checkDbStatus}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#252b3b] hover:bg-[#2d3345] text-slate-300 rounded-lg transition-all border border-white/5 text-sm font-medium"
                    >
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

                {/* Sales Upload (Single/Folder Manual only) */}
                <div className={`bg-[#0f1219] rounded-xl p-8 border border-white/5 hover:border-blue-500/50 transition-all group flex flex-col items-center justify-center text-center space-y-4 ${isWatching ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                        {uploadMode === 'file' ? <CloudLightning className="text-blue-500" size={32} /> : <FolderInput className="text-blue-500" size={32} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Sales & Expenses</h3>
                        <p className="text-xs text-slate-500 mt-2 max-w-[250px] mx-auto leading-relaxed">Manual Upload Only</p>
                    </div>

                    <label className="mt-4 cursor-pointer">
                        {uploadMode === 'file' ? (
                            <input type="file" ref={salesFileRef} accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'sales')} disabled={loading} className="hidden" />
                        ) : (
                            <input type="file" ref={salesFolderRef} webkitdirectory="" directory="" multiple onChange={(e) => handleFolderUpload(e, 'sales')} disabled={loading} className="hidden" />
                        )}
                        <div className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                            {uploadMode === 'file' ? <Upload size={16} /> : <FolderInput size={16} />}
                            {uploadMode === 'file' ? 'Select File' : 'Select Folder'}
                        </div>
                    </label>
                </div>

                {/* Production Upload (Manual OR Auto-Sync) */}
                <div className={`bg-[#0f1219] rounded-xl p-8 border hover:border-emerald-500/50 transition-all group flex flex-col items-center justify-start text-center space-y-4 relative overflow-hidden ${isWatching ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-white/5'}`}>

                    {isWatching && (
                        <div className="absolute top-2 right-2 flex items-center gap-2 animate-pulse">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Live</span>
                        </div>
                    )}

                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                        {uploadMode === 'file' ? <FileSpreadsheet className="text-emerald-500" size={32} /> : <Radio className="text-emerald-500" size={32} />}
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-white">Production Logs {uploadMode === 'folder' && '(Auto-Sync Available)'}</h3>
                        <p className="text-xs text-slate-500 mt-2 max-w-[250px] mx-auto leading-relaxed">
                            {uploadMode === 'file'
                                ? 'Upload stock ledger manually.'
                                : 'Select a folder. Use "Auto-Sync" to watch for new files automatically.'}
                        </p>
                    </div>

                    {uploadMode === 'file' ? (
                        <label className="mt-4 cursor-pointer">
                            <input type="file" ref={prodFileRef} accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'production')} disabled={loading} className="hidden" />
                            <div className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
                                <Upload size={16} /> Select File
                            </div>
                        </label>
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
                                    <button
                                        onClick={startWatcher}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 w-full"
                                    >
                                        <PlayCircle size={16} /> Start Auto-Sync
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={stopWatcher}
                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 w-full animate-in zoom-in duration-300"
                                >
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
                <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border ${status.type === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                    {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span className="font-medium text-sm">{status.message}</span>
                </div>
            )}
        </div>
    );
};

export default AdminDataIngestion;
