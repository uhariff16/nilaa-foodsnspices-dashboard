import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getPackWeight = (desc) => {
    if (!desc) return 1;
    const d = desc.toUpperCase();
    const match = d.match(/(\d+(?:\.\d+)?)\s*(KG|GM|GMS|G|ML|L)/);
    if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2];
        if (unit.startsWith('K') || unit === 'L') return val;
        if (unit.startsWith('G') || unit.startsWith('M')) return val / 1000;
    }
    return 1;
};

async function main() {
    console.log("Fetching all transactions paginated...");
    let allRows = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
        const { data, error } = await supabase.from('transactions').select('*').range(from, from + batchSize - 1);
        if (error) {
            console.error(error);
            break;
        }
        allRows = [...allRows, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }
    
    console.log("Total transactions in DB:", allRows.length);
    const aprilSales = allRows.filter(t => t.date && t.date.includes('-04-') && t.payment_mode === 'Sales');
    console.log("April Sales transactions count:", aprilSales.length);
    
    if (aprilSales.length > 0) {
        console.log("April Sales totals:");
        const totalRev = aprilSales.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalVol = aprilSales.reduce((sum, t) => sum + (parseFloat(t.quantity || 0) * getPackWeight(t.item_name)), 0);
        console.log(`  Total Revenue: ₹${totalRev.toLocaleString()}`);
        console.log(`  Total Volume: ${totalVol.toLocaleString()} kg`);
        
        console.log("April Sales Details (first 30):");
        console.table(aprilSales.map(t => ({
            date: t.date,
            invoice: t.invoice_no,
            customer: t.customer_name,
            item: t.item_name,
            qty: t.quantity,
            amount: t.amount,
            weight_kg: parseFloat(t.quantity || 0) * getPackWeight(t.item_name)
        })).slice(0, 30));
    }
}

main();
