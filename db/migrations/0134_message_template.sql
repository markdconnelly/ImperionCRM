-- 0134 message-template store — render-content for marketing journey sends
-- (issue #731, FE ADR-0073; unblocks backend journey-send rendering BE #174 / ADR-0068).
-- Migration number 0134 pre-assigned; claimed at merge (concurrency contract §10.3) —
-- a rebased branch takes the next free number just before squash; rename is data-safe.
--
-- WHY. A journey send step (ADR-0073) carries a free-text `templateId` (and per A/B
-- variant `templateId`). The backend journey runner (BE #174) resolves recipient +
-- from-connection but leaves `renderTemplate` returning null — there was no store to
-- render subject/html (email) or body (sms) from. This table IS that store: a named,
-- channel-typed, id-referenceable message template. A/B variants do NOT need their own
-- store — each variant's `templateId` simply references a row here.
--
-- SHAPE. Deliberately consistent with `campaign_send.template` jsonb (0071):
--   email → subject + html (rich) | sms → body (text). Both kept as plain columns
--   (nullable, channel-gated by CHECK) rather than a jsonb blob, because a template is
--   addressable by id and queried directly — unlike the inline `campaign_send.template`
--   which is one blast's embedded copy. The journey runner renders against this contract:
--     email: { subject, html }   sms: { body }
--   keyed by message_template.id (the value journey step/variant `templateId` holds).
--
-- CLASSIFICATION. This is an APP/CONFIG table (internal authored content), NOT a silver
-- entity ingested from an external source — so no OKF concept file / coverage-matrix row
-- (ADR-0086 applies to the silver tier only). No PII: templates are merge-field shells,
-- not per-recipient rendered output.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). Merges DORMANT —
-- NOT prod-applied until Mark runs it. No secrets. The web role gets full CRUD (authored
-- in the GUI); the backend runner gets SELECT (it renders, never writes).

BEGIN;

CREATE TABLE IF NOT EXISTS message_template (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  channel            text NOT NULL CHECK (channel IN ('email','sms')),
  -- email content (rendered as subject + html); null on sms templates.
  subject            text,
  html               text,
  -- sms content (rendered as body); null on email templates.
  body               text,
  -- merge-field names referenced by the content (e.g. {{firstName}}) — advisory, for the
  -- composer + the runner's substitution map. Stored as a text[] (mirrors campaign_send's
  -- mergeFields[]); empty = none declared.
  merge_fields       text[] NOT NULL DEFAULT '{}',
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- channel-gated content: an email template needs a subject; an sms template needs a body.
  CHECK (channel <> 'email' OR subject IS NOT NULL),
  CHECK (channel <> 'sms'   OR body    IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_message_template_channel ON message_template (channel);
CREATE INDEX IF NOT EXISTS idx_message_template_created ON message_template (created_at DESC);

DROP TRIGGER IF EXISTS trg_message_template_updated ON message_template;
CREATE TRIGGER trg_message_template_updated BEFORE UPDATE ON message_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Backend journey-runner grant (renders content; SELECT only — no-op if role absent) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON message_template TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping runner grant.';
  END IF;
END $$;

COMMIT;
