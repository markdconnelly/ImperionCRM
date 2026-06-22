-- 0169: Curated Vault sync substrate + Personal Curator god-view (#1157, epic #1152,
-- ADR-0114; carries the ADR-0105 amendment). Migration number 0169 claimed at MERGE per
-- system CLAUDE.md §10.3 — authored against a placeholder; renumber if another migration
-- merges first.
--
-- WHY THIS EXISTS. The personal tier is two substrates (ADR-0114): the Postgres Synthesis
-- Store (verbatim memory_drawer/agent_message → temporal-KG personal_fact) and a per-owner
-- Azure Blob **Curated Vault** (a markdown filesystem the owner edits, mirrored over HTTPS).
-- A background **Personal Curator** keeps them in sync both ways and hunts Knowledge
-- Contradictions for the owner to approve. This migration adds the schema that makes that
-- governable:
--   • personal_vault_file       — Postgres pointer/mirror of the blob markdown files (NOT content).
--   • personal_curation_event   — append-only ledger of every Curator god-view action.
--   • personal_contradiction    — detected contradictions awaiting the owner's resolution.
-- and the **Personal Curator god-view** — a permissive, NON-BYPASSRLS RLS policy keyed on the
-- curator's dedicated service role — over ALL personal-tier surfaces: the two new owner-keyed
-- tables, plus the EXISTING memory_drawer (0167, personal rows) and personal_fact (0168).
--
-- THE ADR-0105 AMENDMENT (Personal Curator god-view). ADR-0105 §3 anticipated a curation
-- identity but scoped it to the cross-wall promoter (§3c — never impersonates, keyed on its
-- service identity). The Personal Curator is a DIFFERENT actor: it stays INTRA-OWNER and needs
-- broad owner-scoped read+write across the personal tier for synthesis/projection. So per the
-- ADR-0114 amendment to ADR-0105:
--   • a PERMISSIVE RLS policy per personal table for the curator service role — NOT BYPASSRLS,
--     so its reach is visible in pg_policies (the same choice §3b made for the admin god-view);
--   • personal-tier ONLY (never a company table);
--   • every god-view action is ledgered to personal_curation_event (enforced at the data layer);
--   • a non-BYPASSRLS managed-identity → Postgres login. **FE owns the role's POLICIES + the
--     ledger schema; the BACKEND owns the runtime (BE #302); INFRA owns the login role itself**
--     (Phase-2 — provisioned outside migrations, like every app role here).
-- The LP vectorization role gets the SAME read concession (elevated personal read to vectorize
-- across owners), non-BYPASSRLS + ledgered, SELECT-only here. The owner-scoping invariant
-- survives because both actors only ever write back to the SAME owner_user_id they read.
--
-- ROLE-BASED, NOT GUC. The curator/LP god-view keys on `current_user` (the connection's DB
-- login role), NOT a settable GUC — a GUC could be spoofed by any code path on the web/backend
-- app role, whereas only actually authenticating as the dedicated role satisfies the predicate
-- (matches ADR-0105 §3c "key on the service identity"). `current_user = '<literal>'` is valid
-- SQL even before the role exists (it simply never matches), so this is forward-compatible with
-- the Phase-2 role provisioning. **CONTRACT: Phase-2 must provision the curator's managed-identity
-- login role as `imperion-personal-curator` (non-BYPASSRLS); if infra names it differently, update
-- the policies below.** The LP role `imperion-localpipeline` already exists (granted in 0167/0168).
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated). Vault file paths / contradiction
-- detail describe PII-bearing personal content — RLS is exactly the control; no row data appears
-- here or in any doc. No secrets.

BEGIN;

-- Curator/LP service-role names referenced by the god-view policies (kept here as a single
-- documented contract; literals are inlined in the policies below for clarity).
--   curator: imperion-personal-curator   (Phase-2 — INFRA-provisioned, non-BYPASSRLS)
--   lp:      imperion-localpipeline       (already exists)

-- ── personal_vault_file — Postgres mirror/pointer of the blob markdown filesystem ──────────
CREATE TABLE IF NOT EXISTS personal_vault_file (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- owner axis (RLS)
  room_path     text NOT NULL,                       -- Room Path = blob path prefix (ADR-0114 §8)
  file_path     text NOT NULL,                        -- e.g. 'mark/projects/imperion-os/decisions.md'
  blob_ref      text NOT NULL,                        -- blob path within the owner's vault-<owner> container
  content_hash  text,                                 -- idempotency/diff key (NOT the change trigger — Event Grid is)
  sync_state    text NOT NULL DEFAULT 'projected'
                  CHECK (sync_state IN ('projected', 'human_edited', 'conflict')),
  synced_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, file_path)
);
COMMENT ON TABLE personal_vault_file IS
  'Postgres pointer/mirror of the per-owner Curated Vault blob markdown filesystem (#1157, '
  'ADR-0114 §8) — the path/state record, NOT the content (which lives in the owner''s '
  'vault-<owner> Blob container). sync_state tracks projected/human_edited/conflict for the '
  'bidirectional Curator sync. Owner-scoped via RLS on app.user_id (ADR-0105). PII-bearing paths.';

CREATE INDEX IF NOT EXISTS ix_personal_vault_file_owner      ON personal_vault_file (owner_user_id);
CREATE INDEX IF NOT EXISTS ix_personal_vault_file_owner_room ON personal_vault_file (owner_user_id, room_path);

DROP TRIGGER IF EXISTS trg_personal_vault_file_updated ON personal_vault_file;
CREATE TRIGGER trg_personal_vault_file_updated BEFORE UPDATE ON personal_vault_file
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── personal_curation_event — append-only ledger of every Curator god-view action ──────────
CREATE TABLE IF NOT EXISTS personal_curation_event (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- whose personal data was touched
  actor         text NOT NULL,                        -- the service identity ('personal_curator' | 'lp_vectorizer')
  action        text NOT NULL
                  CHECK (action IN ('project', 'ingest', 'embed_enqueue', 'invalidate', 'propose_resolution')),
  subject_ref   text,                                 -- free-form ref to the affected object ('table:id' / fact id / file_path)
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- action context (no row-content; provenance only)
  at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE personal_curation_event IS
  'Append-only ledger of every Personal Curator / LP-vectorizer god-view action over the '
  'personal tier (#1157, ADR-0114 amendment to ADR-0105). One row per action; never updated '
  'or deleted. The owner can read their own ledger (transparency); the service actor INSERTs. '
  'This is the audit control that makes the non-BYPASSRLS god-view accountable.';

CREATE INDEX IF NOT EXISTS ix_personal_curation_event_owner ON personal_curation_event (owner_user_id, at DESC);

-- ── personal_contradiction — detected Knowledge Contradictions awaiting owner approval ─────
CREATE TABLE IF NOT EXISTS personal_contradiction (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- owner axis (RLS) — owner resolves their own
  room_path     text,
  fact_a_id     uuid REFERENCES personal_fact(id) ON DELETE CASCADE,       -- fact-vs-fact ...
  fact_b_id     uuid REFERENCES personal_fact(id) ON DELETE CASCADE,
  vault_file_id uuid REFERENCES personal_vault_file(id) ON DELETE CASCADE, -- ... or fact-vs-vault (pg-vs-blob)
  detail        text NOT NULL,                          -- human-readable description of the conflict
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'approved', 'dismissed')),
  resolved_by   uuid REFERENCES app_user(id),           -- the owner who resolved (set on resolve)
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE personal_contradiction IS
  'Knowledge Contradictions the Personal Curator detected (fact-vs-fact or fact-vs-vault), '
  'awaiting the OWNER''s approval — never auto-resolved (#1157, ADR-0114). Owner-scoped via RLS; '
  'the owner resolves their own (approved/dismissed). PII-bearing detail.';

CREATE INDEX IF NOT EXISTS ix_personal_contradiction_owner_status ON personal_contradiction (owner_user_id, status);

DROP TRIGGER IF EXISTS trg_personal_contradiction_updated ON personal_contradiction;
CREATE TRIGGER trg_personal_contradiction_updated BEFORE UPDATE ON personal_contradiction
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══ Row-level security ═════════════════════════════════════════════════════════════════════
-- Per table: an OWNER policy (the owner's own rows, via app.user_id — the 0153 mechanic) plus a
-- PERMISSIVE Personal Curator god-view (current_user = the curator role). Permissive policies are
-- OR'd, so a row is reachable if the owner matches OR the caller is the curator service role.
-- All current_setting(...,true) are missing_ok → unset context yields NULL → fail-closed.

ALTER TABLE personal_vault_file      ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_curation_event  ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_contradiction   ENABLE ROW LEVEL SECURITY;

-- personal_vault_file: owner read/write own; curator full god-view.
DROP POLICY IF EXISTS personal_vault_file_owner ON personal_vault_file;
CREATE POLICY personal_vault_file_owner ON personal_vault_file
  USING (owner_user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (owner_user_id = current_setting('app.user_id', true)::uuid);
DROP POLICY IF EXISTS personal_vault_file_curator ON personal_vault_file;
CREATE POLICY personal_vault_file_curator ON personal_vault_file
  USING (current_user = 'imperion-personal-curator')
  WITH CHECK (current_user = 'imperion-personal-curator');

-- personal_curation_event: owner reads own ledger (transparency); curator INSERTs (append-only).
DROP POLICY IF EXISTS personal_curation_event_owner ON personal_curation_event;
CREATE POLICY personal_curation_event_owner ON personal_curation_event
  FOR SELECT
  USING (owner_user_id = current_setting('app.user_id', true)::uuid);
DROP POLICY IF EXISTS personal_curation_event_curator ON personal_curation_event;
CREATE POLICY personal_curation_event_curator ON personal_curation_event
  USING (current_user IN ('imperion-personal-curator', 'imperion-localpipeline'))
  WITH CHECK (current_user IN ('imperion-personal-curator', 'imperion-localpipeline'));

-- personal_contradiction: owner reads + resolves own; curator opens + god-view.
DROP POLICY IF EXISTS personal_contradiction_owner ON personal_contradiction;
CREATE POLICY personal_contradiction_owner ON personal_contradiction
  USING (owner_user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (owner_user_id = current_setting('app.user_id', true)::uuid);
DROP POLICY IF EXISTS personal_contradiction_curator ON personal_contradiction;
CREATE POLICY personal_contradiction_curator ON personal_contradiction
  USING (current_user = 'imperion-personal-curator')
  WITH CHECK (current_user = 'imperion-personal-curator');

-- ── God-view extended over the EXISTING personal tables (add permissive curator policies) ───
-- memory_drawer (0167): curator reaches PERSONAL rows only (owner_user_id NOT NULL) — never the
-- company/shared (owner NULL) drawers; it is a personal-tier actor. LP gets SELECT-only god-view
-- here (its #300 job: vectorize personal verbatim → gold summary across owners).
DROP POLICY IF EXISTS memory_drawer_curator ON memory_drawer;
CREATE POLICY memory_drawer_curator ON memory_drawer
  USING (owner_user_id IS NOT NULL AND current_user = 'imperion-personal-curator')
  WITH CHECK (owner_user_id IS NOT NULL AND current_user = 'imperion-personal-curator');
DROP POLICY IF EXISTS memory_drawer_lp_read ON memory_drawer;
CREATE POLICY memory_drawer_lp_read ON memory_drawer
  FOR SELECT
  USING (owner_user_id IS NOT NULL AND current_user = 'imperion-localpipeline');

-- personal_fact (0168): curator full god-view (synthesize facts, close windows on contradiction).
DROP POLICY IF EXISTS personal_fact_curator ON personal_fact;
CREATE POLICY personal_fact_curator ON personal_fact
  USING (current_user = 'imperion-personal-curator')
  WITH CHECK (current_user = 'imperion-personal-curator');

-- ── Grants (defensive; roles may be absent in some envs) ───────────────────────────────────
DO $$
BEGIN
  -- Web: owner-facing GUI — read own vault files / ledger / contradictions; resolve contradictions.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON personal_vault_file, personal_curation_event TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, UPDATE ON personal_contradiction TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend: the orchestrator may surface these; the Curator runtime acts as its OWN role below.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON personal_vault_file, personal_curation_event, personal_contradiction
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- Personal Curator service role (Phase-2 — INFRA-provisioned). Full read+write on the personal
  -- tier it curates; the RLS policies above scope it; the ledger keeps it accountable.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-personal-curator') THEN
    GRANT SELECT, INSERT, UPDATE ON
      personal_vault_file, personal_contradiction, personal_fact, memory_drawer
      TO "imperion-personal-curator";
    GRANT SELECT, INSERT ON personal_curation_event TO "imperion-personal-curator";
  ELSE
    RAISE NOTICE 'role imperion-personal-curator absent (Phase-2) — skipping curator grants.';
  END IF;
  -- LocalPipeline: SELECT to vectorize personal verbatim across owners (#300); INSERT its own
  -- ledger rows for the embed action.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT INSERT ON personal_curation_event TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
