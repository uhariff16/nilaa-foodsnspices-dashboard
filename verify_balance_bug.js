import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkBalanceBug() {
    // 1. Get total attendance count
    const { count: attCount, error: attErr } = await supabase
        .from('employee_attendance')
        .select('*', { count: 'exact', head: true });

    // 2. Get total payment count
    const { count: payCount, error: payErr } = await supabase
        .from('employee_payments')
        .select('*', { count: 'exact', head: true });

    console.log(`Total Attendance Records in DB: ${attCount}`);
    console.log(`Total Payment Records in DB: ${payCount}`);

    // If attendance > 100, the frontend is only fetching 100 but all payments.
    console.log("If Attendance > 100, the `.limit(100)` in TimeAttendance.jsx is causing the negative balance bug because it misses historical earnings while deducting ALL historical payments.")
}

checkBalanceBug();
