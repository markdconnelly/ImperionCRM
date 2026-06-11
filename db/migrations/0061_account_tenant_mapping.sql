-- 0061: Tenant Mapping — account_tenant (ADR-0051 decision 1, issue #149 / epic #105).
--
-- Posture bronze (secure scores, the five policy families + golden baselines) is
-- keyed by Microsoft tenant GUID; the app navigates by account. This table is the
-- explicit, admin-managed mapping: tenant GUID is the PK (one account per tenant;
-- an account may own several tenants). Never inferred from domains — ADR-0051
-- rejected the credential_exposure-style domain match for posture.
--
-- Grants: web MI inherits writes via 0002's default privileges (admin Settings
-- surface manages rows). Both pipeline roles read it to resolve account→tenants
-- for posture merges (cloud: pipeline #20 on-demand refresh; local: bulk + the
-- quarterly snapshot job). Idempotent; pipeline grants no-op if a role is absent.

BEGIN;

CREATE TABLE IF NOT EXISTS account_tenant (
  tenant_id     text PRIMARY KEY,                 -- Microsoft tenant GUID
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_account_tenant_account ON account_tenant (account_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON account_tenant TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON account_tenant TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grant.';
  END IF;
END $$;

COMMIT;
