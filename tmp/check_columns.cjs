const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumns() {
  console.log('Inserting minimal row to check columns...');
  const { data, error } = await supabase
    .from('customer_receivables')
    .insert([{ customer_name: 'SCHEMA_CHECK_TEMP' }])
    .select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Successfully inserted. Columns:', Object.keys(data[0]));
    // Clean up
    await supabase.from('customer_receivables').delete().eq('customer_name', 'SCHEMA_CHECK_TEMP');
  }
}

checkColumns();
