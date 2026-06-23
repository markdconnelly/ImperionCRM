-- 0196: seed domain_owner.owner_user_id = Mark Connelly for ALL 8 governance domains
-- (#1252). Activates grounding-conflict routing with a concrete human owner instead of the
-- role-only fallback seeded by the domain_owner migration. "All domains to Mark for now" is
-- Mark's explicit instruction (2026-06-23) — a single accountable owner while the org roster
-- settles; per-domain owners get reassigned later by simple UPDATE.
--
-- owner_user_id is a FK to app_user.id; Mark = app_user 'c201ba37-dbbe-4c5e-8eee-35c620c53c78'
-- (Mark@ImperionLLC.com), verified against prod (read-only MCP, 2026-06-23). The role
-- fallback (fallback_role_slug) is left intact as the secondary path.
--
-- Idempotent (re-running is a no-op once owners are set) + transactional. Frontend-owned
-- schema/seed (ADR-0042). No secrets, no client PII — owner_user_id is an internal employee
-- reference, not client data.

BEGIN;

UPDATE domain_owner
   SET owner_user_id = 'c201ba37-dbbe-4c5e-8eee-35c620c53c78',
       updated_at    = now()
 WHERE owner_user_id IS DISTINCT FROM 'c201ba37-dbbe-4c5e-8eee-35c620c53c78';

-- Guard: every governance domain must now have an owner (catches a missing app_user row or a
-- new unseeded domain before this lands in prod).
DO $$
DECLARE unowned int;
BEGIN
  SELECT count(*) INTO unowned FROM domain_owner WHERE owner_user_id IS NULL;
  IF unowned > 0 THEN
    RAISE EXCEPTION 'domain_owner seed incomplete: % domain(s) still have NULL owner_user_id', unowned;
  END IF;
END $$;

COMMIT;
