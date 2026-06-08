-- Structured meeting object (ADR-0011/0030). A first-class drill-down for the
-- meeting kinds in the communications timeline: a Teams meeting (Copilot recap +
-- transcript) and a Plaud in-person recap/summary. 1:1 with an `interaction` of
-- kind 'meeting', so it relates back to the contact AND the company (account)
-- through that interaction. Email-from-365 stays modeled as plain interactions.
-- Bronze/silver/gold (CLAUDE.md §4). Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE meeting_platform AS ENUM ('teams', 'plaud', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS meeting (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id    uuid NOT NULL UNIQUE REFERENCES interaction(id) ON DELETE CASCADE,
  platform          meeting_platform NOT NULL DEFAULT 'other',
  title             text,
  copilot_recap     text,            -- Teams Copilot recap (silver/gold narrative)
  plaud_summary     text,            -- Plaud meeting summary
  transcript_ref    text,            -- pointer to the full transcript blob (object storage)
  -- Bronze → Silver → Gold (CLAUDE.md §4)
  payload_bronze    jsonb,           -- raw source payload (Graph/Plaud export)
  normalized_silver jsonb,           -- cleaned/normalized
  summary_gold      text,            -- agent-ready summary
  occurred_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE meeting IS
  'Structured Teams/Plaud meeting (Copilot recap + transcript / Plaud summary); 1:1 with an interaction (ADR-0011).';

CREATE INDEX IF NOT EXISTS idx_meeting_interaction ON meeting(interaction_id);

DROP TRIGGER IF EXISTS trg_meeting_updated ON meeting;
CREATE TRIGGER trg_meeting_updated BEFORE UPDATE ON meeting
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
