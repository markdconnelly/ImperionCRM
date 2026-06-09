-- Read grants for the local pipeline's gold knowledge composers (local ADR-0009).
--
-- Migration 0044 granted `imperion-localpipeline` its WRITE surface (bronze + golden +
-- posture tables); 0045 added the knowledge store. The v0.3.0 knowledge composers
-- additionally READ the silver spine to compose account/contact knowledge bodies:
--   account, contact, opportunity     — silver entities the bodies describe
--   autotask_companies                — the bronze link joining contracts/tickets to accounts
-- SELECT only; the role's no-DELETE posture is unchanged. Idempotent; no-ops if the
-- role is absent so the ordered runner never wedges.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    RAISE NOTICE 'role imperion-localpipeline absent — skipping knowledge read grants.';
    RETURN;
  END IF;

  GRANT SELECT ON account, contact, opportunity, autotask_companies
    TO "imperion-localpipeline";
END $$;

COMMIT;
