-- 9001 CRM contact segments — a general-purpose contact set + membership, the
-- enrollment entry point for marketing journeys (ADR-0073 decision 2, ADR-0026
-- boundary, issue #420, epic #319 · parent #314).
-- Migration number 9001 is a PLACEHOLDER (concurrency contract §10.3): the real
-- next-free number is claimed at MERGE — a rebased branch takes the next free slot
-- just before squash, renaming this file (rename is data-safe) and fixing the header
-- + the docs/database/data-model.md reference. Authored against 9001 so concurrent
-- branches do not collide on the live 01xx counter.
--
-- The missing build Mark named (#420): a reusable, general-purpose CONTACT SEGMENT
-- (static/manual or dynamic/rule) plus its membership. ADR-0073 decision 2 makes the
-- segment the enrollment SOURCE a journey draws from; it is also reusable for comms,
-- list views, and reporting — a first-class CRM grouping, not a one-off campaign list.
--
-- DISTINCT FROM AD AUDIENCE (ADR-0026): an ad `audience` / `audience_member` is the
-- paid-media targeting object that syncs OUT to ad platforms (Meta/Google) for
-- delivery. A `segment` is an INTERNAL CRM contact set over our own `contact` rows —
-- it never leaves the system, carries no platform audience id, and is the substrate
-- for journeys/comms/list-views. The two are deliberately separate tables with
-- separate lifecycles; this migration adds segmentation, NOT ad targeting.
--
-- Two new silver tables, mirroring existing silver conventions (born silver, app SoR,
-- ADR-0042 — the front end authors them, processes read/enroll from them):
--
--   1. segment — one contact set. `type` is 'manual' (a static set whose members are
--      added/removed explicitly) or 'rule' (a dynamic set defined by `rule_json`, a
--      predicate over contact fields evaluated to (re)materialize membership). For a
--      'manual' segment `rule_json` is NULL; for a 'rule' segment it holds the
--      predicate (shape validated in the app, lib/segment.ts, not by the DB — one
--      object to author/version, like workflow.definition in 0115). `owner_user_id`
--      is who owns/curates it (FK app_user, ON DELETE SET NULL — losing the owner must
--      not delete the segment).
--
--   2. segment_member — a contact's membership in a segment. UNIQUE(segment_id,
--      contact_id) makes add idempotent (re-adding is a no-op, not a duplicate row) and
--      lets a rule recompute UPSERT membership. `source` records HOW the row got there
--      — 'manual' (added one-by-one), 'bulk' (added by a selection/filter action), or
--      'rule' (materialized by the rule evaluator) — so a rule recompute can replace
--      only its own rule-sourced rows without disturbing manually pinned members.
--      `added_by` (FK app_user, ON DELETE SET NULL) is who/what added it.
--
-- A 'rule' segment's membership is a derived projection: the app/process recomputes it
-- from rule_json over `contact`; this migration stores the rule + the materialized
-- rows but does not itself run any evaluator (no runtime). The recompute writer is a
-- process (ADR-0042); the front end authors the segment + manual/bulk edits and reads
-- membership.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it — it merges dormant. No secrets. A segment is an
-- internal grouping over contacts (it references contacts by id); it mints no new
-- client PII of its own. The grants mirror the silver convention: the web role reads,
-- and writes (the front end authors segments, ADR-0042); the backend/pipeline roles
-- read and write (rule recompute / enrollment).

BEGIN;

-- ── segment: a general-purpose CRM contact set (ADR-0073 decision 2) ──────────────
CREATE TABLE IF NOT EXISTS segment (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text,
  type           text NOT NULL DEFAULT 'manual'
                   CHECK (type IN ('manual', 'rule')),
  owner_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  rule_json      jsonb,                       -- predicate over contact fields; type='rule' only
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- A rule segment must carry a rule; a manual segment must not (membership is explicit).
  CONSTRAINT segment_rule_json_matches_type CHECK (
    (type = 'rule'   AND rule_json IS NOT NULL) OR
    (type = 'manual' AND rule_json IS NULL)
  )
);
COMMENT ON TABLE segment IS
  'A general-purpose CRM contact set (ADR-0073 decision 2, #420): manual (static, members added explicitly) or rule (dynamic, defined by rule_json over contact fields). The enrollment SOURCE for marketing journeys and reusable for comms / list views / reporting. DISTINCT from an ad audience (ADR-0026): a segment is an internal set over our own contacts and never syncs to an ad platform. Born silver, app system of record (ADR-0042) — the front end authors it; processes read/enroll/recompute. Migration 9001 (placeholder; real number claimed at merge §10.3).';
COMMENT ON COLUMN segment.type IS
  'manual = static set, members added/removed explicitly; rule = dynamic set whose membership is materialized from rule_json. CHECK-paired with rule_json.';
COMMENT ON COLUMN segment.rule_json IS
  'For type=rule: the membership predicate over contact fields (shape validated in the app, lib/segment.ts, not the DB — one object to author/version). NULL for type=manual.';
COMMENT ON COLUMN segment.owner_user_id IS
  'Who owns/curates the segment (FK app_user, ON DELETE SET NULL — losing the owner must not delete the segment).';

-- List/pick segments owned by a user; order recent.
CREATE INDEX IF NOT EXISTS idx_segment_owner ON segment (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_segment_type ON segment (type);

-- ── segment_member: a contact's membership in a segment ───────────────────────────
CREATE TABLE IF NOT EXISTS segment_member (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  uuid NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  added_by    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  source      text NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'bulk', 'rule')),
  added_at    timestamptz NOT NULL DEFAULT now(),
  -- One membership row per (segment, contact): add is idempotent, rule recompute upserts.
  CONSTRAINT segment_member_segment_contact_uq UNIQUE (segment_id, contact_id)
);
COMMENT ON TABLE segment_member IS
  'A contact''s membership in a segment (#420). UNIQUE(segment_id, contact_id) — add is idempotent and a rule recompute UPSERTs. source = how it got there (manual one-by-one | bulk selection/filter | rule materialized) so a rule recompute can replace only its own rule-sourced rows and leave manually pinned members alone.';
COMMENT ON COLUMN segment_member.source IS
  'manual = added one-by-one; bulk = added by a selection/filter action; rule = materialized by the rule evaluator. Lets a rule recompute scope its own rows.';

-- Membership of a segment (the members list); and "which segments is this contact in".
CREATE INDEX IF NOT EXISTS idx_segment_member_segment ON segment_member (segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_member_contact ON segment_member (contact_id);

-- ── Grants: web authors + reads; backend/pipeline recompute + enroll (ADR-0042) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON segment TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON segment_member TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON segment TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON segment_member TO "mgid-imperioncrmbackendfunction";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON segment TO "mgid-imperioncrmpipeline";
    GRANT SELECT, INSERT, UPDATE, DELETE ON segment_member TO "mgid-imperioncrmpipeline";
  END IF;
END $$;

COMMIT;
