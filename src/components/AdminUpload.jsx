import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseExcelFile } from '../utils/excelParser';
import { parseProductionFile } from '../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers, RefreshCw } from 'lucide-react';

const AdminUpload = () => {
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [loading, setLoading] = useState(false);
    const [dbReport, setDbReport] = useState(null);

    // --- 1. HANDLE SALES / INVOICE UPLOAD ---
    const handleSalesUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setLoading(true);
        setStatus({ type: 'info', message: 'Parsing Excel files...' });

        try {
            // 1. Parse Local File
            const parsedData = await parseExcelFile(files);

            if (!parsedData.transactions || parsedData.transactions.length === 0) {
                throw new Error("No transaction data found in files.");
            }

            setStatus({ type: 'info', message: `Parsed ${parsedData.transactions.length} rows. Validating...` });

            // 2. Format & Validate for Supabase
            let droppedCount = 0;
            let droppedReasons = [];

            const dbRows = parsedData.transactions.map((t, index) => {
                const row = {
                    date: t.parsedDate,
                    invoice_no: t.invoiceNo,
                    item_name: t.originalDesc || 'Unknown Item',
                    amount: t.parsedAmount || 0,
                    quantity: 0,
                    payment_mode: t.parsedType === 'Expense' ? 'Expense' : 'Sale'
                };

                // Logging logic for dropped rows
                if (!row.date) {
                    droppedCount++;
                    if (droppedReasons.length < 5) droppedReasons.push(`Row ${index}: Date Missing (Orig: ${t.dateStr || 'N/A'})`);
                    return null;
                }
                if (!row.amount) {
                    droppedCount++;
                    if (droppedReasons.length < 5) droppedReasons.push(`Row ${index}: Amount 0 or Missing`);
                    return null;
                }
                return row;
            }).filter(Boolean);

            if (droppedCount > 0) {
                console.warn(`Dropped ${droppedCount} rows. Sample reasons:\n${droppedReasons.join('\n')}`);
            }

            if (dbRows.length === 0) {
                const errorMsg = `All ${parsedData.transactions.length} rows were rejected!\nProbable Cause: Date format mismatch.\n\nSample Rejections:\n${droppedReasons.join('\n')}`;
                alert(errorMsg);
                throw new Error("Validation Failed: No valid rows to insert.");
            }

            // 3. Batch Insert
            const { error } = await supabase
                .from('transactions')
                .insert(dbRows);

            if (error) throw error;

            const successMsg = `Successfully uploaded ${dbRows.length} sales records! (${droppedCount} rows skipped - check console for details)`;
            setStatus({ type: 'success', message: successMsg });

            if (droppedCount > (parsedData.transactions.length * 0.5)) {
                alert(`Warning: High Rejection Rate.\nUploaded: ${dbRows.length}\nSkipped: ${droppedCount}\n\nPlease check the console (F12) or try formatting the Dates in Excel as "YYYY-MM-DD".`);
            }

        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    // --- 2. HANDLE PRODUCTION / STOCK UPLOAD ---
    const handleProductionUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setLoading(true);
        setStatus({ type: 'info', message: 'Parsing Production logs...' });

        try {
            const parsedData = await parseProductionFile(files);

            let allRows = [];

            // Helper to format rows
            const formatRows = (items, type) => items.map(item => ({
                date: item.date,
                type: type, // 'stock_in', 'usage', 'production'
                material: item.material,
                weight: item.weight || 0,
                remarks: `Source: ${item.source || 'Upload'}`
            })).filter(row => row.date && row.weight);

            allRows = [
                ...formatRows(parsedData.stockIn, 'stock_in'),
                ...formatRows(parsedData.preProduction, 'usage'),
                ...formatRows(parsedData.postProduction, 'production')
            ];

            if (allRows.length === 0) {
                throw new Error("No production data found.");
            }

            setStatus({ type: 'info', message: `Uploading ${allRows.length} stock records...` });

            const { error } = await supabase
                .from('production_logs')
                .insert(allRows);

            if (error) throw error;

            setStatus({ type: 'success', message: `Successfully uploaded ${allRows.length} stock logs!` });

        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    // --- 3. DEBUG: CHECK DB STATUS ---
    const checkDbStatus = async () => {
        setLoading(true);
        setStatus({ type: 'info', message: 'Checking database content...' });
        setDbReport(null);

        try {
            // 1. Get ALL Dates for Monthly Counts (Lightweight)
            const { data: allDates, error: countError } = await supabase
                .from('transactions')
                .select('date');

            if (countError) throw countError;

            // Aggregate Counts
            const months = {};
            allDates.forEach(r => {
                const m = r.date ? r.date.substring(0, 7) : 'Unknown';
                months[m] = (months[m] || 0) + 1;
            });

            // 2. Get Latest 5 Transactions (Full Details)
            const { data: latestTxns, error: fetchError } = await supabase
                .from('transactions')
                .select('date, amount, item_name')
                .order('created_at', { ascending: false }) // Use created_at to see actual latest insertions
                .limit(5);

            if (fetchError) throw fetchError;

            // Fallback to sorting by date if created_at fails (e.g. column missing)
            let finalLatest = latestTxns;
            if (!latestTxns || latestTxns.length === 0) {
                const { data: latestDateTxns } = await supabase
                    .from('transactions')
                    .select('date, amount, item_name')
                    .order('date', { ascending: false })
                    .limit(5);
                finalLatest = latestDateTxns;
            }

            setDbReport({
                months: Object.entries(months).sort(),
                latest: finalLatest || [],
                total: allDates.length
            });

            setStatus({ type: 'success', message: 'Database check complete.' });

        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: "Failed to check DB: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    // --- 4. TEST PARSE (DRY RUN) ---
    const handleTestParse = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setLoading(true);
        setStatus({ type: 'info', message: 'Test Parsing (No Upload)...' });

        try {
            const parsedData = await parseExcelFile(files);
            const rawCount = parsedData.transactions.length;

            if (rawCount === 0) {
                alert("TEST RESULT: 0 Transactions Found.\n\nThe parser could not find any valid data rows.\nPossible causes:\n1. 'Amount' or 'Date' column names don't match.\n2. Sheet name doesn't match expected format.");
                setStatus({ type: 'error', message: 'Test Parse: 0 rows found.' });
            } else {
                const sample = parsedData.transactions.slice(0, 3).map(t =>
                    `${t.parsedDate} | ₹${t.parsedAmount} | ${t.originalDesc}`
                ).join('\n');

                alert(`TEST RESULT: Success! Found ${rawCount} valid rows.\n\nSample Data:\n${sample}\n\nYou can safely upload this file.`);
                setStatus({ type: 'success', message: `Test Parse: ${rawCount} rows found.` });
            }

        } catch (err) {
            console.error(err);
            alert(`TEST FAILED: ${err.message}`);
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
            // Reset input so user can re-select same file
            e.target.value = null;
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto bg-[#0f172a] min-h-screen text-slate-100">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Database className="text-blue-500" />
                Data Ingestion (Admin)
            </h1>

            {/* Check DB Button */}
            <div className="mb-6 space-y-4">
                <button
                    onClick={checkDbStatus}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-600"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Debug: Check Database Content
                </button>

                {/* DB REPORT DISPLAY */}
                {dbReport && (
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                            <h3 className="text-lg font-bold text-white">Database Report</h3>
                            <span className="text-slate-400 text-xs text-right">Based on latest uploads</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-blue-400 mb-2 uppercase text-xs tracking-wider">📅 Monthly Distribution</h4>
                                {dbReport.months.length === 0 ? <p className="text-slate-500 italic">No data found in latest 200.</p> :
                                    <div className="bg-slate-900 rounded border border-slate-700 overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-950 text-slate-400">
                                                <tr>
                                                    <th className="p-2">Month</th>
                                                    <th className="p-2 text-right">Records</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dbReport.months.map(([m, c]) => (
                                                    <tr key={m} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                                        <td className="p-2 font-mono text-slate-300">{m}</td>
                                                        <td className="p-2 text-right text-green-400 font-bold">{c}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                }
                            </div>

                            <div>
                                <h4 className="font-semibold text-purple-400 mb-2 uppercase text-xs tracking-wider">🆕 Most Recent Uploads</h4>
                                {dbReport.latest.length === 0 ? <p className="text-slate-500 italic">No transactions found.</p> :
                                    <div className="bg-slate-900 rounded border border-slate-700 p-2 space-y-2">
                                        {dbReport.latest.map((tx, i) => (
                                            <div key={i} className="text-xs border-b border-slate-800 pb-2 last:border-0 last:padding-0">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-slate-200 font-medium">{tx.date}</span>
                                                    <span className="text-emerald-400 font-mono">₹{tx.amount}</span>
                                                </div>
                                                <div className="text-slate-500 truncate" title={tx.item_name}>
                                                    {tx.item_name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Panel */}
            {status.message && (
                <div className={`p-4 rounded-lg mb-8 flex items-center gap-3 ${status.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                    status.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                    }`}>
                    {status.type === 'error' ? <AlertCircle /> : <CheckCircle />}
                    <span>{status.message}</span>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Card 1: Sales Upload */}
                <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <FileText size={24} />
                        </div>
                        <h2 className="text-xl font-semibold">Sales Invoices</h2>
                    </div>
                    <p className="text-slate-400 mb-6 text-sm">
                        Upload invoice Excel files. This will populate the <b>Transactions</b> table (Sales & Expenses).
                        <br /><span className="text-yellow-500 font-bold block mt-2">⚠ Note: Re-uploading creates duplicates!</span>
                    </p>

                    <div className="flex gap-2">
                        {/* ACTUAL UPLOAD */}
                        <label className={`flex-1 block p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${loading ? 'border-slate-700 bg-slate-800' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-800'
                            }`}>
                            <Upload className="mx-auto mb-2 text-slate-400" />
                            <span className="text-sm text-slate-300">Upload Files</span>
                            <input
                                type="file"
                                multiple
                                accept=".xlsx, .xls"
                                onChange={handleSalesUpload}
                                disabled={loading}
                                className="hidden"
                            />
                        </label>

                        {/* TEST RUN */}
                        <label className={`flex-none w-24 block p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${loading ? 'border-slate-700 bg-slate-800' : 'border-slate-600 hover:border-purple-500 hover:bg-slate-800'
                            }`}>
                            <RefreshCw className="mx-auto mb-2 text-purple-400" />
                            <span className="text-xs text-purple-300 font-bold">Test Only</span>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleTestParse}
                                disabled={loading}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Card 2: Production Upload */}
                <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 hover:border-green-500 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                            <Layers size={24} />
                        </div>
                        <h2 className="text-xl font-semibold">Production Logs</h2>
                    </div>
                    <p className="text-slate-400 mb-6 text-sm">
                        Upload production/stock Excel files. This will populate the <b>Production Logs</b> table.
                    </p>

                    <label className={`block w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${loading ? 'border-slate-700 bg-slate-800' : 'border-slate-600 hover:border-green-500 hover:bg-slate-800'
                        }`}>
                        <Upload className="mx-auto mb-2 text-slate-400" />
                        <span className="text-sm text-slate-300">Choose Excel Files</span>
                        <input
                            type="file"
                            multiple
                            accept=".xlsx, .xls"
                            onChange={handleProductionUpload}
                            disabled={loading}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default AdminUpload;
