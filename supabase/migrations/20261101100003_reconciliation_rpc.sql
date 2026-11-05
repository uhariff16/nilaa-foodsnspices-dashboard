-- ==============================================================================
-- NILAA FOODS & SPICES — STAGE 3A MIGRATION 03: HARDENED RECONCILIATION RPC
-- Purpose: Authoritative server-side scoped reconciliation with concurrency locking
-- Function: public.reconcile_production_batch
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_production_batch(
    p_dataset_name TEXT,
    p_worksheet_name TEXT,
    p_reporting_period DATE,
    p_file_name TEXT,
    p_file_sha256 TEXT,
    p_is_authoritative BOOLEAN,
    p_records JSONB,                 -- Array of parsed inbound objects: { id, date, type, material, weight, remarks, logical_key }
    p_decisions JSONB DEFAULT '[]'::jsonb, -- Array of decisions: [{ db_id, action: 'approve_delete' | 'keep_warning', reason }]
    p_is_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_user_email TEXT;
    v_batch_id UUID;
    v_lock_key BIGINT;
    v_period_start DATE;
    v_period_end DATE;
    v_cutover_date DATE;
    v_enabled_setting TEXT;
    v_activation_ts_setting TEXT;
    v_activation_ts TIMESTAMPTZ;
    v_legacy_collision_ids UUID[] := '{}';
    v_deleted_candidate_ids UUID[] := '{}';
    v_deleted_row RECORD;
    v_restore_target_id UUID;
    v_is_ambiguous_restore BOOLEAN := false;
    
    v_record JSONB;
    v_decision JSONB;
    v_db_row RECORD;
    v_match_id UUID;
    
    v_count_new INT := 0;
    v_count_modified INT := 0;
    v_count_unchanged INT := 0;
    v_count_missing INT := 0;
    v_count_conflicts INT := 0;
    v_count_approved_deleted INT := 0;
    v_count_restored INT := 0;
    
    v_inbound_ids UUID[] := '{}';
    v_approved_delete_ids UUID[] := '{}';
    v_discrepancy_list JSONB := '[]'::jsonb;
    v_audit_payload JSONB;
BEGIN
    -- 0. TRANSACTION-LOCAL RPC EXECUTION FLAG
    PERFORM set_config('nfs.in_reconciliation_rpc', 'true', true);

    -- 1. AUTHENTICATION & ROLE VERIFICATION
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '401_UNAUTHORIZED: Authentication required to execute reconciliation.';
    END IF;

    -- Look up role supporting either id = v_user_id or user_id = v_user_id
    SELECT role INTO v_user_role
    FROM public.user_roles
    WHERE id = v_user_id;

    IF v_user_role IS NULL THEN
        BEGIN
            EXECUTE 'SELECT role FROM public.user_roles WHERE user_id = $1' INTO v_user_role USING v_user_id;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'production_manager', 'financial_controller', 'data_entry') THEN
        RAISE EXCEPTION '403_ACCESS_DENIED: User % lacks reconciliation authorization.', v_user_id;
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    IF v_user_email IS NULL THEN
        v_user_email := 'unknown@system.local';
    END IF;

    -- 1b. ACTIVATION STATUS CHECK (Fail-Closed)
    SELECT value INTO v_enabled_setting 
    FROM public.system_settings 
    WHERE key = 'reconciliation_enabled';

    SELECT value INTO v_activation_ts_setting 
    FROM public.system_settings 
    WHERE key = 'reconciliation_activation_timestamp';

    IF v_enabled_setting IS DISTINCT FROM 'true' OR v_activation_ts_setting IS NULL OR length(trim(v_activation_ts_setting)) = 0 THEN
        RAISE EXCEPTION '403_RECONCILIATION_NOT_ACTIVATED: Reconciliation system is not activated. Ingestion writes are blocked.';
    END IF;

    -- 2. SCOPE VALIDATION
    IF p_worksheet_name IS NULL OR length(trim(p_worksheet_name)) = 0 THEN
        RAISE EXCEPTION '400_BAD_REQUEST: worksheet_name is required.';
    END IF;
    IF p_reporting_period IS NULL THEN
        RAISE EXCEPTION '400_BAD_REQUEST: reporting_period is required.';
    END IF;

    -- Fetch cutover settings from system_settings
    SELECT value::date INTO v_cutover_date 
    FROM public.system_settings 
    WHERE key = 'reconciliation_cutover_date';
    
    IF v_cutover_date IS NULL THEN
        v_cutover_date := '2026-11-01'::date;
    END IF;

    -- Normalize period boundaries (e.g. 2026-11-01 to 2026-11-30)
    v_period_start := date_trunc('month', p_reporting_period)::date;
    v_period_end := (date_trunc('month', p_reporting_period) + interval '1 month - 1 day')::date;

    -- CRITICAL STAGE 3I.1 RULE: If the entire reporting period is prior to cutover date, reject
    IF v_period_end < v_cutover_date THEN
        RAISE EXCEPTION '422_HISTORICAL_CUTOVER_VIOLATION: Reporting period % is prior to reconciliation cutover date (%). Historical data is immutable.', p_reporting_period, v_cutover_date;
    END IF;

    -- Validate inbound records: only future records (on or after cutover) must fall within reporting period
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        IF (v_record->>'date')::date >= v_cutover_date THEN
            IF (v_record->>'date')::date < v_period_start OR (v_record->>'date')::date > v_period_end THEN
                RAISE EXCEPTION '422_SCOPE_VIOLATION: Record date % falls outside reporting period % to %.',
                    v_record->>'date', v_period_start, v_period_end;
            END IF;
        END IF;
    END LOOP;

    -- 3. CONCURRENCY SERIALIZATION (TRANSACTION ADVISORY LOCK)
    -- Hash dataset, worksheet, and period into a 64-bit integer
    v_lock_key := ('x' || substr(md5(p_dataset_name || ':' || p_worksheet_name || ':' || v_period_start::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 4. PROCESS INBOUND RECORDS & DETERMINE NEW / MODIFIED / UNCHANGED
    -- Parse approval decisions
    FOR v_decision IN SELECT * FROM jsonb_array_elements(p_decisions)
    LOOP
        IF v_decision->>'action' = 'approve_delete' THEN
            -- Only Admins may approve deletions
            IF v_user_role != 'admin' THEN
                RAISE EXCEPTION 'Access denied: Only administrators can approve record deletion.';
            END IF;
            v_approved_delete_ids := array_append(v_approved_delete_ids, (v_decision->>'db_id')::uuid);
        END IF;
    END LOOP;

    -- 5. ACQUIRE CURRENT DB ROWS IN SCOPE (LOCKED FOR UPDATE)
    -- CRITICAL STAGE 3I.1 RULE: Only acquire future records where date >= GREATEST(v_period_start, v_cutover_date)
    -- AND is_reconciliation_managed = true.
    -- Historical records are NEVER included in scope, NEVER flagged missing, and NEVER modified.
    CREATE TEMP TABLE IF NOT EXISTS temp_scope_rows ON COMMIT DROP AS
    SELECT id, date, type, material, weight, remarks, source_file, source_lineage, logical_key, status, is_deleted, is_reconciliation_managed
    FROM public.production_logs
    WHERE (date >= GREATEST(v_period_start, v_cutover_date) AND date <= v_period_end)
      AND is_reconciliation_managed = true
      AND (
          source_lineage LIKE '%::' || p_worksheet_name
          OR source_lineage IS NULL
          OR remarks LIKE '%Sheet: ' || p_worksheet_name || '%'
          OR to_char(date, 'Mon YYYY') = p_worksheet_name
      )
      AND status != 'approved_deleted'
    FOR UPDATE;

    -- 6. MATCHING & CLASSIFICATION
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        -- CRITICAL STAGE 3I.1 RULE: Skip historical rows from reconciliation
        IF (v_record->>'date')::date < v_cutover_date THEN
            CONTINUE;
        END IF;

        v_match_id := (v_record->>'id')::uuid;
        v_inbound_ids := array_append(v_inbound_ids, v_match_id);

        SELECT * INTO v_db_row
        FROM temp_scope_rows
        WHERE id = v_match_id;

        IF NOT FOUND THEN
            -- Try secondary logical key matching if ID shifted due to row insertion
            IF v_record->>'logical_key' IS NOT NULL THEN
                SELECT * INTO v_db_row
                FROM temp_scope_rows
                WHERE logical_key = v_record->>'logical_key';
            END IF;
        END IF;

        -- Fallback: Check if record exists in active production_logs by ID
        IF v_db_row.id IS NULL THEN
            SELECT * INTO v_db_row
            FROM public.production_logs
            WHERE id = v_match_id AND is_deleted = false AND status != 'approved_deleted';

            -- If record is legacy, block modification/enrollment and flag collision conflict
            IF v_db_row.id IS NOT NULL AND v_db_row.is_reconciliation_managed = false THEN
                v_count_conflicts := v_count_conflicts + 1;
                v_discrepancy_list := v_discrepancy_list || jsonb_build_object(
                    'type', 'legacy_collision',
                    'reason', 'Record is an immutable legacy record. Modification or managed re-enrollment blocked.',
                    'inbound_record', v_record,
                    'legacy_id', v_db_row.id
                );
                CONTINUE;
            END IF;
        END IF;

        IF v_db_row.id IS NULL THEN
            -- Task 2 (Stage 3I.3): Evidence-Based Legacy Collision Assessment
            -- Distinguish confirmed duplicate vs legitimate additional batch vs ambiguous identity
            DECLARE
                v_matched_legacy_id UUID := NULL;
                v_is_confirmed_duplicate BOOLEAN := false;
                v_legacy_candidate_ids UUID[] := '{}';
                v_inbound_weight NUMERIC := (v_record->>'weight')::numeric;
                v_inbound_remarks TEXT := COALESCE(v_record->>'remarks', '');
                v_legacy_rec RECORD;
            BEGIN
                -- Collect all legacy rows on the same date, type, material
                FOR v_legacy_rec IN 
                    SELECT id, weight, remarks, source_lineage
                    FROM public.production_logs
                    WHERE is_reconciliation_managed = false
                      AND is_deleted = false
                      AND date = (v_record->>'date')::date
                      AND type = v_record->>'type'
                      AND material = v_record->>'material'
                LOOP
                    v_legacy_candidate_ids := array_append(v_legacy_candidate_ids, v_legacy_rec.id);

                    -- Check exact weight match
                    IF abs(v_legacy_rec.weight - v_inbound_weight) < 0.0001 THEN
                        v_is_confirmed_duplicate := true;
                        v_matched_legacy_id := v_legacy_rec.id;
                    END IF;
                END LOOP;

                IF cardinality(v_legacy_candidate_ids) > 0 THEN
                    IF v_is_confirmed_duplicate THEN
                        -- 1. Confirmed Duplicate: exact match on date, type, material, weight
                        v_count_conflicts := v_count_conflicts + 1;
                        v_discrepancy_list := v_discrepancy_list || jsonb_build_object(
                            'type', 'confirmed_legacy_duplicate',
                            'reason', 'Inbound row matches existing historical record on date, type, material, and weight. Duplicate insertion prevented.',
                            'inbound_record', v_record,
                            'legacy_id', v_matched_legacy_id
                        );
                        CONTINUE; -- Block duplicate insertion
                    ELSE
                        -- Weight differs from all legacy records on this date
                        -- Check for distinct batch/shift evidence (e.g. 'Shift B' vs 'Shift A', 'Batch 2' vs 'Batch 1')
                        IF (v_inbound_remarks ~* '(shift\s*[b-z]|batch\s*[2-9]|run\s*[2-9]|evening|night|second)' 
                            OR v_record->>'batch_number' IS NOT NULL) THEN
                            -- 2. Legitimate Additional Batch: distinct evidence of separate production run
                            -- Allow insertion as new managed batch (proceeds below)
                            NULL;
                        ELSE
                            -- 3. Ambiguous Identity: quantity differs without distinct batch provenance
                            v_count_conflicts := v_count_conflicts + 1;
                            v_discrepancy_list := v_discrepancy_list || jsonb_build_object(
                                'type', 'legacy_ambiguity_conflict',
                                'reason', 'Ambiguous identity against historical record: quantity differs but distinct batch provenance is not established. Administrator review required.',
                                'inbound_record', v_record,
                                'candidate_legacy_ids', to_jsonb(v_legacy_candidate_ids)
                            );
                            CONTINUE; -- Fail safely without altering historical records
                        END IF;
                    END IF;
                END IF;
            END;

            -- Task 3: Search approved-deleted records SEPARATELY from active records
            -- 1. Check if inbound UUID directly matches a soft-deleted managed record
            SELECT * INTO v_deleted_row
            FROM public.production_logs
            WHERE id = v_match_id AND is_deleted = true AND is_reconciliation_managed = true;

            IF v_deleted_row.id IS NOT NULL THEN
                v_restore_target_id := v_deleted_row.id;
                v_is_ambiguous_restore := false;
            ELSE
                -- 2. Search by attributes among soft-deleted managed records
                SELECT array_agg(id) INTO v_deleted_candidate_ids
                FROM public.production_logs
                WHERE is_reconciliation_managed = true
                  AND is_deleted = true
                  AND date = (v_record->>'date')::date
                  AND type = v_record->>'type'
                  AND material = v_record->>'material'
                  AND weight = (v_record->>'weight')::numeric;

                IF cardinality(v_deleted_candidate_ids) = 1 THEN
                    v_restore_target_id := v_deleted_candidate_ids[1];
                    v_is_ambiguous_restore := false;
                ELSIF cardinality(v_deleted_candidate_ids) > 1 THEN
                    -- Ambiguous restoration: multiple candidate deleted records
                    v_restore_target_id := NULL;
                    v_is_ambiguous_restore := true;
                ELSE
                    v_restore_target_id := NULL;
                    v_is_ambiguous_restore := false;
                END IF;
            END IF;

            IF v_restore_target_id IS NOT NULL THEN
                -- Unambiguous restoration of soft-deleted record
                v_count_restored := v_count_restored + 1;

                IF NOT p_is_dry_run THEN
                    UPDATE public.production_logs
                    SET status = 'active',
                        is_deleted = false,
                        reconciliation_status = 'restored',
                        deleted_at = NULL,
                        deleted_by = NULL,
                        deletion_reason = NULL,
                        source_file = p_file_name,
                        source_lineage = p_file_name || '::' || p_worksheet_name
                    WHERE id = v_restore_target_id;

                    UPDATE public.reconciliation_discrepancies
                    SET resolution_status = 'restored',
                        resolved_at = timezone('utc'::text, now()),
                        resolved_by = v_user_id,
                        resolution_notes = 'Record reappeared in authoritative file ' || p_file_name
                    WHERE production_log_id = v_restore_target_id;

                    -- Task 3: Log all restorations with action = 'restore_record'
                    INSERT INTO public.ingestion_audit_logs (
                        action,
                        actor_id,
                        actor_email,
                        payload
                    ) VALUES (
                        'restore_record',
                        v_user_id,
                        v_user_email,
                        jsonb_build_object(
                            'event', 'RECORD_RESTORED',
                            'production_log_id', v_restore_target_id,
                            'date', v_record->>'date',
                            'material', v_record->>'material',
                            'weight', (v_record->>'weight')::numeric,
                            'restored_from_file', p_file_name
                        )
                    );
                END IF;
            ELSIF v_is_ambiguous_restore THEN
                -- Ambiguous restoration: Treat as conflict requiring administrator review
                v_count_conflicts := v_count_conflicts + 1;
                v_discrepancy_list := v_discrepancy_list || jsonb_build_object(
                    'type', 'row_conflict',
                    'reason', 'Ambiguous restoration: multiple soft-deleted records match inbound row. Administrator review required.',
                    'inbound_record', v_record,
                    'candidate_ids', to_jsonb(v_deleted_candidate_ids)
                );
            ELSE
                -- Truly NEW RECORD (Marked as future reconciliation managed)
                v_count_new := v_count_new + 1;
                IF NOT p_is_dry_run THEN
                    INSERT INTO public.production_logs (
                        id, date, type, material, weight, remarks, source_file, source_lineage, logical_key, status, is_deleted, reconciliation_status, is_reconciliation_managed
                    ) VALUES (
                        v_match_id,
                        (v_record->>'date')::date,
                        v_record->>'type',
                        v_record->>'material',
                        (v_record->>'weight')::numeric,
                        COALESCE(v_record->>'remarks', 'Sheet: ' || p_worksheet_name),
                        p_file_name,
                        p_file_name || '::' || p_worksheet_name,
                        v_record->>'logical_key',
                        'active',
                        false,
                        'confirmed',
                        true -- FUTURE MANAGED
                    );
                END IF;
            END IF;
        ELSE
            -- EXISTING RECORD: Check for Modifications
            IF (v_db_row.weight != (v_record->>'weight')::numeric) OR 
               (v_db_row.date != (v_record->>'date')::date) OR
               (v_db_row.material != v_record->>'material') THEN
                v_count_modified := v_count_modified + 1;
                IF NOT p_is_dry_run THEN
                    UPDATE public.production_logs
                    SET weight = (v_record->>'weight')::numeric,
                        date = (v_record->>'date')::date,
                        material = v_record->>'material',
                        remarks = COALESCE(v_record->>'remarks', remarks),
                        source_file = p_file_name,
                        source_lineage = p_file_name || '::' || p_worksheet_name,
                        status = 'active',
                        is_deleted = false,
                        reconciliation_status = 'confirmed'
                    WHERE id = v_db_row.id;
                END IF;
            ELSE
                v_count_unchanged := v_count_unchanged + 1;
            END IF;

            -- Auto-resolve any previous open discrepancy for this record
            IF NOT p_is_dry_run THEN
                UPDATE public.reconciliation_discrepancies
                SET resolution_status = 'restored',
                    resolved_at = timezone('utc'::text, now()),
                    resolved_by = v_user_id,
                    resolution_notes = 'Record reappeared in authoritative file ' || p_file_name
                WHERE production_log_id = v_db_row.id AND resolution_status = 'open';
            END IF;
        END IF;
    END LOOP;

    -- 7. DETECT MISSING RECORDS (In DB scope, but absent from authoritative file)
    IF p_is_authoritative THEN
        FOR v_db_row IN 
            SELECT * FROM temp_scope_rows 
            WHERE id != ALL(v_inbound_ids)
        LOOP
            v_count_missing := v_count_missing + 1;

            -- Check if this missing record has approved deletion
            IF v_db_row.id = ANY(v_approved_delete_ids) THEN
                v_count_approved_deleted := v_count_approved_deleted + 1;
                IF NOT p_is_dry_run THEN
                    UPDATE public.production_logs
                    SET status = 'approved_deleted',
                        is_deleted = true,
                        reconciliation_status = 'confirmed',
                        deleted_at = timezone('utc'::text, now()),
                        deleted_by = v_user_id,
                        deletion_reason = 'Approved missing record deletion during reconciliation with ' || p_file_name
                    WHERE id = v_db_row.id;

                    UPDATE public.reconciliation_discrepancies
                    SET resolution_status = 'approved_deletion',
                        resolved_at = timezone('utc'::text, now()),
                        resolved_by = v_user_id,
                        resolution_notes = 'Approved deletion in batch ' || p_file_name
                    WHERE production_log_id = v_db_row.id AND resolution_status = 'open';
                END IF;
            ELSE
                -- Record remains active in operational totals, but flagged as pending deletion discrepancy
                IF NOT p_is_dry_run THEN
                    UPDATE public.production_logs
                    SET status = 'pending_deletion',
                        reconciliation_status = 'discrepancy_flagged'
                    WHERE id = v_db_row.id AND status = 'active';
                END IF;

                v_discrepancy_list := v_discrepancy_list || jsonb_build_object(
                    'production_log_id', v_db_row.id,
                    'type', 'missing_in_file',
                    'date', v_db_row.date,
                    'item', v_db_row.material,
                    'weight', v_db_row.weight,
                    'log_type', v_db_row.type,
                    'remarks', v_db_row.remarks
                );

                IF NOT p_is_dry_run THEN
                    INSERT INTO public.reconciliation_discrepancies (
                        production_log_id, dataset_name, worksheet_name, reporting_period,
                        discrepancy_type, severity, db_state, resolution_status
                    ) VALUES (
                        v_db_row.id, p_dataset_name, p_worksheet_name, v_period_start,
                        'missing_in_file', 'warning', row_to_json(v_db_row)::jsonb, 'open'
                    )
                    ON CONFLICT (production_log_id, discrepancy_type) WHERE resolution_status = 'open'
                    DO NOTHING;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 8. CREATE BATCH AND AUDIT LOG (ON COMMIT WRITE)
    IF NOT p_is_dry_run THEN
        INSERT INTO public.ingestion_batches (
            dataset_name, worksheet_name, reporting_period, file_name, file_sha256,
            is_authoritative, total_parsed_rows, new_records_count, modified_records_count,
            unchanged_records_count, missing_records_count, conflict_records_count,
            status, uploaded_by, committed_at
        ) VALUES (
            p_dataset_name, p_worksheet_name, v_period_start, p_file_name, p_file_sha256,
            p_is_authoritative, jsonb_array_length(p_records), v_count_new, v_count_modified,
            v_count_unchanged, v_count_missing, v_count_conflicts,
            'committed', v_user_id, timezone('utc'::text, now())
        ) RETURNING id INTO v_batch_id;

        -- Update batch reference on inserted/updated logs
        UPDATE public.production_logs
        SET ingestion_batch_id = v_batch_id
        WHERE id = ANY(v_inbound_ids);

        -- Insert Immutable Audit Log
        v_audit_payload := jsonb_build_object(
            'dataset', p_dataset_name,
            'worksheet', p_worksheet_name,
            'reporting_period', v_period_start,
            'file_name', p_file_name,
            'file_sha256', p_file_sha256,
            'counts', jsonb_build_object(
                'new', v_count_new,
                'modified', v_count_modified,
                'unchanged', v_count_unchanged,
                'missing', v_count_missing,
                'approved_deleted', v_count_approved_deleted,
                'restored', v_count_restored
            )
        );

        INSERT INTO public.ingestion_audit_logs (
            batch_id, action, actor_id, actor_email, payload
        ) VALUES (
            v_batch_id, 'commit_reconciliation', v_user_id, v_user_email, v_audit_payload
        );
    END IF;

    -- 9. RETURN VERIFIED SERVER TOTALS
    RETURN jsonb_build_object(
        'success', true,
        'dry_run', p_is_dry_run,
        'batch_id', v_batch_id,
        'scope', jsonb_build_object(
            'dataset', p_dataset_name,
            'worksheet', p_worksheet_name,
            'period_start', v_period_start,
            'period_end', v_period_end
        ),
        'counts', jsonb_build_object(
            'total_inbound', jsonb_array_length(p_records),
            'new', v_count_new,
            'modified', v_count_modified,
            'unchanged', v_count_unchanged,
            'missing', v_count_missing,
            'approved_deleted', v_count_approved_deleted,
            'restored', v_count_restored,
            'conflicts', v_count_conflicts
        ),
        'discrepancies', v_discrepancy_list
    );
END;
$$;

-- Grant EXECUTE to authenticated users
GRANT EXECUTE ON FUNCTION public.reconcile_production_batch TO authenticated;
-- Explicitly revoke EXECUTE from public / anon
REVOKE EXECUTE ON FUNCTION public.reconcile_production_batch FROM anon, public;

-- ------------------------------------------------------------------------------
-- 10. APPROVE RECORD DELETION STORED PROCEDURE
-- Allows authorized admin to soft-delete an unapproved missing record from dashboard
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_record_deletion(
    p_production_log_id UUID,
    p_reason TEXT DEFAULT 'Admin approved soft deletion'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_target_log RECORD;
BEGIN
    -- 0. TRANSACTION-LOCAL RPC EXECUTION FLAG
    PERFORM set_config('nfs.in_reconciliation_rpc', 'true', true);

    v_user_id := auth.uid();

    -- Role check: Strictly administrator-only
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE (user_id = v_user_id OR id = v_user_id)
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION '403_ACCESS_DENIED: User % lacks admin role to approve deletion', v_user_id;
    END IF;

    -- Fetch target log
    SELECT * INTO v_target_log
    FROM public.production_logs
    WHERE id = p_production_log_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '404_NOT_FOUND: Record % does not exist', p_production_log_id;
    END IF;

    -- CRITICAL STAGE 3I RULE: Reject any attempt to delete historical records
    IF v_target_log.is_reconciliation_managed = false THEN
        RAISE EXCEPTION '403_LEGACY_PROTECTED: Record % is a protected historical record and cannot be soft-deleted by reconciliation.', p_production_log_id;
    END IF;

    -- Soft delete
    UPDATE public.production_logs
    SET status = 'approved_deleted',
        is_deleted = true,
        reconciliation_status = 'confirmed',
        deleted_at = timezone('utc'::text, now()),
        deleted_by = v_user_id,
        deletion_reason = p_reason
    WHERE id = p_production_log_id;

    -- Update discrepancy
    UPDATE public.reconciliation_discrepancies
    SET resolution_status = 'approved_deletion',
        resolved_at = timezone('utc'::text, now()),
        resolved_by = v_user_id,
        resolution_notes = p_reason
    WHERE production_log_id = p_production_log_id AND resolution_status = 'open';

    -- Audit trail
    INSERT INTO public.ingestion_audit_logs (
        action,
        actor_id,
        payload
    ) VALUES (
        'soft_delete',
        v_user_id,
        jsonb_build_object(
            'event', 'DISCREPANCY_APPROVED_DELETION',
            'production_log_id', p_production_log_id,
            'date', v_target_log.date,
            'material', v_target_log.material,
            'weight', v_target_log.weight,
            'reason', p_reason,
            'before_state', row_to_json(v_target_log)::jsonb,
            'after_state', jsonb_build_object('status', 'approved_deleted', 'is_deleted', true)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'production_log_id', p_production_log_id,
        'status', 'approved_deleted',
        'is_deleted', true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_record_deletion TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_record_deletion FROM anon, public;

-- ------------------------------------------------------------------------------
-- 11. ACTIVATE RECONCILIATION STORED PROCEDURE
-- Allows authorized admin to enable reconciliation and establish actual server activation time
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_existing_enabled TEXT;
    v_existing_ts TEXT;
    v_now TIMESTAMPTZ;
BEGIN
    -- 0. TRANSACTION-LOCAL RPC EXECUTION FLAG
    PERFORM set_config('nfs.in_reconciliation_rpc', 'true', true);

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '401_UNAUTHORIZED: Authentication required to activate reconciliation.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE (user_id = v_user_id OR id = v_user_id) AND role = 'admin'
    ) THEN
        RAISE EXCEPTION '403_ACCESS_DENIED: Only administrators can activate reconciliation.';
    END IF;

    -- Task 3 (Stage 3I.3): Idempotency Check & Original Activation Timestamp Preservation
    SELECT value INTO v_existing_enabled FROM public.system_settings WHERE key = 'reconciliation_enabled';
    SELECT value INTO v_existing_ts FROM public.system_settings WHERE key = 'reconciliation_activation_timestamp';

    IF v_existing_enabled = 'true' AND v_existing_ts IS NOT NULL AND length(trim(v_existing_ts)) > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'enabled', true,
            'activation_timestamp', v_existing_ts,
            'message', 'Reconciliation is already active. Original activation timestamp preserved.'
        );
    END IF;

    v_now := timezone('utc'::text, now());

    INSERT INTO public.system_settings (key, value)
    VALUES 
        ('reconciliation_enabled', 'true'),
        ('reconciliation_activation_timestamp', v_now::text)
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value;

    -- Audit log activation event
    INSERT INTO public.ingestion_audit_logs (
        action,
        actor_id,
        payload
    ) VALUES (
        'system_activation',
        v_user_id,
        jsonb_build_object(
            'event', 'RECONCILIATION_ACTIVATED',
            'activation_timestamp', v_now,
            'activated_by', v_user_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'enabled', true,
        'activation_timestamp', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_reconciliation TO authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_reconciliation FROM anon, public;

-- ------------------------------------------------------------------------------
-- 12. GET RECONCILIATION STATUS STORED PROCEDURE
-- Returns current enabled state, genuine activation timestamp, and cutover date
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_reconciliation_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_enabled TEXT;
    v_activation_ts TEXT;
    v_cutover_date TEXT;
BEGIN
    SELECT value INTO v_enabled FROM public.system_settings WHERE key = 'reconciliation_enabled';
    SELECT value INTO v_activation_ts FROM public.system_settings WHERE key = 'reconciliation_activation_timestamp';
    SELECT value INTO v_cutover_date FROM public.system_settings WHERE key = 'reconciliation_cutover_date';

    RETURN jsonb_build_object(
        'enabled', (v_enabled = 'true'),
        'activation_timestamp', v_activation_ts,
        'cutover_date', COALESCE(v_cutover_date, '2026-11-01')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reconciliation_status TO anon, authenticated;
