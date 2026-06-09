const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAprilSales() {
    console.log("Fetching April 2026 sales transactions...");
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', '2026-04-01')
        .lt('date', '2026-05-01');

    if (error) {
        console.error("Error fetching transactions:", error.message);
        return;
    }

    // Check specific inflated things
    const sales = data.filter(t => t.payment_mode === 'Sales');
    const totals = data.filter(t => t.payment_mode === 'Invoice Total');
    console.log(`Sales rows: ${sales.length}, Invoice Total rows: ${totals.length}`);
    
    if (sales.length > 0) console.log("Sample Sale:", sales[0]);
    if (totals.length > 0) console.log("Sample Total:", totals[0]);

    const missingSales = sales.filter(t => !t.invoice_no || t.invoice_no.toUpperCase().includes('MISSING'));
    const missingTotals = totals.filter(t => !t.invoice_no || t.invoice_no.toUpperCase().includes('MISSING'));
    
    console.log(`Missing Invoice_No - Sales: ${missingSales.length}, Totals: ${missingTotals.length}`);
    
    const missingSalesAmt = missingSales.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const missingTotalsAmt = missingTotals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    console.log(`Missing Amt - Sales: ${missingSalesAmt}, Totals: ${missingTotalsAmt}`);

    const byMode = {};
    data.forEach(t => {
        const mode = t.payment_mode || 'Unknown';
        if (!byMode[mode]) byMode[mode] = { count: 0, amount: 0 };
        byMode[mode].count += 1;
        byMode[mode].amount += Number(t.amount || 0);
    });
    console.log("Breakdown by Payment Mode:", byMode);
    
    // Check specific inflated things
    const sales = data.filter(t => t.payment_mode === 'Sales');
    const totals = data.filter(t => t.payment_mode === 'Invoice Total');
    console.log(`Sales rows: ${sales.length}, Invoice Total rows: ${totals.length}`);
    
    if (sales.length > 0) console.log("Sample Sale:", sales[0]);
    if (totals.length > 0) console.log("Sample Total:", totals[0]);




}

checkAprilSales();
