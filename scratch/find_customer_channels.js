import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log("Fetching unique customer names...");
    const { data: txns, error } = await supabase.from('transactions').select('customer_name, item_name, amount, payment_mode').limit(100);
    if (error) {
        console.error(error);
        return;
    }
    const customers = new Set();
    const items = new Set();
    const paymentModes = new Set();
    txns.forEach(t => {
        if (t.customer_name) customers.add(t.customer_name);
        if (t.item_name) items.add(t.item_name);
        if (t.payment_mode) paymentModes.add(t.payment_mode);
    });
    console.log("Unique Customer Names in sample:", Array.from(customers));
    console.log("Unique Item Names in sample:", Array.from(items));
    console.log("Unique Payment Modes (parsedTypes) in sample:", Array.from(paymentModes));
}

main();
