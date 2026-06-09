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
-- Idempotent: role creation is conditional; GRANTs re-run safely. Must be applied by an
-- Entra admin of the server (pgaadauth_create_principal requirement).

BEGIN;

-- ── Entra-backed role for the backend MI (conditional — pgaadauth errors on duplicates) ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    PERFORM pgaadauth_create_principal('mgid-imperioncrmbackendfunction', false, false);
  END IF;
END $$;

-- ── Read: CRM spine, identity mirror, consent gate, gold knowledge store ─────────────────
GRANT SELECT ON account, contact, opportunity, app_user, discovery_call, assessment
  TO "mgid-imperioncrmbackendfunction";
GRANT SELECT ON current_consent TO "mgid-imperioncrmbackendfunction";
GRANT SELECT ON knowledge_object, knowledge_embedding TO "mgid-imperioncrmbackendfunction";

-- ── Write: evidence/timeline/dossier (append-heavy), captures, audit ─────────────────────
GRANT SELECT, INSERT ON interaction, contact_enrichment, contact_social_identity,
  external_identity, audit_log, consent_event, lead_capture_event, meeting_action_item
  TO "mgid-imperioncrmbackendfunction";

-- ── Read/write/update: connections (OAuth + company credentials), contacts (captures),
--    agent-drafted answers (status flips on human confirm happen in the web app) ──────────
GRANT SELECT, INSERT, UPDATE ON connection, contact, engagement_answer
  TO "mgid-imperioncrmbackendfunction";

COMMIT;
