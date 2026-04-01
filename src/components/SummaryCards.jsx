import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, Wallet } from 'lucide-react';

const getValueColor = (value, type) => {
    if (value < 0 || type === 'return') return '#ef4444'; // Red for returns/losses
    if (type === 'expense') return '#f59e0b'; // Orange for Expenses
    if (type === 'sales') return '#10b981';   // Green for Sales
    if (value > 0) return '#10b981'; // Green for Profit/Margin
    return 'white';
};

export const Card = ({ title, value, icon: Icon, trend, color, isPercentage, type, subtext, isCurrency = true }) => (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>{title}</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: getValueColor(value, type) }}>
                    {isPercentage
                        ? `${value.toFixed(2)}%`
                        : (isCurrency && typeof value === 'number' ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value) : value)
                    }
                </p>
                {subtext && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{subtext}</p>}
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: `rgba(${color}, 0.1)` }}>
                <Icon size={24} color={`rgb(${color})`} />
            </div>
        </div>
        {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>from last month</span>
            </div>
        )}
    </div>
);

const SummaryCards = ({ data, manualExpenses = { salary: 0, daily: 0 }, overrideSales, overrideInvoiceCount, totalReturns = 0 }) => {
    const stats = useMemo(() => {
        let summarySales = 0;
        let summaryProfit = 0;
        let sales = 0;
        let expenses = 0;
        const invoiceSet = new Set(); // [FIX] Re-initialize missing variable
        let legacyInvoiceCount = 0;   // [FIX] Re-initialize missing variable

        const processedIds = new Set(); // [FIX] Track duplicates

        // [FIX] Priority Check
        const hasInvoiceTotals = data.some(item => item.parsedType === 'Invoice Total');

        data.forEach(item => {
            // [FIX] Deduplication Check
            const uniqueKey = item.id || `${item.invoiceNo}-${item.parsedDate}-${item.parsedAmount}-${item.parsedType}`;
            if (processedIds.has(uniqueKey)) return;
            processedIds.add(uniqueKey);

            const type = String(item.parsedType || item.Type || '').toLowerCase();
            const amt = parseFloat(item.parsedAmount || item.Amount || 0);

            if (type === 'profitsummary') {
                summarySales += amt;
                summaryProfit += (item.profit || item.parsedProfit || 0);
            }
            else if (type === 'sales summary') { // [FIX] Separate Sales Summary accumulator
                if (!hasInvoiceTotals) summarySales += amt; // Only use if no better data
            }
            else if (type === 'invoice total') {
                // High Priority Data
                sales += Math.abs(amt);
                if (item.invoiceNo) invoiceSet.add(item.invoiceNo);
            }
            else if (type.includes('sale') || type.includes('income') || type.includes('revenue')) {
                // Granular Sales
                // Skip if we have Invoice Totals
                if (hasInvoiceTotals) return;

                // [FIX] Apply keyword exclusion for Subtotals/Taxable
                const desc = String(item.originalDesc || '').toLowerCase();
                const keywordsToExclude = ['subtotal', 'sub total', 'taxable', 'net amount', 'gross amount', 'round off', 'rounded off', 'roundoff', 'gst', 'total'];

                const isCreditNote = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || desc.includes('cn');

                if (isCreditNote || !keywordsToExclude.some(k => desc.includes(k))) {
                    // [ADJUSTMENT] Treat all as positive additions (Gross Sales)
                    /*
                    const isReturn = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || 
                                     (item.invoiceNo && String(item.invoiceNo).toLowerCase().startsWith('cn-'));

                    if (isReturn) {
                        sales -= Math.abs(amt);
                    } else {
                        sales += amt;
                    }
                    */
                    sales += Math.abs(amt);

                    if (item.invoiceNo) {
                        invoiceSet.add(item.invoiceNo);
                    } else {
                        legacyInvoiceCount++;
                    }
                }
            } else if (type.includes('expense') || type.includes('cost') || type.includes('purchase')) {
                expenses += amt;
            } else {
                if (!type) {
                    sales += amt;
                    if (item.invoiceNo) {
                        invoiceSet.add(item.invoiceNo);
                    } else {
                        legacyInvoiceCount++;
                    }
                }
            }
        });

        // Add Manual Expenses (Only if not using Summary Override? No, manual expenses might still apply)
        expenses += (parseFloat(manualExpenses.salary) || 0);
        expenses += (parseFloat(manualExpenses.daily) || 0);

        // [FIX] Granular Preference Logic
        // If we have granular sales, IGNORE the summarySales accumulator (to avoid double count).
        // If we ONLY have summarySales, use that.
        if (sales === 0 && summarySales > 0) {
            sales = summarySales;
        }
        // Else: sales (granular) is kept as is.

        // [FIX] Use overrides if provided (from Dashboard's deduplicated logic)
        if (overrideSales !== undefined) {
            sales = overrideSales;
        }

        let netProfit = sales - expenses;
        // [FIX] Override with Summary PROFIT only.
        // User Logic: Total Sales should be from INVOICES (calculated above in 'sales' var).
        // Total Profit should be from PROFIT FILE (summaryProfit).
        // Expenses need to be derived to balance: Sales - Expenses = Profit  =>  Expenses = Sales - Profit.
        if (summarySales > 0) {
            // [FIX] User Request: Net Profit MUST be (Sales - Expenses).
            // We no longer override it with the file's profit.
            // netProfit = summaryProfit; 
        }

        const margin = sales > 0 ? (netProfit / sales) * 100 : 0;

        // Total Invoices
        const invoiceCount = (overrideInvoiceCount !== undefined) ? overrideInvoiceCount : (invoiceSet.size + legacyInvoiceCount);

        return { sales, expenses, netProfit, margin, invoiceCount };
    }, [data, manualExpenses, overrideSales, overrideInvoiceCount]);

    return (
        <div className="responsive-grid-5" style={{ marginBottom: '2rem' }}>
            <Card title="Total Sales" value={stats.sales} subtext={`${stats.invoiceCount} Invoices`} icon={IndianRupee} color="59, 130, 246" type="sales" />
            <Card title="Sales Returns" value={totalReturns} icon={TrendingDown} color="239, 68, 68" type="return" />
            <Card title="Total Expenses" value={stats.expenses} icon={Wallet} color="239, 68, 68" type="expense" />
            <Card title="Net Profit" value={stats.netProfit} icon={TrendingUp} color="16, 185, 129" type="profit" />
            <Card title="Profit Margin" value={stats.margin} icon={TrendingDown} color="245, 158, 11" isPercentage type="margin" />
        </div>
    );
};

export default SummaryCards;
