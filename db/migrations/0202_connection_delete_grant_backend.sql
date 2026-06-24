-- Grant DELETE on `connection` to the backend Function App's managed identity (#1284).
--
-- The credential-purge endpoint (backend #390, FE #1282) deletes a registered credential's
-- `connection` row when an operator removes it. Migration 0047 granted the backend MI
-- `mgid-imperioncrmbackendfunction` only SELECT/INSERT/UPDATE on `connection` — never DELETE —
-- so `deleteConnection` (DELETE FROM connection) hit permission-denied and the purge silently
-- failed (the dead Imperion m365 cert row could not be cleared). This adds the missing verb.
--
-- Backend-only by design: the web app's role (`mgid-imperioncrm`) is NOT granted DELETE.
-- Per ADR-0042 the front end is GUI-only and every process — including a credential delete —
-- runs in the backend; the web app must never delete `connection` rows directly.
--
-- GRANT-only and idempotent; no-ops if the role is absent (CI / fresh DBs have no MI role),
-- so the ordered runner never wedges. Same guard pattern as migration 0047.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping DELETE grant.';
    RETURN;
  END IF;

  GRANT DELETE ON connection TO "mgid-imperioncrmbackendfunction";
END $$;

COMMIT;
