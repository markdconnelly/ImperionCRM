-- Apollo enrichment provider (ADR-0035). Apollo is the global enrichment service
-- for leads and companies: it enriches the lead/contact and the company object.
-- It is a company-wide (not per-user) connection. The ingestion/enrichment
-- *pipeline* is a documented later priority — this migration only registers the
-- provider and seeds the org-wide connection so the GUI and the bronze
-- `*_source` tables (0032) can reference it.
--
-- NOTE: `ALTER TYPE … ADD VALUE` commits the new enum label, but the label
-- cannot be USED until that transaction has committed. So the seed INSERT runs in
-- a SECOND transaction below — intentionally two BEGIN/COMMIT blocks in one file.

BEGIN;
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'apollo';
COMMIT;

BEGIN;
INSERT INTO connection (scope, provider, display_name, status)
SELECT 'company', 'apollo'::connection_provider, 'Apollo — enrichment', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM connection
  WHERE provider = 'apollo'::connection_provider AND scope = 'company'
);
COMMIT;
