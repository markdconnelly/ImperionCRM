-- Communications timeline (ADR-0011, CLAUDE.md §4). Turn `interaction` into the
-- universal, multi-channel lifetime-history stream: every email, Teams/SMS/WhatsApp
-- message, call, meeting (transcript + summary), in-person Plaud note, and
-- Facebook/YouTube/LinkedIn touch lands here. A comm is related *first to the
-- employee* whose connection produced it (owner_user_id) and then to the company.
-- Idempotent and transactional.
--
-- Enum note: PostgreSQL ≥12 (target is 18) allows ALTER TYPE … ADD VALUE inside a
-- transaction, but a value added here may not be *used* until the txn commits — any
-- seed that uses the new values lives in a later migration (0026).

BEGIN;

-- ── Additional first-class interaction sources ──────────────────────────────
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'youtube';
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'linkedin';
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'phone_call';
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'in_person';
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'web_form';

-- ── Timeline columns on interaction ─────────────────────────────────────────
ALTER TABLE interaction
  ADD COLUMN IF NOT EXISTS kind                 text,   -- comm shape (see comment below)
  ADD COLUMN IF NOT EXISTS subject              text,
  ADD COLUMN IF NOT EXISTS owner_user_id        uuid REFERENCES app_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_connection_id uuid,   -- FK wired in 0020 once `connection` exists
  ADD COLUMN IF NOT EXISTS external_ref         text;

COMMENT ON COLUMN interaction.kind IS
  'Comm shape: email|message|call|meeting|transcript|summary|social_post|social_comment|dm|ad_engagement|note.';
COMMENT ON COLUMN interaction.owner_user_id IS
  'Employee whose connection produced this comm — related first to the user, then to the company.';

-- ── Meeting follow-up action items ──────────────────────────────────────────
-- Extracted from a meeting interaction (transcript/summary). May be promoted into a
-- first-class task (source_task_id) without copying the description.
CREATE TABLE IF NOT EXISTS meeting_action_item (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES interaction(id) ON DELETE CASCADE,
  account_id     uuid REFERENCES account(id) ON DELETE CASCADE,
  contact_id     uuid REFERENCES contact(id) ON DELETE SET NULL,
  owner_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  description    text NOT NULL,
  status         text NOT NULL DEFAULT 'open',          -- open|done
  due_at         date,
  source_task_id uuid REFERENCES task(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE meeting_action_item IS 'Follow-ups captured from a meeting interaction; can be promoted to a task (ADR-0011).';

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interaction_kind        ON interaction(kind);
CREATE INDEX IF NOT EXISTS idx_interaction_owner       ON interaction(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_action_item_interaction ON meeting_action_item(interaction_id);
CREATE INDEX IF NOT EXISTS idx_action_item_contact     ON meeting_action_item(contact_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_action_item_updated ON meeting_action_item;
CREATE TRIGGER trg_action_item_updated BEFORE UPDATE ON meeting_action_item
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
