-- 0077: Entra auth methods bronze — per-user MFA registration state
-- (#258; posture model ADR-0051).
--
-- Mark per-source review 2026-06-12: auth methods / MFA state should be visible
-- on the company asset. Domain entirely absent today — no existing bronze covers
-- per-user authentication-method registration.
--
-- The on-prem collector (local-pipeline #140; UserAuthenticationMethod.Read.All)
-- flattens Graph /reports/authenticationMethods/userRegistrationDetails — ONE
-- call per tenant covers every user's isMfaRegistered / isMfaCapable /
-- methodsRegistered / preferred-method state — to the standard local-pipeline
-- bronze envelope (0038/0069 contract): flat columns are text (loader
-- stringifies; true types live in raw_payload), PK (tenant_id, source,
-- external_id) where external_id = the Entra user object id, lossless raw
-- payload + content_hash. The collector self-gates until this is applied to prod.
--
-- Grants (0069/0076 pattern — writer gets idempotent-upsert rights, never
-- DELETE; consumers get SELECT).
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Bronze: Graph /reports/authenticationMethods/userRegistrationDetails ─────
CREATE TABLE IF NOT EXISTS entra_auth_methods (
  user_principal_name text, user_display_name text, user_type text, is_admin text,
  is_mfa_capable text, is_mfa_registered text,
  is_passwordless_capable text,
  is_sspr_capable text, is_sspr_enabled text, is_sspr_registered text,
  is_system_preferred_authentication_method_enabled text,
  system_preferred_authentication_methods text,
  methods_registered text,
  user_preferred_method_for_secondary_authentication text,
  last_updated_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE entra_auth_methods IS
  'Bronze: per-user MFA registration state (Graph /reports/authenticationMethods/userRegistrationDetails) via the on-prem collector (#258, local #140). external_id = Entra user object id. MFA registered = is_mfa_registered ''true'' (case-folded — bronze is all-text).';

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON entra_auth_methods TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON entra_auth_methods TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON entra_auth_methods TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON entra_auth_methods TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
