import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runEndToEndTest() {
    console.log("Starting End-to-End Test for R&D Module...");
    let projectId, formulaId, trialId, batchId, sampleId, locationId;

    try {
        // Step 1: Create a Project
        console.log("\n[1] Creating Project...");
        const { data: project, error: projErr } = await supabase.from('rnd_projects').insert([{
            project_no: 'TEST-' + Date.now(),
            name: 'E2E Test Project',
            category: 'Testing',
            objective: 'Verify module flow',
            target_cost: 1.5,
            status: 'Draft'
        }]).select().single();
        if (projErr) throw projErr;
        projectId = project.id;
        console.log("✅ Project created:", project.project_no);

        // Step 2: Create a Formula Version
        console.log("\n[2] Creating Formula Version...");
        const { data: formula, error: formErr } = await supabase.from('rnd_formula_versions').insert([{
            project_id: projectId,
            version_no: 1,
            ingredients: JSON.stringify([{ code: 'ING01', qty: 100 }]),
            remarks: 'Initial Test Formula'
        }]).select().single();
        if (formErr) throw formErr;
        formulaId = formula.id;
        console.log("✅ Formula created: v" + formula.version_no);

        // Step 3: Create a Storage Location
        console.log("\n[3] Creating Storage Location...");
        const { data: location, error: locErr } = await supabase.from('rnd_storage_locations').insert([{
            name: 'Test Fridge A',
            type: 'Refrigerator',
            temperature: '4°C'
        }]).select().single();
        if (locErr) throw locErr;
        locationId = location.id;
        console.log("✅ Location created:", location.name);

        // Step 4: Plan a Trial
        console.log("\n[4] Planning Trial...");
        const { data: trial, error: trialErr } = await supabase.from('rnd_trials').insert([{
            project_id: projectId,
            formula_version_id: formulaId,
            trial_no: 'TR-' + Date.now(),
            objective: 'Test stability',
            status: 'Planned'
        }]).select().single();
        if (trialErr) throw trialErr;
        trialId = trial.id;
        console.log("✅ Trial created:", trial.trial_no);

        // Step 5: Log a Trial Batch
        console.log("\n[5] Logging Trial Batch...");
        const { data: batch, error: batchErr } = await supabase.from('rnd_trial_batches').insert([{
            trial_id: trialId,
            batch_no: 'B-' + Date.now(),
            total_yield: 50,
            machine_used: 'Mixer 1'
        }]).select().single();
        if (batchErr) throw batchErr;
        batchId = batch.id;
        console.log("✅ Batch created:", batch.batch_no);

        // Step 6: Log a Sample
        console.log("\n[6] Logging Sample...");
        const { data: sample, error: sampErr } = await supabase.from('rnd_samples').insert([{
            trial_batch_id: batchId,
            storage_location_id: locationId,
            sample_code: 'SAMP-' + Date.now(),
            quantity: 200,
            uom: 'grams',
            status: 'Stored'
        }]).select().single();
        if (sampErr) throw sampErr;
        sampleId = sample.id;
        console.log("✅ Sample created:", sample.sample_code);

        // Step 7: Record an Observation
        console.log("\n[7] Recording Observation...");
        const { data: obs, error: obsErr } = await supabase.from('rnd_observations').insert([{
            sample_id: sampleId,
            observer_name: 'Auto Tester',
            observation_date: new Date().toISOString().split('T')[0],
            day_number: 0,
            status: 'Pass'
        }]).select().single();
        if (obsErr) throw obsErr;
        console.log("✅ Observation logged for Day", obs.day_number);

        // Step 8: Risk Assessment
        console.log("\n[8] Logging Risk Assessment...");
        const { data: risk, error: riskErr } = await supabase.from('rnd_risk_assessments').insert([{
            project_id: projectId,
            assessment_date: new Date().toISOString().split('T')[0],
            overall_score: 95,
            recommendation: 'Pass',
            assessed_by: 'Auto Tester'
        }]).select().single();
        if (riskErr) throw riskErr;
        console.log("✅ Risk Assessment logged, score:", risk.overall_score);

        // Step 9: Approval Workflow
        console.log("\n[9] Requesting Approval...");
        const { data: app, error: appErr } = await supabase.from('rnd_approvals').insert([{
            project_id: projectId,
            formula_version_id: formulaId,
            stage: 'QA Approval',
            status: 'Pending',
            approver_name: 'QA Lead'
        }]).select().single();
        if (appErr) throw appErr;
        console.log("✅ Approval requested for stage:", app.stage);

        console.log("\n🎉 END-TO-END TEST COMPLETED SUCCESSFULLY! All schema relationships are valid and RLS policies allow insertion.");
    } catch (e) {
        console.error("\n❌ TEST FAILED:", e.message || e);
    }
}

runEndToEndTest();
