-- 0064: Posture snapshots — make the web role READ-ONLY (issue #167, ADR-0051).
--
-- Migration 0063 made snapshots append-only BY GRANT for the pipeline writer roles
-- (INSERT+SELECT only), but the web app role inherited DELETE/INSERT/SELECT/UPDATE on
-- both tables via default privileges, contradicting the enforcement-by-grant intent:
-- snapshots are IMMUTABLE (grades/composites never recomputed after capture).
--
-- The GUI only ever READS snapshots. Creating one is a *process* (ADR-0042): the
-- on-prem quarterly job, the on-demand refresh, and the QBR hook all run in the
-- pipeline/backend under their own roles — so INSERT is revoked from the web role
-- too, leaving it SELECT-only. If a future feature ever needs the web app to take
-- snapshots directly, that is a deliberate grant in a new migration, not a default.
--
-- Idempotent (REVOKE of an absent privilege is a no-op); skips if the role is absent.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    REVOKE INSERT, UPDATE, DELETE
      ON posture_snapshot, posture_snapshot_pillar
      FROM "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read-only revoke.';
  END IF;
END $$;

COMMIT;
