-- 0060: Read grants for the backend's board-packet composer (issue #128;
-- backend epic Backend#27, ADR-0054 §3).
--
-- The packet composer makes a FIXED set of read pulls before a board session:
-- the reporting snapshot (already granted, 0047), campaign numbers, and a
-- security-posture summary (aggregates only — the composer never copies
-- row-level exposure identities into packet_md). The backend MI predates these
-- tables' grant lists: campaign/campaign_metric were web-only, and the posture
-- set (0042/0044) granted only the pipelines.
--
-- SELECT only — the composer is read-only by construction; its single write
-- (board_session.packet_md) is covered by 0056's board grants.
--
-- Idempotent; no-ops if the role is absent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — run 0047''s prerequisite first; skipping.';
    RETURN;
  END IF;
  GRANT SELECT ON
    campaign,             -- packet: active-campaign roster
    campaign_metric,      -- packet: last-30-day spend/clicks/leads aggregates
    credential_exposure,  -- packet: open-exposure counts by severity (aggregates only)
    secure_scores         -- packet: latest secure score per tenant
  TO "mgid-imperioncrmbackendfunction";
END $$;

COMMIT;
