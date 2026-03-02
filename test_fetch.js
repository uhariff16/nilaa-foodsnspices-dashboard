import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLoginAndFetch() {
    const email = 'nilaafoodnspices@gmail.com';
    const password = 'password123'; // assuming a common test password, or we just test the fetch without password if possible?

    // We can't login without password. But we can just use anon key to test ilike
    console.log(`Testing fetchUserRole for: ${email}`);

    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role, can_access_attendance, can_access_payouts, can_view_dashboard, can_manage_users')
            .ilike('email', email)
            .single();

        if (error) {
            console.error("Fetch Error:", error);
        } else {
            console.log("Fetch Success:", data);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

testLoginAndFetch();
