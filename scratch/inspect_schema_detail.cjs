const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  // Query catalog info
  const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'partner_investments' });
  console.log('Columns RPC:', data, error);
}

run();
