const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('transactions').select('date');
    if (error) {
        console.error(error);
        return;
    }
    const counts = {};
    data.forEach(row => {
        if (!row.date) return;
        const monthYear = row.date.substring(0, 7); // YYYY-MM
        counts[monthYear] = (counts[monthYear] || 0) + 1;
    });
    console.log("Transaction counts by Month (YYYY-MM):");
    console.log(counts);
}
run();
