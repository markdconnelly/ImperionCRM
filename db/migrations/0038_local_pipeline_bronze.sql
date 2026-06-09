-- Local-pipeline bronze tables + an account-level "related source data" citation view.
--
-- The on-prem PowerShell engine (ImperionCRM_LocalPipelineEnrichment, ADR-0007) does the
-- heavy scheduled ingestion off the website and writes these bronze tables. Schema is owned
-- HERE (ADR-0017); this is the migration the local module's cmdlets need.
--
-- BRONZE IS LOSSLESS/RAW: flat columns are text (the loader coerces every value to a stable
-- string — dates to ISO 8601); true types live in raw_payload (jsonb); silver casts. Standard
-- envelope: tenant_id, source, external_id, collected_at, raw_payload, content_hash; PK
-- (tenant_id, source, external_id). IT Glue export keys on (source, external_id).
--
-- NOTE: autotask_companies/autotask_contacts and itglue_contacts/itglue_companies/
-- itglue_devices already exist (0036) — NOT recreated here. The IT Glue dataset export is
-- namespaced itglue_export_* to avoid colliding with those per-source contact/company bronze.
--
-- Citations: account_related_bronze (bottom) lets a merged account surface the related
-- Autotask contracts/tickets + IT Glue org doc that feed its picture, drillable to raw payload.
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Entra service principals + Azure/Sentinel inventory ─────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_service_principals (
  app_id text, display_name text, sp_type text, account_enabled text, app_owner_org_id text,
  sign_in_audience text, homepage text, reply_urls text, sp_names text, tags text,
  app_roles_count text, oauth2_scopes_count text, key_credentials_count text,
  key_credential_next_expiry text, pwd_credentials_count text, pwd_credential_next_expiry text,
  created_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS azure_management_groups (
  name text, display_name text, mg_tenant_id text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS azure_subscriptions (
  display_name text, state text, sub_tenant_id text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS azure_resource_groups (
  name text, location text, subscription_id text, provisioning_state text, tags text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS azure_resources (
  name text, type text, location text, resource_group text, subscription_id text,
  sku text, kind text, tags text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS sentinel_analytic_rules (
  name text, display_name text, rule_kind text, enabled text, severity text,
  tactics text, last_modified text, workspace text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS sentinel_automation_rules (
  display_name text, rule_order text, workspace text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS sentinel_watchlists (
  display_name text, provider text, ws_source text, updated text, workspace text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS sentinel_workbooks (
  display_name text, category text, version text, time_modified text, subscription_id text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Kaseya stack: Autotask contracts/tickets (confirmed fields) + KQM/DocuSign (assumed) ──
CREATE TABLE IF NOT EXISTS autotask_contracts (
  contract_name text, contract_number text, company_id text, contact_id text, contact_name text,
  contract_type text, contract_category text, status text, billing_preference text, description text,
  start_date text, end_date text, estimated_cost text, estimated_revenue text, estimated_hours text,
  setup_fee text, is_compliant text, is_default_contract text, opportunity_id text,
  purchase_order_number text, service_level_agreement_id text, last_modified_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS autotask_tickets (
  ticket_number text, title text, status text, priority text, company_id text, contact_id text,
  contract_id text, queue_id text, issue_type text, sub_issue_type text, ticket_type text,
  ticket_category text, assigned_resource_id text, creator_resource_id text, create_date text,
  due_date_time text, completed_date text, resolved_date_time text, first_response_date_time text,
  last_activity_date text, last_tracked_modification_date_time text, description text,
  resolution text, ticket_source text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS kqm_proposals (
  name text, status text, total text, account_ref text, created_at text, updated_at text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS website_proposals (
  name text, status text, total text, account_ref text, created_at text, updated_at text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS docusign_contracts (
  subject text, status text, account_ref text, sent_at text, completed_at text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Microsoft Secure Score ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS secure_scores (
  current_score text, max_score text, active_user_count text, licensed_user_count text,
  enabled_services text, created_date_time text, azure_tenant_id text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS secure_score_control_profiles (
  control_name text, control_category text, title text, max_score text, rank text, service text,
  action_type text, user_impact text, implementation_cost text, tier text, threats text,
  remediation text, deprecated text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Security-posture policies (observed current state) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS entra_conditional_access_policies (
  policy_name text, state text, created_date_time text, modified_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS intune_security_policies (
  policy_name text, template_family text, technologies text, platforms text, modified_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS device_configuration_policies (
  policy_name text, odata_type text, created_date_time text, modified_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS autopilot_policies (
  policy_name text, locale text, created_date_time text, modified_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS defender_xdr_security_policies (
  policy_name text, template_family text, technologies text, platforms text, modified_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Golden states (approved baselines; keyed tenant_id + policy_id) ──────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'conditional_access_policies_golden','intune_security_policies_golden',
    'device_configuration_policies_golden','autopilot_policies_golden',
    'defender_xdr_security_policies_golden'
  ] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %s (
        tenant_id text NOT NULL, policy_id text NOT NULL, policy_name text,
        golden_hash text NOT NULL, golden_payload jsonb NOT NULL,
        approved_by text, approved_at text, notes text,
        PRIMARY KEY (tenant_id, policy_id)
      )$f$, t);
  END LOOP;
END $$;

-- ── IT Glue dataset export (namespaced itglue_export_* — see header) ─────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','configurations','contacts','locations','flexible_asset_types',
    'flexible_assets','domains','manufacturers','models','operating_systems',
    'configuration_types','organization_types','organization_statuses'
  ] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS itglue_export_%s (
        source text NOT NULL DEFAULT 'itglue', external_id text NOT NULL,
        organization_id text, name text, resource_url text, created_at text, updated_at text,
        collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
        PRIMARY KEY (source, external_id)
      )$f$, t);
  END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS itglue_export_relationship (
  from_type text NOT NULL, from_id text NOT NULL, to_type text NOT NULL, to_id text NOT NULL,
  relationship_name text NOT NULL, collected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_type, from_id, relationship_name, to_type, to_id)
);
CREATE INDEX IF NOT EXISTS ix_itglue_export_rel_to   ON itglue_export_relationship (to_type, to_id);
CREATE INDEX IF NOT EXISTS ix_itglue_export_rel_from ON itglue_export_relationship (from_type, from_id);

-- Helpful lookup indexes for the citation joins below.
CREATE INDEX IF NOT EXISTS ix_autotask_contracts_company ON autotask_contracts (company_id);
CREATE INDEX IF NOT EXISTS ix_autotask_tickets_company   ON autotask_tickets (company_id);

-- ── Citation view: a merged account's related local-pipeline bronze ──────────────────────
-- Joins the account's per-source external_ref (account_bronze_all, 0036) to the local-pipeline
-- bronze that references the same external id. Surfaces as drillable "Related source data".
CREATE OR REPLACE VIEW account_related_bronze AS
  SELECT ab.account_id, 'autotask_contract'::text AS kind, c.external_id AS external_ref,
         c.contract_name AS label, c.raw_payload AS payload_bronze, c.collected_at AS last_seen_at
    FROM account_bronze_all ab
    JOIN autotask_contracts c ON c.company_id = ab.external_ref
   WHERE ab.source = 'autotask' AND ab.external_ref IS NOT NULL
  UNION ALL
  SELECT ab.account_id, 'autotask_ticket', t.external_id,
         t.title, t.raw_payload, t.collected_at
    FROM account_bronze_all ab
    JOIN autotask_tickets t ON t.company_id = ab.external_ref
   WHERE ab.source = 'autotask' AND ab.external_ref IS NOT NULL
  UNION ALL
  SELECT ab.account_id, 'itglue_doc', o.external_id,
         o.name, o.raw_payload, o.collected_at
    FROM account_bronze_all ab
    JOIN itglue_export_organizations o ON o.external_id = ab.external_ref
   WHERE ab.source = 'itglue' AND ab.external_ref IS NOT NULL;

COMMENT ON VIEW account_related_bronze IS
  'Per-account citations into local-pipeline bronze (Autotask contracts/tickets, IT Glue org doc) for drill-down troubleshooting (ADR-0039 lineage model).';

COMMIT;
