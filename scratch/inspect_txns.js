import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log("Fetching transactions...");
    const { data, error } = await supabase.from('transactions')
        .select('*')
        .like('type', '%Sales%')
        .limit(5);
    if (error) {
        console.error("Error direct:", error);
        // Let's try general query
        const { data: d2, error: e2 } = await supabase.from('transactions').select('*').limit(5);
        if (e2) console.error("Error transactions:", e2);
        else console.log("Sample general transactions:", JSON.stringify(d2, null, 2));
    } else {
        console.log("Sample Sales transactions:", JSON.stringify(data, null, 2));
    }
}

main();
