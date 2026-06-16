-- 0119:
-- bronze-batch-A — RMM/managed-estate + security-incident landing tables (#674).
--
-- FE owns the table names (system CLAUDE.md §1 — this repo is the schema source of
-- truth; the siblings are consumers). The on-prem LOCAL-PIPELINE collectors for
-- LP #195 (RMM/managed-estate: Datto RMM, Datto BCDR, myITprocess) and LP #196
-- (security incidents MS↔Autotask + Purview posture) fail loudly until these bronze
-- landing tables exist. This migration creates them and nothing else.
--
-- CONVENTION (mirrors 0083_opportunity_bronze_model.sql, ADR-0039): every table is a
-- lossless-envelope bronze landing — flat text columns for the curated, server-queryable
-- subset + the lossless `raw_payload jsonb` carrying the true-typed original. Envelope =
-- tenant_id/source/external_id/collected_at/raw_payload/content_hash, PK
-- (tenant_id, source, external_id). The LP writes these; web/backend/cloud-pipeline read.
--
-- SCOPE: bronze landing tables only. NO silver entity is touched (so NO OKF concept-file
-- change — bronze tables are not silver entities). Silver merges / collectors live in the
-- LP + cloud-pipeline repos and are gated on this migration. Raw security logs and Purview
-- *alerts* are NOT ingested (KQL hunting stays native; exclusion per LP #196 — recorded on
-- purview_compliance_policies below). The 180-day retention prune for security rows is an
-- LP-side cmdlet (#196), not a DB constraint here.
--
-- Additive, idempotent (CREATE TABLE IF NOT EXISTS), transactional. No secrets.

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════════════
--  RMM / managed-estate (LP #195)
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── Datto RMM devices (managed-estate inventory + patch/AV posture) ───────────────────
CREATE TABLE IF NOT EXISTS datto_rmm_devices (
  device_uid        text,   -- Datto RMM device uid (join key for datto_bcdr_backups)
  hostname          text,
  site_name         text,
  operating_system  text,
  last_seen         text,
  patch_status      text,
  antivirus_status  text,
  agent_version     text,
  device_type       text,
  soft_delete       text,   -- archived/retired in Datto (bronze keeps the tombstone)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE datto_rmm_devices IS
  'Bronze: Datto RMM managed-estate device inventory + patch/AV posture (LP #195). external_id = device_uid; raw_payload is lossless. device_uid joins datto_bcdr_backups.';

-- ── Datto BCDR backup posture (per device) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS datto_bcdr_backups (
  device_uid           text,   -- joins datto_rmm_devices.device_uid
  protected_status     text,
  last_backup_at       text,
  last_good_backup_at  text,
  backup_type          text,
  agent_version        text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE datto_bcdr_backups IS
  'Bronze: Datto BCDR backup posture per device (LP #195). protected/unprotected + last-good-backup. device_uid joins datto_rmm_devices.';

-- ── myITprocess recommendations (strategic roadmap / QBR / assessment) ────────────────
CREATE TABLE IF NOT EXISTS myitprocess_recommendations (
  account_ref          text,   -- the Imperion account this recommendation belongs to
  assessment_name      text,
  recommendation_title text,
  category             text,
  priority             text,
  status               text,
  target_date          text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE myitprocess_recommendations IS
  'Bronze: myITprocess strategic roadmap / QBR / assessment recommendations → account (LP #195). account_ref joins the silver account.';

-- ════════════════════════════════════════════════════════════════════════════════════
--  Security incidents + posture (LP #196)
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── M365 security incidents (XDR/Sentinel) — correlate to Autotask (incident SoR) ─────
CREATE TABLE IF NOT EXISTS m365_incidents (
  incident_id          text,
  title                text,
  severity             text,
  status               text,
  classification       text,
  autotask_ticket_ref  text,   -- correlation key: Autotask is the incident system of record
  created_at           text,
  last_update_at       text,
  assigned_to          text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_incidents IS
  'Bronze: M365 XDR/Sentinel security incidents (LP #196). external_id = incident_id; autotask_ticket_ref correlates to the autotask_* ticket bronze (Autotask = incident SoR). Raw security logs + Purview alerts NOT ingested.';

-- ── M365 alerts (children of an incident) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_alerts (
  alert_id          text,
  incident_id       text,   -- joins m365_incidents.incident_id
  title             text,
  severity          text,
  category          text,
  mitre_techniques  text,
  detection_source  text,
  created_at        text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_alerts IS
  'Bronze: M365 XDR/Sentinel alerts (LP #196). external_id = alert_id; incident_id joins m365_incidents. mitre_techniques is the lossless flat projection; full detail in raw_payload.';

-- ── M365 evidence (entities/artifacts attached to an alert) ───────────────────────────
CREATE TABLE IF NOT EXISTS m365_evidence (
  evidence_id         text,
  alert_id            text,   -- joins m365_alerts.alert_id
  evidence_type       text,
  entity_value        text,
  verdict             text,
  remediation_status  text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_evidence IS
  'Bronze: M365 XDR/Sentinel evidence entities per alert (LP #196). external_id = evidence_id; alert_id joins m365_alerts.';

-- ── Purview compliance posture (config/compliance state ONLY — NO alerts) ─────────────
-- Follows the existing *_policies / *_golden posture pattern (cf. dns_zones/dns_golden,
-- 0080). This is posture, not incident data: the current compliance config state, plus a
-- golden-state snapshot for drift reconciliation.
CREATE TABLE IF NOT EXISTS purview_compliance_policies (
  policy_id         text,
  policy_name       text,
  policy_type       text,
  state             text,
  scope             text,
  last_modified_at  text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE purview_compliance_policies IS
  'Bronze: Microsoft Purview compliance posture — config/compliance STATE only (LP #196). NO Purview alerts and NO raw security logs are ingested (exclusion per LP #196; KQL hunting stays native). external_id = policy_id.';

-- Golden-state snapshot for Purview posture drift (same pattern as dns_golden, 0080).
CREATE TABLE IF NOT EXISTS purview_compliance_golden (
  policy_id         text,
  policy_name       text,
  policy_type       text,
  state             text,
  scope             text,
  last_modified_at  text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE purview_compliance_golden IS
  'Bronze: human-approved golden snapshot of the Purview compliance posture for drift reconciliation (LP #196, same drift pattern as dns_golden 0080). Posture only — no alerts.';

-- ════════════════════════════════════════════════════════════════════════════════════
--  Grants (0083 defensive pattern; roles may be absent in some envs)
-- ════════════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  all_tables text[] := ARRAY[
    'datto_rmm_devices','datto_bcdr_backups','myitprocess_recommendations',
    'm365_incidents','m365_alerts','m365_evidence',
    'purview_compliance_policies','purview_compliance_golden'];
  t text;
BEGIN
  -- Local-pipeline writes ALL of this bronze (it runs the LP #195/#196 collectors).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO "imperion-localpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role imperion-localpipeline absent — skipping LP grants.'; END IF;

  -- Web reads for display (BI hub / security-fleet sections).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrm-web-prd"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.'; END IF;

  -- Backend reads (orchestrator / agent picture).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmbackendfunction"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.'; END IF;

  -- Cloud-pipeline reads (bronze→silver merge consumes the bronze).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.'; END IF;
END $$;

COMMIT;
