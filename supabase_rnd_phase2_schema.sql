-- Phase 2: R&D Management Module - Trial Planning & Batch Execution Schema

-- 1. Storage Locations (Virtual mapping for Samples)
CREATE TABLE rnd_storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT, -- e.g., 'Refrigerator', 'Incubator', 'Room Temp Shelf'
    temperature TEXT,
    humidity TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. R&D Trials
-- A trial tests a specific formula version or a specific set of variables.
CREATE TABLE rnd_trials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES rnd_projects(id) ON DELETE CASCADE,
    formula_version_id UUID REFERENCES rnd_formula_versions(id) ON DELETE SET NULL,
    trial_no TEXT NOT NULL,
    objective TEXT,
    variable_changed TEXT, -- What makes this trial different? (e.g., "Increased Citric Acid by 0.5%")
    status TEXT DEFAULT 'Planned', -- Planned, In Progress, Completed, Cancelled
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Trial Batches
-- The actual physical manufacturing of the trial.
CREATE TABLE rnd_trial_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_id UUID REFERENCES rnd_trials(id) ON DELETE CASCADE,
    batch_no TEXT NOT NULL,
    machine_used TEXT,
    operators TEXT,
    production_date DATE,
    start_time TIME,
    end_time TIME,
    total_yield NUMERIC,
    total_wastage NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. R&D Samples
-- Individual samples pulled from a trial batch for observation.
CREATE TABLE rnd_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_batch_id UUID REFERENCES rnd_trial_batches(id) ON DELETE CASCADE,
    storage_location_id UUID REFERENCES rnd_storage_locations(id) ON DELETE SET NULL,
    sample_code TEXT UNIQUE NOT NULL, -- e.g., NFS001-T1-B1-S1
    quantity NUMERIC, -- e.g., 200
    uom TEXT, -- e.g., 'grams'
    status TEXT DEFAULT 'Stored', -- Stored, Consumed in Testing, Discarded
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
