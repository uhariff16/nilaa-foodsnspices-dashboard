-- ==============================================================================
-- NILAA FOODS & SPICES — STAGE 3A MIGRATION 02: RECONCILIATION & AUDIT SCHEMA
-- Purpose: Ingestion batches, discrepancy warnings, immutable audit logs, soft-delete
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. INGESTION BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.ingestion_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_name TEXT NOT NULL,                         -- e.g. 'Daily Stocks & Production'
    worksheet_name TEXT NOT NULL,                       -- e.g. 'Sep 2026'
    reporting_period DATE NOT NULL,                     -- Normalized to first of month, e.g. '2026-09-01'
    file_name TEXT NOT NULL,
    file_sha256 TEXT NOT NULL,
    is_authoritative BOOLEAN NOT NULL DEFAULT true,
    total_parsed_rows INT NOT NULL DEFAULT 0,
    new_records_count INT NOT NULL DEFAULT 0,
    modified_records_count INT NOT NULL DEFAULT 0,
    unchanged_records_count INT NOT NULL DEFAULT 0,
    missing_records_count INT NOT NULL DEFAULT 0,
    conflict_records_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'dry_run' CHECK (status IN ('dry_run', 'committed', 'rejected', 'superseded')),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    committed_at TIMESTAMPTZ
);

-- Index for scoped batch queries (NO global file_sha256 unique constraint that blocks re-reconciliation)
CREATE INDEX IF NOT EXISTS idx_batches_lineage 
ON public.ingestion_batches(dataset_name, worksheet_name, reporting_period, status);

CREATE INDEX IF NOT EXISTS idx_batches_created 
ON public.ingestion_batches(created_at DESC);

-- 2. ADD LIFECYCLE & SOFT-DELETE COLUMNS TO production_logs
-- CRITICAL STAGE 3I RULE: All existing historical records default to is_reconciliation_managed = false (LEGACY/PROTECTED).
-- Only future records created through authorized reconciliation ingestion after activation become managed.
ALTER TABLE public.production_logs 
ADD COLUMN IF NOT EXISTS is_reconciliation_managed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_deletion', 'approved_deleted', 'disputed')),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (reconciliation_status IN ('confirmed', 'pending_verification', 'discrepancy_flagged', 'restored')),
ADD COLUMN IF NOT EXISTS ingestion_batch_id UUID REFERENCES public.ingestion_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_file TEXT,
ADD COLUMN IF NOT EXISTS source_lineage TEXT,           -- e.g. 'Daily Stocks & Production.xlsx::Sep 2026'
ADD COLUMN IF NOT EXISTS logical_key TEXT,              -- Normalized scoped identity: 'usage:2026-09-01:Garlic:0'
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_production_logs_operational 
ON public.production_logs(date, type, material) 
WHERE is_deleted = false AND status != 'approved_deleted';

CREATE INDEX IF NOT EXISTS idx_production_logs_lifecycle 
ON public.production_logs(is_deleted, reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_production_logs_managed 
ON public.production_logs(is_reconciliation_managed, date);

CREATE INDEX IF NOT EXISTS idx_production_logs_lineage 
ON public.production_logs(source_lineage, date);

-- 3. RECONCILIATION DISCREPANCIES TABLE
-- IMPORTANT: NO CASCADE DELETE. Audit records and evidence must NEVER be destroyed by deleting batches.
CREATE TABLE IF NOT EXISTS public.reconciliation_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.ingestion_batches(id) ON DELETE SET NULL,
    production_log_id UUID REFERENCES public.production_logs(id) ON DELETE RESTRICT,
    dataset_name TEXT NOT NULL DEFAULT 'Daily Stocks & Production',
    worksheet_name TEXT NOT NULL,
    reporting_period DATE NOT NULL,
    discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('missing_in_file', 'quantity_mismatch', 'date_mismatch', 'duplicate_worksheet', 'row_conflict')),
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    db_state JSONB NOT NULL,                            -- Exact snapshot of DB record at detection time
    file_state JSONB,                                   -- Snapshot of file row (if applicable)
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'acknowledged', 'approved_deletion', 'restored', 'rejected')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Prevent duplicate open warnings for the same DB record
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_discrepancy
ON public.reconciliation_discrepancies(production_log_id, discrepancy_type)
WHERE resolution_status = 'open';

CREATE INDEX IF NOT EXISTS idx_discrepancies_month_status
ON public.reconciliation_discrepancies(reporting_period, resolution_status);

-- 4. IMMUTABLE INGESTION AUDIT LOGS (Append-Only)
CREATE TABLE IF NOT EXISTS public.ingestion_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.ingestion_batches(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN (
        'dry_run_preview', 'commit_reconciliation', 'resolve_discrepancy', 
        'restore_record', 'soft_delete', 'manual_insert', 'manual_update', 'manual_delete', 'system_activation'
    )),
    actor_id UUID REFERENCES auth.users(id),
    actor_email TEXT,
    payload JSONB NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
ON public.ingestion_audit_logs(action, created_at DESC);

-- 4b. AUTOMATIC AUDIT TRIGGER ON production_logs (Captures all direct writes)
-- Internal definer helper to insert into append-only audit log
-- Hardened with execution restrictions and stack inspection to prevent client forgery
CREATE OR REPLACE FUNCTION public.internal_record_audit_event(
    p_action TEXT,
    p_actor_id UUID,
    p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stack TEXT;
BEGIN
    GET DIAGNOSTICS v_stack = PG_CONTEXT;
    IF v_stack NOT LIKE '%trg_%' AND v_stack NOT LIKE '%reconcile_%' AND v_stack NOT LIKE '%approve_%' AND v_stack NOT LIKE '%activate_%' THEN
        RAISE EXCEPTION '403_DIRECT_EXECUTION_PROHIBITED: internal_record_audit_event cannot be called directly.'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.ingestion_audit_logs (
        action,
        actor_id,
        payload
    ) VALUES (
        p_action,
        COALESCE(p_actor_id, auth.uid()),
        p_payload
    );
END;
$$;

-- Revoke direct execute privilege from anon, authenticated, and public
REVOKE ALL ON FUNCTION public.internal_record_audit_event(TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_record_audit_event(TEXT, UUID, JSONB) TO postgres;

-- Trigger function runs as SECURITY DEFINER so it can log on behalf of any authorized direct write
CREATE OR REPLACE FUNCTION public.trg_audit_production_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_managed BOOLEAN := COALESCE(NEW.is_reconciliation_managed, OLD.is_reconciliation_managed, false);
    v_is_batch BOOLEAN := (current_setting('nfs.in_reconciliation_rpc', true) = 'true');
BEGIN
    -- Gate 4: Direct client writes (unmanaged records) CANNOT suppress audit trail.
    -- Even if a client sets nfs.in_reconciliation_rpc = 'true', direct unmanaged writes are mandatory-audited.
    -- Only trusted batch RPC executing as definer owner on managed records skips individual row-level logging.
    IF NOT v_is_managed OR NOT v_is_batch THEN
        PERFORM public.internal_record_audit_event(
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'manual_insert'
                WHEN TG_OP = 'UPDATE' THEN 'manual_update'
                WHEN TG_OP = 'DELETE' THEN 'manual_delete'
            END,
            auth.uid(),
            jsonb_build_object(
                'operation', TG_OP,
                'table', 'production_logs',
                'record_id', COALESCE(NEW.id, OLD.id),
                'date', COALESCE(NEW.date, OLD.date),
                'material', COALESCE(NEW.material, OLD.material),
                'weight', COALESCE(NEW.weight, OLD.weight),
                'type', COALESCE(NEW.type, OLD.type),
                'before_state', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
                'after_state', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
            )
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_production_logs ON public.production_logs;
CREATE TRIGGER trg_audit_production_logs
AFTER INSERT OR UPDATE OR DELETE ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_production_logs();

-- 4c. PERSISTENT CUTOVER CONFIGURATION & INITIAL DISABLED STATE
-- Server-controlled configuration for future-only cutover boundary.
-- Feature is disabled upon schema creation until explicitly activated by an administrator.
INSERT INTO public.system_settings (key, value)
VALUES 
    ('reconciliation_cutover_date', '2026-11-01'),
    ('reconciliation_enabled', 'false'),
    ('reconciliation_activation_timestamp', '')
ON CONFLICT (key) DO NOTHING;

-- Trigger to prevent ANY operation (direct SQL, client write, or bug) from converting legacy records to managed
CREATE OR REPLACE FUNCTION public.trg_prevent_legacy_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_reconciliation_managed = false AND NEW.is_reconciliation_managed = true THEN
        RAISE EXCEPTION '403_LEGACY_IMMUTABLE: Legacy historical records cannot be converted to reconciliation-managed.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_legacy_conversion ON public.production_logs;
DROP TRIGGER IF EXISTS trg_01_prevent_legacy_conversion ON public.production_logs;
CREATE TRIGGER trg_01_prevent_legacy_conversion
BEFORE UPDATE ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_legacy_conversion();

-- Task 1 & 2 (Stage 3I.4 & 3I.5): Unforgeable dual-layer privilege & execution boundary trigger
-- Uses SECURITY INVOKER so current_user truthfully identifies client callers (anon, authenticated).
-- Blocks direct client enrollment, lifecycle mutations, and managed record business modifications.
-- Preserves legitimate manual edits to unmanaged/legacy records.
CREATE OR REPLACE FUNCTION public.trg_enforce_managed_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_batch BOOLEAN := (current_setting('nfs.in_reconciliation_rpc', true) = 'true');
BEGIN
    -- Gate 1: Block direct INSERT of managed records outside authorized definer RPC
    IF TG_OP = 'INSERT' AND NEW.is_reconciliation_managed = true THEN
        IF current_user IN ('anon', 'authenticated') OR NOT v_is_batch THEN
            RAISE EXCEPTION '403_DIRECT_ENROLLMENT_DENIED: Direct writes cannot enroll records as reconciliation-managed. Only authorized reconciliation RPC can manage eligibility.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Gate 1: Block direct UPDATE changing eligibility from false to true outside definer RPC
    IF TG_OP = 'UPDATE' AND OLD.is_reconciliation_managed = false AND NEW.is_reconciliation_managed = true THEN
        IF current_user IN ('anon', 'authenticated') OR NOT v_is_batch THEN
            RAISE EXCEPTION '403_LEGACY_IMMUTABLE: Direct writes cannot enroll records as reconciliation-managed. Only authorized reconciliation RPC can manage eligibility.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Gate 2: Protect business fields of reconciliation-managed records from direct client edits
    -- Legitimate direct edits to unmanaged records (OLD.is_reconciliation_managed = false) are preserved!
    IF TG_OP = 'UPDATE' AND OLD.is_reconciliation_managed = true THEN
        IF (NEW.date IS DISTINCT FROM OLD.date OR
            NEW.type IS DISTINCT FROM OLD.type OR
            NEW.material IS DISTINCT FROM OLD.material OR
            NEW.weight IS DISTINCT FROM OLD.weight) THEN
            IF current_user IN ('anon', 'authenticated') OR NOT v_is_batch THEN
                RAISE EXCEPTION '403_MANAGED_RECORD_LOCKED: Business fields (date, type, material, weight) of reconciliation-managed records cannot be modified directly. Changes must be ingested through authorized Excel reconciliation.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    -- Gate 1: Block direct client modification to managed lifecycle columns
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.reconciliation_status IS DISTINCT FROM NEW.reconciliation_status OR 
            OLD.ingestion_batch_id IS DISTINCT FROM NEW.ingestion_batch_id OR
            OLD.is_deleted IS DISTINCT FROM NEW.is_deleted OR
            OLD.status IS DISTINCT FROM NEW.status) THEN
            IF current_user IN ('anon', 'authenticated') OR NOT v_is_batch THEN
                RAISE EXCEPTION '403_LIFECYCLE_PROTECTED: Managed lifecycle fields cannot be modified directly by client sessions.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_managed_enrollment ON public.production_logs;
DROP TRIGGER IF EXISTS trg_02_enforce_managed_enrollment ON public.production_logs;
CREATE TRIGGER trg_02_enforce_managed_enrollment
BEFORE INSERT OR UPDATE ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_managed_enrollment();

-- Trigger to reject historical business dates prior to the cutover boundary from being created as reconciliation-managed
CREATE OR REPLACE FUNCTION public.trg_enforce_cutover_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutover DATE;
BEGIN
    IF NEW.is_reconciliation_managed = true THEN
        SELECT value::date INTO v_cutover FROM public.system_settings WHERE key = 'reconciliation_cutover_date';
        IF v_cutover IS NULL THEN
            v_cutover := '2026-11-01'::date;
        END IF;
        IF NEW.date < v_cutover THEN
            RAISE EXCEPTION '422_CUTOVER_DATE_VIOLATION: Reconciliation-managed records cannot have date % prior to cutover date %.', NEW.date, v_cutover;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cutover_date ON public.production_logs;
DROP TRIGGER IF EXISTS trg_03_enforce_cutover_date ON public.production_logs;
CREATE TRIGGER trg_03_enforce_cutover_date
BEFORE INSERT OR UPDATE ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_cutover_date();

-- Gate 1 (Stage 3I.5A): Protected System Settings Trigger
-- Prevents ordinary client writes from directly creating, updating, or deleting protected reconciliation keys.
CREATE OR REPLACE FUNCTION public.trg_protect_system_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_key TEXT := COALESCE(NEW.key, OLD.key);
    v_in_recon BOOLEAN := (current_setting('nfs.in_reconciliation_rpc', true) = 'true');
BEGIN
    IF v_key IN ('reconciliation_enabled', 'reconciliation_activation_timestamp', 'reconciliation_cutover_date') THEN
        IF current_user IN ('anon', 'authenticated') OR NOT v_in_recon THEN
            RAISE EXCEPTION '403_PROTECTED_SETTING: Direct modification of protected system setting "%" is prohibited. Reconciliation settings can only be altered through authorized server procedures.', v_key
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_system_settings ON public.system_settings;
CREATE TRIGGER trg_protect_system_settings
BEFORE INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_system_settings();

-- Gate 2 (Stage 3I.5A): Direct Production Record Deletion Protection
-- Reconciliation-managed records cannot be physically deleted through DataManager, AdminCleanup, or direct SQL.
-- They can ONLY be soft-deleted through approve_record_deletion().
-- Unmanaged historical / manual records may be physically deleted by authorized admins, subject to audit logging.
CREATE OR REPLACE FUNCTION public.trg_protect_managed_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.is_reconciliation_managed IS TRUE THEN
        RAISE EXCEPTION '403_PHYSICAL_DELETE_PROHIBITED: Reconciliation-managed records cannot be physically deleted. Use approve_record_deletion to soft-delete.'
            USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_managed_deletion ON public.production_logs;
DROP TRIGGER IF EXISTS trg_04_protect_managed_deletion ON public.production_logs;
CREATE TRIGGER trg_04_protect_managed_deletion
BEFORE DELETE ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_managed_deletion();

-- 4d. RESTRICT COLUMN-LEVEL WRITE PRIVILEGES ON MANAGED LIFECYCLE FIELDS
-- Direct table-level DML is completely revoked in Migration 01.
-- Only manual operational fields (id, date, type, material, weight, remarks, created_at) are granted.
-- Managed lifecycle columns remain strictly inaccessible to client sessions.

-- 5. RLS POLICIES FOR RECONCILIATION TABLES
ALTER TABLE public.ingestion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5a. Table-level privilege restrictions: Direct DML strictly revoked from ordinary application roles
REVOKE ALL ON TABLE public.ingestion_batches FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.reconciliation_discrepancies FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.ingestion_audit_logs FROM anon, authenticated, PUBLIC;

GRANT SELECT ON TABLE public.ingestion_batches TO anon, authenticated;
GRANT SELECT ON TABLE public.reconciliation_discrepancies TO anon, authenticated;
GRANT SELECT ON TABLE public.ingestion_audit_logs TO authenticated;

-- 5b. ingestion_batches policies: Readable by all, writable by authorized ingestion roles
DROP POLICY IF EXISTS "ingestion_batches_select" ON public.ingestion_batches;
DROP POLICY IF EXISTS "ingestion_batches_write" ON public.ingestion_batches;
CREATE POLICY "ingestion_batches_select" ON public.ingestion_batches FOR SELECT USING (true);
CREATE POLICY "ingestion_batches_write" ON public.ingestion_batches FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email'))
        AND ur.role IN ('admin', 'financial_controller', 'data_entry')
    )
);

-- 5c. reconciliation_discrepancies: Readable by all, resolved by admin/financial_controller
DROP POLICY IF EXISTS "discrepancies_select" ON public.reconciliation_discrepancies;
DROP POLICY IF EXISTS "discrepancies_update" ON public.reconciliation_discrepancies;
CREATE POLICY "discrepancies_select" ON public.reconciliation_discrepancies FOR SELECT USING (true);
CREATE POLICY "discrepancies_update" ON public.reconciliation_discrepancies FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email'))
        AND ur.role IN ('admin', 'financial_controller')
    )
);

-- 5d. ingestion_audit_logs: Readable by admin/financial_controller, NEVER modifiable/deletable by anyone
DROP POLICY IF EXISTS "audit_logs_select" ON public.ingestion_audit_logs;
CREATE POLICY "audit_logs_select" ON public.ingestion_audit_logs FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE (ur.user_id = auth.uid() OR ur.id = auth.uid() OR ur.email = (auth.jwt() ->> 'email'))
        AND ur.role IN ('admin', 'financial_controller')
    )
);

-- Enforce strict append-only immutability on audit logs at engine level
CREATE OR REPLACE FUNCTION public.trg_enforce_audit_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '403_AUDIT_LOGS_IMMUTABLE: Audit log records are append-only and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_audit_immutability ON public.ingestion_audit_logs;
CREATE TRIGGER trg_enforce_audit_immutability
BEFORE UPDATE OR DELETE ON public.ingestion_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_audit_immutability();
