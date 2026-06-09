-- One-time data cleanup: remove inactive IT Glue records that were loaded into the export
-- bronze. Inspection found the Autotask data is already active-only; on the IT Glue side the
-- only inactive entity is organization(s) with status 'Inactive' (configs had 0 archived).
-- This deletes those org(s) and their directly-owned configurations/contacts + relationship
-- edges. Idempotent (deletes nothing if none match). NOTE: going forward the local-pipeline
-- IT Glue export should filter to active records so inactive items don't re-land.

BEGIN;

CREATE TEMP TABLE _inactive_org ON COMMIT DROP AS
  SELECT external_id FROM itglue_export_organizations
   WHERE raw_payload->>'organization-status-name' = 'Inactive';

DELETE FROM itglue_export_relationship
 WHERE (from_type = 'organizations' AND from_id IN (SELECT external_id FROM _inactive_org))
    OR (to_type   = 'organizations' AND to_id   IN (SELECT external_id FROM _inactive_org));

DELETE FROM itglue_export_configurations WHERE organization_id IN (SELECT external_id FROM _inactive_org);
DELETE FROM itglue_export_contacts       WHERE organization_id IN (SELECT external_id FROM _inactive_org);
DELETE FROM itglue_export_organizations  WHERE external_id      IN (SELECT external_id FROM _inactive_org);

COMMIT;
