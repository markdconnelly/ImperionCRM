-- 0065: M365 mail/Teams bronze tables (issue #182 — v1 gate 6, the lead loop).
--
-- The on-prem local pipeline's communication collectors are built and waiting
-- (local-pipeline Get-ImperionM365Mail / …TeamsChat / …TeamsMeeting, blocked
-- local issue #100): they pull cross-org Imperion<->client mail, Teams chats,
-- and Teams meetings via Graph/GDAP, filter the noise, and flatten to the
-- standard local-pipeline bronze envelope. The tables they write don't exist —
-- this migration adds them, following 0038's contract exactly (ADR-0039
-- per-source bronze; local-pipeline envelope per that repo's CLAUDE.md §5/§6):
-- flat columns are text (loader stringifies; true types live in raw_payload),
-- PK (tenant_id, source, external_id), lossless raw payload + content hash.
--
-- Flat columns mirror the collectors' flat-table output 1:1, with one rename:
-- the Teams collectors' `user` property lands in `user_upn` (reserved keyword).
-- Sources written: 'm365_email' (mail) and 'm365_teams' (chats + meetings).
--
-- Grants (0044/0055 posture — writer gets idempotent-upsert rights, never
-- DELETE; consumers get SELECT):
--   imperion-localpipeline          SELECT, INSERT, UPDATE  (the bulk writer)
--   mgid-imperioncrmpipeline        SELECT                  (bronze→silver merge)
--   mgid-imperioncrmbackendfunction SELECT                  (interaction-timeline ingestion)
-- The web role inherits SELECT via 0002's default privileges.
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Mail (source 'm365_email') — Get-ImperionM365Mail ───────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_mail_messages (
  mailbox text, subject text, from_address text, from_name text,
  to_addresses text, cc_addresses text, received_date_time text, sent_date_time text,
  conversation_id text, has_attachments text, importance text, is_read text, web_link text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Teams chats (source 'm365_teams') — Get-ImperionM365TeamsChat ───────────────────────
CREATE TABLE IF NOT EXISTS m365_teams_chats (
  user_upn text, topic text, chat_type text, member_emails text, member_names text,
  created_date_time text, last_updated_date_time text, web_url text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Teams meetings (source 'm365_teams') — Get-ImperionM365TeamsMeeting ─────────────────
CREATE TABLE IF NOT EXISTS m365_teams_meetings (
  user_upn text, subject text, organizer_address text, attendee_addresses text,
  start_date_time text, end_date_time text, is_online_meeting text,
  online_meeting_provider text, join_url text, is_cancelled text, web_link text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- Conversation/thread lookups for the silver interaction merge.
CREATE INDEX IF NOT EXISTS ix_m365_mail_messages_conversation ON m365_mail_messages (conversation_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON m365_mail_messages, m365_teams_chats, m365_teams_meetings
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON m365_mail_messages, m365_teams_chats, m365_teams_meetings
      TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON m365_mail_messages, m365_teams_chats, m365_teams_meetings
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;
END $$;

COMMIT;
