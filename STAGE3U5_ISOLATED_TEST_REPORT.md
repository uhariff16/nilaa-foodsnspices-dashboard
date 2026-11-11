# STAGE 3U.5 — ISOLATED POSTGRESQL TEST SUITE REPORT

**Execution Engine:** Isolated PostgreSQL (PGlite v0.2.14 WASM / Local Engine)  
**Target Candidates:**
- Forward Remediation Candidate: `STAGE3U5_HARDENED_FORWARD_CANDIDATE.sql`
- Compensating Recovery Candidate: `STAGE3U5_RECOVERY_CANDIDATE.sql`  
**Audit Date:** 2026-11-10  
**Test Suite Result:** 9 / 9 TESTS PASSED (100% PASS RATE)  

---

## 1. Test Suite Architecture

To guarantee total fail-closed safety and verify that the corrected historical production log guards work under all possible boundary conditions, a comprehensive 9-scenario isolated test suite was executed against an isolated PostgreSQL database populated with:
- The complete October 2026 sales ledger (319 sales rows, 736 total October transactions, including the redundant ₹480 Peeled Garlic record).
- The exact 2,979 production logs exported from live Supabase project `eegihrxwtyxdzsiabvtw` (2,945 historical active records + 34 November operational records).
- The full audit configuration (`app_settings` with `reconciliation_cutover_date = '2026-11-01'`).

---

## 2. Test Execution Matrix & Results

| # | Test Scenario | Expected Outcome | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | **Baseline Parity & Forward Remediation** | Script executes successfully with 2,945 historical + 34 Nov logs. Deletes 1 redundant row, updates 59 GST rows. Sales drops to ₹429,035.00 (318 lines, 256 invoices). | **SUCCESS.** October sales = ₹429,035.00, lines = 318, invoices = 256. Redundant row deleted. All 59 GST rows updated. Postconditions Q1–Q8 passed. | **PASS** |
| **T2** | **Compensating Recovery Execution** | Recovery script reverses all mutations. Re-inserts redundant row, reverts all 59 GST rows. Sales restored to ₹429,515.00 (319 lines, 204 invoices). | **SUCCESS.** Sales restored to exact baseline ₹429,515.00 across 319 lines and 204 invoices. Redundant row restored with identical attributes. Postconditions V1–V8 passed. | **PASS** |
| **T3** | **New Post-Cutover November Records Permitted** | Adding new November production logs (`date >= '2026-11-01'`) does NOT block or trigger Precondition P2. | **SUCCESS.** Added additional November logs. Forward script completed successfully. Scoped filter correctly ignored November activity. | **PASS** |
| **T4** | **Historical Record Missing (Fail Closed)** | Deleting 1 historical log (`date < '2026-11-01'`, count = 2,944) causes immediate transaction abort. | **SUCCESS.** Script failed closed: `ERROR: P0001: PRECONDITION FAILED [P2]: Expected exactly 2945 active historical production logs before cutover (found: 2944)`. Zero mutations committed. | **PASS** |
| **T5** | **Historical Record Weight Modified (Fail Closed)** | Modifying weight of 1 historical log (weight sum changes from 116,963.196 to 116,973.196) aborts transaction. | **SUCCESS.** Script failed closed: `ERROR: P0001: PRECONDITION FAILED [P2A]: Historical production logs weight sum altered (found: 116973.196, expected: 116963.196)`. Zero mutations committed. | **PASS** |
| **T6** | **Historical Soft-Delete / Inactive (Fail Closed)** | Setting `is_deleted = true` on 1 historical log aborts transaction. | **SUCCESS.** Script failed closed: `ERROR: P0001: PRECONDITION FAILED [P2B]: Found 1 unexpectedly soft-deleted or inactive historical production logs`. Zero mutations committed. | **PASS** |
| **T7** | **Incorrect Cutover Date (Fail Closed)** | Modifying `app_settings.reconciliation_cutover_date` to `'2026-10-01'` aborts transaction. | **SUCCESS.** Script failed closed: `ERROR: P0001: PRECONDITION FAILED [P1]: Reconciliation cutover date must be 2026-11-01 (found: 2026-10-01)`. Zero mutations committed. | **PASS** |
| **T8** | **Recovery Precondition Enforces Historical Logs** | Modifying historical logs prior to recovery execution aborts recovery script before mutating data. | **SUCCESS.** Recovery script failed closed: `ERROR: P0001: RECOVERY PRECONDITION FAILED [R2A]: Historical production logs weight sum altered (found: 117063.196, expected: 116963.196)`. Zero mutations committed. | **PASS** |
| **T9** | **Atomic Engine Rollback on Mid-Flight Failure** | An exception raised during execution completely rolls back database to pre-transaction state. | **SUCCESS.** Transaction aborted mid-flight. Verified database state remained at ₹429,515.00 across 319 lines with redundant row intact. 100% atomicity confirmed. | **PASS** |

---

## 3. Cryptographic & Execution Timings

- **Engine:** PGlite WASM / isolated node instance
- **Total Scenarios Evaluated:** 9
- **Passed Scenarios:** 9 (100%)
- **Failed Scenarios:** 0
- **Total Suite Execution Time:** ~14.8 seconds
- **Production Safety Verification:** All tests executed exclusively in local memory; no network calls or production mutations occurred during test execution.
