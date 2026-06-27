-- 0212: grant the local-pipeline role write access to silver social_engagement (#1364).
--
-- Migration number 0212 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY. Slice H (LocalPipeline #357 / PR #378) added the on-prem poll-in collectors that merge
-- public social comments into silver `social_engagement` (mig 0210). Merge co-locates with
-- ingestion (ADR-0026), and the LP collectors connect as the Postgres role
-- `imperion-localpipeline` (config Db.Username; role created in 0044) — the same role that
-- already owns the Meta organic merge into `social_metric`/`facebook_*`/`instagram_*` (0075).
--
-- But mig 0210 granted `social_engagement` to `mgid-imperioncrmpipeline` (the cloud Pipeline
-- identity) and to the backend, NOT to `imperion-localpipeline`. So the LP engagement write
-- fails closed (42501 permission denied) in prod. The `social_metric` half is unaffected — 0075
-- already grants LP SELECT,INSERT,UPDATE there. This migration closes that one gap.
--
-- WHAT. GRANT SELECT, INSERT, UPDATE ON social_engagement TO "imperion-localpipeline":
--   INSERT  — the poll-in merge (idempotent, ON CONFLICT (channel, external_id) DO NOTHING).
--   UPDATE  — re-sync of mutable fields (body/status) on existing rows; matches the LP write
--             surface granted on social_metric (0075) and the pipeline grant on social_engagement
--             (0210). NEVER DELETE (0044 append-only posture).
--   SELECT  — read-back for the merge.
--
-- Grant-only migration: no DDL, no data change. Defensive DO $$ … pg_roles … $$ idiom (the role
-- may be absent on CI / fresh DBs), per 0075/0210. Frontend-owned schema (ADR-0042 §1). No PII,
-- no secrets. Additive, idempotent, transactional. NOT prod-applied until merge (each prod apply
-- is Mark-gated, §10.3).

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON social_engagement TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping social_engagement grant.';
  END IF;
END $$;

COMMIT;
