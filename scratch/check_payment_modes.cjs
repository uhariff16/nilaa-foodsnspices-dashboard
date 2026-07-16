const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    let allRows = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('transactions').select('payment_mode').range(from, from + batchSize - 1);
        if (error) {
            console.error(error);
            return;
        }
        allRows = [...allRows, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }
    const modes = new Set();
    allRows.forEach(r => modes.add(r.payment_mode));
    console.log("Unique payment_mode values:", Array.from(modes));
}
run();
