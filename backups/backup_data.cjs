const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function backup() {
    console.log("Starting backup of 'employee_attendance'...");
    const { data, error } = await supabase.from('employee_attendance').select('*').order('date', { ascending: false });

    if (error) {
        console.error("Backup failed:", error.message);
        process.exit(1);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `attendance_backup_${timestamp}.json`;
    const filepath = path.join(__dirname, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Backup successful! Saved ${data.length} records to ${filepath}`);
}

backup();
