import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseExcelFile } from '../utils/excelParser';
import { parseProductionFile } from '../utils/productionParser';
import { Upload, CheckCircle, AlertCircle, Database, FileText, Layers } from 'lucide-react';

const AdminUpload = () => {
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [loading, setLoading] = useState(false);

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

            setStatus({ type: 'info', message: `Uploading ${parsedData.transactions.length} sales records...` });

            // 2. Format for Supabase
            // Map parsed fields to DB Columns
            const dbRows = parsedData.transactions.map(t => ({
                date: t.parsedDate,
                invoice_no: t.invoiceNo,
                item_name: t.originalDesc || 'Unknown Item',
                amount: t.parsedAmount || 0,
                quantity: 0, // Default 0 as parser doesn't extract qty for summary view yet
                payment_mode: t.parsedType === 'Expense' ? 'Expense' : 'Sale'
            })).filter(row => row.date && row.amount); // Filter invalid rows

            // 3. Batch Insert
            const { error } = await supabase
                .from('transactions')
                .insert(dbRows);

            if (error) throw error;

            setStatus({ type: 'success', message: `Successfully uploaded ${dbRows.length} sales records!` });

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

    return (
        <div className="p-8 max-w-4xl mx-auto bg-[#0f172a] min-h-screen text-slate-100">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Database className="text-blue-500" />
                Data Ingestion (Admin)
            </h1>

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
                    </p>

                    <label className={`block w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${loading ? 'border-slate-700 bg-slate-800' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-800'
                        }`}>
                        <Upload className="mx-auto mb-2 text-slate-400" />
                        <span className="text-sm text-slate-300">Choose Excel Files</span>
                        <input
                            type="file"
                            multiple
                            accept=".xlsx, .xls"
                            onChange={handleSalesUpload}
                            disabled={loading}
                            className="hidden"
                        />
                    </label>
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
