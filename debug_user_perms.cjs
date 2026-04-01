
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .ilike('email', 'nilaafoodnspices@gmail.com')
        .single();
    
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("User Data:", JSON.stringify(data, null, 2));
    }
}

checkUser();
