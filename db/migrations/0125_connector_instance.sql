-- 0125 integration marketplace — connector_instance registry (ADR-0076, #414)
-- Migration number 0125 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration merges
-- during the CI window, renumber the file (rename is data-safe) and fix the in-file
-- refs + docs/database/data-model.md.
--
-- The persistence half of the declarative connector registry (ADR-0076 §2). The
-- connector MANIFEST (key, auth_type, scopes, default cadence, identity-map shape,
-- capabilities) is a VERSIONED CODE ARTIFACT (src/lib/integrations/connector-manifest.ts,
-- #414) — NOT a DB table — so the catalog's source of truth stays in code, reviewed and
-- diffable. This migration adds only the per-configuration INSTANCE:
--
--   connector_instance (NEW) — one enabled connector, per account scope. Enabling a
--   connector creates a row in 'connecting'; the backend drives it through the uniform
--   lifecycle available → connecting → connected → first_sync → polling (and error)
--   (ADR-0076 §3, backend-orchestrated per ADR-0042). `connector_key` references a
--   manifest by key — validated at the APP layer against the in-code registry (#414),
--   NOT a DB FK (the registry lives in code, mirroring report_definition.root_object in
--   0124). jsonb `granted_scopes` / `health` so the shape grows without schema churn.
--   `cadence_override_minutes` overrides the manifest default poll cadence (ADR-0038;
--   null = use the manifest default, matching connection.poll_interval_minutes units).
--
-- SECURITY (ADR-0034/0036/0043): NO secret material lives here — credentials are
-- custodied in backend Key Vault; the catalog GUI collects and hands off, never stores.
-- This row holds only non-secret configuration + status. No client PII.
--
-- App-native config object (a registry of enabled connectors) — like saved_view /
-- report_definition / status_def, NOT an ingested silver entity with a source-of-record
-- contract. So the OKF semantic-layer gate does not apply: no concept file, no
-- coverage-matrix row.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it.

BEGIN;

-- ── connector_instance: one enabled connector per account scope (ADR-0076 §2/§3) ────
CREATE TABLE IF NOT EXISTS connector_instance (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_key            text NOT NULL,                       -- references an in-code manifest (app-validated, no FK)
  account_scope            text NOT NULL DEFAULT 'global',      -- 'global' or a per-company scope key
  status                   text NOT NULL DEFAULT 'available'
                             CHECK (status IN ('available','connecting','connected','first_sync','polling','error')),
  granted_scopes           jsonb NOT NULL DEFAULT '[]'::jsonb,  -- scopes actually granted at connect (subset of the manifest's)
  cadence_override_minutes integer NULL                         -- override manifest default poll cadence (ADR-0038); null = manifest default
                             CHECK (cadence_override_minutes IS NULL OR cadence_override_minutes >= 0),
  last_sync_at             timestamptz NULL,                    -- set by the backend after first/each sync
  health                   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- last health probe (state, message, checked_at) — non-secret
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- One instance per connector per scope (re-enabling updates the existing row, ADR-0076 §3).
  UNIQUE (connector_key, account_scope)
);

COMMENT ON TABLE connector_instance IS
  'One enabled connector per account scope (ADR-0076 §2/§3). connector_key references an in-code manifest (src/lib/integrations/connector-manifest.ts) — app-validated, not a DB FK, mirroring report_definition.root_object. Backend-orchestrated lifecycle available→connecting→connected→first_sync→polling|error. NO secret material — credentials live in backend Key Vault (ADR-0034/0036); this row is non-secret config + status only. cadence_override_minutes overrides the manifest default poll cadence (ADR-0038; null = default). App-native config, not a silver entity.';

CREATE INDEX IF NOT EXISTS idx_connector_instance_key ON connector_instance (connector_key);
CREATE INDEX IF NOT EXISTS idx_connector_instance_status ON connector_instance (status);

-- ── Grants: the web identity manages instances from the catalog GUI (#416, ADR-0076 §4);
--    the backend orchestrates the lifecycle so it updates status/health/last_sync/granted_scopes
--    (#149, ADR-0042); the pipeline reads cadence + last_sync to register/run the poll (#116,
--    ADR-0038). Defensive (roles may be absent on a fresh server), mirroring 0121.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON connector_instance TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, UPDATE ON connector_instance TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON connector_instance TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;

COMMIT;
