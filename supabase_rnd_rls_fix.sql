-- Disable RLS (If you want to handle security strictly at the application/routing level)
-- OR Enable RLS and add policies for authenticated users. 

-- Here we ENABLE RLS but grant FULL ACCESS to all authenticated users for the R&D module tables.
-- This resolves the "new row violates row-level security policy" error.

-- 1. Enable RLS on all R&D tables
ALTER TABLE rnd_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_formula_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_trial_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_approvals ENABLE ROW LEVEL SECURITY;

-- 2. Create policies to allow authenticated users to perform all operations (SELECT, INSERT, UPDATE, DELETE)

-- rnd_ingredients
CREATE POLICY "Allow full access to authenticated users" ON rnd_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_projects
CREATE POLICY "Allow full access to authenticated users" ON rnd_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_formula_versions
CREATE POLICY "Allow full access to authenticated users" ON rnd_formula_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_storage_locations
CREATE POLICY "Allow full access to authenticated users" ON rnd_storage_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_trials
CREATE POLICY "Allow full access to authenticated users" ON rnd_trials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_trial_batches
CREATE POLICY "Allow full access to authenticated users" ON rnd_trial_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_samples
CREATE POLICY "Allow full access to authenticated users" ON rnd_samples FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_observations
CREATE POLICY "Allow full access to authenticated users" ON rnd_observations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_lab_requests
CREATE POLICY "Allow full access to authenticated users" ON rnd_lab_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_risk_assessments
CREATE POLICY "Allow full access to authenticated users" ON rnd_risk_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- rnd_approvals
CREATE POLICY "Allow full access to authenticated users" ON rnd_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
