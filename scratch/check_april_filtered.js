import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BLACKLIST_ITEMS = [
    'BOX', 'PRINTING', 'POUCH', 'LABEL', 'CARRY BAG', 'SECURITY', 'RENT', 'WAGES', 'SALARY', 
    'LOAN', 'ADVANCE', 'ELECTRICITY', 'POWER', 'INTERNET', 'EB BILL', 'PETTY', 'OFFICE', 'TEA', 
    'SNACKS', 'TRANSPORT', 'FREIGHT', 'AUTO', 'COOLIE', 'LOAD', 'UNLOAD', 'REPAIR', 'MAINTENANCE', 
    'PLUMBING', 'ELECTRICAL', 'HARDWARE', 'STATIONERY', 'PRINT', 'XEROX', 'COURIER', 'POST', 
    'PETROL', 'DIESEL', 'FUEL', 'TOLL', 'MEALS', 'FOOD', 'COMMISSION', 'INTEREST', 'TAX', 'GST', 
    'CGST', 'SGST', 'IGST', 'ROUND OFF', 'DISCOUNT', 'REJECT', 'DAMAGE', 'WASTE', 'SPOILED'
];

const getPackWeight = (desc) => {
    if (!desc) return 1;
    const d = desc.toUpperCase();
    const match = d.match(/(\d+(?:\.\d+)?)\s*(KG|GM|GMS|G|ML|L)/);
    if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2];
        if (unit.startsWith('K') || unit === 'L') return val;
        if (unit.startsWith('G') || unit.startsWith('M')) return val / 1000;
    }
    return 1;
};

async function main() {
    let allRows = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('transactions').select('*').range(from, from + batchSize - 1);
        if (error) break;
        allRows = [...allRows, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
    }

    const aprilSales = allRows.filter(t => {
        if (!t.date || !t.date.startsWith('2026-04')) return false;
        if (t.payment_mode !== 'Sales') return false;
        
        const rawName = String(t.item_name || '').toUpperCase().trim();
        const isFinishedPaste = rawName.includes('PASTE') || rawName.includes('G & G') || rawName.includes('G&G') || rawName.includes('PEELED');
        const isBlacklisted = BLACKLIST_ITEMS.some(b => rawName.includes(b)) ||
            rawName === 'ITEM' || rawName === 'PRODUCT' ||
            rawName === 'AMOUNT' || rawName === 'SUBTOTAL' || rawName === 'INVOICE TOTAL' || rawName === 'TOTAL' ||
            !isFinishedPaste;

        if (isBlacklisted) return false;
        return true;
    });

    console.log("Filtered April 2026 Sales count:", aprilSales.length);
    const totalAmt = aprilSales.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalVol = aprilSales.reduce((sum, t) => sum + (parseFloat(t.quantity || 0) * getPackWeight(t.item_name)), 0);
    console.log(`Calculated Filtered Revenue: ₹${totalAmt.toLocaleString()}`);
    console.log(`Calculated Filtered Volume: ${totalVol.toLocaleString()} kg`);
}

main();
