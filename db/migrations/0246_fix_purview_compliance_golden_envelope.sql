-- 0246: recreate `purview_compliance_golden` with the GOLDEN contract envelope (#1662).
-- Migration number 0246 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. If another
-- migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS. Migration 0119 created `purview_compliance_golden` with the BRONZE
-- landing envelope (`tenant_id/source/external_id/collected_at/raw_payload/content_hash`,
-- PK `(tenant_id, source, external_id)`) even though its own COMMENT claims the dns_golden
-- (0080) drift pattern. The golden/drift contract — the five 0038 posture golden tables and
-- dns_golden alike — is `golden_hash text NOT NULL` + a golden payload jsonb, keyed
-- `(tenant_id, policy_id)`. The LP drift evaluator (`Get-ImperionPolicyDrift`) selects
-- `g.golden_hash` from every family's golden table, so purview drift died with
-- `42703: column g.golden_hash does not exist` and (pre-guard) took down the nightly
-- KnowledgeVectorize sync (LP #409 mitigated the crash; THIS is the durable repair).
--
-- Recreate-from-template over add-column: the table has never been writable by the golden
-- approval flow (wrong key, wrong NOT NULLs), and prod holds ZERO rows (verified read-only
-- 2026-07-01), so nothing human-approved can be lost. The drop is still guarded: it only
-- fires when the table has the misshapen bronze envelope (`content_hash` present,
-- `golden_hash` absent) — a table already on the golden contract is left untouched.
-- Shape matches the 0038 templated loop exactly (conditional_access_policies_golden et al).
--
-- Idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT prod-applied
-- until Mark green-lights the apply. No secrets; no row-level PII.

BEGIN;

-- Drop ONLY the misshapen bronze-envelope incarnation (0119). Never drops a table that
-- already carries the golden contract.
DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name  = 'purview_compliance_golden'
         AND column_name = 'content_hash')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name  = 'purview_compliance_golden'
         AND column_name = 'golden_hash')
  THEN
    DROP TABLE purview_compliance_golden;
  END IF;
END $$;

-- Golden contract shape — identical to the 0038 posture golden template.
CREATE TABLE IF NOT EXISTS purview_compliance_golden (
  tenant_id text NOT NULL, policy_id text NOT NULL, policy_name text,
  golden_hash text NOT NULL, golden_payload jsonb NOT NULL,
  approved_by text, approved_at text, notes text,
  PRIMARY KEY (tenant_id, policy_id)
);
COMMENT ON TABLE purview_compliance_golden IS
  'Golden: human-approved golden snapshot of the Purview compliance posture for drift reconciliation (LP #196; golden contract per 0038/0080, fixed from the misshapen 0119 bronze envelope by #1662). Posture only — no alerts.';

-- Grants (0083 defensive pattern; roles may be absent in some envs). DROP TABLE discarded
-- the 0119 grants, so re-grant: LP writes the golden (approval cmdlet + drift), the other
-- planes read.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON purview_compliance_golden TO "imperion-localpipeline";
  ELSE RAISE NOTICE 'role imperion-localpipeline absent — skipping LP grants.'; END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON purview_compliance_golden TO "mgid-imperioncrm-web-prd";
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.'; END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON purview_compliance_golden TO "mgid-imperioncrmbackendfunction";
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.'; END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON purview_compliance_golden TO "mgid-imperioncrmpipeline";
  ELSE RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.'; END IF;
END $$;

COMMIT;
