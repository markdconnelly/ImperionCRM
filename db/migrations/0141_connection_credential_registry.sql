-- 0141: Connection credential-registry fields — client scope + account linkage +
-- cert-or-secret auth. (ADR-0103, issue #904 / epic #903.)
--
-- Extends the existing `connection` model (0020/0033) into the governed Key Vault
-- credential registry Mark asked for (2026-06-18): every custodied secret is legible
-- (the GUI lists its NAME via `keyvault_secret_ref`, never its value), classified by
-- SCOPE, and — for a managed customer — linked to the account object.
--
--   1. connection_scope += 'client' — the third scope. `user` = an employee's personal
--      connection; `company` = Imperion acting as its own first client; `client` = a
--      managed customer's connection. (Imperion sits on the border of system-creator and
--      first-client, so the distinction is persisted, not inferred.)
--   2. connection.account_id — FK→account (nullable; set for client scope). Many
--      connections → one account (e.g. several M365 tenants for one company). Complements
--      account_tenant (0061, tenant→account); the connection points at the account and
--      carries the KV secret name.
--   3. connection.auth_method + cert_thumbprint — the M365 enterprise app authenticates
--      by certificate OR client-secret (today cert-only in the local pipeline). auth_method
--      records which; cert_thumbprint holds the cert (the secret path reuses the existing
--      `keyvault_secret_ref`). Nullable — OAuth/token providers set neither.
--
-- KV naming standard (human-readable, names only): conn-<scope>-<provider>[-<tenantId|userId>]
-- e.g. conn-client-<tenantId>-m365, conn-company-qbo, conn-<userId>-mileiq. The GUI
-- (Settings Credentials catalog #905, Account panel #906) renders `keyvault_secret_ref` +
-- `display_name` + scope + linked account — NEVER the value (the token/secret lives only
-- in Key Vault, CLAUDE.md §5).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). connection is
-- infrastructure (not a silver OKF entity) — semantic-layer gate N/A. No secrets, no PII.
-- NOT prod-applied until run with an Entra token (issue #904).

BEGIN;

-- ── 1. Scope taxonomy: add the third scope ──────────────────────────────────
-- 'client' = a managed customer's connection (vs 'user' = personal, 'company' =
-- Imperion-as-its-own-client). ADD VALUE is not used elsewhere in this transaction.
ALTER TYPE connection_scope ADD VALUE IF NOT EXISTS 'client';

-- ── 2. Account linkage (many connections → one account) ─────────────────────
-- Nullable: set for client-scope connections (and any company connection an admin
-- chooses to attribute). ON DELETE SET NULL — deleting an account unlinks the credential
-- record but never reaches into Key Vault.
ALTER TABLE connection
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES account(id) ON DELETE SET NULL;
COMMENT ON COLUMN connection.account_id IS
  'Owning account for a client-scope connection (ADR-0103). Many connections → one account (e.g. multiple M365 tenants per company); complements account_tenant (0061). NULL for personal/most company connections.';
CREATE INDEX IF NOT EXISTS idx_connection_account ON connection (account_id) WHERE account_id IS NOT NULL;

-- ── 3. Cert-or-secret auth for the enterprise app ──────────────────────────
-- auth_method records how the M365 enterprise app authenticates; cert_thumbprint holds
-- the certificate (secret path reuses keyvault_secret_ref). Nullable — OAuth/token
-- providers (per-user M365 OAuth, QBO, MileIQ, …) set neither.
ALTER TABLE connection
  ADD COLUMN IF NOT EXISTS auth_method text
    CHECK (auth_method IS NULL OR auth_method IN ('certificate','secret')),
  ADD COLUMN IF NOT EXISTS cert_thumbprint text;
COMMENT ON COLUMN connection.auth_method IS
  'Enterprise-app auth method (ADR-0103): certificate | secret. NULL for OAuth/token-based connections. The M365 enterprise app supports both.';
COMMENT ON COLUMN connection.cert_thumbprint IS
  'Certificate thumbprint when auth_method=certificate (ADR-0103). The secret path reuses keyvault_secret_ref; the secret/token itself never touches the DB.';

-- ── Grants: local pipeline reads connection for the client-tenant estate discovery ──
-- The on-prem collectors enumerate client-scope M365 connections (joined to
-- account_tenant) to fan out per tenant (LP #234). Read-only — it never writes connection.
-- Web/backend/pipeline grants already exist (0020/0047/0049); the new columns inherit them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON connection TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grant.';
  END IF;
END $$;

COMMIT;
