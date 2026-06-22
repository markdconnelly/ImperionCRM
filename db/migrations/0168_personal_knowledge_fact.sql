-- 0168: personal_fact — temporal knowledge graph for the personal tier (#1155, epic
-- #1152, ADR-0114). Migration number 0168 claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a placeholder; renumber if another migration merges first.
--
-- WHY THIS EXISTS. The Synthesis Store's reasoning layer (ADR-0114): owner-private
-- Knowledge Facts — entity–relation–object triples — each carrying a Validity Window
-- (`valid_from`/`valid_to`) so "freshness = correctness" is modelled as DATA, not a guess.
-- This is the SQLite-in-MemPalace role, on Postgres. Full temporal KG day-one (Mark's
-- call): facts are never hard-deleted; a superseded fact has its window CLOSED
-- (`valid_to = now()`) so the timeline is auditable and the live set is just
-- `WHERE valid_to IS NULL`.
--
-- PROVENANCE IS POLYMORPHIC. A fact is synthesized FROM verbatim bronze, and the
-- verbatim store is SPLIT BY ORIGIN (CLAUDE.md §4 / ADR-0113): non-agent turns in
-- `memory_drawer` (0167), agent-run turns in `agent_message` (0056/0163). So a fact
-- cites its source with a `(source_kind, source_id)` pair rather than a single FK —
-- the issue's original `source_capture_id → personal_capture` ref is superseded
-- (ADR-0114 §9 unified Capture onto those two tables; `personal_capture` was retired).
-- No FK is possible (the target is one of two tables); the CHECK keeps the pair
-- both-set-or-both-null. Retention/forgetting (Backend #303) finds facts citing a
-- purged bronze row via the `(source_kind, source_id)` index.
--
-- ACCESS. Owner axis only (ADR-0105), exactly the 0153 mechanic: a row is visible
-- to its owner (`owner_user_id = app.user_id`) and no one else — facts are the
-- synthesized meaning of a person's private memory, strictly personal-tier. The
-- Personal Curator's audited cross-row reads + contradiction handling get their
-- own permissive god-view policy in #1157 (it is NOT granted here). App roles are
-- non-BYPASSRLS (verified live 2026-06-20) → this policy enforces; the table-owner
-- admin keeps the audited god-view by ownership.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT —
-- NOT prod-applied until Mark runs it (each prod apply is Mark-gated). Facts are the
-- distilled meaning of PII-bearing personal memory — RLS is exactly the control; no
-- row-level data appears in this migration or any doc. No secrets.

BEGIN;

CREATE TABLE IF NOT EXISTS personal_fact (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- owner axis (RLS)
  room_path       text NOT NULL,                       -- MemPalace room scope (path-mirror, ADR-0114)
  subject         text NOT NULL,                       -- triple: entity ...
  predicate       text NOT NULL,                       --        ... relation ...
  object          text NOT NULL,                       --        ... object (string form v1; entity-id normalization is a later slice)
  valid_from      timestamptz NOT NULL DEFAULT now(),  -- window opens
  valid_to        timestamptz,                          -- NULL = currently valid; set = invalidated/superseded
  source_kind     text,                                 -- polymorphic provenance: 'memory_drawer' | 'agent_message' (ADR-0113 split)
  source_id       uuid,                                 -- the bronze row id in that table (no FK — two possible targets)
  confidence      real,                                 -- optional synthesis confidence
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_fact_source_kind_chk
    CHECK (source_kind IS NULL OR source_kind IN ('memory_drawer', 'agent_message')),
  CONSTRAINT personal_fact_source_pair_chk
    CHECK ((source_kind IS NULL) = (source_id IS NULL))   -- both set or both null
);
COMMENT ON TABLE personal_fact IS
  'Personal-tier temporal knowledge graph (#1155, ADR-0114): owner-private '
  'entity-relation-object facts with a Validity Window (valid_from/valid_to). '
  'valid_to IS NULL = currently valid; superseded facts have the window closed, '
  'never hard-deleted (auditable timeline). Provenance is polymorphic — '
  '(source_kind, source_id) cites memory_drawer (0167) or agent_message (0056/0163), '
  'split by origin (ADR-0113). Owner-scoped via RLS on app.user_id (ADR-0105). '
  'Synthesized meaning of PII-bearing personal memory.';

-- Lookups by subject (timeline) and by room (scoped recall); the partial index is the
-- live set — `current` reads only open windows.
CREATE INDEX IF NOT EXISTS ix_personal_fact_owner_subject ON personal_fact (owner_user_id, subject);
CREATE INDEX IF NOT EXISTS ix_personal_fact_owner_room    ON personal_fact (owner_user_id, room_path);
CREATE INDEX IF NOT EXISTS ix_personal_fact_live          ON personal_fact (owner_user_id) WHERE valid_to IS NULL;
-- Reverse provenance: find every fact citing a given bronze row (retention/forgetting, #303).
CREATE INDEX IF NOT EXISTS ix_personal_fact_source        ON personal_fact (source_kind, source_id)
  WHERE source_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_personal_fact_updated ON personal_fact;
CREATE TRIGGER trg_personal_fact_updated BEFORE UPDATE ON personal_fact
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row-level security: owner axis (same mechanic as 0153) ─────────────────────────────
ALTER TABLE personal_fact ENABLE ROW LEVEL SECURITY;

-- Re-runnable: drop then create (CREATE POLICY has no IF NOT EXISTS).
-- current_setting(...,true) is missing_ok → an unset context yields NULL → the predicate
-- matches no rows (fail-closed), never errors.
DROP POLICY IF EXISTS personal_fact_owner ON personal_fact;
CREATE POLICY personal_fact_owner ON personal_fact
  USING (owner_user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (owner_user_id = current_setting('app.user_id', true)::uuid);

-- ── Grants (defensive pattern; roles may be absent in some envs) ───────────────────────
DO $$
BEGIN
  -- Web: GUI adds facts, reads timeline/current, and closes a window (invalidate).
  -- No DELETE — facts are never hard-deleted (audit).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON personal_fact TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend: the Personal Curator synthesizes facts from bronze and closes windows on
  -- contradiction (BE #302). SELECT/INSERT/UPDATE; no DELETE (audit).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON personal_fact TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- LocalPipeline: read-only (any future vectorization of facts; consistent with 0167).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON personal_fact TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
