-- Drop the legacy enum-discriminated bronze tables, superseded by the per-source physical
-- tables in 0036 (ADR-0039). Apply this ONLY AFTER the new app + pipeline code is deployed
-- (zero-downtime expand/contract): 0036 creates the new tables, code is deployed to use them,
-- then this removes the old ones. No data migration — bronze is a re-fetchable cache and the
-- next source poll re-lands into the new tables (the silver `contact`/`account` rows persist).
-- Idempotent and transactional.

BEGIN;

DROP TABLE IF EXISTS contact_source;
DROP TABLE IF EXISTS account_source;

-- The enums only ever typed the dropped tables' `source` columns — now unused.
DROP TYPE IF EXISTS contact_bronze_source;
DROP TYPE IF EXISTS company_bronze_source;

COMMIT;
