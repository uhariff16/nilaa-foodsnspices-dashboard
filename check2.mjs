import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data} = await supabase.from('transactions').select('invoice_no, amount').ilike('customer_name', '%JAYAKODI%'); 
  console.log("Total entries:", data.length);
  const uniqueInvoices = new Set(data.map(d => d.invoice_no));
  console.log("Unique invoices:", uniqueInvoices.size);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);
  console.log("Total Amount:", totalAmount);
} 
run();
