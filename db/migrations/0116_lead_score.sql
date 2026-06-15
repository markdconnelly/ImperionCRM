-- 0116 rule-based lead scoring — a `lead_score` per contact (ADR-0073 decision 5,
-- issue #401, epic #319 · parent #314).
-- Migration number 0116 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration merges
-- during the CI window, renumber the file (rename is data-safe).
--
-- The scoring slice of the marketing-automation vertical (epic #319, ADR-0073). A
-- journey can route on engagement (0115), but there is no single shared SIGNAL of how
-- hot a contact is. ADR-0073 decision 5 settles it: ship a RULE-BASED score first —
-- deterministic, explainable, editable (fit attributes + weighted engagement) — and
-- leave a PREDICTED score (an LP model over engagement history) as a later slice that
-- coexists, never silently replacing the rule score. The score becomes a shared
-- signal read by routing (ADR-0024), journeys (ADR-0073), and forecasting (#316).
--
-- One new silver table, `lead_score`:
--
--   * one CURRENT score per (contact, kind) — `kind` is 'rule' (this slice) or
--     'predicted' (the later LP slice, #402), so a contact can carry BOTH at once and
--     neither overwrites the other. UNIQUE(contact_id, kind) makes the writer's upsert
--     idempotent: re-scoring a contact UPDATEs its row rather than appending history.
--     (History/trend is a forecast_snapshot-style derived table if ever needed; v1
--     keeps the current value only.)
--   * `score` numeric — the resolved 0..100 value (the band cold/warm/hot is derived
--     in the app, lib/lead-score.ts, not stored).
--   * `breakdown` jsonb — the per-rule contributions that sum to the score (fit +
--     engagement components, each with its label/points/weight). This is what makes
--     the rule score EXPLAINABLE (ADR-0073 decision 5): the UI shows WHY, and an
--     editor can tune the weights. Shape validated in the app, not the DB.
--   * `computed_at` — when the score was last (re)computed; `created_at` = first seen.
--
-- WHO writes it: the score is a PROCESS output (ADR-0042) — the backend/LP scoring
-- pass computes the rule from `contact` fit fields + the `interaction` engagement
-- timeline and UPSERTs the row; the front end (ADR-0042) only READS it. This migration
-- adds the rule engine's STORAGE; the pure rule computation ships alongside as
-- lib/lead-score.ts so the surface can preview a score, and the backend reuses the
-- same weights when it persists.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets. The score is a derived signal, not new
-- PII — contact identity stays on `contact` (the score references it by id).

BEGIN;

-- ── lead_score: the shared lead signal (ADR-0073 decision 5) ──────────────────────
CREATE TABLE IF NOT EXISTS lead_score (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'rule'
                CHECK (kind IN ('rule', 'predicted')),
  score       numeric NOT NULL DEFAULT 0
                CHECK (score >= 0 AND score <= 100),
  breakdown   jsonb,                       -- per-rule contributions (fit + engagement)
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- One CURRENT score per (contact, kind): the rule and predicted scores coexist, and
  -- re-scoring UPDATEs in place (idempotent writer upsert) rather than appending.
  CONSTRAINT lead_score_contact_kind_uq UNIQUE (contact_id, kind)
);
COMMENT ON TABLE lead_score IS
  'Rule-based (and later predicted) lead score per contact (ADR-0073 decision 5, #401). Fit + weighted engagement → score 0..100 with an explainable breakdown jsonb. One CURRENT row per (contact, kind=rule|predicted) — both coexist, re-scoring upserts. WRITTEN by the backend/LP scoring pass (ADR-0042, a process); the front end reads it. A shared signal for routing (ADR-0024), journeys (ADR-0073), forecasting (#316).';
COMMENT ON COLUMN lead_score.score IS
  'Resolved score 0..100. The band (cold/warm/hot) is derived in the app (lib/lead-score.ts), not stored.';
COMMENT ON COLUMN lead_score.breakdown IS
  'Per-rule contributions summing to the score (fit + engagement components, each label/points/weight) — the EXPLAINABLE trace (ADR-0073 decision 5). Shape validated in the app, not the DB.';
COMMENT ON COLUMN lead_score.kind IS
  'rule = deterministic fit+engagement (this slice); predicted = LP model over engagement history (#402, coexists — never silently replaces the rule score).';

-- Routing/list reads rank contacts by their current rule score (ADR-0024).
CREATE INDEX IF NOT EXISTS idx_lead_score_kind_score ON lead_score (kind, score DESC);
-- Fetch a contact's score(s) on the 360 / leads list.
CREATE INDEX IF NOT EXISTS idx_lead_score_contact ON lead_score (contact_id);

-- ── Grants: app reads; backend/pipeline write the score (ADR-0042) ────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON lead_score TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON lead_score TO "mgid-imperioncrmbackendfunction";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON lead_score TO "mgid-imperioncrmpipeline";
  END IF;
END $$;

COMMIT;
