-- Profit Distribution Hub Schema
-- Handles stakeholder shares and distribution logic

-- 1. Create the stakeholders table
CREATE TABLE IF NOT EXISTS public.profit_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add RLS Policies
ALTER TABLE public.profit_stakeholders ENABLE ROW LEVEL SECURITY;

-- Allow Admins full access
CREATE POLICY "Admins have full access to profit_stakeholders"
ON public.profit_stakeholders
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow Viewers to read if they have permission (optional, currently strictly Admin UI)
CREATE POLICY "Users can view stakeholders"
ON public.profit_stakeholders
FOR SELECT
TO authenticated
USING (true);

-- 3. Add Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create Payouts Tracking Table
CREATE TABLE IF NOT EXISTS public.profit_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stakeholder_id UUID REFERENCES public.profit_stakeholders(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- e.g. "Mar 2026"
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(stakeholder_id, month_year)
);

ALTER TABLE public.profit_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to profit_payouts"
ON public.profit_payouts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Users can view payouts"
ON public.profit_payouts FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_profit_payouts_updated_at
    BEFORE UPDATE ON public.profit_payouts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
