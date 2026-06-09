-- Related-bronze citation views for contacts (and devices, for when the device UI lands),
-- mirroring account_related_bronze from 0038. Lets a merged contact surface the local-pipeline
-- bronze that feeds its wider picture (Autotask tickets it's on, IT Glue contact doc), each
-- drillable to the raw payload for troubleshooting. Depends on 0038 (autotask_tickets,
-- itglue_export_*). Additive, idempotent, transactional. No secrets.

BEGIN;

CREATE INDEX IF NOT EXISTS ix_autotask_tickets_contact ON autotask_tickets (contact_id);

-- A merged contact's related local-pipeline bronze (joins the contact's per-source external_ref
-- from contact_bronze_all to the bronze that references the same external id).
CREATE OR REPLACE VIEW contact_related_bronze AS
  SELECT cb.contact_id, 'autotask_ticket'::text AS kind, t.external_id AS external_ref,
         t.title AS label, t.raw_payload AS payload_bronze, t.collected_at AS last_seen_at
    FROM contact_bronze_all cb
    JOIN autotask_tickets t ON t.contact_id = cb.external_ref
   WHERE cb.source = 'autotask' AND cb.external_ref IS NOT NULL
  UNION ALL
  SELECT cb.contact_id, 'itglue_contact', ic.external_id,
         ic.name, ic.raw_payload, ic.collected_at
    FROM contact_bronze_all cb
    JOIN itglue_export_contacts ic ON ic.external_id = cb.external_ref
   WHERE cb.source = 'itglue' AND cb.external_ref IS NOT NULL;

COMMENT ON VIEW contact_related_bronze IS
  'Per-contact citations into local-pipeline bronze (Autotask tickets, IT Glue contact doc) for drill-down troubleshooting (migration 0038/0039).';

-- A merged device's related bronze (IT Glue configuration record). No device UI yet — created
-- now so the device detail page can surface citations without a later migration.
CREATE OR REPLACE VIEW device_related_bronze AS
  SELECT db.device_id, 'itglue_config'::text AS kind, cfg.external_id AS external_ref,
         cfg.name AS label, cfg.raw_payload AS payload_bronze, cfg.collected_at AS last_seen_at
    FROM device_bronze_all db
    JOIN itglue_export_configurations cfg ON cfg.external_id = db.external_ref
   WHERE db.source = 'itglue' AND db.external_ref IS NOT NULL;

COMMENT ON VIEW device_related_bronze IS
  'Per-device citations into local-pipeline bronze (IT Glue configuration) for drill-down troubleshooting (migration 0038/0039).';

COMMIT;
