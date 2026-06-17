-- 0136: Entra tenant hygiene — verified domains, app registrations, directory
-- role assignments (bronze) (#260; posture model ADR-0051; per-source bronze
-- ADR-0039; golden-baseline benchmark precedent ADR-0051 §3).
--
-- Mark per-source review: tenant hygiene (domain verification, app-registration
-- credential expiry, privileged role-assignment sprawl) is core MSP posture and
-- entirely absent today — no existing bronze covers tenant domains, app
-- registrations, or directory role assignments.
--
-- The on-prem collector (local-pipeline, Graph Directory.Read.All /
-- Application.Read.All / RoleManagement.Read.Directory) flattens
-- Graph /domains, /applications (+ keyCredentials/passwordCredentials expiry),
-- and /roleManagement/directory/roleAssignments (+ resolved roleDefinition) into
-- the standard local-pipeline bronze envelope (0038/0069/0077/0080 contract):
-- flat columns are text (the loader stringifies; true types + lossless payload
-- live in raw_payload), PK (tenant_id, source, external_id), content_hash. The
-- collector self-gates until this is applied to prod — so prod tables are EMPTY
-- until then and the GUI benchmark degrades to a grey "absent" state.
--
-- Account-scoped reads join through account_tenant (ADR-0051) and route through
-- the optional-enrichment seam (#301/#302): a not-yet-migrated table -> empty
-- card, never a blanked account page.
--
-- Grants (0077/0080 pattern — writer gets idempotent-upsert rights, never DELETE;
-- consumers get SELECT). Additive, idempotent, transactional. No secrets, no PII
-- beyond directory-object metadata (access-controlled, ADR-0039). Migration 0136.

BEGIN;

-- ── Bronze: Entra verified domains (Graph /domains) ───────────────────────────
CREATE TABLE IF NOT EXISTS entra_domains (
  domain_name text,
  is_verified text,                       -- 'true' when the domain is verified
  is_default text,                        -- 'true' for the tenant default domain
  is_initial text,                        -- 'true' for the *.onmicrosoft.com initial domain
  authentication_type text,               -- 'Managed' | 'Federated'
  supported_services text,                -- stringified array (Email, OfficeCommunicationsOnline, ...)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE entra_domains IS
  'Bronze: Entra verified domains (Graph /domains) via the on-prem collector (#260, ADR-0051). external_id = domain name (Graph domain id). Unverified domains are a hygiene flag; bronze stays all-text.';

-- ── Bronze: Entra app registrations (Graph /applications + credential expiry) ──
CREATE TABLE IF NOT EXISTS entra_app_registrations (
  app_id text,                            -- the application (client) id
  display_name text,
  sign_in_audience text,                  -- AzureADMyOrg | AzureADMultipleOrgs | ...
  publisher_domain text,
  created_date_time text,
  key_credential_count text,              -- count of certificate credentials
  password_credential_count text,         -- count of client secrets
  -- Earliest/next credential expiry across all key + password credentials (the
  -- hygiene signal: an expired credential blocks the app; one expiring soon needs
  -- rotation). Collector computes the min end date; null/empty when no creds.
  earliest_credential_expiry text,
  has_expired_credential text,            -- 'true' when any credential is already past expiry
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE entra_app_registrations IS
  'Bronze: Entra app registrations (Graph /applications) via the on-prem collector (#260, ADR-0051). external_id = the application object id. Credential expiry (earliest_credential_expiry / has_expired_credential) is the rotation-hygiene signal; bronze stays all-text (true types in raw_payload).';

CREATE INDEX IF NOT EXISTS ix_entra_app_registrations_tenant
  ON entra_app_registrations (tenant_id);

-- ── Bronze: Entra directory role assignments (Graph roleManagement) ───────────
CREATE TABLE IF NOT EXISTS entra_role_assignments (
  role_definition_id text,
  role_display_name text,                 -- resolved role name (e.g. 'Global Administrator')
  is_privileged text,                     -- 'true' when the role is a privileged directory role
  principal_id text,                      -- the assigned principal (user/group/SP) object id
  principal_type text,                    -- 'User' | 'Group' | 'ServicePrincipal'
  principal_display_name text,
  directory_scope_id text,                -- '/' = tenant-wide
  assignment_type text,                   -- 'Assigned' | 'Activated' (eligible vs active)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE entra_role_assignments IS
  'Bronze: Entra directory role assignments (Graph /roleManagement/directory/roleAssignments + resolved roleDefinition) via the on-prem collector (#260, ADR-0051). external_id = the role-assignment id. is_privileged + role_display_name drive role-assignment hygiene (e.g. Global Admin sprawl); bronze stays all-text.';

CREATE INDEX IF NOT EXISTS ix_entra_role_assignments_tenant
  ON entra_role_assignments (tenant_id);

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE
      ON entra_domains, entra_app_registrations, entra_role_assignments
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT
      ON entra_domains, entra_app_registrations, entra_role_assignments
      TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT
      ON entra_domains, entra_app_registrations, entra_role_assignments
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT
      ON entra_domains, entra_app_registrations, entra_role_assignments
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
