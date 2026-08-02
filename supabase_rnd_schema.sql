-- Phase 1: R&D Management Module - Database Schema

-- 1. R&D Ingredients Master
CREATE TABLE rnd_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    supplier TEXT,
    country TEXT,
    cost NUMERIC DEFAULT 0,
    allergen TEXT,
    shelf_life TEXT,
    storage_condition TEXT,
    specification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. R&D Projects
CREATE TABLE rnd_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    objective TEXT,
    project_leader TEXT,
    department TEXT,
    target_shelf_life TEXT,
    target_cost NUMERIC,
    target_ph TEXT,
    target_aw TEXT,
    target_packaging TEXT,
    target_storage TEXT,
    target_market TEXT,
    target_selling_price NUMERIC,
    expected_launch_date DATE,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. R&D Formula Versions
CREATE TABLE rnd_formula_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES rnd_projects(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    batch_yield NUMERIC,
    preservation_method TEXT,
    remarks TEXT,
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: In a production environment, ensure RLS (Row Level Security) policies are configured according to your needs.
-- For now, if you are relying on application-level logic (e.g. isAdmin), you can leave RLS disabled or set it to allow authenticated users.
