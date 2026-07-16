const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function run() {
    let txs = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('transactions').select('*').range(from, from + batchSize - 1);
        if (error) {
            console.error(error);
            return;
        }
        txs = [...txs, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }
    
    // Content-based deduplication matching App.jsx
    const uniqueTxnsMap = new Map();
    txs.forEach(t => {
        const key = `${t.date}-${t.invoice_no}-${Number(t.amount).toFixed(2)}-${Number(t.quantity || 0)}-${t.customer_name}-${t.item_name}`;
        if (!uniqueTxnsMap.has(key)) {
            uniqueTxnsMap.set(key, t);
        }
    });
    const uniqueTxns = Array.from(uniqueTxnsMap.values());

    const mappedTransactions = uniqueTxns.map(t => ({
        id: t.id,
        parsedDate: t.date,
        createdAt: t.created_at,
        parsedAmount: Number(t.amount),
        parsedType: t.payment_mode,
        originalDesc: t.item_name || 'Item',
        name: t.item_name,
        profit: Number(t.profit || 0),
        customerName: t.customer_name,
        invoiceNo: t.invoice_no,
        parsedQty: Number(t.quantity || 1)
    }));

    const monthStr = 'Jun 2026';
    const targetYear = '2026';

    const monthTxs = mappedTransactions.filter(t => {
        if (!t.parsedDate) return false;
        if (!t.parsedDate.startsWith(targetYear)) return false;
        
        let tMonthYear = '';
        if (t.parsedDate.includes('-')) {
            const parts = t.parsedDate.split('-');
            if (parts.length >= 3) {
                const year = parts[0];
                const monthIndex = parseInt(parts[1], 10) - 1;
                if (monthNames[monthIndex]) {
                    tMonthYear = monthNames[monthIndex] + ' ' + year;
                }
            }
        }
        return tMonthYear === monthStr;
    });

    console.log(`Jun 2026 has ${monthTxs.length} transactions.`);

    const allSales = monthTxs.filter(t => 
        String(t.parsedType).toLowerCase().includes('sale') &&
        !String(t.invoiceNo || '').toUpperCase().includes('MISSING')
    );

    const salesAppearsGran = allSales.filter(t => {
        const type = String(t.parsedType || '').toLowerCase();
        const desc = String(t.originalDesc || '').toLowerCase();
        if (type === 'sales summary' || type === 'profitsummary' || type === 'invoice total') return false;
        const keywordsToExclude = ['subtotal', 'sub total', 'taxable', 'net amount', 'gross amount', 'round off', 'rounded off', 'roundoff', 'gst', 'total'];
        const isCreditNote = desc.includes('credit note') || desc.includes('return') || desc.includes('refund') || desc.includes('cn');
        if (isCreditNote) return true;
        if (keywordsToExclude.some(k => desc.includes(k))) return false;
        return true;
    });

    const grossSalesRev = salesAppearsGran.reduce((sum, t) => {
        const amt = parseFloat(t.parsedAmount) || 0;
        return sum + Math.abs(amt);
    }, 0);

    const monthReturns = monthTxs.filter(t => t.parsedType === 'Sales Return');
    const totalRet = monthReturns.reduce((sum, t) => sum + (parseFloat(t.parsedAmount) || 0), 0);

    const { data: discounts } = await supabase.from('invoice_discounts').select('*');
    const [mStr, yStr] = monthStr.split(' ');
    const mIdx = monthNames.indexOf(mStr);
    const targetPrefix = `${yStr}-${String(mIdx + 1).padStart(2, '0')}`;
    
    const monthDiscounts = (discounts || []).filter(d => 
        d.discount_date && d.discount_date.startsWith(targetPrefix)
    );
    const totalDisc = monthDiscounts.reduce((sum, d) => sum + parseFloat(d.discount_amount || 0), 0);

    const netSales = grossSalesRev - totalRet - totalDisc;

    const expensesTxs = monthTxs.filter(t => String(t.parsedType).toLowerCase().includes('expense') || t.parsedType === 'Purchase');
    const recordedExp = expensesTxs.reduce((sum, t) => sum + (parseFloat(t.parsedAmount) || 0), 0);

    console.log("Recorded Gross Sales:", grossSalesRev);
    console.log("Recorded Returns:", totalRet);
    console.log("Recorded Discounts:", totalDisc);
    console.log("Net Sales:", netSales);
    console.log("Recorded Expenses:", recordedExp);

    const manualExpensesTest = [
        { salary: 25000, daily: 3000 },
        { salary: 28000, daily: 0 },
        { salary: 0, daily: 0 }
    ];
    manualExpensesTest.forEach(me => {
        const totalManual = me.salary + me.daily;
        const grandTotalExp = recordedExp + totalManual;
        console.log(`With Manual (Salary=${me.salary}, Daily=${me.daily}): Profit =`, netSales - grandTotalExp);
    });
}
run();
