-- 0139: Silver cloud_asset + cloud_provider/cloud_asset_category enums + cloud_resource_bronze_all
-- view. (#874, epic #873; CMDB cloud-asset CI, #372/ADR-0078.) Depends on 0130 (cloud_* bronze)
-- and 0061 (account_tenant).
--
-- The provider-agnostic SILVER cloud object the CMDB cloud CI arm projects and the cloud
-- Pipeline bronze→silver merge writes (Pipeline #126). Deferred from 0130 to "the #201
-- silver-merge slice + its own front-end issue" (data-model.md scope note) — this is that
-- front-end issue. Multi-cloud by construction: `provider` discriminates azure (the first
-- feed) from aws/gcp/other; a new cloud adds a bronze feed + a merge arm with NO change here.
--
-- SOURCE: the PER-MANAGED-CLIENT Azure ARM bronze `cloud_resources` (source `azure_arm`,
-- 0130) — account-relatable via `tenant_id`. DISTINCT from the partner-tenant posture set
-- `azure_resources` (0038), which is one-tenant security inventory and NOT account-relatable.
--
-- ACCOUNT LINK: the merge resolves `account_id` from the bronze `tenant_id` via `account_tenant`
-- (admin-managed, 0061). `account_id` is NULLABLE (ON DELETE SET NULL) — an asset whose tenant
-- is not yet mapped is retained with a NULL owner; the CMDB union drops NULL-account rows
-- (the staff/internal exclusion, mirroring the silver `device` arm). `tenant_id` is stored on
-- silver so re-merge / account reassignment is deterministic.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). Applied to prod as an
-- additive migration (standing OK). No secrets, no row-level client data here.

BEGIN;

-- ── Enums ───────────────────────────────────────────────────────────────────────────────
-- provider: extensible discriminator. Adding aws/gcp later is ALTER TYPE ... ADD VALUE.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cloud_provider') THEN
    CREATE TYPE cloud_provider AS ENUM ('azure', 'aws', 'gcp', 'other');
  END IF;
END $$;

-- category: coarse, provider-neutral normalization of the native resource type (the merge maps
-- e.g. Microsoft.Compute/* → compute, Microsoft.Storage/* → storage). Display/grouping only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cloud_asset_category') THEN
    CREATE TYPE cloud_asset_category AS ENUM (
      'compute', 'storage', 'network', 'database', 'identity',
      'web', 'analytics', 'integration', 'security', 'management', 'other'
    );
  END IF;
END $$;

-- ── Silver cloud_asset ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cloud_asset (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid REFERENCES account(id) ON DELETE SET NULL,  -- owning client; NULL when tenant unmapped
  provider         cloud_provider NOT NULL,
  external_id      text NOT NULL,                 -- provider-native id (ARM resource id for azure)
  name             text,
  native_type      text,                          -- raw provider type, e.g. Microsoft.Compute/virtualMachines
  category         cloud_asset_category NOT NULL DEFAULT 'other',  -- normalized from native_type by the merge
  region           text,                          -- azure: location
  resource_group   text,                          -- azure: parent RG name
  subscription_ref text,                          -- azure: parent subscriptionId
  status           text,                          -- provisioning/power state (free-text, provider-specific)
  sku              text,
  tags             jsonb,                          -- provider tag map
  tenant_id        text,                          -- source tenant (azure) — re-resolve account via account_tenant
  source           text NOT NULL,                  -- bronze feed key, e.g. azure_arm
  last_seen_at     timestamptz,                    -- bronze collected_at of the latest merge
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)                   -- idempotent merge upsert key
);
COMMENT ON TABLE cloud_asset IS
  'Provider-agnostic SILVER cloud asset (#874, ADR-0078). Discriminated by provider (azure now; aws/gcp/other later) — one row per cloud resource. Written by the cloud Pipeline bronze→silver merge from the per-client Azure ARM bronze (cloud_resources, source azure_arm); account_id resolved from tenant_id via account_tenant (NULL when unmapped; the CMDB union drops NULL-account rows). DISTINCT from the partner-tenant posture set azure_resources (0038).';
CREATE INDEX IF NOT EXISTS idx_cloud_asset_account ON cloud_asset (account_id);
CREATE INDEX IF NOT EXISTS idx_cloud_asset_provider_category ON cloud_asset (provider, category);

DROP TRIGGER IF EXISTS trg_cloud_asset_updated ON cloud_asset;
CREATE TRIGGER trg_cloud_asset_updated BEFORE UPDATE ON cloud_asset
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── cloud_resource_bronze_all (the shared bronze projection — deferred from 0130) ─────────
-- The single read surface the silver merge consumes: the per-client Azure ARM RESOURCE bronze
-- normalized to the silver column names (the subscription/RG bronze are hierarchy lookups, not
-- assets, so they are not projected here). Provider literal is azure for this feed; future
-- aws/gcp feeds add their own UNION ALL arms when they land.
CREATE OR REPLACE VIEW cloud_resource_bronze_all AS
  SELECT 'azure'::text       AS provider,
         tenant_id,
         source,
         external_id,
         name,
         type                AS native_type,
         location            AS region,
         resource_group,
         subscription_id     AS subscription_ref,
         sku,
         kind,
         tags,
         collected_at,
         raw_payload
    FROM cloud_resources;

-- ── Grants (0130 defensive pattern; roles may be absent in some envs) ──────────────────────
DO $$
BEGIN
  -- Web reads silver for the CMDB cloud-asset surface (#372).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON cloud_asset                TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON cloud_resource_bronze_all  TO "mgid-imperioncrm-web-prd";
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.'; END IF;

  -- Cloud pipeline OWNS the bronze→silver merge: writes cloud_asset, reads the bronze projection.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON cloud_asset TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON cloud_resource_bronze_all           TO "mgid-imperioncrmpipeline";
  ELSE RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.'; END IF;

  -- Backend reads (the agent picture / later processes).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON cloud_asset TO "mgid-imperioncrmbackendfunction";
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.'; END IF;
END $$;

COMMIT;
