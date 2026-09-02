import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseExcelFile } from '../../utils/excelParser';
import { parseProductionFile } from '../../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers, RefreshCw, FileSpreadsheet, CloudLightning, FolderInput, File as FileIcon, PlayCircle, StopCircle, Radio, X, Users, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { loadGapi, loadGis, createPicker, downloadDriveFile } from '../../utils/driveUtils';

const AdminDataIngestion = () => {
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [lockedMonths, setLockedMonths] = useState([]);

    React.useEffect(() => {
        const fetchLocked = async () => {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'locked_months').maybeSingle();
            if (data && data.value) setLockedMonths(JSON.parse(data.value));
        };
        fetchLocked();
    }, []);
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

    // --- Google Drive Auto-Sync State ---
    const [watchConfig, setWatchConfig] = useState(() => {
        const saved = localStorage.getItem('driveDetails');
        return saved ? JSON.parse(saved) : {
            folderId: '',
            folderName: '',
            intervalMinutes: 15,
            isActive: false,
            lastSync: null
        };
    });
    const [processedFileIds, setProcessedFileIds] = useState(() => {
        const saved = localStorage.getItem('processedDriveFiles');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [googleSyncEnabled, setGoogleSyncEnabled] = useState(() => {
        const saved = localStorage.getItem('googleSyncEnabled');
        return saved ? JSON.parse(saved) : false; // Default to false
    });

    useEffect(() => {
        localStorage.setItem('googleSyncEnabled', JSON.stringify(googleSyncEnabled));
    }, [googleSyncEnabled]);

    const DEFAULT_KEYWORDS = [
        'sale_summary', 'sales summary', 'invoicewise',
        'customerwise', 'profit',
        'expenses', 'receivable',
        'purchase', 'billwise',
        'stock in', 'pre prod', 'pre production', 'post prod', 'post production', 'usage', 'production',
        'payment', 'supplier',
        'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'summary'
    ];

    const [whitelistKeywords, setWhitelistKeywords] = useState(() => {
        const saved = localStorage.getItem('ingestionKeywords');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Auto-merge default keywords that might be missing
            return Array.from(new Set([...parsed, ...DEFAULT_KEYWORDS]));
        }
        return DEFAULT_KEYWORDS;
    });

    useEffect(() => {
        localStorage.setItem('ingestionKeywords', JSON.stringify(whitelistKeywords));
    }, [whitelistKeywords]);

    const [showKeywordMgr, setShowKeywordMgr] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');

    const [processedFileHashes, setProcessedFileHashes] = useState(() => {
        const saved = localStorage.getItem('processedFileHashes');
        return saved ? JSON.parse(saved) : [];
    });
    const [previewData, setPreviewData] = useState(null);

    useEffect(() => {
        localStorage.setItem('processedFileHashes', JSON.stringify(processedFileHashes));
    }, [processedFileHashes]);

    const computeFileHash = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.error("Hash calculation failed", e);
            return null;
        }
    };

    const [syncProgress, setSyncProgress] = useState(null);
    const [syncLogs, setSyncLogs] = useState(() => {
        const saved = localStorage.getItem('driveSyncLogs');
        return saved ? JSON.parse(saved) : [];
    });

    const addSyncLog = useCallback((logEntry) => {
        setSyncLogs(prev => {
            const updated = [
                {
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    ...logEntry
                },
                ...prev
            ].slice(0, 100);
            localStorage.setItem('driveSyncLogs', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Refs for Auto-Sync (Fix Stale Closure)
    const watchConfigRef = useRef(watchConfig);
    const processedIdsRef = useRef(processedFileIds);

    useEffect(() => { watchConfigRef.current = watchConfig; }, [watchConfig]);
    useEffect(() => { processedIdsRef.current = processedFileIds; }, [processedFileIds]);

    useEffect(() => {
        localStorage.setItem('driveDetails', JSON.stringify(watchConfig));
    }, [watchConfig]);

    useEffect(() => {
        localStorage.setItem('processedDriveFiles', JSON.stringify([...processedFileIds]));
    }, [processedFileIds]);

    // --- Google Drive Integration ---
    // --- Google Drive Integration ---
    const [tokenClient, setTokenClient] = useState(null);
    const [driveConfig, setDriveConfig] = useState(() => {
        const saved = localStorage.getItem('googleDriveConfig');
        return saved ? JSON.parse(saved) : {
            clientId: 'YOUR_CLIENT_ID_HERE',
            apiKey: 'YOUR_API_KEY_HERE',
        };
    });

    useEffect(() => {
        if (driveConfig.clientId !== 'YOUR_CLIENT_ID_HERE') {
            localStorage.setItem('googleDriveConfig', JSON.stringify(driveConfig));
        }
    }, [driveConfig]);

    const [gapiLoaded, setGapiLoaded] = useState(false);
    const [gisLoaded, setGisLoaded] = useState(false);

    useEffect(() => {
        // Load Google Scripts
        loadGapi(() => setGapiLoaded(true));
        loadGis(() => setGisLoaded(true));
        
        // Check DB Status on Mount
        checkDbStatus(true);
    }, []);

    useEffect(() => {
        if (gisLoaded && driveConfig.clientId !== 'YOUR_CLIENT_ID_HERE') {
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: driveConfig.clientId,
                    scope: 'https://www.googleapis.com/auth/drive.readonly',
                    callback: '', // defined at request time
                });
                setTokenClient(client);
            } catch (e) {
                console.error("Failed to init token client", e);
            }
        }
    }, [gisLoaded, driveConfig.clientId]);

    const handleDrivePick = (targetType) => {
        if (!gapiLoaded || !gisLoaded) {
            alert("Google API not loaded yet. Check internet connection.");
            return;
        }

        if (driveConfig.clientId === 'YOUR_CLIENT_ID_HERE' || driveConfig.apiKey === 'YOUR_API_KEY_HERE') {
            const newId = prompt("Enter Google Cloud Client ID:", driveConfig.clientId);
            const newKey = prompt("Enter Google Cloud API Key (Starts with 'AIza...'):", driveConfig.apiKey);
            if (newId && newKey) {
                const trimmedId = newId.trim();
                const trimmedKey = newKey.trim();

                if (!trimmedKey.startsWith('AIza')) {
                    alert("⚠️ That doesn't look like an API Key.\n\nAPI Keys usually start with 'AIza'.\nDid you paste the Client Secret by mistake?");
                    return;
                }

                setDriveConfig({ clientId: trimmedId, apiKey: trimmedKey });
                alert("Credentials saved! Please click the button again.");
            }
            return;
        }

        if (!tokenClient) {
            console.error("Token Client not initialized. Credentials might be invalid or not set.");
            alert("Internal Error: Google Token Client not ready. Please reload page or check console.");
            return;
        }

        const handleAuth = (resp) => {
            if (resp && resp.access_token) {
                const appId = driveConfig.clientId.split('-')[0]; // Extract Project Number
                console.log("Initializing Picker with App ID:", appId); // DEBUG
                createPicker({
                    token: resp.access_token,
                    apiKey: driveConfig.apiKey,
                    appId: appId,
                    selectFolder: targetType === 'folder',
                    onSelect: async ({ fileId, fileName, accessToken }) => {
                        if (targetType === 'folder') {
                            setWatchConfig(prev => ({ ...prev, folderId: fileId, folderName: fileName, isActive: true })); // Auto-activate on select
                            setStatus({ type: 'success', message: `Selected Watch Folder: ${fileName}` });
                        } else {
                            setStatus({ type: 'idle', message: `Downloading ${fileName} from Drive...` });
                            setLoading(true);
                            try {
                                const blob = await downloadDriveFile(fileId, accessToken);
                                const syntheticFile = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                                if (targetType === 'sales') {
                                    setSalesFile(syntheticFile);
                                    setStatus({ type: 'success', message: `Loaded ${fileName} from Drive.` });
                                } else {
                                    setProductionFile(syntheticFile);
                                    setStatus({ type: 'success', message: `Loaded ${fileName} from Drive.` });
                                }
                            } catch (err) {
                                setStatus({ type: 'error', message: "Drive Download Failed: " + err.message });
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                });
            }
        };

        if (window.gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when requesting a fresh access token.
            tokenClient.callback = handleAuth;
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
            tokenClient.callback = handleAuth;
            tokenClient.requestAccessToken({ prompt: '' });
        }
    };

    useEffect(() => {
        return () => {
            if (watcherIntervalRef.current) clearInterval(watcherIntervalRef.current);
        };
    }, []);

    // --- Auto-Sync Logic ---
    const runDriveSync = useCallback(async () => {
        const currentConfig = watchConfigRef.current;
        const currentProcessed = processedIdsRef.current;

        if (!currentConfig.folderId || !tokenClient) return;

        // wrapper to get token
        const performSync = async (accessToken) => {
            try {
                setLoading(true);
                setSyncProgress({
                    totalFiles: 0,
                    currentFileIndex: 0,
                    currentFileName: 'Connecting...',
                    fileStatus: 'Listing files in folder...',
                    percent: 0
                });
                setStatus({ type: 'idle', message: 'Syncing with Drive...' });

                const { listDriveFiles } = await import('../../utils/driveUtils');
                const files = await listDriveFiles(currentConfig.folderId, accessToken);

                // Filter files: New ID OR Newer Modified Time
                const lastSyncDate = currentConfig.lastSync ? new Date(currentConfig.lastSync) : new Date(0);

                console.log("--- Sync Debug ---");
                console.log("Last Sync:", lastSyncDate.toISOString());
                console.log("Total Drive Files:", files.length);

                const filesToProcess = files.filter(f => {
                    const isNew = !currentProcessed.has(f.id);
                    const fileTime = new Date(f.modifiedTime);
                    const isModified = fileTime > lastSyncDate;

                    console.log(`File: ${f.name} | Mod: ${f.modifiedTime} | New: ${isNew} | Modified: ${isModified}`);

                    return isNew || isModified;
                });

                if (filesToProcess.length === 0) {
                    setWatchConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
                    setStatus({ type: 'success', message: 'Sync Complete: No new or updated files found.' });
                    setSyncProgress(null);
                    setLoading(false);
                    
                    addSyncLog({
                        fileName: 'N/A',
                        fileId: 'N/A',
                        status: 'success',
                        message: 'Sync completed: No new or modified files found in folder.'
                    });
                    return;
                }

                setStatus({ type: 'idle', message: `Found ${filesToProcess.length} files to sync...` });
                setSyncProgress({
                    totalFiles: filesToProcess.length,
                    currentFileIndex: 0,
                    currentFileName: '',
                    fileStatus: 'Found new files. Preparing processing queue...',
                    percent: 0
                });

                let successCount = 0;
                let fileIdx = 0;

                for (const fileMeta of filesToProcess) {
                    fileIdx++;
                    setSyncProgress({
                        totalFiles: filesToProcess.length,
                        currentFileIndex: fileIdx,
                        currentFileName: fileMeta.name,
                        fileStatus: 'Downloading...',
                        percent: Math.round(((fileIdx - 1) / filesToProcess.length) * 100)
                    });

                    // Wait 500ms between operations to allow UI updates and make sync progress visual
                    await new Promise(resolve => setTimeout(resolve, 500));

                    try {
                        const blob = await downloadDriveFile(fileMeta.id, accessToken);
                        setSyncProgress(prev => ({ ...prev, fileStatus: 'Parsing & Processing...' }));
                        
                        const file = new File([blob], fileMeta.name, { type: fileMeta.mimeType });

                        let result = { success: false };

                        // Try Sales First
                        try {
                            result = await processSalesData(file);
                        } catch (e) { /* ignore */ }

                        // If not sales, Try Production
                        if (!result.success) {
                            try {
                                result = await processProductionData(file);
                            } catch (e) {
                                console.warn("Prod Parse Failed", e);
                            }
                        }

                        if (result.success || (result.message && !result.message.includes('No valid'))) {
                            successCount++;
                            setProcessedFileIds(prev => {
                                const next = new Set(prev);
                                next.add(fileMeta.id);
                                return next;
                            });
                            
                            addSyncLog({
                                fileName: fileMeta.name,
                                fileId: fileMeta.id,
                                status: 'success',
                                message: result.message || 'Successfully parsed and imported.'
                            });
                        } else {
                            addSyncLog({
                                fileName: fileMeta.name,
                                fileId: fileMeta.id,
                                status: 'warning',
                                message: result.message || 'No valid transactions or logs matched in this file.'
                            });
                        }

                    } catch (err) {
                        console.error(`Sync Error for ${fileMeta.name}:`, err);
                        addSyncLog({
                            fileName: fileMeta.name,
                            fileId: fileMeta.id,
                            status: 'failed',
                            message: err.message || 'Sync worker encountered parsing error.'
                        });
                    }
                }

                setWatchConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
                setStatus({ type: 'success', message: `Auto-Sync: Processed ${successCount}/${filesToProcess.length} files.` });
                
                addSyncLog({
                    fileName: `${filesToProcess.length} files batch`,
                    fileId: 'Batch',
                    status: 'success',
                    message: `Completed sync batch. Successfully processed ${successCount} of ${filesToProcess.length} files.`
                });

                setSyncProgress(null);
                checkDbStatus(true);

            } catch (err) {
                console.error("Auto Sync Error", err);
                setStatus({ type: 'error', message: "Auto-Sync Failed: " + err.message });
                addSyncLog({
                    fileName: 'All Files',
                    fileId: 'Batch Error',
                    status: 'failed',
                    message: 'Sync execution stopped: ' + err.message
                });
                setSyncProgress(null);
            } finally {
                setLoading(false);
            }
        };

        // Trigger Auth if needed
        // Use existing token client
        if (tokenClient) {
            tokenClient.callback = (resp) => {
                if (resp.error) {
                    console.error("Auto-Sync Auth Error:", resp);
                    // Pause Auto-Sync
                    setWatchConfig(prev => ({ ...prev, isActive: false }));
                    setStatus({
                        type: 'error',
                        message: "Auto-Sync Paused: Session Expired. Please click 'Enable Auto-Sync' to sign in again."
                    });
                    addSyncLog({
                        fileName: 'Google Auth',
                        fileId: 'Auth Error',
                        status: 'failed',
                        message: 'Authentication failed. Auto-sync has been paused.'
                    });
                    return;
                }
                if (resp.access_token) {
                    // [NEW] Persist Token
                    const expiresIn = resp.expires_in || 3599; // Default 1hr
                    const expiryTime = Date.now() + (expiresIn * 1000);
                    localStorage.setItem('g_access_token', resp.access_token);
                    localStorage.setItem('g_token_expiry', expiryTime);

                    performSync(resp.access_token);
                }
            };

            // Check for valid cached token first
            const cachedToken = localStorage.getItem('g_access_token');
            const cachedExpiry = localStorage.getItem('g_token_expiry');

            if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
                // Token is valid, use it directly
                console.log("Using cached Google Access Token");
                performSync(cachedToken);
            } else {
                // Token expired or missing, request new one
                // Try silent auth. If it fails, callback gets an error, we pause.
                tokenClient.requestAccessToken({ prompt: '' });
            }
        }
    }, [tokenClient, addSyncLog]); // minimal deps

    // Effect for Interval
    useEffect(() => {
        if (watchConfig.isActive && watchConfig.folderId) {
            // Run immediately on first active
            runDriveSync();

            const ms = watchConfig.intervalMinutes * 60 * 1000;
            const interval = setInterval(runDriveSync, ms);
            return () => clearInterval(interval);
        }
    }, [watchConfig.isActive, watchConfig.folderId, watchConfig.intervalMinutes, runDriveSync]);

    const checkDbStatus = async (silent = false) => {
        setLoading(true);
        if (!silent) setStatus({ type: 'idle', message: '' });
        try {
            const { count: txCount, error: txError } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
            const { count: custCount, error: cError } = await supabase.from('customer_stats').select('*', { count: 'exact', head: true });
            const { count: plCount, error: plError } = await supabase.from('production_logs').select('*', { count: 'exact', head: true });
            const { count: recCount, error: recError } = await supabase.from('customer_receivables').select('*', { count: 'exact', head: true });

            if (txError) throw txError;
            if (plError) throw plError;

            setDbReport({ 
                transactions: txCount, 
                production: plCount, 
                customers: custCount || 0,
                receivables: recCount || 0
            });
            if (!silent) setStatus({ type: 'success', message: "Database connection healthy." });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: "DB Connection Failed: " + error.message });
        } finally {
            setLoading(false);
        }
    };


    const fetchAllRecords = async (table, select, minDate, maxDate) => {
        let allRecords = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let more = true;

        while (more) {
            const { data, error } = await supabase
                .from(table)
                .select(select)
                .gte('date', minDate)
                .lte('date', maxDate)
                .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allRecords = [...allRecords, ...data];
                // If we got less than the page size, we're done
                if (data.length < PAGE_SIZE) more = false;
                from += PAGE_SIZE;
            } else {
                more = false;
            }
        }
        return allRecords;
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
                    counts = { transactions: res.transactions.length, customers: res.customers.length, items: res.items.length, receivables: res.receivables.length };
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


    const processSalesData = async (file) => {
        const result = await parseExcelFile([file]);
        const data = result.transactions || [];
        const receivablesData = result.receivables || [];
        const customerStatsData = result.customers || [];

        const hasTransactions = data && data.length > 0;
        const hasReceivables = receivablesData.length > 0;
        const hasCustomerStats = customerStatsData.length > 0;

        if (!hasTransactions && !hasReceivables && !hasCustomerStats) {
            return { success: false, message: 'No valid records found' };
        }

        let uniqueTransactions = [];
        let updates = [];
        let addedRec = 0;
        let newTxCount = 0;
        let updateTxCount = 0;
        let skippedTxns = 0;

        // 1. Transactions
        if (hasTransactions) {
            // Filter valid rows
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

            if (formattedData.length > 0) {
                const allDates = formattedData.map(d => d.date).sort();
                const minDate = allDates[0];
                const maxDate = allDates[allDates.length - 1];

                const existingTxns = await fetchAllRecords('transactions', 'id, date, amount, item_name, invoice_no, payment_mode, customer_name', minDate, maxDate);

                const createTxSig = (t) => {
                    let d = String(t.date || '').trim();
                    if (d.includes('T')) d = d.split('T')[0];
                    const a = Number(t.amount || 0).toFixed(2);
                    const i = String(t.item_name || '').trim().toLowerCase();
                    const inv = String(t.invoice_no || '').trim().toLowerCase();
                    const cleanInv = (inv === 'null' || inv === 'undefined' || inv.startsWith('inv-missing-')) ? '' : inv;
                    return `${d}|${a}|${i}|${cleanInv}`;
                };

                const existingTxMap = new Map();
                existingTxns.forEach(t => existingTxMap.set(createTxSig(t), t));

                formattedData.forEach(t => {
                    const sig = createTxSig(t);
                    const existing = existingTxMap.get(sig);

                    if (!existing) {
                        uniqueTransactions.push(t);
                    } else if (
                        existing.payment_mode !== t.payment_mode ||
                        (t.customer_name && existing.customer_name !== t.customer_name)
                    ) {
                        updates.push({ ...t, id: existing.id });
                    }
                });

                newTxCount = uniqueTransactions.length;
                updateTxCount = updates.length;
                skippedTxns = formattedData.length - newTxCount - updateTxCount;

                if (uniqueTransactions.length > 0) await supabase.from('transactions').insert(uniqueTransactions);
                if (updates.length > 0) await supabase.from('transactions').upsert(updates);
            }
        }

        // 2. Receivables (Replace Strategy)
        if (hasReceivables) {
            const mappedReceivables = receivablesData.map(r => ({
                customer_name: r.customer_name,
                address: r.address,
                city: r.city,
                phone: r.phone,
                balance_due: r.balance_due,
                created_at: new Date()
            }));

            // Clear old receivables before inserting new snapshot
            await supabase.from('customer_receivables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            const { error } = await supabase.from('customer_receivables').insert(mappedReceivables);
            if (!error) {
                addedRec = mappedReceivables.length;
            } else {
                console.error("Receivables Insert Error:", error);
                throw new Error(`Receivables DB Error: ${error.message}`);
            }
        }

        // 3. Customer Profit Stats
        let addedCustStats = 0;
        if (result.customers && result.customers.length > 0) {
            const stats = result.customers.map(c => ({
                date: c.parsedDate,
                customer_name: c.name,
                revenue: c.revenue,
                profit: c.profit
            }));
            const { error } = await supabase.from('customer_stats').upsert(stats, { onConflict: 'date, customer_name' });
            if (!error) addedCustStats = stats.length;
            else console.error("Customer Stats Upsert Error:", error);
        }

        return {
            success: true,
            newTxns: newTxCount,
            updatedTxns: updateTxCount,
            receivables: addedRec,
            custStats: addedCustStats,
            message: `Imported: ${newTxCount} new txns, ${updateTxCount} updated, ${skippedTxns} skipped. ${addedRec} latest receivables replaced.`
        };
    };

    const processProductionData = async (file) => {
        const data = await parseProductionFile([file]);
        if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) {
            return { success: false, message: "No valid production logs found." };
        }

        const formatRows = (items, type) => items.map(item => ({
            id: item.id,
            date: item.date,
            type: type, // 'stock_in', 'usage', 'production'
            material: item.material,
            weight: item.weight || 0,
            remarks: `Sheet: ${item.source_sheet || 'N/A'}`,
            source_file: item.source_file || file.name
        })).filter(row => row.date && row.weight);

        const allRows = [
            ...formatRows(data.stockIn, 'stock_in'),
            ...formatRows(data.preProduction, 'usage'),
            ...formatRows(data.postProduction, 'production')
        ];

        let newCount = 0;
        let updateCount = 0;
        let skipCount = 0;

        if (allRows.length > 0) {
            const ids = allRows.map(r => r.id);
            const { data: existingLogs, error: fetchErr } = await supabase
                .from('production_logs')
                .select('id, date, type, material, weight, remarks, source_file')
                .in('id', ids);

            if (!fetchErr && existingLogs) {
                const existingMap = new Map(existingLogs.map(l => [l.id, l]));
                const rowsToInsert = [];
                const rowsToUpdate = [];

                allRows.forEach(row => {
                    const existing = existingMap.get(row.id);
                    if (!existing) {
                        newCount++;
                        rowsToInsert.push(row);
                    } else {
                        const isDifferent =
                            existing.date !== row.date ||
                            existing.type !== row.type ||
                            existing.material !== row.material ||
                            Number(existing.weight) !== Number(row.weight) ||
                            existing.remarks !== row.remarks ||
                            existing.source_file !== row.source_file;

                        if (isDifferent) {
                            updateCount++;
                            rowsToUpdate.push(row);
                        } else {
                            skipCount++;
                        }
                    }
                });

                if (rowsToInsert.length > 0) {
                    const { error } = await supabase.from('production_logs').insert(rowsToInsert);
                    if (error) throw error;
                }
                if (rowsToUpdate.length > 0) {
                    const { error } = await supabase.from('production_logs').upsert(rowsToUpdate);
                    if (error) throw error;
                }
            } else {
                const { error } = await supabase.from('production_logs').upsert(allRows);
                if (error) throw error;
                newCount = allRows.length;
            }
        }

        return {
            success: true,
            totalNew: newCount + updateCount,
            details: `Stock-In: ${data.stockIn.length}, Usage: ${data.preProduction.length}, Production: ${data.postProduction.length}`,
            message: `Imported: ${newCount} new logs, ${updateCount} updated, ${skipCount} skipped.`
        };
    };

    const validateSingleFile = async (file, type) => {
        const hash = await computeFileHash(file);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', bookSheets: true });
            const sheetNames = workbook.SheetNames || [];

            const lowerFileName = file.name.toLowerCase();
            const isGenuine = sheetNames.some(name => {
                const lowerName = name.toLowerCase();
                return whitelistKeywords.some(kw => lowerName.includes(kw.toLowerCase().trim()));
            }) || whitelistKeywords.some(kw => lowerFileName.includes(kw.toLowerCase().trim()));

            if (!isGenuine) {
                return {
                    fileName: file.name,
                    file,
                    hash,
                    isDuplicateFile: false,
                    newCount: 0,
                    updateCount: 0,
                    skipCount: 0,
                    errors: [`Error: File rejected. Sheet names do not contain any whitelisted keywords. Current Whitelist: ${whitelistKeywords.join(', ')}`],
                    dataRows: []
                };
            }
        } catch (e) {
            console.error("Lightweight layout verification failed", e);
        }

        if (hash && processedFileHashes.includes(hash)) {
            return {
                fileName: file.name,
                file,
                hash,
                isDuplicateFile: true,
                newCount: 0,
                updateCount: 0,
                skipCount: 0,
                errors: ["Warning: This exact file (matching SHA-256 hash) has already been successfully processed and imported before. Re-importing is unnecessary."],
                dataRows: []
            };
        }

        const errors = [];
        let newCount = 0;
        let updateCount = 0;
        let skipCount = 0;
        let dataRows = [];

        if (type === 'sales') {
            const result = await parseExcelFile([file]);
            const data = result.transactions || [];
            const customerStatsData = result.customers || [];
            const receivablesData = result.receivables || [];

            if (data.length === 0 && customerStatsData.length === 0 && receivablesData.length === 0) {
                errors.push("Error: No valid transaction, customer, or receivable records found in the spreadsheet.");
            }

            // Validate transaction rows
            const formattedData = data.map((record, idx) => {
                const rowNum = idx + 2; // Approximate row number
                const date = record.parsedDate;
                const amount = record.parsedAmount;
                const itemName = record.originalDesc;

                if (!date) {
                    errors.push(`Row ${rowNum}: Missing or invalid transaction Date.`);
                }
                if (amount === undefined || isNaN(amount)) {
                    errors.push(`Row ${rowNum}: Amount '${record.parsedAmount}' is not a valid number.`);
                }
                if (!itemName) {
                    errors.push(`Row ${rowNum}: Particulars / Description is missing.`);
                }

                return {
                    date,
                    amount: Math.abs(amount || 0),
                    payment_mode: record.parsedType || 'Sales',
                    item_name: itemName,
                    customer_name: record.customerName,
                    invoice_no: record.invoiceNo || null,
                    quantity: record.parsedQty || 1,
                    profit: record.parsedProfit || 0
                };
            }).filter(r => r.date && !isNaN(r.amount) && r.item_name);

            if (formattedData.length > 0) {
                const allDates = formattedData.map(d => d.date).sort();
                const minDate = allDates[0];
                const maxDate = allDates[allDates.length - 1];

                const existingTxns = await fetchAllRecords('transactions', 'id, date, amount, item_name, invoice_no, payment_mode, customer_name', minDate, maxDate);

                const createTxSig = (t) => {
                    let d = String(t.date || '').trim();
                    if (d.includes('T')) d = d.split('T')[0];
                    const a = Number(t.amount || 0).toFixed(2);
                    const i = String(t.item_name || '').trim().toLowerCase();
                    const inv = String(t.invoice_no || '').trim().toLowerCase();
                    const cleanInv = (inv === 'null' || inv === 'undefined' || inv.startsWith('inv-missing-')) ? '' : inv;
                    return `${d}|${a}|${i}|${cleanInv}`;
                };

                const existingTxMap = new Map();
                existingTxns.forEach(t => existingTxMap.set(createTxSig(t), t));

                formattedData.forEach(t => {
                    const sig = createTxSig(t);
                    const existing = existingTxMap.get(sig);

                    if (!existing) {
                        newCount++;
                    } else if (
                        existing.payment_mode !== t.payment_mode ||
                        (t.customer_name && existing.customer_name !== t.customer_name)
                    ) {
                        updateCount++;
                    } else {
                        skipCount++;
                    }
                });

                dataRows = formattedData.slice(0, 5); // Take first 5 rows for UI preview
            }

        } else if (type === 'production') {
            const data = await parseProductionFile([file]);
            if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) {
                errors.push("Error: No valid production logs found in file.");
            }

            const formatRows = (items, rowType) => items.map((item, idx) => {
                const rowNum = idx + 2;
                if (!item.date) {
                    errors.push(`Row ${rowNum}: Missing or invalid log Date.`);
                }
                if (item.weight === undefined || isNaN(item.weight)) {
                    errors.push(`Row ${rowNum}: Weight '${item.weight}' is not a valid number.`);
                }
                if (!item.material) {
                    errors.push(`Row ${rowNum}: Material name is missing.`);
                }

                return {
                    id: item.id,
                    date: item.date,
                    type: rowType,
                    material: item.material,
                    weight: item.weight || 0,
                    remarks: `Sheet: ${item.source_sheet || 'N/A'}`,
                    source_file: item.source_file || file.name
                };
            }).filter(row => row.date && row.weight);

            const allRows = [
                ...formatRows(data.stockIn, 'stock_in'),
                ...formatRows(data.preProduction, 'usage'),
                ...formatRows(data.postProduction, 'production')
            ];

            if (allRows.length > 0) {
                const ids = allRows.map(r => r.id);
                const { data: existingLogs, error: fetchErr } = await supabase
                    .from('production_logs')
                    .select('id, date, type, material, weight, remarks, source_file')
                    .in('id', ids);

                if (!fetchErr && existingLogs) {
                    const existingMap = new Map(existingLogs.map(l => [l.id, l]));

                    allRows.forEach(row => {
                        const existing = existingMap.get(row.id);
                        if (!existing) {
                            newCount++;
                        } else {
                            const isDifferent =
                                existing.date !== row.date ||
                                existing.type !== row.type ||
                                existing.material !== row.material ||
                                Number(existing.weight) !== Number(row.weight) ||
                                existing.remarks !== row.remarks ||
                                existing.source_file !== row.source_file;

                            if (isDifferent) {
                                updateCount++;
                            } else {
                                skipCount++;
                            }
                        }
                    });
                } else {
                    newCount = allRows.length;
                }

                dataRows = allRows.slice(0, 5); // Take first 5 rows for UI preview
            }
        }

        return {
            fileName: file.name,
            file,
            hash,
            isDuplicateFile: false,
            newCount,
            updateCount,
            skipCount,
            errors,
            dataRows
        };
    };

    const runDryRunValidation = async (file, type) => {
        setLoading(true);
        setStatus({ type: 'idle', message: `Running dry-run validation for ${file.name}...` });

        try {
            const preview = await validateSingleFile(file, type);
            setPreviewData({
                isFolder: false,
                type,
                ...preview
            });

            if (preview.isDuplicateFile) {
                setStatus({ type: 'error', message: 'Dry-run blocked: Duplicate file detected.' });
            } else {
                setStatus({ type: 'success', message: 'Dry-run validation complete. Please review the details below.' });
            }
        } catch (err) {
            console.error("Dry run validation failed", err);
            setStatus({ type: 'error', message: 'Dry-run failed: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const confirmIngestion = async () => {
        if (!previewData) return;

        setLoading(true);
        try {
            if (previewData.isFolder) {
                const { files, type } = previewData;
                setStatus({ type: 'idle', message: `Committing folder ingestion (0/${files.length} files)...` });

                let successCount = 0;
                let skipCount = 0;
                let failCount = 0;
                let newRecordsCount = 0;
                const hashesToCache = [];

                for (let i = 0; i < files.length; i++) {
                    const fileMeta = files[i];
                    if (!fileMeta.selected) {
                        continue;
                    }
                    setStatus({ type: 'idle', message: `Committing file ${i+1}/${files.length}: ${fileMeta.fileName}...` });

                    if (fileMeta.isDuplicateFile) {
                        skipCount++;
                        continue;
                    }

                    try {
                        let result;
                        if (type === 'sales') {
                            result = await processSalesData(fileMeta.file);
                            if (!result.success) throw new Error(result.message);
                            newRecordsCount += result.newTxns + result.updatedTxns;
                        } else if (type === 'production') {
                            result = await processProductionData(fileMeta.file);
                            if (!result.success && !result.totalNew) {
                                if (result.message.includes('No valid')) throw new Error(result.message);
                            } else {
                                newRecordsCount += result.totalNew || 0;
                            }
                        }

                        successCount++;
                        if (fileMeta.hash) {
                            hashesToCache.push(fileMeta.hash);
                        }

                        addSyncLog({
                            fileName: fileMeta.fileName,
                            fileId: `Folder Import (${type === 'sales' ? 'Sales' : 'Prod'})`,
                            status: 'success',
                            message: result?.message || 'Successfully parsed and imported.'
                        });

                    } catch (fileErr) {
                        console.error(`Error writing ${fileMeta.fileName} to DB:`, fileErr);
                        failCount++;
                        addSyncLog({
                            fileName: fileMeta.fileName,
                            fileId: `Folder Import (${type === 'sales' ? 'Sales' : 'Prod'})`,
                            status: 'failed',
                            message: fileErr.message || 'Failed during DB write.'
                        });
                    }
                }

                if (hashesToCache.length > 0) {
                    setProcessedFileHashes(prev => [...prev, ...hashesToCache]);
                }

                setPreviewData(null);
                await checkDbStatus(true);

                const finalMsg = `Imported: ${successCount} files successfully, ${skipCount} duplicates skipped, ${failCount} failed. Total new/updated records: ${newRecordsCount}`;
                if (failCount > 0) {
                    setStatus({ type: 'error', message: `Completed with errors. ${finalMsg}` });
                } else {
                    setStatus({ type: 'success', message: finalMsg });
                }
            } else {
                const { file, type, hash } = previewData;
                setStatus({ type: 'idle', message: `Committing data from ${file.name} to database...` });

                let result;
                if (type === 'sales') {
                    result = await processSalesData(file);
                    if (!result.success) throw new Error(result.message);

                    addSyncLog({
                        fileName: file.name,
                        fileId: 'Manual Upload (Sales)',
                        status: 'success',
                        message: result.message || 'Successfully parsed and imported.'
                    });
                    setSalesFile(null);
                } else if (type === 'production') {
                    result = await processProductionData(file);
                    if (!result.success && !result.totalNew) {
                        if (result.message.includes('No valid')) throw new Error(result.message);
                        setStatus({ type: 'success', message: "All records already exist." });
                        addSyncLog({
                            fileName: file.name,
                            fileId: 'Manual Upload (Prod)',
                            status: 'warning',
                            message: 'All records already exist in database (no new inserts).'
                        });
                    } else {
                        setStatus({ type: 'success', message: result.message });
                        addSyncLog({
                            fileName: file.name,
                            fileId: 'Manual Upload (Prod)',
                            status: 'success',
                            message: result.message || 'Successfully parsed and imported.'
                        });
                    }
                    setProductionFile(null);
                }

                if (hash) {
                    setProcessedFileHashes(prev => [...prev, hash]);
                }

                setPreviewData(null);
                checkDbStatus();
                setStatus({ type: 'success', message: result.message || 'Import successful!' });
            }
        } catch (error) {
            console.error("Ingestion Write Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const executeUpload = async (type) => {
        const file = type === 'sales' ? salesFile : productionFile;
        if (!file) return;
        await runDryRunValidation(file, type);
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

        const previewFiles = [];
        let totals = { newCount: 0, updateCount: 0, skipCount: 0, errorCount: 0 };

        try {
            for (let i = 0; i < excelFiles.length; i++) {
                const file = excelFiles[i];
                setStatus({ type: 'idle', message: `Dry-run validating folder files: ${i+1}/${excelFiles.length}...` });

                const preview = await validateSingleFile(file, type);
                previewFiles.push({
                    ...preview,
                    selected: true
                });

                totals.newCount += preview.newCount;
                totals.updateCount += preview.updateCount;
                totals.skipCount += preview.skipCount;
                totals.errorCount += preview.errors.length;
            }

            setPreviewData({
                isFolder: true,
                type,
                totals,
                files: previewFiles
            });

            setStatus({ type: 'success', message: `Dry-run completed for ${excelFiles.length} files. Review breakdown below.` });
        } catch (err) {
            console.error("Folder dry run validation failed", err);
            setStatus({ type: 'error', message: 'Folder dry-run failed: ' + err.message });
        } finally {
            setLoading(false);
            if (prodFolderRef.current) prodFolderRef.current.value = "";
        }
    };

    const toggleFileSelection = (index) => {
        setPreviewData(prev => {
            if (!prev || !prev.isFolder) return prev;
            const newFiles = prev.files.map((f, idx) => idx === index ? { ...f, selected: !f.selected } : f);

            // Recalculate totals for selected files
            const totals = { newCount: 0, updateCount: 0, skipCount: 0, errorCount: 0 };
            newFiles.forEach(f => {
                if (f.selected) {
                    totals.newCount += f.newCount;
                    totals.updateCount += f.updateCount;
                    totals.skipCount += f.skipCount;
                    totals.errorCount += f.errors.length;
                }
            });

            return { ...prev, files: newFiles, totals };
        });
    };

    const toggleSelectAll = (checked) => {
        setPreviewData(prev => {
            if (!prev || !prev.isFolder) return prev;
            const newFiles = prev.files.map(f => ({ ...f, selected: checked }));

            // Recalculate totals
            const totals = { newCount: 0, updateCount: 0, skipCount: 0, errorCount: 0 };
            if (checked) {
                newFiles.forEach(f => {
                    totals.newCount += f.newCount;
                    totals.updateCount += f.updateCount;
                    totals.skipCount += f.skipCount;
                    totals.errorCount += f.errors.length;
                });
            }

            return { ...prev, files: newFiles, totals };
        });
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
                    const result = await processProductionData(file);

                    if (result.success && result.totalNew > 0) {
                        setWatchLogs(prev => [`✅ Uploaded: ${entry.name} (${result.totalNew} rows)`, ...prev]);
                    } else if (!result.success) {
                        setWatchLogs(prev => [`⚠️ Skipped: ${entry.name} (${result.message})`, ...prev]);
                    } else {
                        setWatchLogs(prev => [`ℹ️ No new data: ${entry.name}`, ...prev]);
                    }
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
                <div className="flex-center" style={{ marginTop: '1.5rem', flexDirection: 'column', gap: '1rem' }}>
                    <div className="btn-toggle-group">
                        <button onClick={() => setUploadMode('file')} disabled={isWatching} className={`btn-toggle ${uploadMode === 'file' ? 'active blue' : ''}`}>
                            <FileIcon size={16} /> Single File
                        </button>
                        <button onClick={() => setUploadMode('folder')} className={`btn-toggle ${uploadMode === 'folder' ? 'active blue' : ''}`}>
                            <FolderInput size={16} /> Folder Mode
                        </button>
                    </div>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={googleSyncEnabled}
                            onChange={(e) => setGoogleSyncEnabled(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        Enable Google Drive Integration
                    </label>
                </div>
            </div>

            {/* Status Cards */}
            {dbReport && (
                <div className="stat-grid animate-fade-in">
                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{dbReport.transactions.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Transactions</p>
                    </div>

                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{dbReport.customers.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#d8b4fe', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Customers</p>
                    </div>

                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{dbReport.production.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Production Logs</p>
                    </div>

                    <div className="stat-card">
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{dbReport.receivables.toLocaleString()}</p>
                        <p style={{ fontSize: '0.75rem', color: '#fca5a5', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Receivables</p>
                    </div>
                </div>
            )}

            {/* Ingestion Preview Mode Panel (Requirement 2 & 3) */}
            {previewData && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--accent-primary)', background: 'rgba(30, 41, 59, 0.7)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#60a5fa' }}>
                        <Database size={24} /> Dry-Run Ingestion Preview: {previewData.isFolder ? `Folder Batch (${previewData.files.length} files)` : previewData.fileName}
                    </h3>
                    
                    {!previewData.isFolder && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
                            File SHA-256 Hash: <span style={{ color: 'var(--text-primary)' }}>{previewData.hash || 'Calculating...'}</span>
                        </p>
                    )}

                    {!previewData.isFolder && previewData.isDuplicateFile && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', color: '#f87171', fontSize: '0.875rem' }}>
                            {previewData.errors[0]}
                        </div>
                    )}

                    {(!previewData.isFolder ? !previewData.isDuplicateFile : true) && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', flex: 1, textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>New Records</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>
                                        {previewData.isFolder ? previewData.totals.newCount : previewData.newCount}
                                    </span>
                                </div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', flex: 1, textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Updates Detected</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
                                        {previewData.isFolder ? previewData.totals.updateCount : previewData.updateCount}
                                    </span>
                                </div>
                                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', flex: 1, textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Duplicate / Skip</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                                        {previewData.isFolder ? previewData.totals.skipCount : previewData.skipCount}
                                    </span>
                                </div>
                            </div>

                            {previewData.isFolder && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Folder Files Breakdown ({previewData.files.length} files)
                                    </h4>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.15)' }} className="custom-scrollbar">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                                                    <th style={{ padding: '0.5rem 0.75rem', width: '40px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={previewData.files.length > 0 && previewData.files.every(f => f.selected)}
                                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>File Name</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>Status</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>New</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>Updates</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>Duplicates</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>Errors</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.files.map((fileMeta, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: fileMeta.selected ? 1 : 0.5 }}>
                                                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!fileMeta.selected}
                                                                onChange={() => toggleFileSelection(i)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{fileMeta.fileName}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem' }}>
                                                            {fileMeta.isDuplicateFile ? (
                                                                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>Duplicate (Skip)</span>
                                                            ) : fileMeta.errors.length > 0 ? (
                                                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Validation Errors</span>
                                                            ) : (
                                                                <span style={{ color: '#34d399', fontWeight: 'bold' }}>Ready</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: '#34d399' }}>{fileMeta.newCount}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: '#60a5fa' }}>{fileMeta.updateCount}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: '#fbbf24' }}>{fileMeta.skipCount}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: '#f87171' }}>{fileMeta.errors.length}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {previewData.isFolder ? (
                                previewData.totals.errorCount > 0 && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ color: '#f87171', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                            ⚠️ Validation Errors ({previewData.totals.errorCount})
                                        </h4>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#fca5a5' }} className="custom-scrollbar">
                                            {previewData.files.filter(f => f.errors.length > 0).map((fileMeta, idx) => (
                                                <div key={idx} style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#f87171', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                                                        File: {fileMeta.fileName}
                                                    </div>
                                                    {fileMeta.errors.map((err, i) => (
                                                        <div key={i} style={{ paddingLeft: '0.5rem', marginBottom: '0.15rem' }}>{err}</div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ) : (
                                previewData.errors.length > 0 && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ color: '#f87171', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                            ⚠️ Validation Errors ({previewData.errors.length})
                                        </h4>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#fca5a5' }} className="custom-scrollbar">
                                            {previewData.errors.map((err, i) => (
                                                <div key={i} style={{ borderBottom: '1px solid rgba(239,68,68,0.1)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>{err}</div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}

                            {((previewData.isFolder ? previewData.totals.errorCount === 0 : previewData.errors.length === 0) && (!previewData.isFolder ? !previewData.isDuplicateFile : true)) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#34d399', fontSize: '0.875rem' }}>
                                    <CheckCircle size={18} /> Schema validation passed successfully. No anomalies found.
                                </div>
                            )}

                            {((!previewData.isFolder && previewData.dataRows.length > 0) || (previewData.isFolder && previewData.files.some(f => f.dataRows.length > 0))) && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Preview Sample Rows {previewData.isFolder ? `(from ${previewData.files.find(f => f.dataRows.length > 0)?.fileName})` : '(First 5)'}
                                    </h4>
                                    <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.15)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>Date</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>Particulars/Material</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{previewData.type === 'sales' ? 'Amount' : 'Weight'}</th>
                                                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{previewData.type === 'sales' ? 'Type' : 'Log Type'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(previewData.isFolder ? (previewData.files.find(f => f.dataRows.length > 0)?.dataRows || []) : previewData.dataRows).map((row, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)' }}>{row.date || 'N/A'}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{row.item_name || row.material}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)' }}>
                                                            {previewData.type === 'sales' ? `₹${Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${row.weight} kg`}
                                                        </td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{row.payment_mode || row.type}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            onClick={() => {
                                setPreviewData(null);
                                setSalesFile(null);
                                setProductionFile(null);
                                setStatus({ type: 'idle', message: '' });
                            }}
                            className="btn-secondary"
                            style={{ height: '42px', padding: '0 1.5rem' }}
                        >
                            Cancel & Discard
                        </button>
                        <button
                            onClick={confirmIngestion}
                            disabled={loading || (previewData.isFolder ? (previewData.totals.newCount === 0 && previewData.totals.updateCount === 0) : (previewData.isDuplicateFile || (previewData.errors.length > 0 && previewData.newCount === 0 && previewData.updateCount === 0)))}
                            className="btn-primary"
                            style={{
                                height: '42px',
                                padding: '0 2rem',
                                background: (previewData.isFolder ? false : previewData.isDuplicateFile) ? 'rgba(255,255,255,0.1)' : '#10b981',
                                border: 'none',
                                opacity: (loading || (previewData.isFolder ? (previewData.totals.newCount === 0 && previewData.totals.updateCount === 0) : (previewData.isDuplicateFile || (previewData.errors.length > 0 && previewData.newCount === 0 && previewData.updateCount === 0)))) ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Processing...' : 'Confirm Ingestion Write'}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Areas */}
            <div className="admin-grid">

                {/* Google Drive Integration Panel */}
                {googleSyncEnabled && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--accent-primary)', gridColumn: '1 / -1' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#3b82f6' }}>
                        <CloudLightning size={24} /> Google Drive Auto-Sync
                        <button
                            onClick={() => {
                                setDriveConfig({ clientId: 'YOUR_CLIENT_ID_HERE', apiKey: 'YOUR_API_KEY_HERE' });
                                alert("Credentials reset. Click Browse to enter them again.");
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', marginLeft: 'auto' }}
                        >
                            (Reset Credentials)
                        </button>
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '600px' }}>
                        Automatically pull new Excel files from a specific Google Drive folder.
                        files will be processed and added to the database.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>

                        {/* Folder Selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Watch Folder</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={watchConfig.folderName || 'No Folder Selected'}
                                    readOnly
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--glass-border)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        color: 'var(--text-primary)',
                                        flex: 1,
                                        height: '42px',
                                        minWidth: 0 // Allow shrinking
                                    }}
                                />
                                <button
                                    className="btn-secondary"
                                    onClick={() => handleDrivePick('folder')}
                                    style={{
                                        whiteSpace: 'nowrap',
                                        height: '42px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 1.5rem',
                                        flexShrink: 0
                                    }}
                                >
                                    <FolderInput size={18} style={{ marginRight: '0.5rem' }} /> Browse
                                </button>
                            </div>
                        </div>

                        {/* Interval Config & Manual Sync */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sync Interval (Minutes)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min="1"
                                    value={watchConfig.intervalMinutes}
                                    onChange={(e) => setWatchConfig(prev => ({ ...prev, intervalMinutes: parseInt(e.target.value) || 15 }))}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--glass-border)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        color: 'var(--text-primary)',
                                        height: '42px',
                                        flex: 1,
                                        minWidth: 0
                                    }}
                                />
                                <button
                                    className="btn-secondary"
                                    onClick={() => runDriveSync()}
                                    disabled={loading || !watchConfig.folderId}
                                    style={{
                                        whiteSpace: 'nowrap',
                                        height: '42px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 1.5rem',
                                        flexShrink: 0,
                                        opacity: (loading || !watchConfig.folderId) ? 0.5 : 1
                                    }}
                                >
                                    <RefreshCw size={18} style={{ marginRight: '0.5rem' }} className={loading ? 'spin' : ''} /> Sync Now
                                </button>
                            </div>
                        </div>

                        {/* Toggle */}
                        <button
                            className={`btn-primary ${watchConfig.isActive ? 'active' : ''}`}
                            onClick={() => {
                                if (!watchConfig.folderId) return alert("Please select a folder first.");
                                setWatchConfig(prev => ({ ...prev, isActive: !prev.isActive }));
                                if (!watchConfig.isActive) runDriveSync(); // Trigger immediate on start
                            }}
                            style={{
                                background: watchConfig.isActive ? '#10b981' : 'var(--bg-secondary)',
                                border: watchConfig.isActive ? 'none' : '1px solid var(--text-secondary)',
                                height: '42px', // Match others
                                marginTop: '1.75rem' // Align with inputs roughly? Or just let grid handle it.
                                // Actually in a grid with alignItems: end, it should align bottom.
                            }}
                        >
                            {watchConfig.isActive ? (
                                <> <RefreshCw size={18} className="spin" style={{ marginRight: '0.5rem' }} /> Auto-Sync Active </>
                            ) : (
                                <> <PlayCircle size={18} style={{ marginRight: '0.5rem' }} /> Enable Auto-Sync </>
                            )}
                        </button>
                    </div>

                    {/* Status Bar */}
                    {watchConfig.folderId && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                                Status: <span style={{ color: watchConfig.isActive ? '#10b981' : '#f59e0b' }}>{watchConfig.isActive ? 'Running' : 'Paused'}</span>
                            </span>
                            <span>
                                Last Sync: {watchConfig.lastSync ? new Date(watchConfig.lastSync).toLocaleTimeString() : 'Never'}
                            </span>
                            <span>
                                Processed Files: {processedFileIds.size}
                            </span>
                        </div>
                    )}

                    {/* Progress Tracker (Requirement 5) */}
                    {syncProgress && (
                        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.5rem' }} className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <RefreshCw className="spin" size={14} /> Active Google Drive Sync Queue
                                </span>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    File {syncProgress.currentFileIndex} of {syncProgress.totalFiles}
                                </span>
                            </div>
                            
                            <div style={{ height: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                <div style={{ height: '100%', width: `${syncProgress.percent}%`, background: 'linear-gradient(90deg, #3b82f6, #10b981)', transition: 'width 0.3s ease-out' }}></div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {syncProgress.currentFileName ? `Processing: ${syncProgress.currentFileName}` : 'Starting...'}
                                </span>
                                <span>{syncProgress.fileStatus}</span>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Sync Audit Trail (Requirement 4) */}
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--glass-border)', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#10b981' }}>
                            <FileText size={24} /> Sync Log & Audit Trail
                        </h3>
                        {syncLogs.length > 0 && (
                            <button
                                onClick={() => {
                                    if(confirm("Are you sure you want to clear the sync history log?")) {
                                        setSyncLogs([]);
                                        localStorage.removeItem('driveSyncLogs');
                                    }
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    fontSize: '0.75rem',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear History
                            </button>
                        )}
                    </div>

                    {syncLogs.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0', margin: 0, fontSize: '0.875rem' }}>
                            No synchronization logs recorded yet. Complete a Google Drive sync to populate the log.
                        </p>
                    ) : (
                        <div style={{ maxHeight: '440px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.15)' }} className="custom-scrollbar">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Timestamp</th>
                                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>File Target</th>
                                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Details / Messages</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {syncLogs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {log.fileName}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    background: log.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : (log.status === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                                    color: log.status === 'success' ? '#34d399' : (log.status === 'warning' ? '#fbbf24' : '#f87171')
                                                }}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                                                {log.message}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sales Upload */}
                <div className={`upload-card sales group ${isWatching ? 'style={{ opacity: 0.3, pointerEvents: "none", filter: "grayscale(1)" }}' : ''}`}>
                    <div className="upload-icon-box icon-sales">
                        {uploadMode === 'file' ? <CloudLightning size={32} /> : <FolderInput size={32} />}
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Sales & Expenses</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Parses Sales, Expenses, and Customer Insights</p>

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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Production Logs</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Stock In · Usage · Production Output</p>
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
                        <label style={{ marginTop: '1rem', width: '100%', maxWidth: '200px', cursor: 'pointer' }}>
                            <input type="file" ref={prodFolderRef} webkitdirectory="" directory="" multiple onChange={(e) => handleFolderUpload(e, 'production')} disabled={loading} style={{ display: 'none' }} />
                            <div className="btn-action btn-prod" style={{ justifyContent: 'center', width: '100%' }}>
                                <FolderInput size={18} /> Upload Folder
                            </div>
                        </label>
                    )}
                </div>
            </div>

            {/* Watcher Logs */}
            {isWatching && (
                <div style={{ marginTop: '2rem', width: '100%', maxWidth: '56rem', background: 'rgba(0,0,0,0.4)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', backdropFilter: 'blur(4px)' }} className="animate-fade-in">
                    <h4 style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Radio size={12} /> Live Watcher Logs
                    </h4>
                    <div className="custom-scrollbar" style={{ height: '8rem', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.625rem', color: 'var(--text-secondary)' }}>
                        {watchLogs.map((log, i) => (
                            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>{log}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Toast */}
            {status.message && !isWatching && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', zIndex: 50, backdropFilter: 'blur(12px)', border: status.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: status.type === 'error' ? '#fca5a5' : '#6ee7b7' }} className="animate-fade-in">
                    {status.type === 'success' ? <CheckCircle size={20} /> : (status.type === 'error' ? <AlertCircle size={20} /> : <FileIcon size={20} className="spin-slow" />)}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{status.message}</span>
                </div>
            )}

            {/* Whitelist Keywords Manager */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '56rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowKeywordMgr(!showKeywordMgr)}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#60a5fa', fontSize: '1.25rem' }}>
                        <Database size={24} /> Template Security: Whitelist Keywords ({whitelistKeywords.length})
                    </h3>
                    <button className="btn-secondary" style={{ height: '32px', fontSize: '0.75rem', padding: '0 1rem' }}>
                        {showKeywordMgr ? 'Hide Settings' : 'Manage Keywords'}
                    </button>
                </div>

                {showKeywordMgr && (
                    <div style={{ marginTop: '1.5rem' }} className="animate-fade-in">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                            Excel workbooks will be verified before upload. The system will reject files if none of their sheet names contain at least one of the keywords below. You can add new keywords to support new spreadsheet structures in the future.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                            {whitelistKeywords.map((kw, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                                    {kw}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setWhitelistKeywords(prev => prev.filter((_, idx) => idx !== i));
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Add new sheet keyword (e.g. attendance, supplies)..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--glass-border)',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-primary)',
                                    flex: 1,
                                    height: '42px',
                                    fontSize: '0.875rem'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const trimmed = newKeyword.trim().toLowerCase();
                                        if (trimmed && !whitelistKeywords.includes(trimmed)) {
                                            setWhitelistKeywords(prev => [...prev, trimmed]);
                                            setNewKeyword('');
                                        }
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    const trimmed = newKeyword.trim().toLowerCase();
                                    if (trimmed && !whitelistKeywords.includes(trimmed)) {
                                        setWhitelistKeywords(prev => [...prev, trimmed]);
                                        setNewKeyword('');
                                    }
                                }}
                                className="btn-primary"
                                style={{ height: '42px', padding: '0 1.5rem', whiteSpace: 'nowrap' }}
                            >
                                Add Keyword
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Reset keywords back to defaults?")) {
                                        setWhitelistKeywords(DEFAULT_KEYWORDS);
                                    }
                                }}
                                className="btn-secondary"
                                style={{ height: '42px', padding: '0 1rem', whiteSpace: 'nowrap' }}
                            >
                                Reset Defaults
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* DEBUG REPORT UI */}
            {testReport && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.3)', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', width: '100%', maxWidth: '56rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>📂 Diagnostic Report: {testReport.fileName}</h3>

                    <div className="stat-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)' }}>
                            <span style={{ display: 'block', color: '#64748b', marginBottom: '0.25rem' }}>Stock In</span>
                            <span style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{testReport.parsedCounts.stockIn}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)' }}>
                            <span style={{ display: 'block', color: '#64748b', marginBottom: '0.25rem' }}>Pre-Prod</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: testReport.parsedCounts.preProd === 0 ? '#ef4444' : 'white' }}>{testReport.parsedCounts.preProd}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)' }}>
                            <span style={{ display: 'block', color: '#64748b', marginBottom: '0.25rem' }}>Post-Prod</span>
                            <span style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{testReport.parsedCounts.postProd}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '400px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h4 style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>1. Raw Excel Data (Top 10 Rows)</h4>
                            <div style={{ flex: 1, background: 'black', padding: '1rem', borderRadius: '0.25rem', overflow: 'auto', border: '1px solid var(--glass-border)', whiteSpace: 'pre' }}>
                                {JSON.stringify(testReport.previewRows, null, 2)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h4 style={{ fontWeight: 'bold', color: '#34d399', marginBottom: '0.5rem' }}>2. Parser Logs</h4>
                            <div style={{ flex: 1, background: 'black', padding: '1rem', borderRadius: '0.25rem', overflow: 'auto', border: '1px solid var(--glass-border)', whiteSpace: 'pre', color: 'rgba(16, 185, 129, 0.8)' }}>
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
