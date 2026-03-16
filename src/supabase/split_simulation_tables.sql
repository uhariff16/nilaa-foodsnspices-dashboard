-- Create tables for storing production cost simulations split by channel
-- TABLE 1: RETAIL SIMULATIONS
CREATE TABLE IF NOT EXISTS public.simulated_costs_retail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    item_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    variant TEXT,
    total_output NUMERIC NOT NULL,
    total_spend NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL,
    margin NUMERIC NOT NULL,
    suggested_price NUMERIC NOT NULL,
    calculation_method TEXT DEFAULT 'auto',
    input_parameters JSONB NOT NULL
);

-- TABLE 2: WHOLESALE SIMULATIONS
CREATE TABLE IF NOT EXISTS public.simulated_costs_wholesale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    item_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    variant TEXT,
    total_output NUMERIC NOT NULL,
    total_spend NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL,
    margin NUMERIC NOT NULL,
    suggested_price NUMERIC NOT NULL,
    calculation_method TEXT DEFAULT 'auto',
    input_parameters JSONB NOT NULL
);

-- Add calculation_method column if it doesn't exist (handles updates)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulated_costs_retail' AND column_name='calculation_method') THEN
        ALTER TABLE public.simulated_costs_retail ADD COLUMN calculation_method TEXT DEFAULT 'auto';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulated_costs_wholesale' AND column_name='calculation_method') THEN
        ALTER TABLE public.simulated_costs_wholesale ADD COLUMN calculation_method TEXT DEFAULT 'auto';
    END IF;
END $$;

-- Indexes (CREATE INDEX IF NOT EXISTS is already idempotent)
CREATE INDEX IF NOT EXISTS idx_sim_retail_item ON public.simulated_costs_retail(item_name);
CREATE INDEX IF NOT EXISTS idx_sim_retail_date ON public.simulated_costs_retail(created_at);
CREATE INDEX IF NOT EXISTS idx_sim_whole_item ON public.simulated_costs_wholesale(item_name);
CREATE INDEX IF NOT EXISTS idx_sim_whole_date ON public.simulated_costs_wholesale(created_at);

-- Row Level Security
ALTER TABLE public.simulated_costs_retail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_costs_wholesale ENABLE ROW LEVEL SECURITY;

-- Policies (Drop and recreate to avoid "already exists" errors)
DROP POLICY IF EXISTS "Public Read Access" ON public.simulated_costs_retail;
DROP POLICY IF EXISTS "Public Insert Access" ON public.simulated_costs_retail;
DROP POLICY IF EXISTS "Public Delete Access" ON public.simulated_costs_retail;

CREATE POLICY "Public Read Access" ON public.simulated_costs_retail FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON public.simulated_costs_retail FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON public.simulated_costs_retail FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.simulated_costs_wholesale;
DROP POLICY IF EXISTS "Public Insert Access" ON public.simulated_costs_wholesale;
DROP POLICY IF EXISTS "Public Delete Access" ON public.simulated_costs_wholesale;

CREATE POLICY "Public Read Access" ON public.simulated_costs_wholesale FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON public.simulated_costs_wholesale FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON public.simulated_costs_wholesale FOR DELETE USING (true);
