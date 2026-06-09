-- Least-privilege Postgres grants for the on-prem local-pipeline service principal.
--
-- The local pipeline (ImperionCRM_LocalPipelineEnrichment) connects as its OWN cert-backed
-- Entra service principal — NOT the web app identity granted in 0002. Per that repo's
-- ADR-0003 the SP gets a Postgres role scoped to *exactly the tables it writes*: the
-- local-pipeline bronze (0038) + the Dark Web ID / Televy bronze (0043) it owns. It is
-- read-only everywhere else (no grant here = no access), and never gets DELETE (its writes
-- are idempotent upserts that never delete). This is deliberately narrower than 0002's
-- blanket ALL TABLES grant to the web identity.
--
-- APPROVED + bootstrapped 2026-06-09 (Mark): the role is mapped to the "Imperion CRM" SP
-- (appId 46f1077b-c93f-42da-abd4-192da13781ac, objectId d944e180-cb77-45cc-b683-375630e4efbd),
-- which holds the pipeline's certificate (ADR-0002). A new write-capable DB principal is a §8
-- security event — done under explicit human direction.
--
-- PREREQUISITE — already done against the `postgres` database as a PG Entra admin (the password
-- break-glass admin CANNOT apply Entra security labels; an Entra-authenticated admin must):
--   SELECT pgaadauth_create_principal_with_oid(
--     'imperion-localpipeline', 'd944e180-cb77-45cc-b683-375630e4efbd', 'service', false, false);
--
-- This migration (the GRANTs) applies with the committed runner against `imperioncrm`:
--   node scripts/migrate.mjs 0044
-- Idempotent (re-running re-grants harmlessly).

DO $$
DECLARE
  -- The local-pipeline SP's Postgres role (mapped to the "Imperion CRM" SP objectId
  -- d944e180-cb77-45cc-b683-375630e4efbd via pgaadauth, type 'service', non-admin).
  v_role text := 'imperion-localpipeline';
  t text;
  -- Bronze/golden tables this repo WRITES (SELECT for the upsert's hash check, INSERT, UPDATE).
  write_tables text[] := ARRAY[
    -- Entra SPs + Azure / Sentinel inventory (0038)
    'm365_service_principals',
    'azure_management_groups','azure_subscriptions','azure_resource_groups','azure_resources',
    'sentinel_analytic_rules','sentinel_automation_rules','sentinel_watchlists','sentinel_workbooks',
    -- CRM/support bronze (0038)
    'autotask_contracts','autotask_tickets','kqm_proposals','website_proposals','docusign_contracts',
    -- Security posture: Secure Score + observed policies (0038)
    'secure_scores','secure_score_control_profiles',
    'entra_conditional_access_policies','intune_security_policies','device_configuration_policies',
    'autopilot_policies','defender_xdr_security_policies',
    -- Golden states (0038) — written by Set-ImperionPolicyGoldenState (human-gated)
    'conditional_access_policies_golden','intune_security_policies_golden',
    'device_configuration_policies_golden','autopilot_policies_golden','defender_xdr_security_policies_golden',
    -- IT Glue full export graph (0038)
    'itglue_export_organizations','itglue_export_configurations','itglue_export_contacts',
    'itglue_export_locations','itglue_export_flexible_asset_types','itglue_export_flexible_assets',
    'itglue_export_domains','itglue_export_manufacturers','itglue_export_models',
    'itglue_export_operating_systems','itglue_export_configuration_types','itglue_export_organization_types',
    'itglue_export_organization_statuses','itglue_export_relationship',
    -- Dark Web ID / Televy bronze (0043) — owned by the local pipeline (front-end ADR-0040)
    'darkwebid_exposures','televy_reports'
  ];
BEGIN
  IF v_role = 'REPLACE_WITH_PIPELINE_SP_ROLE' THEN
    RAISE EXCEPTION 'Set v_role to the local-pipeline SP''s Postgres role before applying 0044.';
  END IF;

  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), v_role);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);

  FOREACH t IN ARRAY write_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE %I TO %I', t, v_role);
  END LOOP;
END $$;
