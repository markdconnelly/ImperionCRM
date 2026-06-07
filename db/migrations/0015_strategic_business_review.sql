-- Strategic Business Review (ADR-0023) — the recurring (~quarterly) relationship
-- cadence. Owned by the ACCOUNT (company); the contact is just the employee present at
-- that instance. Each SBR benchmarks against a prior assessment, re-scores the six
-- dimensions for the period (sbr_dimension_score — a time series, not a duplicate),
-- pulls in ticket history for the period (sbr_ticket — references, not copies), and
-- records concerns and next actions. Idempotent and transactional.

BEGIN;

CREATE TABLE IF NOT EXISTS strategic_business_review (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,   -- owning company
  contact_id            uuid REFERENCES contact(id) ON DELETE SET NULL,           -- client employee instance
  conducted_by_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,          -- Imperion lead
  benchmark_assessment_id uuid REFERENCES assessment(id) ON DELETE SET NULL,      -- baseline benchmarked against
  review_date           date NOT NULL,
  period_label          text,                              -- e.g. '2026-Q3'
  status                text NOT NULL DEFAULT 'scheduled', -- scheduled|completed
  concerns              text,
  summary               text,
  next_actions          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE strategic_business_review IS 'Quarterly SBR, account-scoped; benchmarks an assessment over time (ADR-0023).';

CREATE INDEX IF NOT EXISTS idx_sbr_account ON strategic_business_review(account_id);

-- Periodic re-score of the six dimensions for this SBR (trend vs the benchmark).
CREATE TABLE IF NOT EXISTS sbr_dimension_score (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sbr_id      uuid NOT NULL REFERENCES strategic_business_review(id) ON DELETE CASCADE,
  dimension   text NOT NULL,                       -- identity, endpoint, network, email, backup, incident
  rating      assessment_rating,                   -- reuses the assessment rating scale (ADR-0022)
  note        text,
  UNIQUE (sbr_id, dimension)
);

-- Ticket history considered at this SBR — references existing tickets, no copying.
CREATE TABLE IF NOT EXISTS sbr_ticket (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sbr_id      uuid NOT NULL REFERENCES strategic_business_review(id) ON DELETE CASCADE,
  ticket_id   uuid NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  UNIQUE (sbr_id, ticket_id)
);

DROP TRIGGER IF EXISTS trg_sbr_updated ON strategic_business_review;
CREATE TRIGGER trg_sbr_updated BEFORE UPDATE ON strategic_business_review
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
