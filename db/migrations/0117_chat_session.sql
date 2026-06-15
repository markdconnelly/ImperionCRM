-- 0117 chat_session + deflection telemetry — Imperion-native service-desk data ONLY
-- (ADR-0074 decisions 4/5/6, issue #403, epic #320 · parent #314).
-- Migration number 0117 claimed at merge (concurrency contract §10.3): a rebased branch
-- takes the next free number just before squash; if another migration merges during the
-- CI window, renumber the file (rename is data-safe) and fix the in-file refs + data-model.md
-- + the OKF concept timestamp.
--
-- THE SCOPE BOUNDARY (ADR-0074, RATIFIED): Autotask is the ticket system of record;
-- Imperion documents back via the Autotask API and reads its own write-backs natively
-- through the existing pull (bronze `autotask_tickets` mig 0038 → silver `ticket`). So
-- Imperion keeps a native table ONLY for data that is NOT ticket-resident and has nowhere
-- to round-trip to. ADR-0074 §5 names exactly two such things: a PRE-TICKET chat session,
-- and DEFLECTION TELEMETRY (a conversation that never became a ticket). Those are this
-- migration. Deliberately NOT created here (ADR-0074 §1/§2/§3):
--   * NO `sla_state` source-of-record table — SLA breach is a read-model PROJECTION over
--     silver `ticket`, refreshed by the pipeline, not an authoritative store.
--   * NO standalone `csat` store — CSAT is written back to the Autotask ticket (note/UDF)
--     and round-trips into bronze→silver; native only if Autotask genuinely cannot hold it
--     (default = not created, and Autotask can, so it is not).
--
-- ONE new silver table, `chat_session` (archetype B — single-source-of-record silver, born
-- silver; the app IS the SoR for a conversation Autotask never sees):
--
--   * Lifecycle `status` — bot → live → (deflected | escalated | closed). A bot answer
--     grounded in gold knowledge (ADR-0041) either deflects (self-served, no ticket) or
--     escalates (creates an Autotask ticket via the API and hands over the transcript).
--   * Channel — which inbound surface the session arrived on (web chat / social / email …),
--     so the unified routing view (ADR-0074 §6, coordinated with ICM service-desk #280) can
--     fold chat into one queue without a second router.
--   * `account_id` / `contact_id` — nullable FKs with ON DELETE SET NULL: a pre-ticket
--     session often starts anonymous (we may not know who it is yet), and deleting the
--     contact/account must not delete the telemetry, so the link is severable, not a CASCADE.
--   * DEFLECTION TELEMETRY (ADR-0074 §4, the deflection-rate metric source) lives as
--     columns ON this row, matching the ADR table sketch (`deflected bool`): `deflected`
--     (resolved without a ticket), `deflection_kind` (HOW — self-served vs bot-resolved),
--     and a denormalized `had_ticket` derived from `escalated_ticket_ref`. The chatbot
--     deflection rate on the BI hub (ADR-0062) is COUNT(deflected) / COUNT(*) over a window.
--   * `escalated_ticket_ref` text — the Autotask ticket id once the session escalates
--     (text, because the id belongs to Autotask, not us — no FK into silver `ticket`,
--     which may not have pulled the new ticket yet: read-after-write lag, ADR-0074
--     consequences). A session is EITHER deflected XOR escalated XOR still open/closed.
--   * `transcript_uri` / `summary` — pointer to the stored transcript (blob, written by the
--     backend chat process) + an optional short summary for the timeline/routing card. The
--     transcript body is NOT inlined here (it may carry PII; it lives in governed blob).
--
-- WHO writes it: a PROCESS output (ADR-0042) — the BACKEND runs the chatbot/live-chat and
-- writes the session + deflection outcome; the PIPELINE may touch it on refresh; the FRONT
-- END only READS (a read model + honest-empty fallback ships alongside, lib not surface —
-- the chat console is #407/#404, out of scope here). Hence the grants below.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT prod-applied
-- until Mark runs it. No secrets. PII (the transcript) is held by reference in governed
-- blob, never inlined in a row here.

BEGIN;

-- ── chat_session: pre-ticket / bot conversation + deflection telemetry (ADR-0074 §5) ──
CREATE TABLE IF NOT EXISTS chat_session (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable links: a pre-ticket session is often anonymous; SET NULL so deleting the
  -- contact/account severs the link without destroying the deflection telemetry.
  account_id           uuid REFERENCES account(id) ON DELETE SET NULL,
  contact_id           uuid REFERENCES contact(id) ON DELETE SET NULL,
  -- Lifecycle (ADR-0074 §4): a session starts as bot, may go live (human), and ends
  -- deflected (no ticket), escalated (became an Autotask ticket), or closed.
  status               text NOT NULL DEFAULT 'bot'
                         CHECK (status IN ('bot', 'live', 'deflected', 'escalated', 'closed')),
  -- Inbound surface, so the unified routing view can fold chat into one queue (ADR-0074 §6).
  channel              text NOT NULL DEFAULT 'web_chat'
                         CHECK (channel IN ('web_chat', 'social', 'email', 'sms', 'voice', 'other')),
  -- ── Deflection telemetry (ADR-0074 §4 — the chatbot-deflection-rate metric source) ──
  deflected            boolean NOT NULL DEFAULT false,   -- resolved WITHOUT creating a ticket
  deflection_kind      text
                         CHECK (deflection_kind IN ('self_served', 'bot_resolved')),
  -- The Autotask ticket id once the session escalates (text — Autotask owns the id; no FK
  -- into silver `ticket`, which may not have pulled it yet: read-after-write lag).
  escalated_ticket_ref text,
  -- Denormalized convenience flag for the BI-hub deflection-rate split (derived from
  -- escalated_ticket_ref by the writer; a session that escalated produced a ticket).
  had_ticket           boolean NOT NULL DEFAULT false,
  -- Transcript by reference (governed blob, written by the backend) + optional summary for
  -- the timeline/routing card. The transcript body is NOT inlined (PII stays in blob).
  transcript_uri       text,
  summary              text,
  started_at           timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  -- A session that records a ticket ref must be flagged as escalated/had_ticket and cannot
  -- also be deflected: deflection and escalation are mutually exclusive outcomes.
  CONSTRAINT chat_session_outcome_chk CHECK (NOT (deflected AND escalated_ticket_ref IS NOT NULL))
);

COMMENT ON TABLE chat_session IS
  'Imperion-NATIVE pre-ticket live-chat/bot session + deflection telemetry (ADR-0074 §5, #403). The ONLY service-desk data Imperion stores natively: a conversation that is not ticket-resident (Autotask is the ticket SoR; ticket-resident data round-trips Autotask API → bronze → silver). Lifecycle bot→live→deflected|escalated|closed; deflection columns are the chatbot-deflection-rate source (ADR-0062 BI hub). WRITTEN by the backend chat process (ADR-0042, a process); the front end reads it. NO sla_state SoR, NO standalone csat store (those round-trip through Autotask).';
COMMENT ON COLUMN chat_session.status IS
  'bot = answered by the gold-grounded bot; live = handed to a human; deflected = resolved with no ticket; escalated = created an Autotask ticket (escalated_ticket_ref); closed = ended.';
COMMENT ON COLUMN chat_session.deflected IS
  'TRUE when the session was resolved without creating a ticket (ADR-0074 §4). Deflection rate = COUNT(deflected)/COUNT(*) over a window on the BI hub (ADR-0062).';
COMMENT ON COLUMN chat_session.deflection_kind IS
  'How it deflected: self_served (the user found their answer) vs bot_resolved (the bot answered). NULL when not deflected.';
COMMENT ON COLUMN chat_session.escalated_ticket_ref IS
  'The Autotask ticket id once escalated (text — Autotask owns the id; no FK into silver ticket, which may not have pulled the new ticket yet: read-after-write lag, ADR-0074).';
COMMENT ON COLUMN chat_session.transcript_uri IS
  'Pointer to the stored transcript (governed blob, written by the backend). The transcript body is NOT inlined here — it may carry PII.';

-- BI-hub deflection-rate + routing reads scan recent sessions by recency / deflection.
CREATE INDEX IF NOT EXISTS idx_chat_session_started ON chat_session (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session_deflected ON chat_session (deflected, started_at DESC);
-- Open/active sessions for the routing queue.
CREATE INDEX IF NOT EXISTS idx_chat_session_status ON chat_session (status);
-- A contact's chat history on the 360 timeline.
CREATE INDEX IF NOT EXISTS idx_chat_session_contact ON chat_session (contact_id);

-- ── Grants: app reads; backend/pipeline write the session (ADR-0042 / ADR-0074 §7) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON chat_session TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON chat_session TO "mgid-imperioncrmbackendfunction";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON chat_session TO "mgid-imperioncrmpipeline";
  END IF;
END $$;

COMMIT;
