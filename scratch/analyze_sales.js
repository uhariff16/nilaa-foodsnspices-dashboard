import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log("Analyzing all sales transactions...");
    const { data: txns, error } = await supabase.from('transactions')
        .select('customer_name, item_name, amount, quantity, payment_mode')
        .eq('payment_mode', 'Sales');
        
    if (error) {
        console.error(error);
        return;
    }
    
    const customerMap = {};
    const itemMap = {};
    
    txns.forEach(t => {
        const cust = String(t.customer_name || 'unknown').toLowerCase().trim();
        const item = String(t.item_name || 'unknown').toLowerCase().trim();
        
        customerMap[cust] = (customerMap[cust] || 0) + 1;
        itemMap[item] = (itemMap[item] || 0) + 1;
    });
    
    console.log("ALL UNIQUE CUSTOMER NAMES & COUNTS:");
    console.log(customerMap);
    
    console.log("\nALL UNIQUE ITEM NAMES & COUNTS:");
    console.log(itemMap);
}

main();
