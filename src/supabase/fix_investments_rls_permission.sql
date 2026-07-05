-- Supabase RLS Migration: Grant SELECT, INSERT, UPDATE, and DELETE access to investments data for permitted users
-- Executing this query in the SQL editor enables non-admins with dashboard.investments permissions (read/write) to access the tab.

-- 1. Helper function to check if the user is authorized to read investments data (either read or write permission)
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
        OR (permissions->'dashboard'->>'investments') = 'true'
        OR (permissions->'dashboard'->'investments'->>'read') = 'true'
        OR (permissions->'dashboard'->'investments'->>'write') = 'true'
        OR (permissions->'dashboard'->>'ytd') = 'true'
      )
  );
$$;

-- 2. Helper function to check if the user is authorized to write/modify investments data
CREATE OR REPLACE FUNCTION public.has_investment_write_access()
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
        OR (permissions->'dashboard'->>'investments') = 'true' -- backward compatibility
        OR (permissions->'dashboard'->'investments'->>'write') = 'true'
      )
  );
$$;

-- 3. Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Admins manage assets" ON public.business_assets;
DROP POLICY IF EXISTS "Admins manage investments" ON public.partner_investments;
DROP POLICY IF EXISTS "View assets if permitted" ON public.business_assets;
DROP POLICY IF EXISTS "View investments if permitted" ON public.partner_investments;
DROP POLICY IF EXISTS "Admins manage assets write" ON public.business_assets;
DROP POLICY IF EXISTS "Admins manage investments write" ON public.partner_investments;
DROP POLICY IF EXISTS "Manage assets if permitted write" ON public.business_assets;
DROP POLICY IF EXISTS "Manage investments if permitted write" ON public.partner_investments;

-- 4. Create updated policies for public.business_assets
CREATE POLICY "View assets if permitted" 
ON public.business_assets FOR SELECT TO authenticated
USING (public.has_investment_access());

CREATE POLICY "Manage assets if permitted write" 
ON public.business_assets FOR ALL TO authenticated
USING (public.is_admin() OR public.has_investment_write_access())
WITH CHECK (public.is_admin() OR public.has_investment_write_access());

-- 5. Create updated policies for public.partner_investments
CREATE POLICY "View investments if permitted" 
ON public.partner_investments FOR SELECT TO authenticated
USING (public.has_investment_access());

CREATE POLICY "Manage investments if permitted write" 
ON public.partner_investments FOR ALL TO authenticated
USING (public.is_admin() OR public.has_investment_write_access())
WITH CHECK (public.is_admin() OR public.has_investment_write_access());
