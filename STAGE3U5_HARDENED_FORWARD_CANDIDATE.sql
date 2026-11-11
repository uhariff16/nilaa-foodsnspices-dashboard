-- ============================================================================
-- NILAA FOODS & SPICES — STAGE 3U.2 HARDENED GATE B FINAL PRODUCTION REMEDIATION
-- FILE: STAGE3U2_HARDENED_GATE_B_REMEDIATION.sql
-- TARGET SUPABASE PROJECT: eegihrxwtyxdzsiabvtw (Nilaa Foods & Spices)
-- AUTHORIZATION STATUS: STRICTLY NOT AUTHORIZED FOR PRODUCTION EXECUTION
-- EXECUTION GATE: REQUIRES EXPLICIT SEPARATE WRITTEN STAGE 3U GATE B APPROVAL
-- ============================================================================
-- MUTATION SCOPE & INTEGRITY GUARANTEES:
-- 1. ATOMIC TRANSACTION: Enclosed in a single DO $$ block; rolls back on any error.
-- 2. CONCURRENCY PROTECTION: Row-level locks (FOR UPDATE) in deterministic PK order.
-- 3. EXACT BEFORE-IMAGE VALIDATION: All 10 fields verified via NULL-safe comparisons.
-- 4. EXACT MUTATIONS: Exactly 1 DELETE + exactly 59 UPDATEs = exactly 60 affected rows.
-- 5. TARGET INTEGRITY: 59 unique UPDATE UUIDs; 0 overlap with DELETE; footer excluded.
-- 6. PRESERVE FINANCIAL VALUES: Only invoice_no, date, and customer_name are modified.
-- ============================================================================

DO $$
DECLARE
    v_raw_october_sales NUMERIC;
    v_unique_invoices INT;
    v_sales_line_count INT;
    v_cutover_val TEXT;
    v_prod_logs_count INT;
    v_prod_logs_weight NUMERIC;
    v_prod_logs_del_count INT;
    v_locked_count INT;
    v_affected_deletes INT := 0;
    v_affected_updates INT := 0;
    v_temp_count INT;
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'STAGE 3U.5: INITIALIZING STRICT PRECONDITION CHECKS...';
    RAISE NOTICE '================================================================';

    -- PRECONDITION 1: System Reconciliation Cutover Date
    SELECT value INTO v_cutover_val FROM public.system_settings WHERE key = 'reconciliation_cutover_date';
    IF v_cutover_val IS NULL OR v_cutover_val != '2026-11-01' THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P1]: Reconciliation cutover date must be 2026-11-01 (found: %)', v_cutover_val;
    END IF;

    -- PRECONDITION 2: Protected Historical Production Logs Baseline
    SELECT count(*), coalesce(sum(weight), 0)
    INTO v_prod_logs_count, v_prod_logs_weight
    FROM public.production_logs
    WHERE date < '2026-11-01';

    IF v_prod_logs_count != 2945 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P2]: Expected exactly 2945 active historical production logs before cutover (found: %)', v_prod_logs_count;
    END IF;

    IF v_prod_logs_weight != 116963.196 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P2A]: Historical production logs weight sum altered (found: %, expected: 116963.196)', v_prod_logs_weight;
    END IF;

    -- Verify zero historical production logs are soft-deleted or marked inactive
    SELECT count(*) INTO v_prod_logs_del_count
    FROM public.production_logs
    WHERE date < '2026-11-01' AND (is_deleted = true OR status != 'active');

    IF v_prod_logs_del_count != 0 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P2B]: Found % unexpectedly soft-deleted or inactive historical production logs', v_prod_logs_del_count;
    END IF;

    -- PRECONDITION 3: Baseline October Sales, Invoices, and Line Item Counts
    SELECT sum(amount), count(distinct invoice_no), count(*)
    INTO v_raw_october_sales, v_unique_invoices, v_sales_line_count
    FROM public.transactions
    WHERE date >= '2026-10-01' AND date <= '2026-10-31' AND payment_mode = 'Sales';

    IF v_raw_october_sales != 429515.00 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P3]: October sales baseline must be 429,515.00 (found: %)', v_raw_october_sales;
    END IF;

    IF v_unique_invoices != 204 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P3]: October unique invoices must be 204 (found: %)', v_unique_invoices;
    END IF;

    IF v_sales_line_count != 319 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P3]: October sales lines must be 319 (found: %)', v_sales_line_count;
    END IF;

    -- PRECONDITION 4: Target-List Integrity & Exclusions (A5)
    -- Assert that all 60 target UUIDs are strictly distinct (no duplicates)
    IF (
        SELECT count(*)
        FROM (VALUES 
            ('e90f3397-b8a1-49df-8476-e894b6a73019'::uuid),
            ('46bf15f9-1b35-4490-ba3a-9aceb8b9c98a'::uuid),
            ('b5922f67-ddcd-45a8-a3ac-2cfa027d485b'::uuid),
            ('5e5910db-477a-47aa-8df5-df57a973b563'::uuid),
            ('f7ce52a6-9d40-4985-9fba-5fa53bd5231e'::uuid),
            ('731cc1e3-3066-476a-9058-710b9745e60b'::uuid),
            ('ef4d56a8-9503-43fe-9311-a817aa8cdb8e'::uuid),
            ('466c9da4-362c-4496-aa4d-2a7920e93ca1'::uuid),
            ('a70589a9-f2a4-4e32-ae65-7199a7cd43ba'::uuid),
            ('e15ef6ba-6bde-46b9-832e-988654f0fc1c'::uuid),
            ('34660046-6b94-4865-a2a3-163777cdb19e'::uuid),
            ('f105a892-d375-4427-a3e0-2c7b8beaa35c'::uuid),
            ('739e2ce1-e1b1-4f13-b099-78d5101dac3a'::uuid),
            ('98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7'::uuid),
            ('8e096283-58c4-47bf-9fc7-7aa07fca3440'::uuid),
            ('21df8fcc-6b28-43cf-9042-e5cc41c912a8'::uuid),
            ('fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0'::uuid),
            ('754c897c-0663-4ff4-acd7-0da650008d5d'::uuid),
            ('cfb1f651-d54a-4b19-9d51-4c357028e190'::uuid),
            ('0ab1a35d-1959-4b96-9765-14797e63b1f3'::uuid),
            ('3bfcac91-4e64-4e2f-8acb-8df574e6ed1a'::uuid),
            ('d9ada1fc-0652-4ede-bb95-877fb7929d00'::uuid),
            ('ad6a936f-fee7-473a-a85b-c2baa4d92e99'::uuid),
            ('fade8fc4-a66d-4261-b118-453a17fceca0'::uuid),
            ('ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228'::uuid),
            ('4534541e-ba9c-48fe-9eee-af3c38bff0dc'::uuid),
            ('8bf45253-fcdd-454a-91aa-eb5b951102fa'::uuid),
            ('9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed'::uuid),
            ('ad5547ca-fc7f-44c6-88c8-f811f2f8ac02'::uuid),
            ('df5404b1-0cb6-493c-b946-dbede4bdaf9f'::uuid),
            ('eb17072b-8028-4994-bdca-3f2833c934fa'::uuid),
            ('8d2307f5-6cac-4c8c-b272-78eb644c079a'::uuid),
            ('10331c31-0e6c-4fec-91e2-61e7b9e5e59c'::uuid),
            ('162885f2-f189-457b-9d3b-6a80e93335ad'::uuid),
            ('8828c0d3-5e66-4005-9786-cb8df93daacd'::uuid),
            ('953ac70b-4d21-468c-bf03-cae38fe7d4fb'::uuid),
            ('4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67'::uuid),
            ('08cadc02-720f-4131-bdf1-dae5b6e349dc'::uuid),
            ('e8087824-b2bf-4b78-8d69-7c11ec2c2f33'::uuid),
            ('4213dfc1-312b-4914-8a17-ff78acf5c463'::uuid),
            ('43e7b920-fcc1-452d-a5bc-4e73a53f6280'::uuid),
            ('b3998a92-70c2-4d5f-bc56-b120fdf584ce'::uuid),
            ('608fe8a8-cbf3-4dc6-80f0-467ddd704ae1'::uuid),
            ('57c5cb12-87cd-4bd2-9f01-1e5f68c38acf'::uuid),
            ('4d7dfb46-0378-4851-83af-3e0120bd0342'::uuid),
            ('6f809b87-381d-4d57-940b-765c5ea62297'::uuid),
            ('afd218a2-a590-4e2e-b87e-e7a1af519f49'::uuid),
            ('80b9c1fb-d58f-40ff-bb0a-728760442e6e'::uuid),
            ('9eb66ad4-63c9-4ae3-8f64-56066a5d973e'::uuid),
            ('39071be8-5502-433f-89d6-8bb5f5c730ef'::uuid),
            ('8ef86bf6-bfb3-482e-9347-a260ba53168b'::uuid),
            ('6cb938c8-97d8-4540-bfc9-dc8641f34bac'::uuid),
            ('2051513c-5409-445d-97fb-05e73499f825'::uuid),
            ('575c5b3d-f0f4-462b-9b7c-e19f52f67f28'::uuid),
            ('610be9be-2d1d-494b-b5a4-49a1e23335db'::uuid),
            ('2f97525b-daea-4f6b-b47e-531f32b17e97'::uuid),
            ('5dced9bc-c2bd-471d-87ed-0a3558b688e0'::uuid),
            ('316b021b-4365-44e5-b7ad-5b0b9d35b4b4'::uuid),
            ('5ed391e5-e8b8-431b-9b88-ed35b958ee09'::uuid),
            ('2dcefaa4-8944-4a12-9dfa-f1435d65b358'::uuid)
        ) AS targets(id)
    ) != 60 OR (
        SELECT count(distinct id)
        FROM (VALUES 
            ('e90f3397-b8a1-49df-8476-e894b6a73019'::uuid),
            ('46bf15f9-1b35-4490-ba3a-9aceb8b9c98a'::uuid),
            ('b5922f67-ddcd-45a8-a3ac-2cfa027d485b'::uuid),
            ('5e5910db-477a-47aa-8df5-df57a973b563'::uuid),
            ('f7ce52a6-9d40-4985-9fba-5fa53bd5231e'::uuid),
            ('731cc1e3-3066-476a-9058-710b9745e60b'::uuid),
            ('ef4d56a8-9503-43fe-9311-a817aa8cdb8e'::uuid),
            ('466c9da4-362c-4496-aa4d-2a7920e93ca1'::uuid),
            ('a70589a9-f2a4-4e32-ae65-7199a7cd43ba'::uuid),
            ('e15ef6ba-6bde-46b9-832e-988654f0fc1c'::uuid),
            ('34660046-6b94-4865-a2a3-163777cdb19e'::uuid),
            ('f105a892-d375-4427-a3e0-2c7b8beaa35c'::uuid),
            ('739e2ce1-e1b1-4f13-b099-78d5101dac3a'::uuid),
            ('98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7'::uuid),
            ('8e096283-58c4-47bf-9fc7-7aa07fca3440'::uuid),
            ('21df8fcc-6b28-43cf-9042-e5cc41c912a8'::uuid),
            ('fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0'::uuid),
            ('754c897c-0663-4ff4-acd7-0da650008d5d'::uuid),
            ('cfb1f651-d54a-4b19-9d51-4c357028e190'::uuid),
            ('0ab1a35d-1959-4b96-9765-14797e63b1f3'::uuid),
            ('3bfcac91-4e64-4e2f-8acb-8df574e6ed1a'::uuid),
            ('d9ada1fc-0652-4ede-bb95-877fb7929d00'::uuid),
            ('ad6a936f-fee7-473a-a85b-c2baa4d92e99'::uuid),
            ('fade8fc4-a66d-4261-b118-453a17fceca0'::uuid),
            ('ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228'::uuid),
            ('4534541e-ba9c-48fe-9eee-af3c38bff0dc'::uuid),
            ('8bf45253-fcdd-454a-91aa-eb5b951102fa'::uuid),
            ('9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed'::uuid),
            ('ad5547ca-fc7f-44c6-88c8-f811f2f8ac02'::uuid),
            ('df5404b1-0cb6-493c-b946-dbede4bdaf9f'::uuid),
            ('eb17072b-8028-4994-bdca-3f2833c934fa'::uuid),
            ('8d2307f5-6cac-4c8c-b272-78eb644c079a'::uuid),
            ('10331c31-0e6c-4fec-91e2-61e7b9e5e59c'::uuid),
            ('162885f2-f189-457b-9d3b-6a80e93335ad'::uuid),
            ('8828c0d3-5e66-4005-9786-cb8df93daacd'::uuid),
            ('953ac70b-4d21-468c-bf03-cae38fe7d4fb'::uuid),
            ('4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67'::uuid),
            ('08cadc02-720f-4131-bdf1-dae5b6e349dc'::uuid),
            ('e8087824-b2bf-4b78-8d69-7c11ec2c2f33'::uuid),
            ('4213dfc1-312b-4914-8a17-ff78acf5c463'::uuid),
            ('43e7b920-fcc1-452d-a5bc-4e73a53f6280'::uuid),
            ('b3998a92-70c2-4d5f-bc56-b120fdf584ce'::uuid),
            ('608fe8a8-cbf3-4dc6-80f0-467ddd704ae1'::uuid),
            ('57c5cb12-87cd-4bd2-9f01-1e5f68c38acf'::uuid),
            ('4d7dfb46-0378-4851-83af-3e0120bd0342'::uuid),
            ('6f809b87-381d-4d57-940b-765c5ea62297'::uuid),
            ('afd218a2-a590-4e2e-b87e-e7a1af519f49'::uuid),
            ('80b9c1fb-d58f-40ff-bb0a-728760442e6e'::uuid),
            ('9eb66ad4-63c9-4ae3-8f64-56066a5d973e'::uuid),
            ('39071be8-5502-433f-89d6-8bb5f5c730ef'::uuid),
            ('8ef86bf6-bfb3-482e-9347-a260ba53168b'::uuid),
            ('6cb938c8-97d8-4540-bfc9-dc8641f34bac'::uuid),
            ('2051513c-5409-445d-97fb-05e73499f825'::uuid),
            ('575c5b3d-f0f4-462b-9b7c-e19f52f67f28'::uuid),
            ('610be9be-2d1d-494b-b5a4-49a1e23335db'::uuid),
            ('2f97525b-daea-4f6b-b47e-531f32b17e97'::uuid),
            ('5dced9bc-c2bd-471d-87ed-0a3558b688e0'::uuid),
            ('316b021b-4365-44e5-b7ad-5b0b9d35b4b4'::uuid),
            ('5ed391e5-e8b8-431b-9b88-ed35b958ee09'::uuid),
            ('2dcefaa4-8944-4a12-9dfa-f1435d65b358'::uuid)
        ) AS targets(id)
    ) != 60 THEN
        RAISE EXCEPTION 'TARGET INTEGRITY FAILED [P4A]: Target mutation list contains duplicate or invalid UUID count';
    END IF;

    -- Assert that footer row is strictly excluded from target mutation list
    IF EXISTS (
        SELECT 1 FROM (VALUES 
            ('e90f3397-b8a1-49df-8476-e894b6a73019'::uuid),
            ('46bf15f9-1b35-4490-ba3a-9aceb8b9c98a'::uuid),
            ('b5922f67-ddcd-45a8-a3ac-2cfa027d485b'::uuid),
            ('5e5910db-477a-47aa-8df5-df57a973b563'::uuid),
            ('f7ce52a6-9d40-4985-9fba-5fa53bd5231e'::uuid),
            ('731cc1e3-3066-476a-9058-710b9745e60b'::uuid),
            ('ef4d56a8-9503-43fe-9311-a817aa8cdb8e'::uuid),
            ('466c9da4-362c-4496-aa4d-2a7920e93ca1'::uuid),
            ('a70589a9-f2a4-4e32-ae65-7199a7cd43ba'::uuid),
            ('e15ef6ba-6bde-46b9-832e-988654f0fc1c'::uuid),
            ('34660046-6b94-4865-a2a3-163777cdb19e'::uuid),
            ('f105a892-d375-4427-a3e0-2c7b8beaa35c'::uuid),
            ('739e2ce1-e1b1-4f13-b099-78d5101dac3a'::uuid),
            ('98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7'::uuid),
            ('8e096283-58c4-47bf-9fc7-7aa07fca3440'::uuid),
            ('21df8fcc-6b28-43cf-9042-e5cc41c912a8'::uuid),
            ('fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0'::uuid),
            ('754c897c-0663-4ff4-acd7-0da650008d5d'::uuid),
            ('cfb1f651-d54a-4b19-9d51-4c357028e190'::uuid),
            ('0ab1a35d-1959-4b96-9765-14797e63b1f3'::uuid),
            ('3bfcac91-4e64-4e2f-8acb-8df574e6ed1a'::uuid),
            ('d9ada1fc-0652-4ede-bb95-877fb7929d00'::uuid),
            ('ad6a936f-fee7-473a-a85b-c2baa4d92e99'::uuid),
            ('fade8fc4-a66d-4261-b118-453a17fceca0'::uuid),
            ('ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228'::uuid),
            ('4534541e-ba9c-48fe-9eee-af3c38bff0dc'::uuid),
            ('8bf45253-fcdd-454a-91aa-eb5b951102fa'::uuid),
            ('9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed'::uuid),
            ('ad5547ca-fc7f-44c6-88c8-f811f2f8ac02'::uuid),
            ('df5404b1-0cb6-493c-b946-dbede4bdaf9f'::uuid),
            ('eb17072b-8028-4994-bdca-3f2833c934fa'::uuid),
            ('8d2307f5-6cac-4c8c-b272-78eb644c079a'::uuid),
            ('10331c31-0e6c-4fec-91e2-61e7b9e5e59c'::uuid),
            ('162885f2-f189-457b-9d3b-6a80e93335ad'::uuid),
            ('8828c0d3-5e66-4005-9786-cb8df93daacd'::uuid),
            ('953ac70b-4d21-468c-bf03-cae38fe7d4fb'::uuid),
            ('4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67'::uuid),
            ('08cadc02-720f-4131-bdf1-dae5b6e349dc'::uuid),
            ('e8087824-b2bf-4b78-8d69-7c11ec2c2f33'::uuid),
            ('4213dfc1-312b-4914-8a17-ff78acf5c463'::uuid),
            ('43e7b920-fcc1-452d-a5bc-4e73a53f6280'::uuid),
            ('b3998a92-70c2-4d5f-bc56-b120fdf584ce'::uuid),
            ('608fe8a8-cbf3-4dc6-80f0-467ddd704ae1'::uuid),
            ('57c5cb12-87cd-4bd2-9f01-1e5f68c38acf'::uuid),
            ('4d7dfb46-0378-4851-83af-3e0120bd0342'::uuid),
            ('6f809b87-381d-4d57-940b-765c5ea62297'::uuid),
            ('afd218a2-a590-4e2e-b87e-e7a1af519f49'::uuid),
            ('80b9c1fb-d58f-40ff-bb0a-728760442e6e'::uuid),
            ('9eb66ad4-63c9-4ae3-8f64-56066a5d973e'::uuid),
            ('39071be8-5502-433f-89d6-8bb5f5c730ef'::uuid),
            ('8ef86bf6-bfb3-482e-9347-a260ba53168b'::uuid),
            ('6cb938c8-97d8-4540-bfc9-dc8641f34bac'::uuid),
            ('2051513c-5409-445d-97fb-05e73499f825'::uuid),
            ('575c5b3d-f0f4-462b-9b7c-e19f52f67f28'::uuid),
            ('610be9be-2d1d-494b-b5a4-49a1e23335db'::uuid),
            ('2f97525b-daea-4f6b-b47e-531f32b17e97'::uuid),
            ('5dced9bc-c2bd-471d-87ed-0a3558b688e0'::uuid),
            ('316b021b-4365-44e5-b7ad-5b0b9d35b4b4'::uuid),
            ('5ed391e5-e8b8-431b-9b88-ed35b958ee09'::uuid),
            ('2dcefaa4-8944-4a12-9dfa-f1435d65b358'::uuid)
        ) AS targets(id) WHERE id = '22eed743-7410-4c6b-8e46-9ddab9f15654'
    ) THEN
        RAISE EXCEPTION 'TARGET INTEGRITY FAILED [P4B]: Protected footer row must NOT be in target mutation list';
    END IF;

    -- PRECONDITION 5: Protected Footer Row Presence & Invariant
    IF NOT EXISTS (
        SELECT 1 FROM public.transactions 
        WHERE id = '22eed743-7410-4c6b-8e46-9ddab9f15654'
          AND invoice_no = 'inv-4232'
          AND amount = 480.00
          AND payment_mode = 'Invoice Total'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P5]: Protected invoice-total footer 22eed743 missing from database';
    END IF;

    -- PRECONDITION 6: Concurrency Protection & Deterministic Row Locking
    -- Acquire row-level locks on all 60 affected records in deterministic primary-key order
    PERFORM 1
    FROM public.transactions
    WHERE id IN (
        'e90f3397-b8a1-49df-8476-e894b6a73019'::uuid,
        '46bf15f9-1b35-4490-ba3a-9aceb8b9c98a'::uuid,
        'b5922f67-ddcd-45a8-a3ac-2cfa027d485b'::uuid,
        '5e5910db-477a-47aa-8df5-df57a973b563'::uuid,
        'f7ce52a6-9d40-4985-9fba-5fa53bd5231e'::uuid,
        '731cc1e3-3066-476a-9058-710b9745e60b'::uuid,
        'ef4d56a8-9503-43fe-9311-a817aa8cdb8e'::uuid,
        '466c9da4-362c-4496-aa4d-2a7920e93ca1'::uuid,
        'a70589a9-f2a4-4e32-ae65-7199a7cd43ba'::uuid,
        'e15ef6ba-6bde-46b9-832e-988654f0fc1c'::uuid,
        '34660046-6b94-4865-a2a3-163777cdb19e'::uuid,
        'f105a892-d375-4427-a3e0-2c7b8beaa35c'::uuid,
        '739e2ce1-e1b1-4f13-b099-78d5101dac3a'::uuid,
        '98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7'::uuid,
        '8e096283-58c4-47bf-9fc7-7aa07fca3440'::uuid,
        '21df8fcc-6b28-43cf-9042-e5cc41c912a8'::uuid,
        'fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0'::uuid,
        '754c897c-0663-4ff4-acd7-0da650008d5d'::uuid,
        'cfb1f651-d54a-4b19-9d51-4c357028e190'::uuid,
        '0ab1a35d-1959-4b96-9765-14797e63b1f3'::uuid,
        '3bfcac91-4e64-4e2f-8acb-8df574e6ed1a'::uuid,
        'd9ada1fc-0652-4ede-bb95-877fb7929d00'::uuid,
        'ad6a936f-fee7-473a-a85b-c2baa4d92e99'::uuid,
        'fade8fc4-a66d-4261-b118-453a17fceca0'::uuid,
        'ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228'::uuid,
        '4534541e-ba9c-48fe-9eee-af3c38bff0dc'::uuid,
        '8bf45253-fcdd-454a-91aa-eb5b951102fa'::uuid,
        '9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed'::uuid,
        'ad5547ca-fc7f-44c6-88c8-f811f2f8ac02'::uuid,
        'df5404b1-0cb6-493c-b946-dbede4bdaf9f'::uuid,
        'eb17072b-8028-4994-bdca-3f2833c934fa'::uuid,
        '8d2307f5-6cac-4c8c-b272-78eb644c079a'::uuid,
        '10331c31-0e6c-4fec-91e2-61e7b9e5e59c'::uuid,
        '162885f2-f189-457b-9d3b-6a80e93335ad'::uuid,
        '8828c0d3-5e66-4005-9786-cb8df93daacd'::uuid,
        '953ac70b-4d21-468c-bf03-cae38fe7d4fb'::uuid,
        '4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67'::uuid,
        '08cadc02-720f-4131-bdf1-dae5b6e349dc'::uuid,
        'e8087824-b2bf-4b78-8d69-7c11ec2c2f33'::uuid,
        '4213dfc1-312b-4914-8a17-ff78acf5c463'::uuid,
        '43e7b920-fcc1-452d-a5bc-4e73a53f6280'::uuid,
        'b3998a92-70c2-4d5f-bc56-b120fdf584ce'::uuid,
        '608fe8a8-cbf3-4dc6-80f0-467ddd704ae1'::uuid,
        '57c5cb12-87cd-4bd2-9f01-1e5f68c38acf'::uuid,
        '4d7dfb46-0378-4851-83af-3e0120bd0342'::uuid,
        '6f809b87-381d-4d57-940b-765c5ea62297'::uuid,
        'afd218a2-a590-4e2e-b87e-e7a1af519f49'::uuid,
        '80b9c1fb-d58f-40ff-bb0a-728760442e6e'::uuid,
        '9eb66ad4-63c9-4ae3-8f64-56066a5d973e'::uuid,
        '39071be8-5502-433f-89d6-8bb5f5c730ef'::uuid,
        '8ef86bf6-bfb3-482e-9347-a260ba53168b'::uuid,
        '6cb938c8-97d8-4540-bfc9-dc8641f34bac'::uuid,
        '2051513c-5409-445d-97fb-05e73499f825'::uuid,
        '575c5b3d-f0f4-462b-9b7c-e19f52f67f28'::uuid,
        '610be9be-2d1d-494b-b5a4-49a1e23335db'::uuid,
        '2f97525b-daea-4f6b-b47e-531f32b17e97'::uuid,
        '5dced9bc-c2bd-471d-87ed-0a3558b688e0'::uuid,
        '316b021b-4365-44e5-b7ad-5b0b9d35b4b4'::uuid,
        '5ed391e5-e8b8-431b-9b88-ed35b958ee09'::uuid,
        '2dcefaa4-8944-4a12-9dfa-f1435d65b358'::uuid
    )
    ORDER BY id
    FOR UPDATE;

    GET DIAGNOSTICS v_locked_count = ROW_COUNT;

    IF v_locked_count != 60 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED [P6]: Failed to lock exactly 60 target records (locked: %)', v_locked_count;
    END IF;

    RAISE NOTICE 'Preconditions PASSED. Executing hardened surgical mutations...';

    -- =========================================================================
    -- OPERATION 1: Controlled Physical Deletion of Redundant Sales Row
    -- =========================================================================
    DELETE FROM public.transactions
    WHERE id = 'e90f3397-b8a1-49df-8476-e894b6a73019'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4232'
      AND date IS NOT DISTINCT FROM '2026-10-28'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;

    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: Redundant row e90f3397 before-image mismatch or missing (deleted: %)', v_temp_count;
    END IF;
    v_affected_deletes := v_affected_deletes + v_temp_count;

    -- =========================================================================
    -- OPERATION 2: In-Place GST Invoice Remappings with Before-Image Predicates
    -- =========================================================================
    -- Remap 1/59: 46bf15f9-1b35-4490-ba3a-9aceb8b9c98a (inv-4181 -> GST-054)
    UPDATE public.transactions
    SET invoice_no = 'GST-054',
        date = '2026-10-17'::date,
        customer_name = 'THOPPI VAPPA ( TRICHY )'
    WHERE id = '46bf15f9-1b35-4490-ba3a-9aceb8b9c98a'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4181'
      AND date IS NOT DISTINCT FROM '2026-10-17'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 55
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 11825
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 46bf15f9-1b35-4490-ba3a-9aceb8b9c98a before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 2/59: b5922f67-ddcd-45a8-a3ac-2cfa027d485b (inv-4189 -> GST-055)
    UPDATE public.transactions
    SET invoice_no = 'GST-055',
        date = '2026-10-19'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = 'b5922f67-ddcd-45a8-a3ac-2cfa027d485b'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4189'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'halidh cook'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 15
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 3225
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row b5922f67-ddcd-45a8-a3ac-2cfa027d485b before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 3/59: 5e5910db-477a-47aa-8df5-df57a973b563 (inv-4189 -> GST-055)
    UPDATE public.transactions
    SET invoice_no = 'GST-055',
        date = '2026-10-19'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = '5e5910db-477a-47aa-8df5-df57a973b563'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4189'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'halidh cook'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 10
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 2150
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 5e5910db-477a-47aa-8df5-df57a973b563 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 4/59: f7ce52a6-9d40-4985-9fba-5fa53bd5231e (inv-4190 -> GST-056)
    UPDATE public.transactions
    SET invoice_no = 'GST-056',
        date = '2026-10-19'::date,
        customer_name = 'ASMA RESTAURANT'
    WHERE id = 'f7ce52a6-9d40-4985-9fba-5fa53bd5231e'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4190'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 6
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1500
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row f7ce52a6-9d40-4985-9fba-5fa53bd5231e before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 5/59: 731cc1e3-3066-476a-9058-710b9745e60b (inv-4190 -> GST-057)
    UPDATE public.transactions
    SET invoice_no = 'GST-057',
        date = '2026-10-19'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '731cc1e3-3066-476a-9058-710b9745e60b'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4190'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 731cc1e3-3066-476a-9058-710b9745e60b before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 6/59: ef4d56a8-9503-43fe-9311-a817aa8cdb8e (inv-4190 -> GST-058)
    UPDATE public.transactions
    SET invoice_no = 'GST-058',
        date = '2026-10-19'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = 'ef4d56a8-9503-43fe-9311-a817aa8cdb8e'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4190'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row ef4d56a8-9503-43fe-9311-a817aa8cdb8e before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 7/59: 466c9da4-362c-4496-aa4d-2a7920e93ca1 (inv-4192 -> GST-059)
    UPDATE public.transactions
    SET invoice_no = 'GST-059',
        date = '2026-10-20'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '466c9da4-362c-4496-aa4d-2a7920e93ca1'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4192'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'andrew cook'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 466c9da4-362c-4496-aa4d-2a7920e93ca1 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 8/59: a70589a9-f2a4-4e32-ae65-7199a7cd43ba (inv-4192 -> GST-060)
    UPDATE public.transactions
    SET invoice_no = 'GST-060',
        date = '2026-10-20'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = 'a70589a9-f2a4-4e32-ae65-7199a7cd43ba'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4192'
      AND date IS NOT DISTINCT FROM '2026-10-19'::date
      AND customer_name IS NOT DISTINCT FROM 'andrew cook'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row a70589a9-f2a4-4e32-ae65-7199a7cd43ba before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 9/59: e15ef6ba-6bde-46b9-832e-988654f0fc1c (inv-4194 -> GST-061)
    UPDATE public.transactions
    SET invoice_no = 'GST-061',
        date = '2026-10-20'::date,
        customer_name = 'EASY TO COOK'
    WHERE id = 'e15ef6ba-6bde-46b9-832e-988654f0fc1c'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4194'
      AND date IS NOT DISTINCT FROM '2026-10-20'::date
      AND customer_name IS NOT DISTINCT FROM 'andrew cook'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC 500GM ( BTL )'
      AND quantity IS NOT DISTINCT FROM 3
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 420
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row e15ef6ba-6bde-46b9-832e-988654f0fc1c before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 10/59: 34660046-6b94-4865-a2a3-163777cdb19e (inv-4196 -> GST-062)
    UPDATE public.transactions
    SET invoice_no = 'GST-062',
        date = '2026-10-20'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = '34660046-6b94-4865-a2a3-163777cdb19e'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4196'
      AND date IS NOT DISTINCT FROM '2026-10-20'::date
      AND customer_name IS NOT DISTINCT FROM 'ameen master chef'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 10
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 2150
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 34660046-6b94-4865-a2a3-163777cdb19e before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 11/59: f105a892-d375-4427-a3e0-2c7b8beaa35c (inv-4196 -> GST-063)
    UPDATE public.transactions
    SET invoice_no = 'GST-063',
        date = '2026-10-21'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = 'f105a892-d375-4427-a3e0-2c7b8beaa35c'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4196'
      AND date IS NOT DISTINCT FROM '2026-10-20'::date
      AND customer_name IS NOT DISTINCT FROM 'ameen master chef'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row f105a892-d375-4427-a3e0-2c7b8beaa35c before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 12/59: 739e2ce1-e1b1-4f13-b099-78d5101dac3a (inv-4196 -> GST-064)
    UPDATE public.transactions
    SET invoice_no = 'GST-064',
        date = '2026-10-21'::date,
        customer_name = 'SULAIMAN DELIVERY'
    WHERE id = '739e2ce1-e1b1-4f13-b099-78d5101dac3a'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4196'
      AND date IS NOT DISTINCT FROM '2026-10-20'::date
      AND customer_name IS NOT DISTINCT FROM 'ameen master chef'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 240
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 739e2ce1-e1b1-4f13-b099-78d5101dac3a before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 13/59: 98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7 (inv-4200 -> GST-065)
    UPDATE public.transactions
    SET invoice_no = 'GST-065',
        date = '2026-10-21'::date,
        customer_name = 'THOPPI VAPPA ( TRICHY )'
    WHERE id = '98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4200'
      AND date IS NOT DISTINCT FROM '2026-10-21'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 55
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 11825
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 98f45ebb-fdfe-42f3-8f9f-62d9e5dc43a7 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 14/59: 8e096283-58c4-47bf-9fc7-7aa07fca3440 (inv-4202 -> GST-066)
    UPDATE public.transactions
    SET invoice_no = 'GST-066',
        date = '2026-10-22'::date,
        customer_name = 'RR BRIYANI'
    WHERE id = '8e096283-58c4-47bf-9fc7-7aa07fca3440'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4202'
      AND date IS NOT DISTINCT FROM '2026-10-22'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 500
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 8e096283-58c4-47bf-9fc7-7aa07fca3440 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 15/59: 21df8fcc-6b28-43cf-9042-e5cc41c912a8 (inv-4202 -> GST-067)
    UPDATE public.transactions
    SET invoice_no = 'GST-067',
        date = '2026-10-22'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '21df8fcc-6b28-43cf-9042-e5cc41c912a8'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4202'
      AND date IS NOT DISTINCT FROM '2026-10-22'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 21df8fcc-6b28-43cf-9042-e5cc41c912a8 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 16/59: fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0 (inv-4202 -> GST-068)
    UPDATE public.transactions
    SET invoice_no = 'GST-068',
        date = '2026-10-22'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = 'fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4202'
      AND date IS NOT DISTINCT FROM '2026-10-22'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row fbb9b8a0-9370-4a1e-8674-c25a8b2e97c0 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 17/59: 754c897c-0663-4ff4-acd7-0da650008d5d (inv-4203 -> GST-069)
    UPDATE public.transactions
    SET invoice_no = 'GST-069',
        date = '2026-10-22'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = '754c897c-0663-4ff4-acd7-0da650008d5d'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4203'
      AND date IS NOT DISTINCT FROM '2026-10-22'::date
      AND customer_name IS NOT DISTINCT FROM 'sandwich shop'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 8
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1720
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 754c897c-0663-4ff4-acd7-0da650008d5d before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 18/59: cfb1f651-d54a-4b19-9d51-4c357028e190 (inv-4207 -> GST-070)
    UPDATE public.transactions
    SET invoice_no = 'GST-070',
        date = '2026-10-23'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = 'cfb1f651-d54a-4b19-9d51-4c357028e190'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4207'
      AND date IS NOT DISTINCT FROM '2026-10-23'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row cfb1f651-d54a-4b19-9d51-4c357028e190 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 19/59: 0ab1a35d-1959-4b96-9765-14797e63b1f3 (inv-4207 -> GST-071)
    UPDATE public.transactions
    SET invoice_no = 'GST-071',
        date = '2026-10-23'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = '0ab1a35d-1959-4b96-9765-14797e63b1f3'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4207'
      AND date IS NOT DISTINCT FROM '2026-10-23'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 0ab1a35d-1959-4b96-9765-14797e63b1f3 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 20/59: 3bfcac91-4e64-4e2f-8acb-8df574e6ed1a (inv-4208 -> GST-072)
    UPDATE public.transactions
    SET invoice_no = 'GST-072',
        date = '2026-10-23'::date,
        customer_name = 'CASH'
    WHERE id = '3bfcac91-4e64-4e2f-8acb-8df574e6ed1a'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4208'
      AND date IS NOT DISTINCT FROM '2026-10-23'::date
      AND customer_name IS NOT DISTINCT FROM 'abdul hameed bandari'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 3bfcac91-4e64-4e2f-8acb-8df574e6ed1a before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 21/59: d9ada1fc-0652-4ede-bb95-877fb7929d00 (inv-4210 -> GST-073)
    UPDATE public.transactions
    SET invoice_no = 'GST-073',
        date = '2026-10-23'::date,
        customer_name = 'SETTU BANDARI'
    WHERE id = 'd9ada1fc-0652-4ede-bb95-877fb7929d00'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4210'
      AND date IS NOT DISTINCT FROM '2026-10-23'::date
      AND customer_name IS NOT DISTINCT FROM 'hassan ariff partner'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1200
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row d9ada1fc-0652-4ede-bb95-877fb7929d00 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 22/59: ad6a936f-fee7-473a-a85b-c2baa4d92e99 (inv-4210 -> GST-073)
    UPDATE public.transactions
    SET invoice_no = 'GST-073',
        date = '2026-10-23'::date,
        customer_name = 'SETTU BANDARI'
    WHERE id = 'ad6a936f-fee7-473a-a85b-c2baa4d92e99'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4210'
      AND date IS NOT DISTINCT FROM '2026-10-23'::date
      AND customer_name IS NOT DISTINCT FROM 'hassan ariff partner'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 500GM'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row ad6a936f-fee7-473a-a85b-c2baa4d92e99 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 23/59: fade8fc4-a66d-4261-b118-453a17fceca0 (inv-4210 -> GST-074)
    UPDATE public.transactions
    SET invoice_no = 'GST-074',
        date = '2026-10-23'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = 'fade8fc4-a66d-4261-b118-453a17fceca0'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4210'
      AND date IS NOT DISTINCT FROM '2026-10-23'::date
      AND customer_name IS NOT DISTINCT FROM 'hassan ariff partner'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1075
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row fade8fc4-a66d-4261-b118-453a17fceca0 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 24/59: ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228 (inv-4213 -> GST-075)
    UPDATE public.transactions
    SET invoice_no = 'GST-075',
        date = '2026-10-24'::date,
        customer_name = 'CASH'
    WHERE id = 'ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4213'
      AND date IS NOT DISTINCT FROM '2026-10-24'::date
      AND customer_name IS NOT DISTINCT FROM 'hotel bismi'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 24
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 6240
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row ffbfc9aa-5ed4-4d74-9e9e-b810f6f4d228 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 25/59: 4534541e-ba9c-48fe-9eee-af3c38bff0dc (inv-4213 -> GST-075)
    UPDATE public.transactions
    SET invoice_no = 'GST-075',
        date = '2026-10-24'::date,
        customer_name = 'CASH'
    WHERE id = '4534541e-ba9c-48fe-9eee-af3c38bff0dc'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4213'
      AND date IS NOT DISTINCT FROM '2026-10-24'::date
      AND customer_name IS NOT DISTINCT FROM 'hotel bismi'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 500GM'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 130
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 4534541e-ba9c-48fe-9eee-af3c38bff0dc before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 26/59: 8bf45253-fcdd-454a-91aa-eb5b951102fa (inv-4213 -> GST-075)
    UPDATE public.transactions
    SET invoice_no = 'GST-075',
        date = '2026-10-24'::date,
        customer_name = 'CASH'
    WHERE id = '8bf45253-fcdd-454a-91aa-eb5b951102fa'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4213'
      AND date IS NOT DISTINCT FROM '2026-10-24'::date
      AND customer_name IS NOT DISTINCT FROM 'hotel bismi'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 3
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 720
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 8bf45253-fcdd-454a-91aa-eb5b951102fa before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 27/59: 9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed (inv-4214 -> GST-076)
    UPDATE public.transactions
    SET invoice_no = 'GST-076',
        date = '2026-10-24'::date,
        customer_name = 'SULAIMAN DELIVERY'
    WHERE id = '9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4214'
      AND date IS NOT DISTINCT FROM '2026-10-24'::date
      AND customer_name IS NOT DISTINCT FROM 'malaysian fast food'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 9e093f89-b7c0-4eb8-8a4f-ba17e31fd1ed before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 28/59: ad5547ca-fc7f-44c6-88c8-f811f2f8ac02 (inv-4214 -> GST-077)
    UPDATE public.transactions
    SET invoice_no = 'GST-077',
        date = '2026-10-24'::date,
        customer_name = 'SETTU BANDARI'
    WHERE id = 'ad5547ca-fc7f-44c6-88c8-f811f2f8ac02'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4214'
      AND date IS NOT DISTINCT FROM '2026-10-24'::date
      AND customer_name IS NOT DISTINCT FROM 'malaysian fast food'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 10
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 2400
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row ad5547ca-fc7f-44c6-88c8-f811f2f8ac02 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 29/59: df5404b1-0cb6-493c-b946-dbede4bdaf9f (inv-4218 -> GST-078)
    UPDATE public.transactions
    SET invoice_no = 'GST-078',
        date = '2026-10-25'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = 'df5404b1-0cb6-493c-b946-dbede4bdaf9f'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4218'
      AND date IS NOT DISTINCT FROM '2026-10-25'::date
      AND customer_name IS NOT DISTINCT FROM 'ar rahim hotel'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row df5404b1-0cb6-493c-b946-dbede4bdaf9f before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 30/59: eb17072b-8028-4994-bdca-3f2833c934fa (inv-4224 -> GST-079)
    UPDATE public.transactions
    SET invoice_no = 'GST-079',
        date = '2026-10-25'::date,
        customer_name = 'SHAWARMA SPOT NAGORE'
    WHERE id = 'eb17072b-8028-4994-bdca-3f2833c934fa'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4224'
      AND date IS NOT DISTINCT FROM '2026-10-25'::date
      AND customer_name IS NOT DISTINCT FROM 'al azeem caters & restaurant'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row eb17072b-8028-4994-bdca-3f2833c934fa before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 31/59: 8d2307f5-6cac-4c8c-b272-78eb644c079a (inv-4226 -> GST-080)
    UPDATE public.transactions
    SET invoice_no = 'GST-080',
        date = '2026-10-26'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = '8d2307f5-6cac-4c8c-b272-78eb644c079a'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4226'
      AND date IS NOT DISTINCT FROM '2026-10-26'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 8d2307f5-6cac-4c8c-b272-78eb644c079a before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 32/59: 10331c31-0e6c-4fec-91e2-61e7b9e5e59c (inv-4226 -> GST-081)
    UPDATE public.transactions
    SET invoice_no = 'GST-081',
        date = '2026-10-26'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '10331c31-0e6c-4fec-91e2-61e7b9e5e59c'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4226'
      AND date IS NOT DISTINCT FROM '2026-10-26'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 10331c31-0e6c-4fec-91e2-61e7b9e5e59c before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 33/59: 162885f2-f189-457b-9d3b-6a80e93335ad (inv-4226 -> GST-082)
    UPDATE public.transactions
    SET invoice_no = 'GST-082',
        date = '2026-10-26'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = '162885f2-f189-457b-9d3b-6a80e93335ad'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4226'
      AND date IS NOT DISTINCT FROM '2026-10-26'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1075
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 162885f2-f189-457b-9d3b-6a80e93335ad before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 34/59: 8828c0d3-5e66-4005-9786-cb8df93daacd (inv-4226 -> GST-083)
    UPDATE public.transactions
    SET invoice_no = 'GST-083',
        date = '2026-10-27'::date,
        customer_name = 'SULAIMAN DELIVERY'
    WHERE id = '8828c0d3-5e66-4005-9786-cb8df93daacd'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4226'
      AND date IS NOT DISTINCT FROM '2026-10-26'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 240
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 8828c0d3-5e66-4005-9786-cb8df93daacd before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 35/59: 953ac70b-4d21-468c-bf03-cae38fe7d4fb (inv-4226 -> GST-084)
    UPDATE public.transactions
    SET invoice_no = 'GST-084',
        date = '2026-10-27'::date,
        customer_name = 'SANDWICH SHOP'
    WHERE id = '953ac70b-4d21-468c-bf03-cae38fe7d4fb'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4226'
      AND date IS NOT DISTINCT FROM '2026-10-26'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 240
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 953ac70b-4d21-468c-bf03-cae38fe7d4fb before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 36/59: 4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67 (inv-4228 -> GST-085)
    UPDATE public.transactions
    SET invoice_no = 'GST-085',
        date = '2026-10-27'::date,
        customer_name = 'CASH'
    WHERE id = '4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4228'
      AND date IS NOT DISTINCT FROM '2026-10-27'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 520
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 4800f2bf-9bef-4a6e-a5ab-3f3c4387ae67 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 37/59: 08cadc02-720f-4131-bdf1-dae5b6e349dc (inv-4228 -> GST-085)
    UPDATE public.transactions
    SET invoice_no = 'GST-085',
        date = '2026-10-27'::date,
        customer_name = 'CASH'
    WHERE id = '08cadc02-720f-4131-bdf1-dae5b6e349dc'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4228'
      AND date IS NOT DISTINCT FROM '2026-10-27'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 500GM'
      AND quantity IS NOT DISTINCT FROM 3
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 390
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 08cadc02-720f-4131-bdf1-dae5b6e349dc before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 38/59: e8087824-b2bf-4b78-8d69-7c11ec2c2f33 (inv-4228 -> GST-086)
    UPDATE public.transactions
    SET invoice_no = 'GST-086',
        date = '2026-10-27'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = 'e8087824-b2bf-4b78-8d69-7c11ec2c2f33'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4228'
      AND date IS NOT DISTINCT FROM '2026-10-27'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row e8087824-b2bf-4b78-8d69-7c11ec2c2f33 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 39/59: 4213dfc1-312b-4914-8a17-ff78acf5c463 (inv-4228 -> GST-087)
    UPDATE public.transactions
    SET invoice_no = 'GST-087',
        date = '2026-10-27'::date,
        customer_name = 'YOUSUF BANDARI'
    WHERE id = '4213dfc1-312b-4914-8a17-ff78acf5c463'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4228'
      AND date IS NOT DISTINCT FROM '2026-10-27'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 240
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 4213dfc1-312b-4914-8a17-ff78acf5c463 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 40/59: 43e7b920-fcc1-452d-a5bc-4e73a53f6280 (inv-4231 -> GST-088)
    UPDATE public.transactions
    SET invoice_no = 'GST-088',
        date = '2026-10-28'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = '43e7b920-fcc1-452d-a5bc-4e73a53f6280'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4231'
      AND date IS NOT DISTINCT FROM '2026-10-28'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 43e7b920-fcc1-452d-a5bc-4e73a53f6280 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 41/59: b3998a92-70c2-4d5f-bc56-b120fdf584ce (inv-4232 -> GST-089)
    UPDATE public.transactions
    SET invoice_no = 'GST-089',
        date = '2026-10-28'::date,
        customer_name = 'SULAIMAN DELIVERY'
    WHERE id = 'b3998a92-70c2-4d5f-bc56-b120fdf584ce'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4232'
      AND date IS NOT DISTINCT FROM '2026-10-28'::date
      AND customer_name IS NOT DISTINCT FROM 'cash'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 240
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row b3998a92-70c2-4d5f-bc56-b120fdf584ce before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 42/59: 608fe8a8-cbf3-4dc6-80f0-467ddd704ae1 (inv-4235 -> GST-090)
    UPDATE public.transactions
    SET invoice_no = 'GST-090',
        date = '2026-10-29'::date,
        customer_name = 'RR BRIYANI'
    WHERE id = '608fe8a8-cbf3-4dc6-80f0-467ddd704ae1'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4235'
      AND date IS NOT DISTINCT FROM '2026-10-28'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 500
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 608fe8a8-cbf3-4dc6-80f0-467ddd704ae1 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 43/59: 57c5cb12-87cd-4bd2-9f01-1e5f68c38acf (inv-4236 -> GST-091)
    UPDATE public.transactions
    SET invoice_no = 'GST-091',
        date = '2026-10-29'::date,
        customer_name = 'SULAIMAN DELIVERY'
    WHERE id = '57c5cb12-87cd-4bd2-9f01-1e5f68c38acf'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4236'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'malaysian fast food'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GINGER 500GM'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 57c5cb12-87cd-4bd2-9f01-1e5f68c38acf before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 44/59: 4d7dfb46-0378-4851-83af-3e0120bd0342 (inv-4237 -> GST-092)
    UPDATE public.transactions
    SET invoice_no = 'GST-092',
        date = '2026-10-29'::date,
        customer_name = 'DEALER NAGAI'
    WHERE id = '4d7dfb46-0378-4851-83af-3e0120bd0342'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4237'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 20
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 4300
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 4d7dfb46-0378-4851-83af-3e0120bd0342 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 45/59: 6f809b87-381d-4d57-940b-765c5ea62297 (inv-4237 -> GST-092)
    UPDATE public.transactions
    SET invoice_no = 'GST-092',
        date = '2026-10-29'::date,
        customer_name = 'DEALER NAGAI'
    WHERE id = '6f809b87-381d-4d57-940b-765c5ea62297'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4237'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 440
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 6f809b87-381d-4d57-940b-765c5ea62297 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 46/59: afd218a2-a590-4e2e-b87e-e7a1af519f49 (inv-4237 -> GST-093)
    UPDATE public.transactions
    SET invoice_no = 'GST-093',
        date = '2026-10-29'::date,
        customer_name = 'ASMA RESTAURANT'
    WHERE id = 'afd218a2-a590-4e2e-b87e-e7a1af519f49'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4237'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 6
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1500
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row afd218a2-a590-4e2e-b87e-e7a1af519f49 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 47/59: 80b9c1fb-d58f-40ff-bb0a-728760442e6e (inv-4240 -> GST-094)
    UPDATE public.transactions
    SET invoice_no = 'GST-094',
        date = '2026-10-29'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = '80b9c1fb-d58f-40ff-bb0a-728760442e6e'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4240'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'al azeem caters & restaurant'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 12
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 2580
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 80b9c1fb-d58f-40ff-bb0a-728760442e6e before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 48/59: 9eb66ad4-63c9-4ae3-8f64-56066a5d973e (inv-4241 -> GST-095)
    UPDATE public.transactions
    SET invoice_no = 'GST-095',
        date = '2026-10-29'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = '9eb66ad4-63c9-4ae3-8f64-56066a5d973e'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4241'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'sai maraikar shop'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 9eb66ad4-63c9-4ae3-8f64-56066a5d973e before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 49/59: 39071be8-5502-433f-89d6-8bb5f5c730ef (inv-4241 -> GST-096)
    UPDATE public.transactions
    SET invoice_no = 'GST-096',
        date = '2026-10-30'::date,
        customer_name = 'THOPPI VAPPA ( TRICHY )'
    WHERE id = '39071be8-5502-433f-89d6-8bb5f5c730ef'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4241'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'sai maraikar shop'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 55
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 11825
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 39071be8-5502-433f-89d6-8bb5f5c730ef before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 50/59: 8ef86bf6-bfb3-482e-9347-a260ba53168b (inv-4241 -> GST-097)
    UPDATE public.transactions
    SET invoice_no = 'GST-097',
        date = '2026-10-29'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '8ef86bf6-bfb3-482e-9347-a260ba53168b'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4241'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'sai maraikar shop'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 8ef86bf6-bfb3-482e-9347-a260ba53168b before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 51/59: 6cb938c8-97d8-4540-bfc9-dc8641f34bac (inv-4241 -> GST-098)
    UPDATE public.transactions
    SET invoice_no = 'GST-098',
        date = '2026-10-30'::date,
        customer_name = 'YOUSUF BANDARI'
    WHERE id = '6cb938c8-97d8-4540-bfc9-dc8641f34bac'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4241'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'sai maraikar shop'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 8
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1920
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 6cb938c8-97d8-4540-bfc9-dc8641f34bac before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 52/59: 2051513c-5409-445d-97fb-05e73499f825 (inv-4241 -> GST-099)
    UPDATE public.transactions
    SET invoice_no = 'GST-099',
        date = '2026-10-30'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = '2051513c-5409-445d-97fb-05e73499f825'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4241'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'sai maraikar shop'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 2051513c-5409-445d-97fb-05e73499f825 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 53/59: 575c5b3d-f0f4-462b-9b7c-e19f52f67f28 (inv-4241 -> GST-100)
    UPDATE public.transactions
    SET invoice_no = 'GST-100',
        date = '2026-10-30'::date,
        customer_name = 'SULAIMAN DELIVERY'
    WHERE id = '575c5b3d-f0f4-462b-9b7c-e19f52f67f28'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4241'
      AND date IS NOT DISTINCT FROM '2026-10-29'::date
      AND customer_name IS NOT DISTINCT FROM 'sai maraikar shop'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 575c5b3d-f0f4-462b-9b7c-e19f52f67f28 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 54/59: 610be9be-2d1d-494b-b5a4-49a1e23335db (inv-4246 -> GST-101)
    UPDATE public.transactions
    SET invoice_no = 'GST-101',
        date = '2026-10-30'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '610be9be-2d1d-494b-b5a4-49a1e23335db'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4246'
      AND date IS NOT DISTINCT FROM '2026-10-30'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 610be9be-2d1d-494b-b5a4-49a1e23335db before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 55/59: 2f97525b-daea-4f6b-b47e-531f32b17e97 (inv-4246 -> GST-102)
    UPDATE public.transactions
    SET invoice_no = 'GST-102',
        date = '2026-10-31'::date,
        customer_name = 'HOTEL BISMI'
    WHERE id = '2f97525b-daea-4f6b-b47e-531f32b17e97'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4246'
      AND date IS NOT DISTINCT FROM '2026-10-30'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 2
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 480
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 2f97525b-daea-4f6b-b47e-531f32b17e97 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 56/59: 5dced9bc-c2bd-471d-87ed-0a3558b688e0 (inv-4246 -> GST-103)
    UPDATE public.transactions
    SET invoice_no = 'GST-103',
        date = '2026-10-31'::date,
        customer_name = 'AR RAHIM HOTEL'
    WHERE id = '5dced9bc-c2bd-471d-87ed-0a3558b688e0'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4246'
      AND date IS NOT DISTINCT FROM '2026-10-30'::date
      AND customer_name IS NOT DISTINCT FROM 'hassim catering'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 1KG'
      AND quantity IS NOT DISTINCT FROM 5
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 1100
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 5dced9bc-c2bd-471d-87ed-0a3558b688e0 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 57/59: 316b021b-4365-44e5-b7ad-5b0b9d35b4b4 (inv-4250 -> GST-104)
    UPDATE public.transactions
    SET invoice_no = 'GST-104',
        date = '2026-10-31'::date,
        customer_name = 'HASSIM CATERING'
    WHERE id = '316b021b-4365-44e5-b7ad-5b0b9d35b4b4'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4250'
      AND date IS NOT DISTINCT FROM '2026-10-31'::date
      AND customer_name IS NOT DISTINCT FROM 'ameen master chef'
      AND item_name IS NOT DISTINCT FROM 'NFS GINGER GARLIC PASTE (WITHOUT PACKET)'
      AND quantity IS NOT DISTINCT FROM 12
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 2580
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 316b021b-4365-44e5-b7ad-5b0b9d35b4b4 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 58/59: 5ed391e5-e8b8-431b-9b88-ed35b958ee09 (inv-4251 -> GST-105)
    UPDATE public.transactions
    SET invoice_no = 'GST-105',
        date = '2026-10-31'::date,
        customer_name = 'SANDWICH SHOP'
    WHERE id = '5ed391e5-e8b8-431b-9b88-ed35b958ee09'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4251'
      AND date IS NOT DISTINCT FROM '2026-10-31'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GINGER 500GM'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 110
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 5ed391e5-e8b8-431b-9b88-ed35b958ee09 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- Remap 59/59: 2dcefaa4-8944-4a12-9dfa-f1435d65b358 (inv-4251 -> GST-105)
    UPDATE public.transactions
    SET invoice_no = 'GST-105',
        date = '2026-10-31'::date,
        customer_name = 'SANDWICH SHOP'
    WHERE id = '2dcefaa4-8944-4a12-9dfa-f1435d65b358'
      AND invoice_no IS NOT DISTINCT FROM 'inv-4251'
      AND date IS NOT DISTINCT FROM '2026-10-31'::date
      AND customer_name IS NOT DISTINCT FROM 'nfs delivery'
      AND item_name IS NOT DISTINCT FROM 'NFS PEELED GARLIC 500GM'
      AND quantity IS NOT DISTINCT FROM 1
      AND rate IS NOT DISTINCT FROM NULL
      AND amount IS NOT DISTINCT FROM 130
      AND payment_mode IS NOT DISTINCT FROM 'Sales'
      AND profit IS NOT DISTINCT FROM 0;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    IF v_temp_count != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: GST target row 2dcefaa4-8944-4a12-9dfa-f1435d65b358 before-image mismatch or missing (updated: %)', v_temp_count;
    END IF;
    v_affected_updates := v_affected_updates + v_temp_count;

    -- =========================================================================
    -- MUTATION COUNT ASSERTIONS
    -- =========================================================================
    IF v_affected_deletes != 1 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: Expected exactly 1 deleted sales row (got: %)', v_affected_deletes;
    END IF;

    IF v_affected_updates != 59 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: Expected exactly 59 updated GST rows (got: %)', v_affected_updates;
    END IF;

    IF (v_affected_deletes + v_affected_updates) != 60 THEN
        RAISE EXCEPTION 'SAFETY INVARIANT FAILED: Total affected rows must be exactly 60 (got: %)', (v_affected_deletes + v_affected_updates);
    END IF;

    -- =========================================================================
    -- POSTCONDITION VALIDATIONS
    -- =========================================================================
    SELECT sum(amount), count(distinct invoice_no), count(*)
    INTO v_raw_october_sales, v_unique_invoices, v_sales_line_count
    FROM public.transactions
    WHERE date >= '2026-10-01' AND date <= '2026-10-31' AND payment_mode = 'Sales';

    IF v_raw_october_sales != 429035.00 THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q1]: Expected October sales of 429,035.00 (got: %)', v_raw_october_sales;
    END IF;

    IF v_unique_invoices != 256 THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q2]: Expected 256 unique invoices (got: %)', v_unique_invoices;
    END IF;

    IF v_sales_line_count != 318 THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q3]: Expected 318 sales line items (got: %)', v_sales_line_count;
    END IF;

    -- Redundant row must be absent
    IF EXISTS (SELECT 1 FROM public.transactions WHERE id = 'e90f3397-b8a1-49df-8476-e894b6a73019') THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q4]: Redundant row e90f3397 still exists in database';
    END IF;

    -- GST-100 must be preserved and remapped
    IF NOT EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = '575c5b3d-f0f4-462b-9b7c-e19f52f67f28'
          AND invoice_no = 'GST-100'
          AND customer_name = 'SULAIMAN DELIVERY'
          AND amount = 480.00
          AND payment_mode = 'Sales'
    ) THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q5]: Legitimate GST-100 row 575c5b3d corrupted or missing';
    END IF;

    -- Protected footer must remain untouched
    IF NOT EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = '22eed743-7410-4c6b-8e46-9ddab9f15654'
          AND invoice_no = 'inv-4232'
          AND amount = 480.00
          AND payment_mode = 'Invoice Total'
    ) THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q6]: Protected invoice-total footer 22eed743 corrupted or missing';
    END IF;

    -- Cutover setting must remain untouched
    SELECT value INTO v_cutover_val FROM public.system_settings WHERE key = 'reconciliation_cutover_date';
    IF v_cutover_val != '2026-11-01' THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q7]: Cutover setting was altered during remediation';
    END IF;

    -- Production logs must remain untouched
    SELECT count(*), coalesce(sum(weight), 0)
    INTO v_prod_logs_count, v_prod_logs_weight
    FROM public.production_logs
    WHERE date < '2026-11-01';

    IF v_prod_logs_count != 2945 OR v_prod_logs_weight != 116963.196 THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q8]: Historical production logs altered (found count: %, weight: %)', v_prod_logs_count, v_prod_logs_weight;
    END IF;

    SELECT count(*) INTO v_prod_logs_del_count
    FROM public.production_logs
    WHERE date < '2026-11-01' AND (is_deleted = true OR status != 'active');

    IF v_prod_logs_del_count != 0 THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED [Q8B]: Historical production logs soft-deleted during remediation (found: %)', v_prod_logs_del_count;
    END IF;

    RAISE NOTICE '================================================================';
    RAISE NOTICE 'STAGE 3U.5 REMEDIATION COMPLETED SUCCESSFULLY.';
    RAISE NOTICE 'DELETED SALES ROWS: % (Expected: 1)', v_affected_deletes;
    RAISE NOTICE 'UPDATED GST ROWS:   % (Expected: 59)', v_affected_updates;
    RAISE NOTICE 'OCTOBER SALES:      ₹% (Expected: ₹429,035.00)', v_raw_october_sales;
    RAISE NOTICE 'UNIQUE INVOICES:    % (Expected: 256)', v_unique_invoices;
    RAISE NOTICE 'SALES LINES:        % (Expected: 318)', v_sales_line_count;
    RAISE NOTICE '================================================================';
END $$;
