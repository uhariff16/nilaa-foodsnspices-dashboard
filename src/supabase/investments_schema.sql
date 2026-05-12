
-- 1. Create Business Assets Table
CREATE TABLE IF NOT EXISTS public.business_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Machinery', -- Machinery, Vehicle, Furniture, Building, etc.
    purchase_date DATE NOT NULL,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Partner Investments Table
-- Links partners to assets or general capital
CREATE TABLE IF NOT EXISTS public.partner_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stakeholder_id UUID REFERENCES public.profit_stakeholders(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.business_assets(id) ON DELETE SET NULL, -- Null for general investments
    amount NUMERIC NOT NULL DEFAULT 0,
    investment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.business_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_investments ENABLE ROW LEVEL SECURITY;

-- 4. Admin-Only Policies
-- Only Admins can manage investment data
DROP POLICY IF EXISTS "Admins manage assets" ON public.business_assets;
CREATE POLICY "Admins manage assets" 
ON public.business_assets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'));

DROP POLICY IF EXISTS "Admins manage investments" ON public.partner_investments;
CREATE POLICY "Admins manage investments" 
ON public.partner_investments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'));

-- Optional: Allow Viewers to see (User said Admin only for now, so we keep it strict)
-- If you want viewers to SEE but not EDIT, we can add a SELECT policy later.

-- 5. Add Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_business_assets_updated_at ON public.business_assets;
CREATE TRIGGER update_business_assets_updated_at
    BEFORE UPDATE ON public.business_assets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_investments_updated_at ON public.partner_investments;
CREATE TRIGGER update_partner_investments_updated_at
    BEFORE UPDATE ON public.partner_investments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
