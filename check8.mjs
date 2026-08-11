import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data} = await supabase.from('transactions').select('*').in('payment_mode', ['Expense']); 
  
  const unknown = data.filter(item => {
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
  
  console.log("Unknown Supplier Purchases (from Expenses):", unknown.length);
  console.log("Total Amount:", unknown.reduce((sum, d) => sum + d.amount, 0));
  
  // Let's group them by item_name
  const byItem = {};
  unknown.forEach(u => {
      byItem[u.item_name] = (byItem[u.item_name] || 0) + u.amount;
  });
  console.log("By item:", byItem);
} 
run();
