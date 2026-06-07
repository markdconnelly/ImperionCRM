-- Grant the App Service user-assigned managed identity access to the database.
-- Environment-specific (imperioncrm-pg-prd): identity "mgid-imperioncrm-web-prd"
-- (clientId 5efd13c7-2847-4d22-b3e4-6674013b73c7, principalId
-- 4fc3a0ac-2349-4bf7-9ec2-3c6be27985da). The app connects via an Entra token from
-- this identity (no password). ADR-0016 / ADR-0017.
--
-- PREREQUISITE (one-time bootstrap, run as an Entra admin against the `postgres`
-- database, where the pgaadauth functions live — see db/README.md):
--   CREATE ROLE "mgid-imperioncrm-web-prd" WITH LOGIN;
--   SELECT pgaadauth_update_principal_with_oid(
--     'mgid-imperioncrm-web-prd',
--     '4fc3a0ac-2349-4bf7-9ec2-3c6be27985da','service',false,false);
--
-- This migration runs against `imperioncrm` and only grants privileges to that
-- role (which is cluster-wide). Idempotent.

GRANT CONNECT ON DATABASE imperioncrm           TO "mgid-imperioncrm-web-prd";
GRANT USAGE  ON SCHEMA public                   TO "mgid-imperioncrm-web-prd";
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public                TO "mgid-imperioncrm-web-prd";
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public             TO "mgid-imperioncrm-web-prd";

-- Future tables/sequences created by later migrations inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES   TO "mgid-imperioncrm-web-prd";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES                 TO "mgid-imperioncrm-web-prd";
