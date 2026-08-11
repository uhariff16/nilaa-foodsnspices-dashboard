import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://eegihrxwtyxdzsiabvtw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ');
async function run() { 
  const {data: expenses} = await supabase.from('transactions').select('*').in('payment_mode', ['Expense']);
  const {data: payments} = await supabase.from('transactions').select('*').in('payment_mode', ['Supplier_Payment']);
  
  const paymentSet = new Set(payments.map(p => `${p.date}-${p.amount}`));
  
  const unknown = expenses.filter(item => {
    const desc = ((item.item_name || '') + ' ' + (item.customer_name || '')).toLowerCase();
    const isPurchaseKeyword = item.payment_mode === 'Purchase' || desc.includes('ginger') || desc.includes('garlic') || desc.includes('jayakodi') || /\bdesi\b/.test(desc) || desc.includes('naatu');
    return isPurchaseKeyword && String(item.customer_name || 'Unknown').toUpperCase().trim() === 'UNKNOWN';
  });
  
  let duplicateCount = 0;
  unknown.forEach(u => {
      if (paymentSet.has(`${u.date}-${u.amount}`)) {
          duplicateCount++;
      }
  });
  console.log("Out of", unknown.length, "UNKNOWN expenses, how many match a Supplier_Payment exactly by Date and Amount?", duplicateCount);
} 
run();
