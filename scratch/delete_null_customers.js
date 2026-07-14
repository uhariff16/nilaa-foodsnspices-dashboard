import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log("Locating duplicate transactions for deletion...");
    const { data: txns, error: fetchError } = await supabase.from('transactions')
        .select('id, date, customer_name, item_name, amount')
        .eq('payment_mode', 'Sales')
        .is('customer_name', null);

    if (fetchError) {
        console.error("Error fetching:", fetchError);
        return;
    }

    console.log(`Found ${txns.length} duplicate transactions to delete.`);
    if (txns.length === 0) return;

    // Delete in batches of 100
    const ids = txns.map(t => t.id);
    console.log("Starting deletion of duplicate rows...");
    
    let deletedCount = 0;
    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error: deleteError } = await supabase.from('transactions')
            .delete()
            .in('id', batch);
            
        if (deleteError) {
            console.error("Error deleting batch:", deleteError);
            break;
        }
        deletedCount += batch.length;
        console.log(`Deleted ${deletedCount}/${ids.length} rows...`);
    }
    
    console.log("Cleanup completed successfully!");
}

main();
