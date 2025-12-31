
import { supabase } from './src/lib/supabaseClient.js';

async function testConnection() {
    console.log("Testing Supabase Connection...");
    try {
        const { data, error } = await supabase.from('production_logs').select('*').limit(1);
        if (error) {
            console.error("Connection Failed:", error.message);
        } else {
            console.log("Connection Successful!");
            console.log("Data sample:", data);
        }
    } catch (err) {
        console.error("Unexpected Error:", err);
    }
}

testConnection();
