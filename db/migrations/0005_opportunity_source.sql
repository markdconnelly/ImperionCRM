-- Make opportunities reconcilable with future external feeds (Kaseya Quote Manager,
-- Autotask contracts). `source` marks where a row came from; `external_ref` lets a
-- feed upsert by its own id. Seed/placeholder rows use source='seed' and can be
-- replaced when the real feeds land (ADR-0012). ADR-0010.

BEGIN;

ALTER TABLE opportunity
  ADD COLUMN IF NOT EXISTS source       text NOT NULL DEFAULT 'manual', -- manual|seed|autotask|quotemanager
  ADD COLUMN IF NOT EXISTS external_ref text;                            -- id in the source system

-- A feed upserts by (source, external_ref); enforce uniqueness only when set.
CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunity_source_ref
  ON opportunity(source, external_ref) WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunity_source ON opportunity(source);

COMMIT;
