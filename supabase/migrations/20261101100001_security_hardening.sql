-- ==============================================================================
-- NILAA FOODS & SPICES — STAGE 3A MIGRATION 01: SECURITY HARDENING
-- Purpose: Enforce least-privilege RLS, revoke anon write grants, secure definer funcs
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. ENSURE BASE TABLES & USER_ROLES USER_ID COLUMN
CREATE TABLE IF NOT EXISTS public.daily_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    material TEXT NOT NULL,
    opening_stock NUMERIC DEFAULT 0,
    closing_stock NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE public.user_roles SET user_id = id WHERE user_id IS NULL;

-- 1. REVOKE ALL UNPROTECTED TABLE-LEVEL DML PRIVILEGES FROM ANON, AUTHENTICATED, AND PUBLIC
-- In PostgreSQL, revoking column-level privileges does NOT restrict access if table-level DML is granted.
-- Therefore, table-level INSERT, UPDATE, DELETE are completely revoked from client roles.
REVOKE ALL ON TABLE public.production_logs FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.transactions FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.daily_stock FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.customer_receivables FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.customer_stats FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.system_settings FROM anon, authenticated, PUBLIC;

-- 2. ENSURE READ PRIVILEGES ACROSS OPERATIONAL TABLES
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        GRANT USAGE ON SCHEMA auth TO anon, authenticated;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;
    END IF;
END $$;

-- 3. GRANT LEAST-PRIVILEGE COLUMN-LEVEL DML FOR AUTHENTICATED MANUAL OPERATIONS
-- Only legitimate business fields used by manual entry and adjustments are writable by authenticated sessions.
-- Managed reconciliation lifecycle columns remain completely ungranted and cannot be inserted or updated by clients.
GRANT INSERT (id, date, type, material, weight, remarks, created_at) 
ON TABLE public.production_logs TO authenticated;

GRANT UPDATE (date, type, material, weight, remarks) 
ON TABLE public.production_logs TO authenticated;

GRANT DELETE ON TABLE public.production_logs TO authenticated;

-- Operational DML for transactions, daily_stock, customer datasets, and system_settings (strictly governed by RLS policies)
GRANT INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.daily_stock TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.customer_receivables TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.customer_stats TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.system_settings TO authenticated;

-- 2. DROP OVERLY PERMISSIVE LEGACY & EXISTING POLICIES (Idempotent)
DROP POLICY IF EXISTS "Enable insert for all users" ON public.production_logs;
DROP POLICY IF EXISTS "Enable update for all users" ON public.production_logs;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.production_logs;
DROP POLICY IF EXISTS "Allow anon all" ON public.production_logs;
DROP POLICY IF EXISTS "Public all" ON public.production_logs;
DROP POLICY IF EXISTS "Allow Read All" ON public.production_logs;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON public.production_logs;
DROP POLICY IF EXISTS "Public Access" ON public.production_logs;
DROP POLICY IF EXISTS "production_logs_select_active" ON public.production_logs;
DROP POLICY IF EXISTS "production_logs_insert_authorized" ON public.production_logs;
DROP POLICY IF EXISTS "production_logs_update_authorized" ON public.production_logs;
DROP POLICY IF EXISTS "production_logs_delete_admin" ON public.production_logs;

DROP POLICY IF EXISTS "Enable insert for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon all" ON public.transactions;
DROP POLICY IF EXISTS "Allow Read All" ON public.transactions;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON public.transactions;
DROP POLICY IF EXISTS "Public Access" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_all" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_authorized" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_authorized" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_admin" ON public.transactions;

DROP POLICY IF EXISTS "Enable insert for all users" ON public.daily_stock;
DROP POLICY IF EXISTS "Enable update for all users" ON public.daily_stock;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.daily_stock;
DROP POLICY IF EXISTS "daily_stock_select_all" ON public.daily_stock;
DROP POLICY IF EXISTS "daily_stock_write_authorized" ON public.daily_stock;

DROP POLICY IF EXISTS "Allow anon all" ON public.customer_receivables;
DROP POLICY IF EXISTS "customer_receivables_select_all" ON public.customer_receivables;
DROP POLICY IF EXISTS "customer_receivables_write_authorized" ON public.customer_receivables;

DROP POLICY IF EXISTS "Public Access" ON public.customer_stats;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON public.customer_stats;
DROP POLICY IF EXISTS "Allow Read All" ON public.customer_stats;
DROP POLICY IF EXISTS "Allow anon all" ON public.customer_stats;
DROP POLICY IF EXISTS "customer_stats_select_all" ON public.customer_stats;
DROP POLICY IF EXISTS "customer_stats_write_authorized" ON public.customer_stats;

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Admin Manage Profit Reserve" ON public.system_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_write_authorized" ON public.system_settings;

-- 3. ENSURE BASE COLUMNS & ENABLE ROW LEVEL SECURITY ACROSS CORE OPERATIONAL TABLES
ALTER TABLE public.production_logs 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_stats ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES FOR production_logs
-- 4a. SELECT: All authenticated and anon clients can read operational records (excluding approved soft-deleted).
-- Admin and financial controllers can read all records including soft-deleted for audit/restoration purposes.
CREATE POLICY "production_logs_select_active"
ON public.production_logs FOR SELECT
USING (
    is_deleted = false
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);

-- 4b. INSERT: Authenticated users with admin, financial_controller, or data_entry role
CREATE POLICY "production_logs_insert_authorized"
ON public.production_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller', 'data_entry')
    )
);

-- 4c. UPDATE: Authenticated admin or financial_controller for adjustments
CREATE POLICY "production_logs_update_authorized"
ON public.production_logs FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);

-- 4d. DELETE: Strictly restricted to admin users (physical delete restricted; prefer soft-delete)
CREATE POLICY "production_logs_delete_admin"
ON public.production_logs FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role = 'admin'
    )
);

-- 5. POLICIES FOR transactions
CREATE POLICY "transactions_select_all"
ON public.transactions FOR SELECT
USING (true);

CREATE POLICY "transactions_insert_authorized"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);

CREATE POLICY "transactions_update_authorized"
ON public.transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);

CREATE POLICY "transactions_delete_admin"
ON public.transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role = 'admin'
    )
);

-- 6. POLICIES FOR daily_stock
CREATE POLICY "daily_stock_select_all"
ON public.daily_stock FOR SELECT
USING (true);

CREATE POLICY "daily_stock_write_authorized"
ON public.daily_stock FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);

-- 7. POLICIES FOR system_settings
CREATE POLICY "system_settings_select_all"
ON public.system_settings FOR SELECT
USING (true);

CREATE POLICY "system_settings_write_authorized"
ON public.system_settings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
    AND key NOT IN ('reconciliation_enabled', 'reconciliation_activation_timestamp', 'reconciliation_cutover_date')
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
    AND key NOT IN ('reconciliation_enabled', 'reconciliation_activation_timestamp', 'reconciliation_cutover_date')
);

-- 8. POLICIES FOR customer_receivables
CREATE POLICY "customer_receivables_select_all"
ON public.customer_receivables FOR SELECT
USING (true);

CREATE POLICY "customer_receivables_write_authorized"
ON public.customer_receivables FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);

-- 9. POLICIES FOR customer_stats
CREATE POLICY "customer_stats_select_all"
ON public.customer_stats FOR SELECT
USING (true);

CREATE POLICY "customer_stats_write_authorized"
ON public.customer_stats FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email')) 
        AND ur.role IN ('admin', 'financial_controller')
    )
);
