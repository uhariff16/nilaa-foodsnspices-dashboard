const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumn() {
    console.log("Checking for 'can_access_attendance' column in 'user_roles'...");
    const { data, error } = await supabase.from('user_roles').select('*').limit(1);

    if (error) {
        console.error("Error fetching user_roles:", error.message);
        return;
    }

    if (data && data.length > 0) {
        const hasColumn = 'can_access_attendance' in data[0];
        console.log(`Column 'can_access_attendance' exists: ${hasColumn}`);
        if (!hasColumn) {
            console.log("SQL to add column: ALTER TABLE user_roles ADD COLUMN can_access_attendance BOOLEAN DEFAULT false;");
        }
    } else {
        console.log("No data in user_roles table to check structure.");
    }
}

checkColumn();

