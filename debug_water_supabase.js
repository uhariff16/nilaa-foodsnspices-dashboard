const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching Feb 2026 transactions from DB...");
    const { data: allData, error } = await supabase.from('transactions')
        .select('*')
        .gte('date', '2026-02-01')
        .lt('date', '2026-03-01');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total Feb DB transactions: ${allData.length}`);

    // Water Logic filter
    const waterKeywords = ['WATER', 'CAN WATER', 'WATER CAN'];
    const waterTxns = allData.filter(t => {
        const name = String(t.item_name || '').toUpperCase();
        return waterKeywords.some(k => name.includes(k));
    });

    console.log(`Matched ${waterTxns.length} Water transactions in Feb:`);
    let total = 0;
    waterTxns.forEach(t => {
        console.log(`- Date: ${t.date}, Amount: ${t.amount}, Type: ${t.payment_mode}, Desc: ${t.item_name}`);
        total += Number(t.amount || 0);
    });

    console.log(`\nTOTAL WATER SUM IN FEB DB: ${total}`);
}

run();
