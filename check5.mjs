import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data} = await supabase.from('transactions').select('*').ilike('customer_name', '%JAYAKODI%').eq('payment_mode', 'Purchase'); 
  
  const map = new Map();
  data.forEach(t => {
      const key = `${t.date}-${t.invoice_no}-${Number(t.amount).toFixed(2)}-${Number(t.quantity || 0)}-${t.customer_name}-${t.item_name}`;
      if (!map.has(key)) map.set(key, t);
  });
  const unique = Array.from(map.values());
  console.log("Jayakodi Purchases Unique after App.jsx dedup:", unique.length);
  console.log("Total Amount after dedup:", unique.reduce((sum, d) => sum + d.amount, 0));
} 
run();
