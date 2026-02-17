import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseExcelFile } from '../../utils/excelParser';
import { parseProductionFile } from '../../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers, RefreshCw, FileSpreadsheet, CloudLightning, FolderInput, File as FileIcon, PlayCircle, StopCircle, Radio, X, Users, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { loadGapi, loadGis, createPicker, downloadDriveFile } from '../../utils/driveUtils';

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
                // Only show status if we actually find files or on error, to reduce noise?
                // Or just show idle.
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
                    setLoading(false);
                    return;
                }

                setStatus({ type: 'idle', message: `Found ${filesToProcess.length} files to sync...` });
                let successCount = 0;

                for (const fileMeta of filesToProcess) {
                    try {
                        const blob = await downloadDriveFile(fileMeta.id, accessToken);
                        const file = new File([blob], fileMeta.name, { type: fileMeta.mimeType });

                        let result = { success: false };

                        // Try Sales First
                        try {
                            result = await processSalesData(file);
                        } catch (e) { /* ignore */ }

                        // If not sales, Try Production
                        if (!result.success) {
                            // Reset file stream? JS File object is readable multiple times usually
                            try {
                                result = await processProductionData(file);
                            } catch (e) {
                                console.warn("Prod Parse Failed", e);
                            }
                        }

                        if (result.success || (result.message && !result.message.includes('No valid'))) {
                            successCount++;
                            // Mark as processed (add to Set)
                            // We add to set, but for updates it's already there. That's fine.
                            setProcessedFileIds(prev => {
                                const next = new Set(prev);
                                next.add(fileMeta.id);
                                return next;
                            });
                        }

                    } catch (err) {
                        console.error(`Sync Error for ${fileMeta.name}:`, err);
                    }
                }

                setWatchConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
                setStatus({ type: 'success', message: `Auto-Sync: Processed ${successCount}/${filesToProcess.length} files.` });
                checkDbStatus(true);

            } catch (err) {
                console.error("Auto Sync Error", err);
                setStatus({ type: 'error', message: "Auto-Sync Failed: " + err.message });
            } finally {
                setLoading(false);
            }
        };

        // Trigger Auth if needed
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: driveConfig.clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (resp) => {
                if (resp.access_token) performSync(resp.access_token);
            },
        });
        // Try silent first?
        // Actually for "Auto" we assume we have a token or need to prompt.
        // If we are 'isActive', we should probably prompt once and keep token?
        // Token expires in 1hr.
        // effectively we need to request it.
        client.requestAccessToken({ prompt: '' }); // Try silent
    }, [driveConfig.clientId, tokenClient]); // minimal deps

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
            const { count: custCount, error: cError } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).not('customer_name', 'is', null);
            const { count: plCount, error: plError } = await supabase.from('production_logs').select('*', { count: 'exact', head: true });

            if (txError) throw txError;
            if (plError) throw plError;

            setDbReport({ transactions: txCount, production: plCount, customers: custCount || 0 });
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
        const hasTransactions = data && data.length > 0;
        const hasReceivables = receivablesData.length > 0;

        if (!hasTransactions && !hasReceivables) {
            return { success: false, message: 'No valid records found' };
        }

        let uniqueTransactions = [];
        let updates = [];
        let addedRec = 0;

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
                    return `${d}|${a}|${i}|${inv}`;
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

                if (uniqueTransactions.length > 0) await supabase.from('transactions').insert(uniqueTransactions);
                if (updates.length > 0) await supabase.from('transactions').upsert(updates);
            }
        }

        // 2. Receivables (Replace Strategy)
        if (hasReceivables) {
            const mappedReceivables = receivablesData.map(r => ({
                customer_name: r.customerName,
                address: r.address,
                city: r.city,
                contact: r.contact,
                balance: r.balanceDue,
                updated_at: new Date()
            }));

            await supabase.from('customer_receivables').delete().neq('customer_name', '_placeholder_');
            const { error } = await supabase.from('customer_receivables').insert(mappedReceivables);
            if (!error) addedRec = mappedReceivables.length;
        }

        return {
            success: true,
            newTxns: uniqueTransactions.length,
            updatedTxns: updates.length,
            receivables: addedRec,
            message: `Processed: ${uniqueTransactions.length} new txns, ${updates.length} updated, ${addedRec} receivables.`
        };
    };

    const processProductionData = async (file) => {
        const data = await parseProductionFile([file]);
        if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) {
            return { success: false, message: "No valid production logs found." };
        }

        const allDates = [...data.stockIn.map(d => d.date), ...data.preProduction.map(d => d.date), ...data.postProduction.map(d => d.date)].filter(d => d).sort();
        if (allDates.length === 0) return { success: false, message: "No dates found in data." };

        const minDate = allDates[0];
        const maxDate = allDates[allDates.length - 1];

        const existingLogs = await fetchAllRecords('production_logs', 'date, material, weight, type', minDate, maxDate);

        const createSig = (d) => {
            let dateStr = String(d.date || '').trim();
            if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
            return `${dateStr}|${String(d.material).trim().toLowerCase()}|${Number(d.weight).toFixed(2)}|${d.type}`;
        };
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

        if (totalNew > 0) {
            if (newStockIn.length) await supabase.from('production_logs').insert(newStockIn);
            if (newPreProd.length) await supabase.from('production_logs').insert(newPreProd);
            if (newPostProd.length) await supabase.from('production_logs').insert(newPostProd);
        }

        return {
            success: true,
            totalNew,
            details: `Stock-In: ${newStockIn.length}, Pre-Prod: ${newPreProd.length}, Post-Prod: ${newPostProd.length}`,
            message: `Added ${totalNew} new records.`
        };
    };

    const executeUpload = async (type) => {
        const file = type === 'sales' ? salesFile : productionFile;
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'idle', message: `Processing ${file.name}...` });

        try {
            if (type === 'sales') {
                const result = await processSalesData(file);
                if (!result.success) {
                    throw new Error(result.message);
                }
                setStatus({ type: 'success', message: result.message });
                setSalesFile(null);
            } else if (type === 'production') {
                const result = await processProductionData(file);
                if (!result.success && !result.totalNew) { // Allow success with 0 new if just deduped
                    if (result.message.includes('No valid')) throw new Error(result.message);
                    setStatus({ type: 'success', message: "All records already exist." });
                } else {
                    setStatus({ type: 'success', message: result.message });
                }
                setProductionFile(null);
            }

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

        let processedCount = 0;
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;
        let newRecordsCount = 0;
        let receivablesCleared = false; // [NEW] Track if we've cleared old data for this batch
        const errorLogs = [];

        // Helper to update status during loop
        const updateProgress = () => {
            const pct = Math.round((processedCount / excelFiles.length) * 100);
            setStatus({ type: 'idle', message: `Processing ${processedCount}/${excelFiles.length} (${pct}%)...` });
        };

        try {
            for (let i = 0; i < excelFiles.length; i++) {
                const file = excelFiles[i];
                processedCount++;
                updateProgress();

                try {
                    if (type === 'production') {
                        const data = await parseProductionFile([file]);

                        // Check if valid data found
                        if (!data.stockIn.length && !data.preProduction.length && !data.postProduction.length) {
                            // Not an error, just empty/irrelevant file
                            skipCount++;
                            continue;
                        }

                        // Dedup Logic (Per File)
                        const allDates = [...data.stockIn.map(d => d.date), ...data.preProduction.map(d => d.date), ...data.postProduction.map(d => d.date)].filter(d => d).sort();
                        if (allDates.length === 0) { skipCount++; continue; }

                        const minDate = allDates[0];
                        const maxDate = allDates[allDates.length - 1];

                        // Fetch existing for this range
                        const existingLogs = await fetchAllRecords('production_logs', 'date, material, weight, type', minDate, maxDate);

                        const createSig = (d) => {
                            let dateStr = String(d.date || '').trim();
                            if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
                            return `${dateStr}|${String(d.material).trim().toLowerCase()}|${Number(d.weight).toFixed(2)}|${d.type}`;
                        };
                        const existingSet = new Set(existingLogs.map(createSig));

                        const filterNew = (items, type) => {
                            return items
                                .map(i => ({ ...i, type }))
                                .filter(i => !existingSet.has(createSig(({ ...i, type }))))
                                .map(({ id, source_sheet, source_file, ...rest }) => rest);
                        };

                        const newStockIn = filterNew(data.stockIn, 'stock_in');
                        const newPreProd = filterNew(data.preProduction, 'usage');
                        const newPostProd = filterNew(data.postProduction, 'production');
                        const totalNew = newStockIn.length + newPreProd.length + newPostProd.length;

                        if (totalNew > 0) {
                            if (newStockIn.length) await supabase.from('production_logs').insert(newStockIn);
                            if (newPreProd.length) await supabase.from('production_logs').insert(newPreProd);
                            if (newPostProd.length) await supabase.from('production_logs').insert(newPostProd);
                            newRecordsCount += totalNew;
                            successCount++;
                        } else {
                            skipCount++;
                        }

                    } else if (type === 'sales') {
                        const result = await parseExcelFile([file]);
                        const data = result.transactions || [];
                        const receivablesData = result.receivables || [];

                        if (data.length === 0 && receivablesData.length === 0) {
                            skipCount++;
                            continue;
                        }

                        let fileAddedCount = 0;
                        let addedCust = 0;

                        // 1. Transactions
                        if (data.length > 0) {
                            const formattedData = data.map(record => ({
                                date: record.parsedDate,
                                amount: record.parsedAmount,
                                payment_mode: record.parsedType,
                                item_name: record.originalDesc,
                                invoice_no: record.invoiceNo,
                                quantity: record.parsedQty || 1,
                                customer_name: record.customerName
                            })).filter(r => r.date && r.amount && r.item_name);

                            if (formattedData.length > 0) {
                                const allDates = formattedData.map(d => d.date).sort();
                                const minDate = allDates[0];
                                const maxDate = allDates[allDates.length - 1];

                                const existingTxns = await fetchAllRecords('transactions', 'id, date, amount, item_name, invoice_no, payment_mode, customer_name', minDate, maxDate);

                                const createTxSig = (t) => `${String(t.date).split('T')[0]}|${Number(t.amount).toFixed(2)}|${String(t.item_name).trim().toLowerCase()}|${String(t.invoice_no).trim().toLowerCase()}`;
                                const existingTxMap = new Map();
                                existingTxns.forEach(t => existingTxMap.set(createTxSig(t), t));

                                const uniqueTransactions = [];
                                const updates = [];

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

                                if (uniqueTransactions.length > 0) {
                                    const { error } = await supabase.from('transactions').insert(uniqueTransactions);
                                    if (error) throw error;
                                    fileAddedCount += uniqueTransactions.length;
                                }
                                if (updates.length > 0) {
                                    const { error } = await supabase.from('transactions').upsert(updates);
                                    if (error) throw error;
                                    fileAddedCount += updates.length;
                                }
                            }
                        }

                        // 2. Receivables (Direct Insert/Update)
                        if (receivablesData.length > 0) {
                            const mappedReceivables = receivablesData.map(r => ({
                                customer_name: r.customerName,
                                address: r.address,
                                city: r.city,
                                contact: r.contact,
                                balance: r.balanceDue,
                                updated_at: new Date()
                            }));
                            // 2. Receivables
                            // [NEW] Logic: Replace existing data if new data found.
                            // Only clear once per batch (on first file with receivables)
                            if (!receivablesCleared) {
                                await supabase.from('customer_receivables').delete().neq('customer_name', '_placeholder_');
                                receivablesCleared = true;
                            }

                            const { error: recError } = await supabase.from('customer_receivables').insert(mappedReceivables);
                            if (!recError) fileAddedCount += mappedReceivables.length;
                        }

                        // 3. Customer Stats (Restored)
                        const customerData = result.customers || [];
                        if (customerData.length > 0) {
                            const mappedCustomers = customerData.map(c => ({
                                customer_name: String(c.name).trim().toUpperCase(),
                                revenue: c.revenue,
                                profit: c.profit,
                                date: c.parsedDate
                            })).filter(c => c.date); // Ensure date exists

                            if (mappedCustomers.length > 0) {
                                // Simple Batch Insert - rely on table constraints or ignore duplicates for speed
                                // OR: Check existing if we want to be safe. 
                                // Let's try direct insert but log errors instead of crashing, 
                                // assuming 'customer_stats' allows multiple entries or we need to dedup.
                                // Best practice: Check range.

                                const cDates = mappedCustomers.map(c => c.date).sort();
                                const cMin = cDates[0];
                                const cMax = cDates[cDates.length - 1];

                                const existingCusts = await fetchAllRecords('customer_stats', 'date, customer_name, revenue', cMin, cMax);
                                const custSig = (c) => `${String(c.date).split('T')[0]}|${String(c.customer_name).trim().toUpperCase()}`;
                                const existingCustSet = new Set(existingCusts.map(custSig));

                                const newCustStats = mappedCustomers.filter(c => !existingCustSet.has(custSig(c)));

                                if (newCustStats.length > 0) {
                                    const { error: custError } = await supabase.from('customer_stats').insert(newCustStats);
                                    if (!custError) addedCust += newCustStats.length;
                                    else console.warn("Customer Stats Insert Error (Batch):", custError.message);
                                }
                            }
                        }

                        if (fileAddedCount > 0 || addedCust > 0) {
                            newRecordsCount += (fileAddedCount + addedCust);
                            successCount++;
                        } else {
                            skipCount++;
                        }
                    }
                } catch (fileErr) {
                    console.error(`Error processing ${file.name}:`, fileErr);
                    failCount++;
                    errorLogs.push(`${file.name}: ${fileErr.message}`);
                }
            }

            // Update Global Stats
            await checkDbStatus(true);
            if (prodFolderRef.current) prodFolderRef.current.value = "";

            // Final Status Message
            if (failCount === 0) {
                setStatus({
                    type: 'success',
                    message: `Batch Complete. Processed ${successCount} files, Skipped ${skipCount}. Added ${newRecordsCount} records.`
                });
            } else {
                setStatus({
                    type: 'error',
                    message: `Completed with Errors. Success: ${successCount}, Failed: ${failCount}. Added ${newRecordsCount} records. Check console for details.`
                });
                alert(`Batch Upload Completed with ${failCount} errors.\n\nFailed Files:\n${errorLogs.slice(0, 5).join('\n')}\n${errorLogs.length > 5 ? '...' : ''}`);
            }

        } catch (err) {
            console.error("Critical Batch Error:", err);
            setStatus({ type: 'error', message: "Critical Batch Failure: " + err.message });
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
                            <FileIcon size={16} /> Single File
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

                {/* Google Drive Integration Panel */}
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
                </div>

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
                    {status.type === 'success' ? <CheckCircle size={20} /> : (status.type === 'error' ? <AlertCircle size={20} /> : <FileIcon size={20} className="spin-slow" />)}
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
