-- 0223: `problem` + `known_error` silver — ITIL 4 Problem Management, app-native (#1577,
-- parent #373, ADR-0079 [Change Enablement] AMENDED to add Problem Management — Problem was
-- dropped from #373/ADR-0079 when only Change shipped; this slice adds it back as the substrate
-- for Sage's `problem-investigation` tracer + `run-PIR` procedure, Stream 05).
--
-- Migration number 0223 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- WHY THIS EXISTS. ITIL 4 Problem Management, app-native, the neighbour of Change Enablement
-- (0135). A `problem` is the root-cause investigation record that sits BEHIND one or more
-- incidents/tickets: Sage opens it, links the contributing incidents, drives it
-- open→investigating→known_error→resolved, and on resolution emits a `known_error` (the
-- workaround + permanent-fix register a future incident can be matched against). This is the
-- twin posture of `change_request`: an app-native WORKING object — the website is the SoR for
-- the investigation; `ticket` (Autotask SoR) remains the SoR for the incidents it links.
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B). A `problem` / `known_error`
-- is a REAL persisted row with a uuid PK (unlike a CI, which is a projection), so `known_error`
-- FKs to `problem` and the incident-link column FKs to `ticket`.
--
-- LINKING INCIDENTS. A problem groups the incidents that share a root cause. The natural link is
-- to silver `ticket` (the incident SoR, ADR-0044). For the v1 grain a problem carries a single
-- primary `ticket_id` ref (the triggering incident); a future many-incidents bridge
-- (`problem_incident`) can be added without reshaping this table — OMITTED now (one incident link
-- is the minimum Sage's tracer needs; the 0131/0144 "no fabricated edge" discipline).
--
-- WHO WRITES IT. App-native: the /problems surface + Sage's investigate-problem / run-PIR
-- procedures write it (problem:write, ADR-0045), backend-executed. NOT a bronze→silver merge
-- (no external source of record for the investigation itself — Autotask owns the incident, not
-- the root-cause analysis). Read-only to web for render.
--
-- New silver entities → each gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- problem.md, known_error.md) + a coverage-matrix row in THIS PR (system CLAUDE.md §11; the
-- semantic-layer gate requires the concept file for a CREATE of a concept-bearing silver table).
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. No row-level PII
-- (a problem is title/description + status + a root-cause narrative + incident/ticket refs; it
-- mints no personal data of its own — operational data_class). No secrets. DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── problem_status: the Problem Management lifecycle ──────────────────────────────────────
-- open → investigating → known_error (a workaround is registered) → resolved (permanent fix).
-- An ENUM (not a CHECK) so the /problems board, Sage's investigate-problem tracer, and run-PIR
-- share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_status') THEN
    CREATE TYPE problem_status AS ENUM ('open', 'investigating', 'known_error', 'resolved');
  END IF;
END $$;

-- ── problem: the app-native root-cause investigation record ───────────────────────────────
CREATE TABLE IF NOT EXISTS problem (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional owning client account (a problem may be account-scoped or estate-wide).
  account_id    uuid REFERENCES account(id) ON DELETE SET NULL,
  -- The primary contributing incident the problem was raised from (the incident SoR is silver
  -- `ticket`, ADR-0044). Nullable so a proactive problem (no triggering incident) is allowed.
  -- A future many-incidents bridge (`problem_incident`) layers on without reshaping this table.
  ticket_id     uuid REFERENCES ticket(id) ON DELETE SET NULL,
  title         text          NOT NULL,
  description   text,
  status        problem_status NOT NULL DEFAULT 'open',
  -- Severity band (free text band: low|medium|high|critical) — kept text so the create form +
  -- agent share a band without an enum migration when the bands evolve.
  severity      text,
  -- The investigation output — the root-cause narrative (populated as status advances).
  root_cause    text,
  opened_at     timestamptz   NOT NULL DEFAULT now(),
  resolved_at   timestamptz,                                  -- set when status → resolved
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  -- end ≥ start sanity: a problem cannot resolve before it opened.
  CONSTRAINT problem_resolved_after_opened CHECK (resolved_at IS NULL OR resolved_at >= opened_at)
);
COMMENT ON TABLE problem IS
  'ITIL 4 Problem Management root-cause investigation record (#1577, parent #373, ADR-0079 amended to add Problem Management): app-native WORKING object — open→investigating→known_error→resolved — behind one or more incidents. Optional account; ticket_id links the primary contributing incident (silver ticket, the incident SoR, ADR-0044). The website is the SoR for the investigation; Sage''s investigate-problem / run-PIR procedures write it. Archetype B (app-native single-SoR), operational data_class. No PII, no secrets. Migration 0223 (PLACEHOLDER — real number at merge).';
COMMENT ON COLUMN problem.ticket_id IS
  'Primary contributing incident (FK → silver ticket, ADR-0044). Nullable (proactive problem). A future problem_incident bridge carries the many-incidents set without reshaping this table.';
COMMENT ON COLUMN problem.root_cause IS
  'Root-cause narrative — the investigation output, populated as status advances (the run-PIR post-incident review writes against the resolved problem).';

-- Board/list reads filter by status + account and sort newest-first; index the hot paths.
CREATE INDEX IF NOT EXISTS idx_problem_status   ON problem (status);
CREATE INDEX IF NOT EXISTS idx_problem_account  ON problem (account_id);
CREATE INDEX IF NOT EXISTS idx_problem_ticket   ON problem (ticket_id);
CREATE INDEX IF NOT EXISTS idx_problem_opened   ON problem (opened_at DESC);

-- ── known_error: the known-error + workaround register ────────────────────────────────────
-- Emitted by a problem when a workaround is found (status known_error) and refined with the
-- permanent fix on resolution. A future incident is matched against this register (the value of
-- Problem Management: stop re-investigating the same root cause).
CREATE TABLE IF NOT EXISTS known_error (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      uuid NOT NULL REFERENCES problem(id) ON DELETE CASCADE,  -- the owning problem
  title           text NOT NULL,
  workaround      text,                                                    -- the interim mitigation
  permanent_fix   text,                                                    -- the resolution (set on problem resolve)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE known_error IS
  'Known-error + workaround register (#1577, ADR-0079 amended): a known error emitted by a problem (FK problem_id, ON DELETE CASCADE) — the interim workaround + the eventual permanent fix a future incident is matched against. App-native (archetype B), operational data_class. No PII, no secrets. Migration 0223 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_known_error_problem ON known_error (problem_id);

-- ── updated_at triggers (the 0210/0211 convention) ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_problem_updated ON problem;
CREATE TRIGGER trg_problem_updated BEFORE UPDATE ON problem
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_known_error_updated ON known_error;
CREATE TRIGGER trg_known_error_updated BEFORE UPDATE ON known_error
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: the app reads + writes (the /problems CRUD + Sage's investigate-problem / run-PIR,
--    problem:write, ADR-0045); the backend reads + writes (Sage executes server-side); the
--    pipeline reads (observability of the app-native working object); local-pipeline reads.
--    Defensive (roles may be absent), mirroring 0135/0211's grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON problem     TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON known_error TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON problem     TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON known_error TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON problem     TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON known_error TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON problem     TO "imperion-localpipeline";
    GRANT SELECT ON known_error TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
