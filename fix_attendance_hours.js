
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getDec(time) {
    if (!time || time === '-') return null;
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h + (m / 60);
}

async function fix() {
    console.log("Fetching corrupted records...");
    // Fetch records where total_hours is null
    const { data: records, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .is('total_hours', null);

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Found ${records.length} records to fix.`);

    for (const rec of records) {
        if (rec.shifts && Array.isArray(rec.shifts)) {
            let totalH = 0;
            rec.shifts.forEach(s => {
                const inD = getDec(s.in);
                const outD = getDec(s.out);
                if (inD !== null && outD !== null) {
                    let diff = outD - inD;
                    if (diff < 0) diff += 24;
                    totalH += diff;
                }
            });

            const breakMins = (rec.break_hours || 0) * 60;
            totalH = Math.max(0, totalH - (breakMins / 60));

            // Recalculate wage assuming generic 8h 
            // We don't have config here easily, hardcode 8h, 1.5x
            const standard_daily_hours = 8;
            const ot_multiplier = 1.5;
            const rate = rec.rate || 100;

            const regular_hours = Math.min(totalH, standard_daily_hours);
            const ot_hours = Math.max(0, totalH - standard_daily_hours);
            const wage = (regular_hours * rate) + (ot_hours * rate * ot_multiplier);

            console.log(`Fixing ${rec.emp_name} (${rec.date}): Shifts=${JSON.stringify(rec.shifts)} -> Total=${totalH.toFixed(2)}h`);

            const { error: updateError } = await supabase
                .from('employee_attendance')
                .update({
                    total_hours: totalH,
                    regular_hours: regular_hours,
                    ot_hours: ot_hours,
                    daily_wage: wage
                })
                .eq('id', rec.id);

            if (updateError) console.error("Update failed:", updateError);
            else console.log("Success.");
        }
    }
}

fix();
