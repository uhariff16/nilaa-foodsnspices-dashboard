const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    let allRows = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('transactions').select('date, payment_mode').range(from, from + batchSize - 1);
        if (error) {
            console.error(error);
            return;
        }
        allRows = [...allRows, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }
    const jun2026 = allRows.filter(r => r.date && r.date.includes('2026-06'));
    console.log("Count of 2026-06 in date column:", jun2026.length);
    if (jun2026.length > 0) {
        console.log("Sample 2026-06 dates:", jun2026.slice(0, 5));
    }
    const any26 = allRows.filter(r => r.date && r.date.includes('26') && !r.date.startsWith('2025'));
    console.log("Count of non-2025 dates containing 26:", any26.length);
    if (any26.length > 0) {
        console.log("Sample non-2025 dates:", any26.slice(0, 5));
    }
}
run();
