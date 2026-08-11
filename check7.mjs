import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data} = await supabase.from('transactions').select('*').in('payment_mode', ['Purchase', 'Expense']); 
  
  const map = new Map();
  data.forEach(t => {
      const key = `${t.date}-${t.invoice_no}-${Number(t.amount).toFixed(2)}-${Number(t.quantity || 0)}-${t.customer_name}-${t.item_name}`;
      if (!map.has(key)) map.set(key, t);
  });
  const unique = Array.from(map.values());
  
  const unknown = unique.filter(item => {
    const inv = String(item.invoice_no || '').trim().toUpperCase();
    const desc = ((item.item_name || '') + ' ' + (item.customer_name || '')).toLowerCase();
    const isPurchaseKeyword = item.payment_mode === 'Purchase' || desc.includes('ginger') || desc.includes('garlic') || desc.includes('jayakodi') || /\bdesi\b/.test(desc) || desc.includes('naatu');
    
    if (inv.startsWith('P')) return true;
    
    const isExpense = desc.includes('exp') || desc.includes('marketing') || desc.includes('design');
    if (isExpense) return false;
    return isPurchaseKeyword;
  }).filter(curr => {
     const sName = String(curr.customer_name || 'Unknown').toUpperCase().trim();
     return sName === 'UNKNOWN';
  });
  
  console.log("Unknown Supplier Purchases:", unknown.length);
  console.log("Total Amount:", unknown.reduce((sum, d) => sum + d.amount, 0));
  console.log("Sample:", unknown.slice(0, 3));
} 
run();
