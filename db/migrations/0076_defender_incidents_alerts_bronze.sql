-- 0076: Microsoft Defender incidents + alerts bronze + Autotask ticket linkage
-- (#256, ADR-0059; posture model ADR-0051).
--
-- Mark per-source review 2026-06-12: Defender alerts/incidents are bronze data that
-- layers with Autotask data per incident. The existing sentinel_* bronze (0038) is
-- Azure Sentinel rules/automation ONLY — it does not cover Defender incidents.
--
-- The on-prem collector (local-pipeline #138; SecurityIncident.Read.All /
-- SecurityAlert.Read.All already admin-consented) flattens Graph /security/incidents
-- and /security/alerts_v2 to the standard local-pipeline bronze envelope (0038/0069
-- contract): flat columns are text (loader stringifies; true types live in
-- raw_payload), PK (tenant_id, source, external_id), lossless raw payload +
-- content_hash. The collector self-gates until this is applied to prod.
--
-- Layering keys: defender_alerts.incident_external_id groups alerts under their
-- incident; defender_incident_ticket_link (ADR-0059) pairs an incident with the
-- Autotask ticket worked for it. The link lives OUTSIDE bronze — the loaders'
-- full-row upserts would clobber app/process-owned state on a bronze column — and
-- its PK (tenant_id, incident_external_id) is the sync-back idempotency key: at
-- most one ticket per incident, so ticket-creation flows that re-see the incident
-- (or re-ingest the created ticket) can never loop into a second ticket — the
-- same caution as tasks↔tickets.
--
-- Grants (0069 pattern — writer gets idempotent-upsert rights, never DELETE;
-- consumers get SELECT). Link writers: local pipeline (collector auto-link) and
-- backend functions (ticket-creation processes, ADR-0042).
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Bronze: Graph /security/incidents ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defender_incidents (
  display_name text, severity text, status text, classification text, determination text,
  assigned_to text, redirect_incident_id text, incident_web_url text,
  custom_tags text, system_tags text, description text, summary text, resolving_comment text,
  created_date_time text, last_update_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE defender_incidents IS
  'Bronze: Defender XDR incidents (Graph /security/incidents) via the on-prem collector (#256, local #138). Open = status not resolved/redirected.';

-- ── Bronze: Graph /security/alerts_v2 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defender_alerts (
  incident_external_id text, provider_alert_id text, title text, severity text, status text,
  classification text, determination text, category text, service_source text,
  detection_source text, detector_id text, assigned_to text, actor_display_name text,
  threat_display_name text, threat_family_name text, mitre_techniques text,
  alert_web_url text, incident_web_url text, description text, recommended_actions text,
  first_activity_date_time text, last_activity_date_time text,
  created_date_time text, last_update_date_time text, resolved_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE defender_alerts IS
  'Bronze: Defender XDR alerts (Graph /security/alerts_v2). incident_external_id groups alerts under their defender_incidents row (#256).';

-- Layering key: alerts → incident.
CREATE INDEX IF NOT EXISTS ix_defender_alerts_incident
  ON defender_alerts (tenant_id, incident_external_id);

-- ── Incident ↔ Autotask ticket linkage (ADR-0059) ────────────────────────────
-- PK (tenant_id, incident_external_id) = the idempotency key: one Autotask ticket
-- per incident. Writers must INSERT ... ON CONFLICT DO NOTHING (or check first);
-- an existing row means the ticket already exists — never create another.
CREATE TABLE IF NOT EXISTS defender_incident_ticket_link (
  tenant_id                   text NOT NULL,
  incident_external_id        text NOT NULL,
  autotask_ticket_external_id text NOT NULL,
  origin     text NOT NULL DEFAULT 'manual'
             CHECK (origin IN ('defender_to_autotask', 'autotask_to_defender', 'manual')),
  linked_by  text,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, incident_external_id)
);
COMMENT ON TABLE defender_incident_ticket_link IS
  'Defender incident → Autotask ticket pairing (ADR-0059). PK is the sync-back idempotency key: at most one ticket per incident, so ticket creation never loops.';

-- Reverse lookup: ticket → incident (ticket pages layer the Defender side in).
CREATE INDEX IF NOT EXISTS ix_defender_ticket_link_ticket
  ON defender_incident_ticket_link (autotask_ticket_external_id);

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON defender_incidents, defender_alerts,
      defender_incident_ticket_link TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON defender_incidents, defender_alerts,
      defender_incident_ticket_link TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON defender_incidents, defender_alerts TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE ON defender_incident_ticket_link
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON defender_incidents, defender_alerts,
      defender_incident_ticket_link TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
