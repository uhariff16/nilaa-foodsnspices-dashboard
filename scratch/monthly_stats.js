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
    const { data: txns } = await supabase.from('transactions').select('*').eq('payment_mode', 'Sales');
    const months = {};
    txns.forEach(t => {
        if (t.date) {
            const yrMo = t.date.substring(0, 7);
            if (!months[yrMo]) {
                months[yrMo] = { rev: 0, vol: 0, count: 0, customers: {} };
            }
            const qty = parseFloat(t.quantity || 0);
            const amt = parseFloat(t.amount || 0);
            const wt = qty * getPackWeight(t.item_name);
            months[yrMo].rev += amt;
            months[yrMo].vol += wt;
            months[yrMo].count += qty;
            
            const cust = t.customer_name || 'cash';
            months[yrMo].customers[cust] = (months[yrMo].customers[cust] || 0) + amt;
        }
    });
    
    Object.keys(months).sort().forEach(m => {
        console.log(`Month: ${m}`);
        console.log(`  Revenue: ₹${months[m].rev.toLocaleString()}`);
        console.log(`  Volume: ${months[m].vol.toLocaleString()} kg`);
        console.log(`  Top Customers:`, Object.entries(months[m].customers).sort((a,b) => b[1]-a[1]).slice(0, 5));
    });
}

main();
