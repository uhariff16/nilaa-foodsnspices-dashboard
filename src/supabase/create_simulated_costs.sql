-- Create table for storing production cost simulations
CREATE TABLE IF NOT EXISTS public.simulated_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    item_name TEXT NOT NULL,         -- e.g., "G & G Paste"
    product_type TEXT NOT NULL,      -- 'paste', 'ginger_peeled', 'garlic_peeled'
    variant TEXT,                    -- 'mix', 'ginger', 'garlic'
    channel TEXT NOT NULL,           -- 'retail', 'wholesale'
    
    total_output NUMERIC NOT NULL,   -- kg
    total_spend NUMERIC NOT NULL,    -- INR
    unit_cost NUMERIC NOT NULL,      -- INR/kg
    margin NUMERIC NOT NULL,         -- %
    suggested_price NUMERIC NOT NULL, -- INR/kg
    
    input_parameters JSONB NOT NULL  -- Full snapshot of inputs (gingerKg, rates, costs, etc.)
);

-- Index for faster retrieval by name and date
CREATE INDEX IF NOT EXISTS idx_simulated_costs_item ON public.simulated_costs(item_name);
CREATE INDEX IF NOT EXISTS idx_simulated_costs_created_at ON public.simulated_costs(created_at);

-- Row Level Security
ALTER TABLE public.simulated_costs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'simulated_costs' AND policyname = 'Public Read Access'
    ) THEN
        CREATE POLICY "Public Read Access" ON public.simulated_costs FOR SELECT USING (true);
    END IF;
END $$;

-- Policy: Allow public insert access (For simple admin use without deep auth setup yet)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'simulated_costs' AND policyname = 'Public Insert Access'
    ) THEN
        CREATE POLICY "Public Insert Access" ON public.simulated_costs FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Policy: Allow public delete access
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'simulated_costs' AND policyname = 'Public Delete Access'
    ) THEN
        CREATE POLICY "Public Delete Access" ON public.simulated_costs FOR DELETE USING (true);
    END IF;
END $$;
