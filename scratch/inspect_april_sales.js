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
    return 1; // Default to 1kg if no unit found (bulk/loose/standard)
};

async function main() {
    console.log("Analyzing April transactions...");
    const { data: txns, error } = await supabase.from('transactions')
        .select('*')
        .eq('payment_mode', 'Sales');
        
    if (error) {
        console.error(error);
        return;
    }
    
    // We want to list the transactions sorted by weight or amount, and see what the customer is
    const retailTxns = [];
    const wholesaleTxns = [];
    
    txns.forEach(t => {
        if (!t.date || !t.date.includes('-04-')) return;
        const customer = String(t.customer_name || 'cash').toLowerCase().trim();
        const desc = String(t.item_name || '').toUpperCase();
        
        // Mapped retail customers list from code/DB (defaults: cash, nfs delivery, market shop)
        const isRetailCust = customer === 'cash' || customer === 'nfs delivery' || customer === 'market shop';
        const qty = parseFloat(t.quantity || 0);
        const amt = parseFloat(t.amount || 0);
        const weight = qty * getPackWeight(desc);
        
        const info = {
            id: t.id,
            date: t.date,
            customer: t.customer_name,
            item: t.item_name,
            qty,
            amount: amt,
            weight_kg: weight,
            invoice: t.invoice_no
        };
        
        if (isRetailCust) retailTxns.push(info);
        else wholesaleTxns.push(info);
    });
    
    console.log("RETAIL TRANSACTIONS IN APRIL:");
    console.table(retailTxns.sort((a, b) => b.weight_kg - a.weight_kg).slice(0, 30));
    
    console.log("WHOLESALE TRANSACTIONS IN APRIL:");
    console.table(wholesaleTxns.sort((a, b) => b.weight_kg - a.weight_kg).slice(0, 10));
}

main();
