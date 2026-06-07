-- Lead-capture hooks (ADR-0024). Configured "hooks" that pull a new person into the
-- system from a web form, Facebook lead, YouTube comment, LinkedIn message, inbound
-- email, or QR — each capture lands raw (bronze), resolves to a contact, then kicks
-- enrichment + nurture. Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE lead_hook_kind AS ENUM
    ('web_form','facebook_lead','youtube_comment','linkedin_message','inbound_email','qr','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS lead_hook (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  kind               lead_hook_kind NOT NULL,
  config             jsonb,
  active             boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_capture_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_id        uuid REFERENCES lead_hook(id) ON DELETE SET NULL,
  payload_bronze jsonb,                                 -- raw inbound capture
  contact_id     uuid REFERENCES contact(id) ON DELETE SET NULL,
  account_id     uuid REFERENCES account(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'new',           -- new|resolved|ignored
  received_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE lead_capture_event IS 'Raw inbound lead captures; resolve to a contact, then start a profile + nurture (ADR-0024).';

CREATE INDEX IF NOT EXISTS idx_capture_event_hook   ON lead_capture_event(hook_id);
CREATE INDEX IF NOT EXISTS idx_capture_event_status ON lead_capture_event(status, received_at DESC);

DROP TRIGGER IF EXISTS trg_lead_hook_updated ON lead_hook;
CREATE TRIGGER trg_lead_hook_updated BEFORE UPDATE ON lead_hook
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_capture_event_updated ON lead_capture_event;
CREATE TRIGGER trg_capture_event_updated BEFORE UPDATE ON lead_capture_event
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
