import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function main() {
    let allTxns = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('transactions').select('*').range(from, from + batchSize - 1);
        if (error) break;
        allTxns = [...allTxns, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }
    
    const mappedTransactions = allTxns.map(t => ({
        id: t.id,
        parsedDate: t.date,
        parsedAmount: Number(t.amount),
        parsedType: t.payment_mode,
        originalDesc: t.item_name || 'Item',
        customerName: t.customer_name,
        invoiceNo: t.invoice_no,
        parsedQty: Number(t.quantity || 1)
    }));

    // Let's run for both 2025 and 2026
    for (const selectedYear of ['2025', '2026']) {
        console.log(`\n================== YEAR ${selectedYear} ==================`);
    
    // Fetch production logs
    let allLogs = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('production_logs').select('*').range(from, from + batchSize - 1);
        if (error) break;
        allLogs = [...allLogs, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }
    
    // Simulate yearlyData mapping
    const aggregated = monthNames.map((mName, idx) => {
        const monthStr = String(idx + 1).padStart(2, '0');
        const targetPrefix = `${selectedYear}-${monthStr}`;

        const monthTxns = mappedTransactions.filter(t => t.parsedDate && t.parsedDate.startsWith(targetPrefix));
        
        let revenue = 0;
        let totalExpenses = 0;
        
        if (monthTxns.length > 0) {
            const finalSales = monthTxns.filter(t => t.parsedType === 'Sales' && !String(t.invoiceNo || '').toUpperCase().includes('MISSING'));
            const salesReturns = monthTxns.filter(t => t.parsedType === 'Sales Return');
            
            const grossRevenue = finalSales.reduce((acc, t) => acc + Math.abs(t.parsedAmount || 0), 0);
            const returnRevenue = salesReturns.reduce((acc, t) => acc + Math.abs(t.parsedAmount || 0), 0);
            revenue = grossRevenue - returnRevenue;
            
            const expenses = monthTxns.filter(t => t.parsedType === 'Expense');
            totalExpenses = expenses.reduce((acc, t) => acc + Math.abs(t.parsedAmount || 0), 0);
        }
        
        const netProfit = revenue - totalExpenses;
        
        return {
            name: mName,
            revenue,
            expenses: totalExpenses,
            netProfit,
            isActive: revenue > 0 || totalExpenses > 0
        };
    });
    
    console.log("SIMULATED MONTHLY METRICS FOR 2026:");
    aggregated.forEach(m => {
        if (m.isActive) {
            console.log(`Month: ${m.name}`);
            console.log(`  Revenue: ₹${m.revenue.toLocaleString()}`);
            console.log(`  Expenses: ₹${m.expenses.toLocaleString()}`);
            console.log(`  Net Profit: ₹${m.netProfit.toLocaleString()}`);
        }
    });
    
    const active = aggregated.filter(m => m.isActive);
    const totalRev = active.reduce((acc, m) => acc + m.revenue, 0);
    const totalExp = active.reduce((acc, m) => acc + m.expenses, 0);
    const totalProfit = active.reduce((acc, m) => acc + m.netProfit, 0);
    console.log(`\nOVERALL YTD 2026:`);
    console.log(`  Total Revenue: ₹${totalRev.toLocaleString()}`);
    console.log(`  Total Expenses: ₹${totalExp.toLocaleString()}`);
    console.log(`  YTD Profit: ₹${totalProfit.toLocaleString()}`);
    }
}

main();
