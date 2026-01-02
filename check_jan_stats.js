
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkJanStats() {
    console.log("Checking Production Logs for Jan 2026...");

    // Helper
    const runQuery = async (type) => {
        const { count, error } = await supabase
            .from('production_logs')
            .select('*', { count: 'exact', head: true })
            .eq('type', type)
            .gte('date', '2026-01-01')
            .lt('date', '2026-02-01');

        if (error) return `Error: ${error.message}`;
        return count;
    };

    const stockIn = await runQuery('stock_in');
    const usage = await runQuery('usage');
    const production = await runQuery('production');

    console.log(`Stock In (Jan 2026): ${stockIn}`);
    console.log(`Pre-Prod (Jan 2026): ${usage}`);
    console.log(`Post-Prod (Jan 2026): ${production}`);
}

checkJanStats();
