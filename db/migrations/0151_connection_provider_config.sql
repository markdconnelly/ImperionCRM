-- 0151: add connection.provider_config jsonb for per-connection NON-SECRET config (#962, ADR-0103).
-- Migration number 0151 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. If another
-- migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS. A per-client `connection` row carries the secret by REFERENCE
-- (`keyvault_secret_ref` = a Key Vault NAME) and identifiers (account_id, client_id |
-- external_account_id, auth_method). But some sources need NON-SECRET config to actually be
-- polled that none of those columns model — for UniFi: `connectionType` (console | cloud, which
-- API family) and `controllerHost` (the console host for the on-prem Network Integration API).
-- These are config, not secrets (so NOT the Key Vault secret) and not an identifier (so NOT the
-- console id). Because `connection` is a multi-provider registry, one generic jsonb column avoids
-- per-provider column sprawl: each provider stores the shape it needs.
--
-- UniFi (provider='unifi', client scope) stores:
--   { "connectionType": "console" | "cloud", "controllerHost": "<host>" }   (host only for console)
-- The backend custody endpoint (BE #229) writes it; the local-pipeline multi-console sweep
-- (LocalPipeline #259) reads it to pick the API family + host. Other providers may use it later.
--
-- INVARIANT: provider_config holds NON-SECRET config ONLY — never an API key, secret, token, or
-- password. Secrets live in Key Vault by reference (`keyvault_secret_ref`), CLAUDE.md §5 / the
-- "tokens live in Key Vault, never the DB" golden rule. There is no row-level PII here.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it.

BEGIN;

ALTER TABLE connection ADD COLUMN IF NOT EXISTS provider_config jsonb;

COMMENT ON COLUMN connection.provider_config IS
  'Per-connection NON-SECRET provider config (ADR-0103). UniFi: {connectionType:console|cloud, controllerHost}. Never holds a secret/key/token — secrets live in Key Vault by keyvault_secret_ref.';

COMMIT;
