-- Consent ledger (ADR-0014), extended to gate inbound enrichment and ad targeting
-- (ADR-0025/0026). An append-only record of opt-in/opt-out per contact × channel,
-- with timestamp, source, and proof — defensible under TCPA/CAN-SPAM/GDPR. Current
-- consent is *derived* from the latest event, never stored as a mutable flag.
-- Idempotent and transactional.

BEGIN;

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE consent_channel AS ENUM
    ('email','sms','call_recording','data_enrichment','ad_targeting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_state AS ENUM ('opt_in','opt_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lawful basis for processing a contact's data (GDPR Art. 6). Referenced by the
-- consent ledger and by every enrichment fact (ADR-0025).
DO $$ BEGIN
  CREATE TYPE lawful_basis AS ENUM
    ('consent','legitimate_interest','contract','public_data');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Append-only ledger ──────────────────────────────────────────────────────
-- No updated_at trigger: rows are immutable (never updated or deleted) to preserve
-- evidentiary value. A change of mind is a NEW event.
CREATE TABLE IF NOT EXISTS consent_event (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  channel             consent_channel NOT NULL,
  state               consent_state NOT NULL,
  lawful_basis        lawful_basis NOT NULL DEFAULT 'consent',
  source              text,                             -- where/how consent was captured
  proof               jsonb,                            -- form id, IP, recording ref, etc.
  recorded_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE consent_event IS
  'Append-only consent ledger (ADR-0014); current consent derived via the current_consent view. Never UPDATE/DELETE.';

CREATE INDEX IF NOT EXISTS idx_consent_contact_channel_time
  ON consent_event(contact_id, channel, occurred_at DESC);

-- ── Derived current consent ─────────────────────────────────────────────────
-- Latest event wins per (contact, channel). Send-time and ad-use checks read this.
CREATE OR REPLACE VIEW current_consent AS
SELECT DISTINCT ON (contact_id, channel)
  contact_id, channel, state, lawful_basis, occurred_at
FROM consent_event
ORDER BY contact_id, channel, occurred_at DESC;

COMMIT;
