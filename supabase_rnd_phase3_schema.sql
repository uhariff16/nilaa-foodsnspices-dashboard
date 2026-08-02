-- Phase 3: R&D Management Module - Observation, Shelf-Life & Laboratories Schema

-- 1. Observations
-- Tracks the physical and sensory evaluation of samples over time.
CREATE TABLE rnd_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID REFERENCES rnd_samples(id) ON DELETE CASCADE,
    observer_name TEXT NOT NULL,
    observation_date DATE NOT NULL,
    day_number INTEGER, -- e.g., Day 0, Day 7, Day 30
    color TEXT,
    odor TEXT,
    texture TEXT,
    taste TEXT,
    water_separation BOOLEAN DEFAULT false,
    ph_value NUMERIC,
    aw_value NUMERIC,
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb, -- Array of image URLs/paths
    status TEXT DEFAULT 'Pass', -- Pass, Caution, Fail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Lab Requests
-- Tracks external or internal lab testing requests for specific samples.
CREATE TABLE rnd_lab_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID REFERENCES rnd_samples(id) ON DELETE CASCADE,
    lab_name TEXT NOT NULL, -- e.g., "Internal QA", "Eurofins"
    request_date DATE NOT NULL,
    test_type TEXT, -- e.g., 'Microbiological', 'Chemical', 'Physical'
    parameters TEXT, -- e.g., 'TPC, Yeast & Mold, E.coli'
    status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed, Cancelled
    report_url TEXT, -- Link to PDF report
    results_summary TEXT, -- Final summary notes from the lab report
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
