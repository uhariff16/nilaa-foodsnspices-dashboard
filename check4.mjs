import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data} = await supabase.from('transactions').select('*').eq('payment_mode', 'Supplier_Payment'); 
  console.log("Total payment entries:", data.length);
  
  const counts = {};
  data.forEach(d => {
    const k = `${d.date}-${d.amount}-${d.customer_name}`;
    counts[k] = (counts[k] || 0) + 1;
  });
  const dupes = Object.entries(counts).filter(x => x[1] > 1);
  console.log("Duplicate payment records:", dupes.length);
  if (dupes.length > 0) {
      console.log("Example dupes:", dupes.slice(0, 5));
  }
} 
run();
