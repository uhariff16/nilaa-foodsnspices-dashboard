import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data} = await supabase.from('transactions').select('date, invoice_no, amount, customer_name, item_name').ilike('customer_name', '%JAYAKODI%'); 
  const uniqueInvoices = new Set(data.map(d => d.invoice_no));
  console.log("Jayakodi Total entries:", data.length);
  
  const counts = {};
  data.forEach(d => counts[d.invoice_no] = (counts[d.invoice_no] || 0) + 1);
  const dupes = Object.entries(counts).filter(x => x[1] > 1);
  console.log("Duplicate invoice_nos:", dupes.length);
  if (dupes.length > 0) {
      console.log("Example dupes:", data.filter(d => d.invoice_no === dupes[0][0]));
  }
} 
run();
