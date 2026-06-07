-- Discovery call engagement (ADR-0023). Owned by the ACCOUNT (company); the contact
-- is only recorded as the employee who participated in this instance. The eight
-- discovery data points are captured as answers (engagement_answer) to the active
-- discovery question_template, so the question set stays editable and answers are not
-- duplicated here. This record holds the call metadata, verdict, and the locked next
-- step. Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE discovery_verdict AS ENUM ('fit','not_fit','nurture');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS discovery_call (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,   -- owning company
  opportunity_id      uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  contact_id          uuid REFERENCES contact(id) ON DELETE SET NULL,           -- client employee instance
  conducted_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,         -- Imperion rep
  template_id         uuid REFERENCES question_template(id) ON DELETE SET NULL, -- question set version used
  status              text NOT NULL DEFAULT 'scheduled',  -- scheduled|completed|cancelled
  held_at             timestamptz,
  verdict             discovery_verdict,
  verdict_reason      text,
  next_step           text,
  sbr_cadence         text,                               -- monthly|quarterly (mandated on the call)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE discovery_call IS 'Discovery engagement, account-scoped; 8 captures live in engagement_answer (ADR-0023).';

CREATE INDEX IF NOT EXISTS idx_discovery_account ON discovery_call(account_id);
CREATE INDEX IF NOT EXISTS idx_discovery_verdict ON discovery_call(verdict);

DROP TRIGGER IF EXISTS trg_discovery_call_updated ON discovery_call;
CREATE TRIGGER trg_discovery_call_updated BEFORE UPDATE ON discovery_call
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
