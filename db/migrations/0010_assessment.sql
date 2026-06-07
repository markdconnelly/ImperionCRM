-- AI Security Readiness Assessment — the paid engagement that GATES managed services
-- (ADR-0022). "We begin every relationship with an AI Security Readiness Assessment."
-- Scores six dimensions (At Risk / Needs Work / Solid / Strong); one-time fee that is
-- credited toward onboarding on conversion. Tied to an account (and optionally the
-- opportunity that sold it). The remediation roadmap is realized as the delivery
-- project's milestones (ADR-0020), not stored here. Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE assessment_status AS ENUM
    ('proposed','scheduled','in_progress','delivered','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_rating AS ENUM ('at_risk','needs_work','solid','strong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS assessment (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  opportunity_id        uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  name                  text NOT NULL,
  status                assessment_status NOT NULL DEFAULT 'proposed',
  fee_amount            numeric,                       -- one-time engagement fee
  credit_to_onboarding  boolean NOT NULL DEFAULT true, -- fee credited toward onboarding on conversion

  -- The six-dimension scorecard (null = not yet scored)
  identity_rating       assessment_rating,             -- Identity Security
  endpoint_rating       assessment_rating,             -- Endpoint Security
  network_rating        assessment_rating,             -- Network Segmentation
  email_rating          assessment_rating,             -- Email & Collaboration Security
  backup_rating         assessment_rating,             -- Backup & Recovery
  incident_rating       assessment_rating,             -- Incident Readiness

  top_priorities        text,                          -- ranked top-three priorities (plain language)
  recommendation        text,                          -- e.g. "Managed services + SOC monitoring"
  report_url            text,                          -- written report / scorecard deliverable
  notes                 text,
  kickoff_at            date,                          -- scheduled kickoff
  delivered_at          timestamptz,                   -- set when status -> delivered/closed
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE assessment IS 'Paid AI Security Readiness Assessment; six rated dimensions; gates managed services (ADR-0022).';

CREATE INDEX IF NOT EXISTS idx_assessment_account ON assessment(account_id);
CREATE INDEX IF NOT EXISTS idx_assessment_status  ON assessment(status);

DROP TRIGGER IF EXISTS trg_assessment_updated ON assessment;
CREATE TRIGGER trg_assessment_updated BEFORE UPDATE ON assessment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
