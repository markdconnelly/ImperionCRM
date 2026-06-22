-- 0179: Eval→improvement feedback loop + PII-safe golden-harvest provenance.
-- Eval-plane feedback slice (#1037, epic #983, ADR-0120).
--
-- WHY THIS EXISTS. The eval plane (0154/0155, ADR-0106) MEASURES quality but does not close the
-- loop: a failing eval or a low-scored `agent_run` produces no actionable artifact, and the
-- richest source of new golden cases — real traces — cannot be copied into `agent_eval_case`
-- because it is curated/synthetic-ONLY (no client PII, §8). This migration delivers the two
-- halves of the loop as DATA:
--
--   1. agent_tuning_candidate — a Mark-GATED PROPOSAL row. A failed eval / low-scored run opens
--      one (kind = prompt | grant | skill change); it carries a human-readable diff/rationale and
--      a status (open → accepted/rejected/applied). It NEVER auto-applies anything — applying a
--      prompt/grant/skill change stays a human decision (ADR-0120, the autonomy ceiling #1036).
--      The accepted/applied track-record is the signal earned autonomy (#1036) later reads.
--
--   2. agent_eval_case provenance — harvest_source + harvest_run_id mark a case that was
--      HARVESTED from a real trace and proves it went through redaction. The redaction/synthesis
--      step (src/lib/agent/eval-harvest.ts, fail-closed) runs in the backend harvester BEFORE the
--      INSERT; these columns record that origin for audit. Curated cases keep harvest_source =
--      'curated' (the default), exactly as today.
--
-- DORMANT — schema only. NO harvester, NO auto-filer, NO LLM/GitHub calls in this migration
-- (those run in the backend runtime). NOT prod-applied until the orchestrator/Mark runs it (each
-- prod apply is Mark-gated). Additive + idempotent + transactional. Frontend-owned schema
-- (ADR-0042). Backend MI writes (it is the runtime that harvests + files); web reads for the
-- candidate review surface + SELECT/UPDATE so an operator can accept/reject from the cockpit
-- (the 0158 dial / 0163 governance precedent). Pipeline identities get nothing.
--
-- NO SECRETS. NO PII. agent_tuning_candidate.title/rationale/diff are operator/agent-authored
-- PROPOSAL text describing a CODE/CONFIG change — they MUST NOT embed client row-level data
-- (same §8 bar as agent_eval_case). harvested case inputs are redaction-gated upstream. Agent-
-- platform operational tables — NOT silver business entities (same class as agent_run /
-- agent_eval_*), so absent from the OKF bundle (semantic-layer-not-affected).

BEGIN;

-- ── 1. Golden-case harvest provenance (additive columns on the 0154 table) ──────────────────
ALTER TABLE agent_eval_case
  ADD COLUMN IF NOT EXISTS harvest_source text NOT NULL DEFAULT 'curated'
    CHECK (harvest_source IN ('curated', 'harvested')),
  ADD COLUMN IF NOT EXISTS harvest_run_id uuid REFERENCES agent_run(id) ON DELETE SET NULL;
COMMENT ON COLUMN agent_eval_case.harvest_source IS
  'Origin of this golden case: ''curated'' (hand-authored/synthetic, the default) or ''harvested'' '
  '(synthesised from a real trace via the redaction-gated harvester, ADR-0120). A harvested case '
  'has passed src/lib/agent/eval-harvest.ts fail-closed redaction — no client PII (§8).';
COMMENT ON COLUMN agent_eval_case.harvest_run_id IS
  'For a harvested case: the agent_run it was synthesised from (provenance/audit). Content was '
  'redacted before storage; this is an id reference only, never trace text.';

-- ── 2. agent_tuning_candidate: Mark-gated improvement PROPOSAL rows ──────────────────────────
CREATE TABLE IF NOT EXISTS agent_tuning_candidate (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What kind of change is proposed. Bounds the loop to the three levers in scope (#1037).
  kind          text NOT NULL CHECK (kind IN ('prompt', 'grant', 'skill')),
  -- Target the proposal touches: a sub-agent (agent_id) or a whole module.
  agent_id      uuid REFERENCES agent(id) ON DELETE SET NULL,
  module        text,
  title         text NOT NULL,                       -- short proposal label (PII-free)
  rationale     text NOT NULL,                       -- why: cites the failing eval/low run (PII-free)
  -- The proposed change as human-readable diff/prose. NOT executable — a human applies it.
  proposed_diff text,
  -- Provenance: what triggered this candidate (an eval result and/or a low-scored run).
  source_eval_result_id uuid REFERENCES agent_eval_result(id) ON DELETE SET NULL,
  source_run_id         uuid REFERENCES agent_run(id) ON DELETE SET NULL,
  -- External proposal artifact (e.g. the auto-filed GitHub issue URL), if the backend filed one.
  external_ref  text,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'accepted', 'rejected', 'applied')),
  -- Who actioned it (operator/Mark) + when — the accept/apply track record #1036 reads.
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE agent_tuning_candidate IS
  'Mark-gated improvement PROPOSAL (#1037, ADR-0120). A failed eval / low-scored run opens a '
  'candidate prompt|grant|skill change; it never auto-applies — a human accepts/applies. The '
  'accepted/applied track record is the signal earned autonomy (#1036) reads. Backend RW, web '
  'SELECT+UPDATE (operator decides from the cockpit). No PII, no secrets — proposal text only.';
COMMENT ON COLUMN agent_tuning_candidate.proposed_diff IS
  'Human-readable proposed change (prose/diff). NOT executable and NEVER auto-applied — applying '
  'a prompt/grant/skill change is a human decision (ADR-0120, autonomy ceiling #1036).';

CREATE INDEX IF NOT EXISTS agent_tuning_candidate_status_idx
  ON agent_tuning_candidate (status, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_tuning_candidate_agent_idx
  ON agent_tuning_candidate (agent_id);

DROP TRIGGER IF EXISTS trg_agent_tuning_candidate_updated ON agent_tuning_candidate;
CREATE TRIGGER trg_agent_tuning_candidate_updated BEFORE UPDATE ON agent_tuning_candidate
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Least-privilege grants (0154/0163 defensive pattern; roles may be absent in some envs) ───
DO $$
BEGIN
  -- Backend MI is the runtime — it harvests cases + files candidates (RW).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON agent_tuning_candidate TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- Web reads the candidate review surface + UPDATE so an operator can accept/reject (0158/0163
  -- dial/governance precedent). No INSERT (candidates are filed by the runtime), no DELETE.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, UPDATE ON agent_tuning_candidate TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
