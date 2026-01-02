
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLatest() {
    console.log("Fetching last 10 inserted records...");
    const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data.length === 0) {
        console.log("No records found.");
        return;
    }

    console.log("Last 10 Records:");
    data.forEach(d => {
        console.log(`[${d.created_at}] ID: ${d.id} | Date: ${d.date} | Type: ${d.type} | Mat: ${d.material} | Wt: ${d.weight}`);
    });
}

checkLatest();
