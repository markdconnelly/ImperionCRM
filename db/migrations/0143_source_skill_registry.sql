-- 0143: source_skill registry — per-source sanctioned fetch/validate skill.
-- (ADR-0104 decision 2; extends the ADR-0103 connection credential registry.)
--
-- The OKF semantic layer grounds an agent on an entity's MEANING — which source wins,
-- how it joins (ADR-0086) — but deliberately holds no tool knowledge (constraint 4). The
-- map from a SOURCE SYSTEM (provider) to the SANCTIONED skill that fetches/validates from
-- it lives here ONCE per provider, never duplicated into each entity's concept file (the
-- "N shallow adapters" anti-pattern, ADR-0104). An ICM stage resolves
--   entity -> its sources (OKF) -> this registry -> the sanctioned skill
-- then checks agent_tool_grant before invoking.
--
-- Skills are referenced BY NAME only (e.g. 'imperion-skills:autotask-fetch'); they live in
-- the in-repo plugin marketplace (ADR-0060), not the DB. No secret, no PII. The table ships
-- empty — rows are seeded as the sanctioned skills are authored.

CREATE TABLE IF NOT EXISTS source_skill (
  provider       connection_provider PRIMARY KEY,   -- mirrors connection.provider (0020/0033/…)
  fetch_skill    text,                              -- sanctioned ingest/fetch skill name; NULL = none yet
  validate_skill text,                              -- sanctioned validate skill name; NULL = none
  notes          text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE source_skill IS
  'Per-source (provider) sanctioned fetch/validate skill refs — the tool-routing hop the OKF layer points at (ADR-0104 decision 2). Skills referenced by NAME only (imperion-skills:<name>, ADR-0060); never a secret, never PII.';
COMMENT ON COLUMN source_skill.fetch_skill IS
  'Sanctioned skill name for ingest/fetch from this source; NULL = none sanctioned yet.';
COMMENT ON COLUMN source_skill.validate_skill IS
  'Sanctioned skill name for validating data from this source; NULL = none.';

DROP TRIGGER IF EXISTS trg_source_skill_updated ON source_skill;
CREATE TRIGGER trg_source_skill_updated BEFORE UPDATE ON source_skill
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (defensive pattern; roles may be absent in some envs) ──────────────────────
DO $$
BEGIN
  -- Web (admin config surface): manages the sanctioned-skill map.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON source_skill TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend (orchestrator/ICM): reads the sanctioned skill at tool-selection time.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON source_skill TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- Pipelines: read-only (may resolve the sanctioned ingestion skill).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON source_skill TO "imperion-localpipeline";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON source_skill TO "mgid-imperioncrmpipeline";
  END IF;
END $$;
