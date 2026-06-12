-- 0070: Events + registration (#228, sub-issue of #109 — ADR-0053 slice A).
--
-- Events are first-class objects (ADR-0053 §1): the webinar/live-event builders create
-- an `event`; a campaign of any channel can point at the event it promotes
-- (`campaign.event_id`). Registration is lead capture (§2): the new `lead_hook_kind`
-- value `event_registration` lands signups in the existing capture inbox
-- (lead_capture_event, 0022); resolution links the contact and the registration row.
-- Attendance is recorded on the registration after the event. Funnel numbers
-- (registrations, attendance) are DERIVED from event_registration, never stored (§7).
--
-- Deliberately NOT here (sibling slices): campaign.workflow_id (#112 auto-enroll),
-- campaign_send + 'sms'/'acs' enum values (#110 sends).
--
-- Grants: app-owned tables — the web MI reads/writes via 0002's default privileges.
-- Backend executor grants land with the #110 sends migration where they're needed.
--
-- Idempotent (guarded types/columns, IF NOT EXISTS) and transactional, except the
-- enum value: ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
-- PG < 12 semantics for *use* in the same txn — it is fine to ADD VALUE inside a
-- txn on our PG (18) as long as this txn doesn't also USE the value, which it doesn't.

BEGIN;

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE event_kind AS ENUM ('webinar','live_event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft','scheduled','live','completed','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Event (the object campaigns promote) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS event (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               event_kind NOT NULL,
  name               text NOT NULL,
  description        text,
  status             event_status NOT NULL DEFAULT 'draft',
  starts_at          timestamptz,                -- required to leave draft (CHECK below)
  ends_at            timestamptz,
  timezone           text,
  capacity           integer,
  join_url           text,                       -- Teams meeting/webinar link (webinar)
  location           text,                       -- venue (live_event)
  registration_page  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- typed registration-page config {headline, blurb, fields[]}
  workflow_id        uuid REFERENCES workflow(id) ON DELETE SET NULL,  -- auto-enroll registrants (#112 wiring)
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'draft' OR starts_at IS NOT NULL)
);

-- ── Event registration (one row per signup; attendance recorded post-event) ──
CREATE TABLE IF NOT EXISTS event_registration (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  contact_id       uuid REFERENCES contact(id) ON DELETE SET NULL,
  capture_event_id uuid REFERENCES lead_capture_event(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'registered'
                     CHECK (status IN ('registered','attended','no_show','canceled')),
  source           text,                         -- which hook/channel brought them
  registered_at    timestamptz NOT NULL DEFAULT now(),
  checked_in_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_registration_contact_uniq
  ON event_registration (event_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registration_event ON event_registration (event_id);

-- ── Campaigns promote events ────────────────────────────────────────────────
ALTER TABLE campaign
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES event(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_event ON campaign (event_id);

-- ── Registration is lead capture (ADR-0053 §2) ──────────────────────────────
ALTER TYPE lead_hook_kind ADD VALUE IF NOT EXISTS 'event_registration';

-- ── updated_at triggers (0001 convention) ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_event_updated ON event;
CREATE TRIGGER trg_event_updated BEFORE UPDATE ON event
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_event_registration_updated ON event_registration;
CREATE TRIGGER trg_event_registration_updated BEFORE UPDATE ON event_registration
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
