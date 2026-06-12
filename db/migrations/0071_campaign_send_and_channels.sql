-- 0071: Campaign Sends + the sms/acs channels (#236, sub-issue of #110 — ADR-0053 slice B).
--
-- A Campaign Send is ONE schedulable blast (ADR-0053 §4): channel email|sms,
-- recipients = an audience OR the linked event's registrants, a typed template
-- (jsonb: email {subject, bodyMarkdown, mergeFields[]} / sms {text}), and exactly
-- one of send_at (absolute) or event_offset_minutes (relative to the campaign's
-- linked event start; negative = before — e.g. -1440 = the T-1-day reminder).
--
-- Execution is backend-deferred, semantics decided now (§5): the backend executor
-- walks due sends, materializes recipients AT FIRE TIME, consent-gates per
-- recipient per channel via current_consent, sends via ACS, logs one outbound
-- interaction per recipient, updates counters, marks sent. Idempotent per
-- (send, contact). Until it exists, builders save/schedule; NOTHING fires.
--
-- Enum additions: campaign_platform += 'sms' (SMS campaigns), connection_provider
-- += 'acs' (the company-scoped Azure Communication Services credential, §6).
--
-- Grants (ADR-0053 grants note): the backend executor reads/writes campaign_send
-- and reads/writes event + event_registration (attendance/counters), reads
-- audience_member + current_consent (recipient materialization + consent gate).
-- current_consent SELECT was already granted in 0047; re-granting is harmless.
--
-- Idempotent and transactional (ADD VALUE IF NOT EXISTS values are not used
-- within this transaction).

BEGIN;

DO $$ BEGIN
  CREATE TYPE campaign_send_status AS ENUM ('draft','scheduled','sending','sent','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS campaign_send (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  channel              text NOT NULL CHECK (channel IN ('email','sms')),
  recipient_scope      text NOT NULL DEFAULT 'audience'
                         CHECK (recipient_scope IN ('audience','event_registrants')),
  audience_id          uuid REFERENCES audience(id) ON DELETE SET NULL,
  template             jsonb NOT NULL DEFAULT '{}'::jsonb,  -- typed: email {subject, bodyMarkdown, mergeFields[]} / sms {text}
  send_at              timestamptz,              -- absolute schedule
  event_offset_minutes integer,                  -- relative to the campaign's linked event start; negative = before
  status               campaign_send_status NOT NULL DEFAULT 'draft',
  queued_count         integer NOT NULL DEFAULT 0,
  sent_count           integer NOT NULL DEFAULT 0,
  delivered_count      integer NOT NULL DEFAULT 0,
  failed_count         integer NOT NULL DEFAULT 0,
  sent_at              timestamptz,
  created_by_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'draft'
         OR ((send_at IS NOT NULL)::int + (event_offset_minutes IS NOT NULL)::int = 1)),
  CHECK (recipient_scope <> 'audience' OR audience_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS campaign_send_due_idx ON campaign_send (send_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaign_send_campaign ON campaign_send (campaign_id);

ALTER TYPE campaign_platform   ADD VALUE IF NOT EXISTS 'sms';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'acs';

DROP TRIGGER IF EXISTS trg_campaign_send_updated ON campaign_send;
CREATE TRIGGER trg_campaign_send_updated BEFORE UPDATE ON campaign_send
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Backend executor grants (no-op if the role is absent; pattern of 0047) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON campaign_send, event, event_registration
      TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON audience, audience_member, current_consent
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping executor grants.';
  END IF;
END $$;

COMMIT;
