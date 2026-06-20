-- 0149: add 'unifi' to connection_provider — UniFi consoles as a per-client read source.
-- (ADR-0103 credential registry; LocalPipeline #255 per-tenant resolver / #259 UniFi.)
--
-- The pipeline polls multiple UniFi consoles, each with the client's own API key, resolved
-- per tenant from the `connection` registry (scope='client', auth_method='secret', the API
-- key custodied in Key Vault by reference). UniFi is NOT an Entra app — it carries an API
-- key, so it reuses keyvault_secret_ref with external_account_id holding the console/site id.
-- This adds the provider label the GUI credential-entry form (#950 / FE #957) writes.
--
-- NOTE: `ALTER TYPE … ADD VALUE` commits the new enum label, but the label cannot be USED
-- until the transaction commits (PostgreSQL ≥12; target is 18). This migration only ADDS the
-- value — no row uses it here — so a single transaction is correct (cf. 0031_apollo_provider).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). connection is
-- infrastructure (no silver OKF concept file → semantic-layer gate not engaged). No grant
-- change (existing roles already SELECT/registry-write `connection`). No secrets, no PII.
-- NOT prod-applied until run with an Entra token.

BEGIN;
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'unifi';
COMMIT;
