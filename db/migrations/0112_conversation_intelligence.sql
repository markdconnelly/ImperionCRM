-- 0112 conversational intelligence — capture/transcribe/analyze schema (ADR-0068, issue #375)
-- Migration number 0112 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration
-- merges during the CI window, renumber the file (rename is data-safe).
--
-- The schema heavy lane of the conversational-intelligence vertical (epic #315,
-- ADR-0068). Voice/meeting conversations become first-class on the customer 360:
-- ACS calls / Teams meetings / manual uploads are captured, transcribed (Azure
-- Speech, diarized), analyzed (Claude — ADR-0043), and the transcript segments are
-- embedded in _LocalPipelineEnrichment (Voyage @1024 — ADR-0041). The backend
-- orchestrates and holds the credentials (ADR-0042); this front end only reads for
-- display. Real transcription/analysis is DORMANT until ACS/Speech creds land
-- (#66/#21) — the schema ships now so the surface (#379) and the backend
-- orchestrator (#376/#377) can build against it.
--
-- Persistence model (ADR-0068 decision 3): transcript as artifact, insights as rows.
-- Raw audio is *referenced* (audio_artifact_uri), not stored in Postgres; the full
-- transcript is a blob (transcript_artifact_uri); the diarized turns
-- (conversation_segment) and the AI outputs (conversation_insight) are relational.
-- These are DERIVED artifacts, not a polled external source, so there is no
-- bronze-per-source table here (ADR-0068 decision 3) — but `conversation` IS a
-- silver entity on the timeline, so it gets an OKF concept file (semantic-layer gate).
--
-- Three additive tables:
--
--   1. conversation (NEW, silver) — one row per call/meeting/upload. Links to
--      account/contact/opportunity (all SET NULL — an upload may be unlinked until
--      auto-linking, an ADR-0068 future consideration). source CHECK acs|teams|upload;
--      status CHECK captured→transcribed→analyzed→purged. consent_basis_id → the
--      consent ledger (ADR-0014): a conversation cannot be transcribed without a basis,
--      enforced in the backend orchestrator, not as a NOT NULL (capture can precede the
--      consent check). retention_expires_at drives the purge job (transcript + segments
--      removed on expiry, status→purged; insights optionally retained in aggregate).
--
--   2. conversation_segment (NEW) — one diarized turn (speaker + start/end ms + text).
--      The EMBEDDING unit (ADR-0041) — vectorized in _LocalPipelineEnrichment, not here.
--      CASCADE on conversation so a purge/delete takes its turns with it.
--
--   3. conversation_insight (NEW) — one AI output (summary|action_item|sentiment|
--      objection|risk) as { kind, payload jsonb, model }. payload jsonb so each kind
--      carries its own shape without a migration. CASCADE on conversation.
--
-- Consent + retention are first-class (ADR-0068 decision 5), but the ENFORCEMENT is a
-- backend process; the schema only carries the basis pointer + the expiry timestamp.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets. Transcript/segment TEXT carries client
-- conversation content (sensitive, client-identifying) — keep it out of docs/issues;
-- this migration creates structure only, no data.

BEGIN;

-- ── conversation: one captured call / meeting / upload (ADR-0068) ───────────────
CREATE TABLE IF NOT EXISTS conversation (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              uuid REFERENCES account(id) ON DELETE SET NULL,
  contact_id              uuid REFERENCES contact(id) ON DELETE SET NULL,
  opportunity_id          uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  source                  text NOT NULL
                            CHECK (source IN ('acs', 'teams', 'upload')),
  external_ref            text,                  -- ACS call id / Teams meeting id / upload id
  audio_artifact_uri      text,                  -- pointer to the audio blob (referenced, not stored)
  transcript_artifact_uri text,                  -- pointer to the full transcript blob
  started_at              timestamptz,
  ended_at                timestamptz,
  duration_seconds        integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  consent_basis_id        uuid REFERENCES consent_event(id) ON DELETE SET NULL,  -- ADR-0014 ledger
  retention_expires_at    timestamptz,           -- transcript + segments purged on/after this
  status                  text NOT NULL DEFAULT 'captured'
                            CHECK (status IN ('captured', 'transcribed', 'analyzed', 'purged')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE conversation IS
  'One captured voice/meeting conversation (ADR-0068, #375) — an ACS call, Teams meeting, or manual upload. Silver entity on the customer 360 / interaction timeline. Audio + full transcript are referenced blobs (audio_artifact_uri / transcript_artifact_uri), not stored inline; diarized turns live in conversation_segment, AI outputs in conversation_insight. Backend orchestrates transcribe→analyze and holds the credentials (ADR-0042); this front end only reads. Transcript content is sensitive + client-identifying.';
COMMENT ON COLUMN conversation.consent_basis_id IS
  'Consent ledger basis (ADR-0014) the transcription rests on. Enforced by the backend orchestrator before transcribe (capture can precede the check), not as a NOT NULL.';
COMMENT ON COLUMN conversation.retention_expires_at IS
  'Retention window end (ADR-0068 decision 5). On/after this a backend purge job removes the transcript + segments and sets status=purged; insights are optionally retained in aggregate.';
COMMENT ON COLUMN conversation.status IS
  'Pipeline state: captured → transcribed → analyzed → purged (ADR-0068 decision 1).';

-- 360 read: an account's conversations, newest first (the panel list, #379).
CREATE INDEX IF NOT EXISTS idx_conversation_account ON conversation (account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_contact ON conversation (contact_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_opportunity ON conversation (opportunity_id, started_at DESC);
-- Dedupe captures from the same source (one ACS call id ingests once). Partial so
-- many uploads with no external_ref don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_source_ref
  ON conversation (source, external_ref) WHERE external_ref IS NOT NULL;

-- ── conversation_segment: one diarized turn, the embedding unit (ADR-0041) ──────
CREATE TABLE IF NOT EXISTS conversation_segment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  speaker         text,                  -- diarized speaker label
  start_ms        integer,               -- offset into the recording
  end_ms          integer,
  text            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE conversation_segment IS
  'One diarized turn of a conversation (ADR-0068) — speaker + start/end offsets + text. The embedding unit: vectorized in _LocalPipelineEnrichment with Voyage @1024 (ADR-0041), surfaced via the gold knowledge citation view. CASCADE on conversation (a purge/delete takes its turns). text is sensitive client conversation content.';

-- Read order: a conversation's turns in time order (transcript view).
CREATE INDEX IF NOT EXISTS idx_conversation_segment_conv ON conversation_segment (conversation_id, start_ms);

-- ── conversation_insight: one AI analysis output (ADR-0043) ─────────────────────
CREATE TABLE IF NOT EXISTS conversation_insight (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  kind            text NOT NULL
                    CHECK (kind IN ('summary', 'action_item', 'sentiment', 'objection', 'risk')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  model           text,                  -- the Claude model that produced it (ADR-0043)
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE conversation_insight IS
  'One AI-derived insight about a conversation (ADR-0068, ADR-0043) — summary | action_item | sentiment | objection | risk. payload jsonb so each kind carries its own shape without a migration; model names the Claude tier that produced it. CASCADE on conversation. Feeds deal 360, the interaction timeline, and (risk/objection) forecasting #316.';

-- Read: a conversation's insights, grouped by kind (the panel, #379).
CREATE INDEX IF NOT EXISTS idx_conversation_insight_conv ON conversation_insight (conversation_id, kind);

-- updated_at trigger on conversation (mirrors project_template / sprint / intake_form).
-- set_updated_at() defined by an earlier migration; DROP-then-CREATE keeps re-run idempotent.
DROP TRIGGER IF EXISTS trg_conversation_updated ON conversation;
CREATE TRIGGER trg_conversation_updated BEFORE UPDATE ON conversation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Grants for the web role (mirrors 0111's guarded grant block).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON conversation TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_segment TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_insight TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
