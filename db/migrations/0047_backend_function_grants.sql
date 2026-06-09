-- Postgres role + least-privilege GRANTs for the backend Function App's managed identity
-- (backend ADR-0030/0035; backend docs/operations/infrastructure.md §3).
--
-- The backend authenticates as its own user-assigned managed identity
-- (`mgid-imperioncrmbackendfunction`) with a short-lived Entra token — no password.
-- This migration creates the matching Entra-backed Postgres role (if absent) and grants
-- exactly the tables the backend touches today (CLAUDE.md §2 of the backend repo):
--   read   — CRM spine + consent view + the gold knowledge store (agent retrieval)
--   write  — the timeline, dossier, identity map, audit, capture, drafts, connections
-- Refine table-by-table as each backend capability lands; widening is a reviewed change.
--
-- PREREQUISITE — done against the `postgres` maintenance DB as the PG Entra admin (the
-- pgaadauth_* functions exist only there; same pattern as migration 0044):
--   SELECT pgaadauth_create_principal_with_oid(
--     'mgid-imperioncrmbackendfunction', '4f9bab1a-ed60-446b-94da-aee4b6ea2b98',
--     'service', false, false);
--   (runner: scripts/create-backend-pg-principal.mjs)
--
-- This migration is GRANTs-only and idempotent; it no-ops if the role is absent so the
-- ordered runner never wedges.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — run the prerequisite first; skipping grants.';
    RETURN;
  END IF;

  -- ── Read: CRM spine, identity mirror, consent gate, gold knowledge store ───────────────
  GRANT SELECT ON account, contact, opportunity, app_user, discovery_call, assessment
    TO "mgid-imperioncrmbackendfunction";
  GRANT SELECT ON current_consent TO "mgid-imperioncrmbackendfunction";
  GRANT SELECT ON knowledge_object, knowledge_embedding TO "mgid-imperioncrmbackendfunction";

  -- ── Write: evidence/timeline/dossier (append-heavy), captures, audit ───────────────────
  GRANT SELECT, INSERT ON interaction, contact_enrichment, contact_social_identity,
    external_identity, audit_log, consent_event, lead_capture_event, meeting_action_item
    TO "mgid-imperioncrmbackendfunction";

  -- ── Read/write/update: connections (OAuth + company credentials), contacts (captures),
  --    agent-drafted answers (human confirm flips status in the web app) ──────────────────
  GRANT SELECT, INSERT, UPDATE ON connection, contact, engagement_answer
    TO "mgid-imperioncrmbackendfunction";
END $$;

COMMIT;
