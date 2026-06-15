-- 0101 in-app notifications + per-trigger channel prefs (ADR-0064 A3, issue #332)
--
-- PM collaboration A3 (ADR-0064): an in-app notification centre (the bell) plus
-- the recipient store the BACKEND fans out from. Recipients are the people on the
-- work object — the watchers/assignees in `work_assignment` (B3 / migration 0099,
-- now prod-applied) and @mentioned users (0097). A notification is written when a
-- relevant work event happens (assigned / @mentioned / commented); the GUI reads
-- the bell straight off this table (ADR-0042 — direct DB reads for rendering are
-- fine), while the OUTBOUND fan-out to email/Teams via Power Automate and the
-- scheduled due-soon/overdue evaluation are BACKEND processes (ADR-0064: "the
-- front end never holds a provider key"). This slice ships the in-app surface
-- before the outbound channel is wired — it degrades gracefully (house style).
--
-- Two tables, both keyed on the EMPLOYEE'S app_user (notifications are internal —
-- never a client/contact):
--   * notification        — one row per (recipient, event). payload jsonb carries
--                           the render context (e.g. title, the actor's display
--                           name). read_at NULL = unread (drives the bell badge).
--   * notification_pref    — per-user, per-kind, per-channel enable flag. ABSENCE
--                           of a row means "use the default": in-app ON, outbound
--                           channels the backend's default. Muting a trigger =
--                           an explicit enabled=false row (acceptance: "muting a
--                           trigger suppresses it"). The in-app channel is always
--                           recorded so the bell honours a mute even before the
--                           backend exists.
--
-- The `kind` set mirrors the ADR-0064 A3 triggers: assigned | mentioned |
-- commented | due_soon | overdue | blocked. parent_type/parent_id locate the work
-- object for the deep-link (acceptance: "bell deep-links to the item"); no DB-level
-- FK on parent_id (polymorphic — same tradeoff as work_comment/work_assignment).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here (recipients are
-- employees; payload carries no contact data).
--
-- `task`/`project` are app-native operational state (not ingested silver entities
-- with a source-of-record contract — same as work_comment / work_assignment /
-- work_attachment), so the OKF semantic-layer gate does not apply: there is no
-- concept file for `notification` / `notification_pref`.

BEGIN;

-- ── notification: one row per (recipient employee, work event) ────────────────
-- recipient_user_id FKs app_user (CASCADE: removing an employee clears their
-- inbox). kind is the trigger; payload jsonb is the pre-rendered context the bell
-- shows without re-joining (e.g. {"title": "...", "actor": "Ada Lovelace"}).
-- read_at NULL = unread. created_at orders the bell newest-first.
CREATE TABLE IF NOT EXISTS notification (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind              text NOT NULL
                      CHECK (kind IN ('assigned', 'mentioned', 'commented',
                                      'due_soon', 'overdue', 'blocked')),
  parent_type       text NOT NULL
                      CHECK (parent_type IN ('task', 'project', 'milestone')),
  parent_id         uuid NOT NULL,                       -- the work object to deep-link to
  actor_user_id     uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- who triggered it (null = system, e.g. due-soon)
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,  -- pre-rendered render context (no PII)
  read_at           timestamptz,                         -- NULL = unread (drives the bell badge)
  created_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE notification IS
  'In-app notification to an EMPLOYEE (ADR-0064 A3, #332). One row per (recipient, work event); kind = assigned|mentioned|commented|due_soon|overdue|blocked. parent_type+parent_id locate the work object for the deep-link (no FK — polymorphic). read_at NULL = unread. The bell reads this table directly; the backend fans out to email/Teams via Power Automate (no provider key in the FE). No client PII (recipients are employees; payload carries no contact data).';

-- Bell read: a user''s unread (then recent) notifications, newest-first.
CREATE INDEX IF NOT EXISTS idx_notification_recipient
  ON notification (recipient_user_id, created_at DESC);
-- Fast unread badge count (partial index over the unread rows only).
CREATE INDEX IF NOT EXISTS idx_notification_unread
  ON notification (recipient_user_id)
  WHERE read_at IS NULL;

-- ── notification_pref: per-user, per-kind, per-channel enable flag ────────────
-- ABSENCE of a row = use the default (in-app ON). An explicit enabled=false row
-- mutes that trigger on that channel. channel = in_app (the bell) | email | teams
-- (the backend honours email/teams; the FE honours in_app). PK makes a toggle an
-- upsert. ON DELETE CASCADE clears a removed user''s prefs.
CREATE TABLE IF NOT EXISTS notification_pref (
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind        text NOT NULL
                CHECK (kind IN ('assigned', 'mentioned', 'commented',
                                'due_soon', 'overdue', 'blocked')),
  channel     text NOT NULL CHECK (channel IN ('in_app', 'email', 'teams')),
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, channel)
);
COMMENT ON TABLE notification_pref IS
  'Per-user, per-kind, per-channel notification enable flag (ADR-0064 A3, #332). Absence of a row = default (in-app ON); an explicit enabled=false row mutes that trigger on that channel (acceptance: "muting a trigger suppresses it"). channel: in_app (the bell, honoured by the FE) | email | teams (honoured by the backend dispatcher). PK (user_id,kind,channel) makes a toggle an upsert.';

COMMIT;
