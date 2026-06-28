-- Supabase RLS Migration: Grant SELECT access to investments data for permitted users
-- Executing this query in the SQL editor enables non-admins with dashboard.investments permission to see the charts and tables.

-- 1. Helper function to check if the user is authorized to read investments data
CREATE OR REPLACE FUNCTION public.has_investment_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1 
    FROM public.user_roles 
    WHERE (id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'))
      AND (
        role = 'admin' 
        OR email = 'uhariff@gmail.com'
        OR (permissions->'dashboard'->>'investments')::boolean = true
      )
  );
$$;

-- 2. Drop the original rigid admin-only policies
DROP POLICY IF EXISTS "Admins manage assets" ON public.business_assets;
DROP POLICY IF EXISTS "Admins manage investments" ON public.partner_investments;

-- 3. Create updated policies for public.business_assets
CREATE POLICY "View assets if permitted" 
ON public.business_assets FOR SELECT TO authenticated
USING (public.has_investment_access());

CREATE POLICY "Admins manage assets write" 
ON public.business_assets FOR INSERT, UPDATE, DELETE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Create updated policies for public.partner_investments
CREATE POLICY "View investments if permitted" 
ON public.partner_investments FOR SELECT TO authenticated
USING (public.has_investment_access());

CREATE POLICY "Admins manage investments write" 
ON public.partner_investments FOR INSERT, UPDATE, DELETE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
