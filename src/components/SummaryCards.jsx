import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, Wallet } from 'lucide-react';

const getValueColor = (value, type) => {
    if (value < 0) return '#ef4444'; // Always Red for negative (refunds/losses)
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

const SummaryCards = ({ data, manualExpenses = { salary: 0, daily: 0 } }) => {
    const stats = useMemo(() => {
        let sales = 0;
        let expenses = 0;
        const invoiceSet = new Set(); // To track unique invoices
        let legacyInvoiceCount = 0;   // Fallback for items without invoiceNo

        data.forEach(item => {
            const type = String(item.parsedType || item.Type || '').toLowerCase();
            const amt = parseFloat(item.parsedAmount || item.Amount || 0);

            if (type.includes('sale') || type.includes('income') || type.includes('revenue')) {
                sales += amt;
                if (item.invoiceNo) {
                    invoiceSet.add(item.invoiceNo);
                } else {
                    legacyInvoiceCount++;
                }
            } else if (type.includes('expense') || type.includes('cost')) {
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

        // Add Manual Expenses
        expenses += (parseFloat(manualExpenses.salary) || 0);
        expenses += (parseFloat(manualExpenses.daily) || 0);

        const netProfit = sales - expenses;
        const margin = sales > 0 ? (netProfit / sales) * 100 : 0;

        // Total Invoices = Unique Invoice Nos + (orphan lines if any)
        // Note: Ideally all modern parser lines have InvoiceNo. 
        // If we have mixed data, simple addition might double count if one line has ID and other doesn't for same bill? 
        // But orphan lines usually mean legacy data. We'll sum them.
        const invoiceCount = invoiceSet.size + legacyInvoiceCount;

        return { sales, expenses, netProfit, margin, invoiceCount };
    }, [data, manualExpenses]);

    return (
        <div className="responsive-grid-4" style={{ marginBottom: '2rem' }}>
            <Card title="Total Sales" value={stats.sales} subtext={`${stats.invoiceCount} Invoices`} icon={IndianRupee} color="59, 130, 246" type="sales" />
            <Card title="Total Expenses" value={stats.expenses} icon={Wallet} color="239, 68, 68" type="expense" />
            <Card title="Net Profit" value={stats.netProfit} icon={TrendingUp} color="16, 185, 129" type="profit" />
            <Card title="Profit Margin" value={stats.margin} icon={TrendingDown} color="245, 158, 11" isPercentage type="margin" />
        </div>
    );
};

export default SummaryCards;
