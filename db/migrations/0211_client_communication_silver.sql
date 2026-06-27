-- 0211: client_communication silver — unified, client-scoped comms history (#1369, epic #1366, ADR-0126).
--
-- Migration number 0211 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHAT THIS IS. The silver entity that captures direct client<->employee communications as
-- ONE unified, client-scoped history across channels — email, Teams chats, Teams meetings,
-- and social-media DMs (ADR-0126). It is the FILTERED projection of Imperion's OWN-tenant
-- comms: only messages that touch a DB client (via account_domain + onboarded contacts) are
-- retained; internal/non-client traffic is dropped. data_class = client_pii.
--
-- WHY A NEW ENTITY (not the existing `interaction`, ADR-0011). `interaction` is the rich,
-- unfiltered, multi-purpose Contact-360 timeline (it carries bronze/silver/gold payloads,
-- meeting drill-downs, ad engagements, notes, and is the research substrate for every
-- workflow). `client_communication` is a DIFFERENT, narrower contract: the defensible
-- client-relationship comms ledger, defined BY its filter rule and deliberately PII-minimal
-- (subject + snippet only, NEVER message bodies — ADR-0126 privacy posture). Keeping it
-- distinct lets the filter rule be the entity's reason for existing and lets the read GUI
-- render a clean per-account comms history without conflating with the broader timeline.
--
-- THE FILTER RULE (the entity's defining contract; the MERGE that applies it co-locates with
-- ingestion per ADR-0026 and is a sibling LP/Pipeline follow-up — NOT built here):
--   A raw home-tenant message is retained as a client_communication iff ANY of its non-Imperion
--   participant addresses (from/to/cc; chat/meeting members) resolves to a DB client by:
--     (1) email-domain match against `account_domain.domain` (the GUI-curated per-account
--         domain list, mig 0081 / #1368), OR
--     (2) exact address match against an onboarded `contact` email for an account.
--   The resolved `account_id` (and `contact_id` when a single contact matches) is stamped on
--   the silver row. Imperion's own domains are excluded from the "client participant" test so
--   purely-internal threads never match. See docs/database/client-communication-filter.md.
--
-- ARCHETYPE B (single-source-of-record silver, born from the filtered merge — the `interaction`
-- neighbor). Idempotency: UNIQUE (channel, source_system, external_id) is the merge upsert key
-- (idempotent replace-from-source, ADR-0026). content_hash carries change detection.
--
-- GRANTS (ADR-0042 §1: web reads for render; the ingesting plane writes the merge — per
-- ADR-0026 the LP/cloud-pipeline identity owns bronze->silver; backend reads for agent
-- grounding). Defensive DO $$ … pg_roles … $$ idiom (roles may be absent on CI / fresh DBs)
-- per 0210/0158. Frontend-owned schema (ADR-0042 §1). NO message bodies, no secrets. Additive,
-- idempotent (IF NOT EXISTS / enum guards), transactional. NOT prod-applied until merge (each
-- prod apply is Mark-gated, §10.3).

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────────
-- The unified channel the message arrived on. social_dm folds Meta Messenger/IG DMs (ADR-0124)
-- into the same client-comms history (ADR-0126 #3). New channels (e.g. a future business-SMS)
-- ride in by extending this enum.
DO $$ BEGIN
  CREATE TYPE client_communication_channel AS ENUM
    ('email', 'teams_chat', 'teams_meeting', 'social_dm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Relative to Imperion: inbound = client -> employee, outbound = employee -> client.
-- 'internal' is intentionally ABSENT — internal traffic is filtered OUT, never stored here.
DO $$ BEGIN
  CREATE TYPE client_communication_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── client_communication — filtered, client-scoped, cross-channel comms ───────
CREATE TABLE IF NOT EXISTS client_communication (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHO (the client this message belongs to — stamped by the filter rule on merge).
  account_id        uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,   -- the matched DB client
  contact_id        uuid REFERENCES contact(id) ON DELETE SET NULL,           -- the matched client contact, when a single one resolves

  -- WHAT channel / which way.
  channel           client_communication_channel NOT NULL,
  direction         client_communication_direction NOT NULL,

  -- PARTICIPANTS (addresses/handles only — minimal PII; no display-name fan-out beyond what a
  -- header carries). client_participants = the matched client side; imperion_participants = the
  -- employee side. text[] keeps a thread's multiple addresses without a child table.
  client_participants    text[] NOT NULL DEFAULT '{}',
  imperion_participants  text[] NOT NULL DEFAULT '{}',

  -- CONTENT (DELIBERATELY MINIMAL — ADR-0126 privacy posture). subject + a short snippet only;
  -- the full body is NEVER stored here (the rich timeline/transcript lives in `interaction` /
  -- object storage). snippet is a truncated preview for the history list.
  subject           text,
  snippet           text,

  -- WHEN.
  occurred_at       timestamptz NOT NULL,                                     -- message/meeting time (timeline position)

  -- PROVENANCE / idempotency (ADR-0026 replace-from-source merge).
  source_system     text NOT NULL,           -- the bronze source: 'm365_email' | 'm365_teams' | 'meta_messenger' | 'instagram_dm'
  external_id       text NOT NULL,            -- the source's stable id (e.g. Graph message id, chat id, DM id)
  thread_ref        text,                     -- conversation/thread id for grouping (e.g. m365 conversation_id)
  content_hash      text NOT NULL,            -- change detection for the idempotent re-merge

  -- CLASSIFICATION. Captured client comms are client PII (ADR-0126 / ADR-0118 third RLS axis).
  data_class        text NOT NULL DEFAULT 'client_pii',

  ingested_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (channel, source_system, external_id)                               -- idempotent merge upsert key (ADR-0026)
);
COMMENT ON TABLE client_communication IS
  'Silver: unified, client-scoped direct client<->employee communications (email/teams_chat/teams_meeting/social_dm) — the FILTERED projection of Imperion''s own-tenant comms, scoped to DB clients via account_domain + onboarded contacts (ADR-0126, #1369). PII-minimal: subject + snippet only, NEVER message bodies. Distinct from the broader `interaction` Contact-360 timeline (ADR-0011). Archetype B; UNIQUE (channel, source_system, external_id) idempotent merge key (ADR-0026; merge co-locates with ingestion — sibling LP/Pipeline follow-up). data_class = client_pii.';

-- Per-account history (the GUI read), newest first.
CREATE INDEX IF NOT EXISTS idx_client_communication_account  ON client_communication(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_communication_contact  ON client_communication(contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_communication_channel  ON client_communication(channel, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_communication_thread   ON client_communication(thread_ref);

-- ── updated_at trigger (matches 0210 convention) ─────────────────────────────
DROP TRIGGER IF EXISTS trg_client_communication_updated ON client_communication;
CREATE TRIGGER trg_client_communication_updated BEFORE UPDATE ON client_communication
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (ADR-0042 §1; defensive — roles may be absent, per 0210/0158) ──────
-- web (mgid-imperioncrm-web-prd):       SELECT (render the unified client-comms history).
-- pipeline (mgid-imperioncrmpipeline):  RW (the filtered bronze->silver merge runs as the
--                                       pipeline identity; ADR-0026 — live/webhook merges in
--                                       cloud, bulk merges on-prem under this same role).
-- local-pipeline (imperion-localpipeline): RW (on-prem bulk merge for the sources it ingests).
-- backend (…backendfunction):           SELECT (agent grounding over client comms).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON client_communication TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON client_communication TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline merge grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON client_communication TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline merge grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON client_communication TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;
END $$;

COMMIT;
