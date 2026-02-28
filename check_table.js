import { supabase } from './src/lib/supabaseClient.js';

async function checkTable() {
    console.log("Checking for employee_payments table...");
    const { data, error } = await supabase
        .from('employee_payments')
        .select('*')
        .limit(1);

    if (error) {
        if (error.code === '42P01') {
            console.error("❌ Table 'employee_payments' does not exist.");
        } else {
            console.error("❌ Error checking table:", error.message);
        }
    } else {
        console.log("✅ Table 'employee_payments' exists!");
    }
}

checkTable();
