-- Assessment evidence store (ADR-0023) — bronze→silver→gold (CLAUDE.md §4).
-- Holds the deeper assessment data: Televy reports/analytics and current-state pulls
-- from the client's Microsoft 365 / Google environment, plus external scan and
-- phishing-simulation outputs. Each artifact is stored ONCE as received (bronze),
-- with optional normalized (silver) and summary (gold) forms for downstream use.
-- The collection itself runs in external functions (ADR-0018); this is the store.
-- Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE artifact_source AS ENUM
    ('televy','m365_graph','google_workspace','external_scan','phishing_sim','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE artifact_kind AS ENUM ('report','analytics','snapshot','finding','metric');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS assessment_artifact (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     uuid NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  source            artifact_source NOT NULL,
  kind              artifact_kind NOT NULL,
  title             text,
  dimension         text,                          -- optional: which scorecard dimension it informs
  collected_at      timestamptz NOT NULL DEFAULT now(),
  payload_bronze    jsonb,                          -- raw as received from the source
  normalized_silver jsonb,                          -- cleaned/normalized
  summary_gold      text,                           -- agent-ready summary
  blob_ref          text,                           -- pointer to a report file in object storage
  external_ref      text,                           -- source-system identifier
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE assessment_artifact IS 'Televy / M365 / Google / scan evidence for an assessment; bronze/silver/gold (ADR-0023).';

CREATE INDEX IF NOT EXISTS idx_artifact_assessment ON assessment_artifact(assessment_id);
CREATE INDEX IF NOT EXISTS idx_artifact_source     ON assessment_artifact(source);

DROP TRIGGER IF EXISTS trg_assessment_artifact_updated ON assessment_artifact;
CREATE TRIGGER trg_assessment_artifact_updated BEFORE UPDATE ON assessment_artifact
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
