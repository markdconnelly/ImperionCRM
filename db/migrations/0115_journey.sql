-- 0115 marketing journeys — a journey is a SINGLE object on the existing workflow
-- substrate (ADR-0073, issue #397, epic #319 · parent #314).
-- Migration number 0115 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration merges
-- during the CI window, renumber the file (rename is data-safe).
--
-- The schema heavy lane of the marketing-automation vertical (epic #319, ADR-0073).
-- Today campaigns can build an audience and send once (ADR-0053); what is missing is
-- automation DEPTH — multi-step nurture cadences, A/B on a send, engagement-branching
-- journeys. ADR-0073 settles the shape, and the key call (decision 1, RATIFIED by Mark)
-- is: DO NOT mint a second engine. A journey is a `workflow` row (ICM-executed,
-- ADR-0061) whose embedded config holds the ordered steps; enrollment REUSES
-- `workflow_enrollment` (one ACTIVE per (workflow, contact), idempotent — already
-- built, migration 0024/0073). No journey_step / journey_enrollment / journey_step_variant
-- child tables: the journey is authored, versioned, and reasoned about as ONE object.
--
-- Three additive changes — all on existing tables (no new tables):
--
--   1. workflow_kind gains 'journey' — marks a workflow row as a marketing journey
--      (vs the existing nurture / pre_discovery / re_engagement sequences). A journey
--      reads its steps from `definition` (below); the legacy kinds read child
--      `workflow_step` rows. One table, two authoring shapes, distinguished by kind.
--
--   2. workflow.definition (NEW jsonb, nullable) — the journey as a single object
--      (ADR-0073 decision 1): the ordered steps (send / wait / branch / score / exit),
--      the A/B variant config on send steps (decision 4), and the source segment refs
--      it enrolls from (decision 2 — segment table is a later wave #420, so the ref is
--      held as data here, forward-compatible, not yet an FK). NULL on the legacy kinds
--      (they use workflow_step). Shape is validated in the app (lib/journey.ts), not by
--      the DB — one object to version, exactly as the ADR intends.
--
--   3. workflow_enrollment gains two nullable columns used only by journeys:
--      - variant_assignments (jsonb) — STICKY A/B assignment per enrollee
--        (ADR-0073 decision 4): { stepKey: variantKey } so a contact always sees the
--        same variant of a given send step across re-evaluation; the winner roll-out
--        later overwrites remaining enrollees. NULL = no A/B yet seen.
--      - current_step_key (text) — the journey runtime cursor. The legacy
--        current_step_ordinal is a linear index; a branching journey has no single
--        ordinal, so it tracks position by step key. NULL on the legacy kinds.
--
-- No gate bypass (ADR-0058/0055): a journey send step still crosses the approval gate
-- and autonomy dial — this migration adds structure only, no runtime. The backend
-- journey runner (#398) and the journey builder (#399) build on this; this front end
-- (ADR-0042) only READS — it ships a read model (listJourneys / getJourney over the
-- definition) so the surface lane can build.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no PII (journey config is internal).
-- workflow already grants SELECT to the web role and SELECT/INSERT/UPDATE to the
-- backend/pipeline roles; ALTER ADD COLUMN inherits those grants (no new grant needed).

BEGIN;

-- ── workflow_kind: a journey is a workflow (ADR-0073 decision 1) ──────────────────
-- ADD VALUE IF NOT EXISTS is safe inside a transaction on PG ≥ 12 (target is 18); the
-- new label is not USED in this same migration, so the in-txn-use caveat does not apply.
ALTER TYPE workflow_kind ADD VALUE IF NOT EXISTS 'journey';

-- ── workflow.definition: the journey as a single object (ADR-0073 decision 1) ──────
ALTER TABLE workflow ADD COLUMN IF NOT EXISTS definition jsonb;
COMMENT ON COLUMN workflow.definition IS
  'Marketing journey as a single object (ADR-0073 decision 1, #397): ordered steps (send/wait/branch/score/exit), A/B variant config on send steps (decision 4), and source segment refs for enrollment (decision 2; segment table is #420, held as data until then). Set only when kind = journey; legacy kinds use workflow_step. Shape validated in the app (lib/journey.ts), not the DB — one object to author/version.';

-- ── workflow_enrollment: journey-only runtime columns (ADR-0073 decision 4) ────────
ALTER TABLE workflow_enrollment
  ADD COLUMN IF NOT EXISTS variant_assignments jsonb,
  ADD COLUMN IF NOT EXISTS current_step_key    text;
COMMENT ON COLUMN workflow_enrollment.variant_assignments IS
  'Sticky A/B assignment for a journey enrollee (ADR-0073 decision 4, #397): { stepKey: variantKey } so a contact always sees the same variant of a send step; winner roll-out overwrites remaining enrollees. NULL = no A/B variant seen / not a journey.';
COMMENT ON COLUMN workflow_enrollment.current_step_key IS
  'Journey runtime cursor by step key (ADR-0073, #397). A branching journey has no linear ordinal, so position is tracked by key. NULL on the legacy linear kinds, which use current_step_ordinal.';

COMMIT;
