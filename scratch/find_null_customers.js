import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    let allRows = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('transactions').select('*').range(from, from + batchSize - 1);
        if (error) break;
        allRows = [...allRows, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }

    const nullCustomerSales = allRows.filter(t => t.payment_mode === 'Sales' && (t.customer_name === null || t.customer_name === ''));
    console.log("Total Sales transactions with NULL customer:", nullCustomerSales.length);
    
    // Group by month
    const monthly = {};
    nullCustomerSales.forEach(t => {
        const month = t.date ? t.date.substring(0, 7) : 'Unknown';
        monthly[month] = (monthly[month] || 0) + 1;
    });
    console.log("NULL customer sales grouped by month:", monthly);
}

main();
