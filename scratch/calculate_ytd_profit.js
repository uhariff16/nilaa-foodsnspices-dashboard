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
    
    // Group by year and calculate
    const stats = {};
    allRows.forEach(t => {
        if (!t.date) return;
        const year = t.date.substring(0, 4);
        if (!stats[year]) {
            stats[year] = { sales: 0, expenses: 0, profitSum: 0 };
        }
        const amt = parseFloat(t.amount || 0);
        if (t.payment_mode === 'Sales') {
            stats[year].sales += amt;
        } else if (t.payment_mode === 'Expense') {
            stats[year].expenses += amt;
        } else if (t.payment_mode === 'ProfitSummary') {
            stats[year].profitSum += amt;
        }
    });
    
    console.log(stats);
}

main();
