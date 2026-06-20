-- 0147: connection.client_id — the client tenant's Entra app/client id for per-client
-- M365 app registrations. (ADR-0103, issue #943 / epic #903; backend #217 / PR #224.)
--
-- Per-client-app model (Mark, 2026-06-19): each managed client tenant has its OWN Entra
-- app registration — a distinct application (client) id plus its own credential (secret or
-- certificate, custodied in Key Vault by reference). The backend custody endpoint
-- `POST /api/connections/client/m365` (ImperionCRM_Backend #217 / PR #224) writes the
-- `client`-scope m365 `connection` row but, until now, had no dedicated home for the app id,
-- so it parked it on the free-form `external_account_id` as a schema-compatible interim.
--
-- This adds the first-class column. It is the public Entra **application (client) id** — an
-- identifier, NOT a secret: the secret/cert path still reuses `keyvault_secret_ref` /
-- `cert_thumbprint` and the secret value never touches the DB. Set for `scope='client'` rows;
-- NULL otherwise (company/user connections do not carry a per-client app id).
--
-- The GUI (Settings Credentials catalog #905, Account panel #906) renders this id alongside
-- the KV secret NAME + scope + provider + linked account — NEVER a secret value (CLAUDE.md §5).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). connection is
-- infrastructure (not a silver OKF entity, but it has a concept file — its column list is
-- updated in the same PR). No grant change needed: existing roles already SELECT `connection`
-- (0020/0047/0049/0141) and the new column inherits those grants. No secrets, no PII.
-- NOT prod-applied until run with an Entra token.

BEGIN;

-- ── Per-client Entra application (client) id ────────────────────────────────
-- Public identifier for the client tenant's own app registration. NULL for non-client
-- connections. The credential (secret/cert) lives in Key Vault by reference, not here.
ALTER TABLE connection
  ADD COLUMN IF NOT EXISTS client_id text;
COMMENT ON COLUMN connection.client_id IS
  'Entra application (client) id of the client tenant''s own app registration (ADR-0103, per-client-app model). Set for scope=client M365 connections; NULL otherwise. A public identifier, NOT a secret — the credential reuses keyvault_secret_ref/cert_thumbprint and never touches the DB. Supersedes the interim use of external_account_id (backend #217 / PR #224).';

COMMIT;
