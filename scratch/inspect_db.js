import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log("Checking customer_stats...");
    const { data: customers, error } = await supabase.from('customer_stats').select('*').limit(3);
    if (error) console.error("Error customers:", error);
    else console.log("Sample customer_stats:", JSON.stringify(customers, null, 2));

    console.log("Checking item master...");
    const { data: items, error: err2 } = await supabase.from('item_master').select('*').limit(3);
    if (err2) {
        // try itemMaster
        const { data: items2, error: err3 } = await supabase.from('itemMaster').select('*').limit(3);
        if (err3) console.error("Error item_master/itemMaster:", err2, err3);
        else console.log("Sample itemMaster:", JSON.stringify(items2, null, 2));
    } else {
        console.log("Sample item_master:", JSON.stringify(items, null, 2));
    }
    
    // Check if there is a table for customer metadata
    const { data: customerMeta, error: err4 } = await supabase.from('customers').select('*').limit(3);
    if (err4) console.error("Error customers table:", err4);
    else console.log("Sample customers table:", JSON.stringify(customerMeta, null, 2));
}

main();
