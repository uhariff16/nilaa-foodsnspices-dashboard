import React, { useState, useMemo } from 'react';
import { Home, ShoppingCart, Package, Menu, Settings, LogOut, TrendingUp, TrendingDown, Award, Wallet, Clock, Users, Calendar, Calculator } from 'lucide-react';
import logo from '../../assets/logo.png';
import CostSimulator from '../CostSimulator';

const MobileDashboard = ({ data, filteredTransactions, filteredCustomers, selectedMonth, selectedYear, productionData, receivables, manualExpenses, previousMonthStats, onSwitchToDesktop }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Use filteredTransactions if available for precision
    const transactionsToUse = filteredTransactions || data.transactions || [];
    const displayMonth = selectedMonth || 'Overall';

    // Helpers
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    // --- Calculations ---
    const stats = useMemo(() => {
        let sales = 0;
        let expenses = 0;
        let materialCost = 0;
        let overheadCost = 0;

        // Aggregations for Top Movers
        const productSales = {};
        const customerSales = {};

        transactionsToUse.forEach(item => {
            const type = String(item.parsedType || item.Type || '').toLowerCase();
            const amt = parseFloat(item.parsedAmount || item.Amount || 0);

            // 1. Profit Summary
            if (type === 'profitsummary') { /* Ignore */ }
            // 2. Sales
            else if (type.includes('sale') || type.includes('income') || type.includes('revenue') || item.payment_mode === 'Sales') {
                sales += amt;

                // Track Top Product
                const name = item.item_name || item.name || item.originalDesc || 'Unknown';
                if (!productSales[name]) productSales[name] = 0;
                productSales[name] += amt;

                // Track Top Customer
                const cust = item.customerName || item.customer_name || 'Walk-in';
                if (cust !== 'Walk-in') {
                    if (!customerSales[cust]) customerSales[cust] = 0;
                    customerSales[cust] += amt;
                }
            }
            // 3. Expenses
            else if (type.includes('expense') || type.includes('cost') || type.includes('purchase')) {
                expenses += amt;
                if (type.includes('purchase') || type.includes('material')) {
                    materialCost += amt;
                } else {
                    overheadCost += amt;
                }
            }
            // 4. Fallback Sales
            else if (!type) {
                sales += amt;
            }
        });

        // Add Manual Expenses (Overhead)
        const manualTotal = (parseFloat(manualExpenses?.salary) || 0) + (parseFloat(manualExpenses?.daily) || 0);
        expenses += manualTotal;
        overheadCost += manualTotal;

        const netProfit = sales - expenses;
        const margin = sales > 0 ? (netProfit / sales) * 100 : 0;

        // Determine Top Product
        let topProdName = 'N/A';
        let topProdAmt = 0;
        Object.entries(productSales).forEach(([name, val]) => {
            if (val > topProdAmt) { topProdAmt = val; topProdName = name; }
        });

        // Determine Top Customer (Prefer Desktop Logic passed via props)
        let topCustName = 'N/A';
        let topCustAmt = 0;

        if (filteredCustomers && filteredCustomers.length > 0) {
            // [FIX] Ensure we pick the highest revenue customer
            const bestCust = filteredCustomers.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current);
            topCustName = bestCust.name;
            topCustAmt = bestCust.revenue;
        } else {
            // Fallback: Local Calculation
            Object.entries(customerSales).forEach(([name, val]) => {
                if (val > topCustAmt) { topCustAmt = val; topCustName = name; }
            });
        }

        // Receivables Calculation
        const totalReceivables = (receivables || []).reduce((sum, item) => sum + (parseFloat(item.balance || item.balanceDue) || 0), 0);

        return { sales, expenses, netProfit, materialCost, overheadCost, margin, topProdName, topProdAmt, topCustName, topCustAmt, totalReceivables };
    }, [transactionsToUse, manualExpenses, receivables, filteredCustomers]);

    const { sales: totalSales, expenses: totalExpenses, netProfit, materialCost, overheadCost, margin, topProdName, topProdAmt, topCustName, topCustAmt, totalReceivables } = stats;

    // --- Derived Data for Sales Tab ---
    const salesData = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        let todayTotal = 0;
        const invoiceSet = new Set();
        let legacyInvoiceCount = 0;

        const allSales = transactionsToUse.filter(t => {
            const type = (t.parsedType || '').toLowerCase();
            const mode = (t.payment_mode || '').toLowerCase();
            return mode === 'sales' || type.includes('sale');
        });

        // Calculate Month Invoice Count (from filteredTransactions scope)
        allSales.forEach(t => {
            if (t.invoiceNo) invoiceSet.add(t.invoiceNo);
            else legacyInvoiceCount++;
        });
        const monthInvoiceCount = invoiceSet.size + legacyInvoiceCount;

        // Calculate Today's Stats
        const todayTxns = [];
        const todayInvoiceSet = new Set();
        let todayLegacyCount = 0;

        allSales.forEach(t => {
            if (t.parsedDate === todayStr) {
                todayTotal += parseFloat(t.parsedAmount || 0);
                todayTxns.push(t);
                if (t.invoiceNo) todayInvoiceSet.add(t.invoiceNo);
                else todayLegacyCount++;
            }
        });
        const todayInvoiceCount = todayInvoiceSet.size + todayLegacyCount; // If needed for future

        const avgSale = monthInvoiceCount > 0 ? totalSales / monthInvoiceCount : 0;

        return { allSales, todayTxns, todayTotal, invoiceCount: monthInvoiceCount, avgSale, todayStr };
    }, [transactionsToUse, totalSales]);

    // Robust Stock Logic
    const stockItems = useMemo(() => {
        if (productionData?.postProduction?.length > 0) {
            const map = {};
            productionData.postProduction.forEach(item => {
                const name = item.material || item.item_name;
                if (!map[name]) map[name] = 0;
                map[name] += parseFloat(item.weight || 0);
            });
            return Object.entries(map).map(([name, qty]) => ({ name, qty, unit: 'Kg' }));
        }
        return [];
    }, [productionData]);

    // --- Stock Logic (Ported from StockDashboard) ---
    const stockStats = useMemo(() => {
        // Raw
        let ginger = { open: 0, in: 0, out: 0, nextOpen: 0 };
        let garlic = { open: 0, in: 0, out: 0, nextOpen: 0 };
        // Peeled
        let gingerPeeled = { open: 0, in: 0, out: 0, nextOpen: 0 };
        let garlicPeeled = { open: 0, in: 0, out: 0, nextOpen: 0 };
        // Paste
        let paste = { open: 0, in: 0, out: 0, nextOpen: 0 };       // G&G Paste (Mixed)
        let gingerPaste = { open: 0, in: 0, out: 0, nextOpen: 0 }; // Ginger Paste
        let garlicPaste = { open: 0, in: 0, out: 0, nextOpen: 0 }; // Garlic Paste

        // 1. Determine Date Prefix
        let targetPrefix = selectedYear;
        let nextMonthPrefix = null;

        if (displayMonth !== 'Overall') {
            const parts = (selectedMonth || '').split(' ');
            if (parts.length === 2) {
                const selMonth = parts[0];
                const selYear = parts[1];
                const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                if (monthMap[selMonth]) {
                    targetPrefix = selYear + '-' + monthMap[selMonth];

                    let yearInt = parseInt(selYear);
                    let monthInt = parseInt(monthMap[selMonth]);
                    monthInt++;
                    if (monthInt > 12) { monthInt = 1; yearInt++; }
                    nextMonthPrefix = yearInt + '-' + String(monthInt).padStart(2, '0');
                }
            } else if (!selectedMonth || selectedMonth === 'Overall') {
                targetPrefix = String(selectedYear);
            }
        } else {
            targetPrefix = String(selectedYear);
        }

        const isMatch = (dateStr) => dateStr && dateStr.startsWith(targetPrefix);
        const isNextMonthMatch = (dateStr) => nextMonthPrefix && dateStr && dateStr.startsWith(nextMonthPrefix);

        const addToStat = (statObj, type, weight) => {
            if (type === 'open') statObj.open += weight;
            else if (type === 'in') statObj.in += weight;
            else if (type === 'out') statObj.out += weight;
            else if (type === 'nextOpen') statObj.nextOpen += weight;
        };

        const classifyAndAdd = (name, weight, type) => {
            // Raw
            if (name.includes('GINGER') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                addToStat(ginger, type, weight);
            } else if (name.includes('GARLIC') && !name.includes('PASTE') && !name.includes('PEELED') && !name.includes('PROCESSED') && !name.includes('CLEANED')) {
                addToStat(garlic, type, weight);
            }
            // Peeled
            else if (name.includes('GINGER') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                addToStat(gingerPeeled, type, weight);
            } else if (name.includes('GARLIC') && (name.includes('PEELED') || name.includes('PROCESSED') || name.includes('CLEANED')) && !name.includes('PASTE')) {
                addToStat(garlicPeeled, type, weight);
            }
            // Paste
            else if (name.includes('PASTE')) {
                if (name.includes('GINGER') && !name.includes('GARLIC')) addToStat(gingerPaste, type, weight);
                else if (name.includes('GARLIC') && !name.includes('GINGER')) addToStat(garlicPaste, type, weight);
                else addToStat(paste, type, weight);
            }
        };

        // 2. Process Stock In
        (productionData?.stockIn || []).forEach(item => {
            const name = (item.material || item.item || '').trim().toUpperCase();
            const weight = parseFloat(item.weight || 0);
            const isOS = name.startsWith('OS') || name.startsWith('O.S') || name.includes('OPENING') || name.includes('B/F');
            if (isMatch(item.date)) classifyAndAdd(name, weight, isOS ? 'open' : 'in');
            if (isNextMonthMatch(item.date) && isOS) classifyAndAdd(name, weight, 'nextOpen');
        });

        // 3. Process Usage
        (productionData?.preProduction || []).forEach(item => {
            if (!isMatch(item.date)) return;
            classifyAndAdd((item.material || '').toUpperCase(), parseFloat(item.weight || 0), 'out');
        });

        // 4. Process Production
        (productionData?.postProduction || []).forEach(item => {
            if (!isMatch(item.date)) return;
            classifyAndAdd((item.material || '').toUpperCase(), parseFloat(item.weight || 0), 'in');
        });

        // 5. Process Sales
        salesData.allSales.forEach(item => {
            classifyAndAdd((item.name || item.item_name || '').toUpperCase(), parseFloat(item.parsedQty || item.quantity || 0), 'out');
        });

        const close = (obj) => obj.open + obj.in - obj.out;

        // Reconcile Logic
        const hasNextMonthData = productionData?.stockIn?.some(item => isNextMonthMatch(item.date));
        const reconcile = (obj) => {
            if (hasNextMonthData && obj.out < 1 && (obj.open > 0 || obj.in > 0)) {
                const theoretical = obj.open + obj.in;
                if (theoretical > obj.nextOpen) return obj.nextOpen;
            }
            return close(obj);
        };

        return {
            ginger: close(ginger),
            garlic: close(garlic),
            gingerPeeled: reconcile(gingerPeeled),
            garlicPeeled: reconcile(garlicPeeled),
            paste: reconcile(paste),
            gingerPaste: reconcile(gingerPaste),
            garlicPaste: reconcile(garlicPaste)
        };
    }, [productionData, salesData, selectedMonth, selectedYear, displayMonth]);


    // --- Sub-Components ---

    const OverviewTab = () => (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Overview</h2>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.1rem' }}>Period</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                        {displayMonth}
                    </span>
                </div>
            </div>

            {/* Main Stats */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>Sales</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399', margin: '0.25rem 0', letterSpacing: '-0.5px' }}>{formatCurrency(totalSales)}</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>Net Profit</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: '700', color: netProfit >= 0 ? '#34d399' : '#f87171', margin: '0.25rem 0', letterSpacing: '-0.5px' }}>{formatCurrency(netProfit)}</p>
                </div>
            </div>

            {/* Expense Breakdown */}
            <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Expenses</span>
                    <span style={{ fontWeight: '700', color: '#f87171' }}>{formatCurrency(totalExpenses)}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Material Cost</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(materialCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Overheads</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(overheadCost)}</span>
                </div>
            </div>

            {/* Key Insights (Replaces Activity) */}
            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>Highlights</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr' }}>

                {/* Receivables Card [NEW] */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(248, 113, 113, 0.1)', color: '#f87171' }}>
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Outstanding Balance</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f87171', margin: 0 }}>{formatCurrency(totalReceivables)}</p>
                    </div>
                </div>

                {/* Margin Card */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Net Margin</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{margin.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Top Customer */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>
                        <Award size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Top Customer</p>
                        <p style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{topCustName.toUpperCase()}</p>
                        <p style={{ fontSize: '0.8rem', color: '#60a5fa', margin: 0 }}>{formatCurrency(topCustAmt)}</p>
                    </div>
                </div>

                {/* Top Product */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Top Product</p>
                        <p style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0' }}>{topProdName}</p>
                        <p style={{ fontSize: '0.8rem', color: '#fbbf24', margin: 0 }}>{formatCurrency(topProdAmt)}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const SalesTab = () => (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 700 }}>Sales Dashboard</h2>

            {/* Sales Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* 1. Month Total (Already in Overview, but requested here too) */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontWeight: 500 }}>
                        <Calendar size={12} /> Month Total
                    </p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#34d399', margin: '0.25rem 0' }}>
                        {formatCurrency(totalSales)}
                    </p>
                </div>

                {/* 2. Today's Total */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontWeight: 500 }}>
                        <Clock size={12} /> Today's Sales
                    </p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#60a5fa', margin: '0.25rem 0' }}>
                        {formatCurrency(salesData.todayTotal)}
                    </p>
                </div>

                {/* 3. Invoice Count */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontWeight: 500 }}>
                        <Users size={12} /> Invoices ({displayMonth})
                    </p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                        {salesData.invoiceCount}
                    </p>
                </div>

                {/* 4. Average Sales */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontWeight: 500 }}>
                        <TrendingUp size={12} /> Avg Sale
                    </p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                        {formatCurrency(salesData.avgSale)}
                    </p>
                </div>
            </div>

            {/* List: Today's History */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Today's Activity ({salesData.todayTxns.length})</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{salesData.todayStr}</span>
            </div>

            {salesData.todayTxns.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', border: '1px dashed var(--glass-border)', borderRadius: '0.5rem' }}>
                    No sales recorded today yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {salesData.todayTxns.map((t, i) => (
                        <div key={i} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontWeight: '600', margin: 0 }}>{(t.customerName || t.name || 'Walk-in').toUpperCase()}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{t.item_name || 'Item'}</p>
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#34d399' }}>+{formatCurrency(t.parsedAmount)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const StockTab = () => (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 700 }}>Stock Analysis</h2>

            {/* Raw Material Available */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', marginTop: '0.5rem', color: '#fbbf24', fontWeight: 600 }}>Raw Material Available</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: '#fbbf24', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>Ginger (Raw)</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                        {stockStats.ginger.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>kg</span>
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: '#fbbf24', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>Garlic (Raw)</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                        {stockStats.garlic.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>kg</span>
                    </p>
                </div>
            </div>

            {/* Processed Product Stock */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#34d399', fontWeight: 600 }}>Processed Product Stock</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>G&G Paste (Mix)</span>
                    <span style={{ fontWeight: '700', color: '#34d399' }}>{stockStats.paste.toLocaleString()} kg</span>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>Ginger Paste</span>
                    <span style={{ fontWeight: '700', color: '#34d399' }}>{stockStats.gingerPaste.toLocaleString()} kg</span>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>Garlic Paste</span>
                    <span style={{ fontWeight: '700', color: '#34d399' }}>{stockStats.garlicPaste.toLocaleString()} kg</span>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>Ginger (Peeled)</span>
                    <span style={{ fontWeight: '700', color: '#fbbf24' }}>{stockStats.gingerPeeled.toLocaleString()} kg</span>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>Garlic (Peeled)</span>
                    <span style={{ fontWeight: '700', color: '#fbbf24' }}>{stockStats.garlicPeeled.toLocaleString()} kg</span>
                </div>
            </div>
        </div>
    );

    const MenuTab = () => (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Menu</h2>
            <div className="glass-panel" style={{ padding: '0.5rem' }}>
                <div
                    onClick={() => setActiveTab('simulator')}
                    style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                >
                    <Calculator size={20} color="#f59e0b" />
                    <span>Production Cost Simulator</span>
                </div>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Settings size={20} />
                    <span>Settings</span>
                </div>
                <button
                    onClick={() => {
                        console.log("Ext Desktop View Triggered");
                        if (onSwitchToDesktop) onSwitchToDesktop();
                    }}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        color: '#ef4444',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        fontSize: 'inherit'
                    }}
                >
                    <LogOut size={20} />
                    <span>Ext Desktop View</span>
                </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                AntiGravity v1.2 Mobile
            </p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '1rem', paddingBottom: '0' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                    background: '#ca8a04', // Dark Yellow
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#581c87', letterSpacing: '1px' }}>NFS Dashboard</h1>
                </div>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--glass-border)' }}>
                    <img src={logo} alt="NFS Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'sales' && <SalesTab />}
            {activeTab === 'stock' && <StockTab />}
            {activeTab === 'menu' && <MenuTab />}
            {activeTab === 'simulator' && (
                <div style={{ paddingBottom: '80px' }}>
                    <CostSimulator previousMonthStats={previousMonthStats} selectedMonth={selectedMonth || 'Overall'} />
                </div>
            )}

            {/* Bottom Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, width: '100%',
                background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)',
                borderTop: '1px solid var(--glass-border)',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                padding: '0.75rem 0', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
                zIndex: 50
            }}>
                <NavButton icon={Home} label="Home" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <NavButton icon={ShoppingCart} label="Sales" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
                <NavButton icon={Package} label="Stock" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
                <NavButton icon={Menu} label="Menu" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
            </div>
        </div>
    );
};

const NavButton = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick} style={{
        background: 'transparent', border: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        cursor: 'pointer'
    }}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
        <span style={{ fontSize: '0.75rem', fontWeight: active ? '600' : '400' }}>{label}</span>
    </button>
);

export default MobileDashboard;
