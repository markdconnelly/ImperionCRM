-- 0150: allow `api_key` in connection.auth_method CHECK (#960, ADR-0103).
-- Migration number 0150 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. If another
-- migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS. `connection.auth_method` (migration 0141) admits only
-- ('certificate','secret') — the two ways the M365 enterprise app authenticates. UniFi client
-- consoles authenticate by API KEY, so a client-scope UniFi `connection` row (provider='unifi',
-- migration 0149) needs auth_method='api_key'. Today that value is rejected by the CHECK, so the
-- UniFi custody endpoint (backend #229) and the UniFi half of the credential-entry GUI cannot
-- write a row. The LP resolver `Resolve-ImperionTenantCredential` (LocalPipeline #257) already
-- implements the api_key branch (forward-looking, dormant until this lands).
--
-- Drop-then-add the Postgres-default constraint name (confirmed in prod:
-- `connection_auth_method_check`, currently
-- `CHECK (auth_method IS NULL OR auth_method IN ('certificate','secret'))`). Widening a CHECK
-- never fails validation against existing rows. Re-runnable: DROP IF EXISTS + ADD. Mirrors the
-- 0145 pattern.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. No secrets; no row-level PII (auth_method is
-- an enum-like label; the key/secret itself never touches the DB — keyvault_secret_ref is a NAME).

BEGIN;

ALTER TABLE connection DROP CONSTRAINT IF EXISTS connection_auth_method_check;
ALTER TABLE connection
  ADD CONSTRAINT connection_auth_method_check
  CHECK (auth_method IS NULL OR auth_method IN ('certificate', 'secret', 'api_key'));

COMMIT;
