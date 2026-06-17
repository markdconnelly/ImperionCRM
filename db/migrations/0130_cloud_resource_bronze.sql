-- 0130: Per-client Azure ARM cloud-resource BRONZE (#800; CMDB cloud-asset CI, #372/ADR-0078).
--
-- The on-prem local-pipeline collector (Get-ImperionCloudResource →
-- Set-ImperionCloudResourceToBronze, source key 'azure_arm', LocalPipeline #201/#216) is
-- already authored against these table names and merges DORMANT (fail-loud) until they
-- exist. This migration lands the schema dependency only.
--
-- DISTINCT FROM the existing azure_* posture set (0038, ADR-0008): those are the
-- PARTNER-TENANT, security-scoped inventory (one tenant, Sentinel/Secure-Score scoped, NOT
-- account-relatable). These cloud_* tables are PER-MANAGED-CLIENT, CMDB-shaped, fanned out
-- across client tenants, and account-relatable (the later silver `cloud_asset` + CMDB CI
-- stitch). Keeping them separate avoids overloading the posture set's meaning (a silver/OKF
-- hazard) — do NOT merge the two.
--
-- BRONZE IS LOSSLESS/RAW (0080 LP envelope): flat columns are text (the loader coerces
-- every value to a stable string — dates to ISO 8601); ARM `tags` is a small key→value map
-- stored as jsonb (matches 0083 `knowledge_blob_refs`; richer than the 0038 posture-set text
-- `tags`, which only stamped a flattened string); true types + the original live in
-- raw_payload (jsonb); silver casts. Standard envelope:
-- tenant_id, source, external_id, collected_at, raw_payload, content_hash; PK
-- (tenant_id, source, external_id). Bronze stays permissive (no CHECK / no FK).
--
-- SCOPE: the three bronze tables only. NOT in scope: the silver `cloud_asset` table, the
-- CMDB CI stitch, the OKF concept file, or a `cloud_resource_bronze_all` union view (deferred
-- to the #201 silver-merge slice, which decides the shared projection it needs — system §11).
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Subscription (per client tenant) — external_id = subscriptionId ─────────────────────
CREATE TABLE IF NOT EXISTS cloud_subscriptions (
  display_name text, state text, sub_tenant_id text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE cloud_subscriptions IS
  'Per-client Azure ARM subscription bronze (#800, source azure_arm). external_id = subscriptionId. Distinct from the partner-tenant posture set (azure_subscriptions, 0038) — this is per-managed-client, CMDB-shaped.';

-- ── Resource group — external_id = RG ARM id ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cloud_resource_groups (
  name text, location text, subscription_id text, provisioning_state text, tags jsonb,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE cloud_resource_groups IS
  'Per-client Azure ARM resource-group bronze (#800, source azure_arm). external_id = RG ARM id; subscription_id is the parent subscriptionId. tags = ARM tag map (jsonb).';

-- ── Resource (VM/storage/app-service/SQL/networking/…) — external_id = resource ARM id ──
CREATE TABLE IF NOT EXISTS cloud_resources (
  name text, type text, location text, kind text, sku text,
  resource_group text, subscription_id text, tags jsonb,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE cloud_resources IS
  'Per-client Azure ARM resource bronze (#800, source azure_arm) — backs the CMDB cloud-asset CI (#372/ADR-0078). external_id = resource ARM id; resource_group + subscription_id are the parent ARM ids. tags = ARM tag map (jsonb). Distinct from the posture set azure_resources (0038, partner-tenant security inventory).';

-- Parent-id lookup indexes for the later silver CMDB stitch (RG → subscription → resource).
CREATE INDEX IF NOT EXISTS ix_cloud_resource_groups_sub ON cloud_resource_groups (subscription_id);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_rg         ON cloud_resources (resource_group);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_sub        ON cloud_resources (subscription_id);

-- ── Grants (0083 defensive pattern; roles may be absent in some envs) ───────────────────
DO $$
DECLARE
  cloud_tables text[] := ARRAY['cloud_subscriptions','cloud_resource_groups','cloud_resources'];
  t text;
BEGIN
  -- Local-pipeline writes the cloud-resource bronze (it collects via ARM, source azure_arm).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    FOREACH t IN ARRAY cloud_tables LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO "imperion-localpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role imperion-localpipeline absent — skipping LP grants.'; END IF;

  -- Web reads for display (CMDB cloud-asset surface, #372).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    FOREACH t IN ARRAY cloud_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrm-web-prd"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.'; END IF;

  -- Backend reads (the agent picture / later processes).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    FOREACH t IN ARRAY cloud_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmbackendfunction"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.'; END IF;

  -- Cloud-pipeline reads (the bronze→silver `cloud_asset` merge consumes it).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    FOREACH t IN ARRAY cloud_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.'; END IF;
END $$;

COMMIT;
