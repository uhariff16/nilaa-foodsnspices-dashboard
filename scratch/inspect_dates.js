import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const { data: txns } = await supabase.from('transactions').select('date, payment_mode');
    const dates = {};
    txns.forEach(t => {
        if (t.date) {
            const yrMo = t.date.substring(0, 7);
            const key = `${yrMo} [${t.payment_mode}]`;
            dates[key] = (dates[key] || 0) + 1;
        }
    });
    console.log(dates);
}

main();
