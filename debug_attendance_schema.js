
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debug() {
    console.log("Fetching employee_attendance records...");
    const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .order('date', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Found " + data.length + " records.");
        console.log("Sample Record Keys:", Object.keys(data[0]));

        // Find Manikandan if possible
        const mani = data.find(r => r.emp_name && r.emp_name.toLowerCase().includes('manikandan'));
        if (mani) {
            console.log("\n--- Record for Manikandan ---");
            console.log(JSON.stringify(mani, null, 2));
        } else {
            console.log("\n--- First Record ---");
            console.log(JSON.stringify(data[0], null, 2));
        }
    } else {
        console.log("No data found in table.");
    }
}

debug();
