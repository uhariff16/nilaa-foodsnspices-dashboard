const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumns() {
    const { data, error } = await supabase.from('employee_attendance').select('*').limit(1);
    if (error) {
        console.error("Error fetching attendance:", error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log("Current columns in employee_attendance table:", Object.keys(data[0]));
    } else {
        console.log("No data in employee_attendance table to check columns.");
    }
}

checkColumns();
