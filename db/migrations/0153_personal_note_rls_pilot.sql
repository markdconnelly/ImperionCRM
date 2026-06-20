-- 0153: personal_note — first personal-tier table + first RLS policy (owner axis).
-- Access spine slice 2 (#975, parent #967, ADR-0105). Migration number 0153 claimed at
-- MERGE per system CLAUDE.md §10.3 — authored against a placeholder; renumber if another
-- migration merges first.
--
-- WHY THIS EXISTS. Slice 1 (#974, migration 0152) shipped the `withIdentity` claim-plumbing
-- with NO policy enabled. This slice proves the owner-axis mechanic end-to-end on a NEW,
-- self-contained personal-tier table (the "verbatim drawer" of the #968 design) so there is
-- ZERO risk of breaking an existing read path: every read/write of personal_note goes
-- through `withIdentity` from day one.
--
-- THE POLICY. Owner scope keys on the caller's `app_user.id` carried in `app.user_id`
-- (NOT the Entra `oid` — ownership columns FK to app_user.id, a different value; see
-- ADR-0105). `current_setting('app.user_id', true)` is missing_ok → an unset context yields
-- NULL → the predicate matches no rows (fail-closed), never errors. The app role
-- `mgid-imperioncrm-web-prd` is non-owner / non-BYPASSRLS (verified live 2026-06-20) → it is
-- subject to this policy. The table-owner admin (migrate.mjs / pg-MCP) bypasses RLS by
-- ownership, but the APP never connects as the owner, so personal notes are owner-only even
-- for an admin using the web app — which is the intended personal-tier privacy contract.
-- An explicit, AUDITED admin/company bypass over personal data is deliberately deferred to
-- slice 3 (#976), not granted here.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated). After
-- apply, verify with the cross-employee matrix in docs/testing/rls-access-spine.md.
-- No secrets. Personal notes are user content (PII-bearing) — RLS is exactly the control;
-- no row-level data appears in this migration or any doc.

BEGIN;

CREATE TABLE IF NOT EXISTS personal_note (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE personal_note IS
  'Personal-tier owner-private note ("verbatim drawer", #968). Owner-scoped via RLS on '
  'app.user_id (ADR-0105). Owner-only — invisible to other employees and to admins via '
  'the app; PII-bearing user content.';

CREATE INDEX IF NOT EXISTS personal_note_owner_idx ON personal_note (owner_user_id);

DROP TRIGGER IF EXISTS trg_personal_note_updated ON personal_note;
CREATE TRIGGER trg_personal_note_updated BEFORE UPDATE ON personal_note
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row-level security: owner axis ───────────────────────────────────────────────────
ALTER TABLE personal_note ENABLE ROW LEVEL SECURITY;

-- Re-runnable: drop then create (CREATE POLICY has no IF NOT EXISTS).
DROP POLICY IF EXISTS personal_note_owner ON personal_note;
CREATE POLICY personal_note_owner ON personal_note
  USING (owner_user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (owner_user_id = current_setting('app.user_id', true)::uuid);

-- ── Grants (defensive pattern; roles may be absent in some envs) ──────────────────────
DO $$
BEGIN
  -- Web (the only writer/reader of personal notes in this slice).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON personal_note TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
