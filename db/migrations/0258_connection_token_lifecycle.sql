-- 0258: connection.token_issued_at / token_expires_at — self-expiring OAuth token
-- lifecycle timestamps (#1798; reads = FE #1502 Threads token-health badge, writes =
-- backend #497/#506 on connect/refresh).
--
-- WHY THIS EXISTS. FE #1502's connection card maps `token_issued_at`/`token_expires_at`
-- through the `connection` model (postgres-repositories.ts ConnectionDbRow), but no
-- migration ever added the columns — they resolve null and the health badge degrades to
-- "Expiry unknown" even after the backend knows the timestamps. Backend #497 records
-- issuedAt/expiresAt inside the KV blob (`conn-company-threads`) and surfaces them via
-- GET /api/connections/threads/status; persisting them onto the `connection` row (so the
-- FE's direct-DB render path lights up) needs the schema, which is FE-owned (§1/ADR-0042).
--
-- GENERIC, NOT THREADS-SPECIFIC: any custodied OAuth connection with a self-expiring
-- token may populate these (Threads is merely the first writer). TIMESTAMPS ONLY —
-- NEVER token material: the token/secret itself stays in Key Vault by reference
-- (`keyvault_secret_ref`, ADR-0103; backend token custody ADR-0102). NULL = lifecycle
-- unknown/not applicable (e.g. cert or api_key auth), so the change is purely additive
-- and backward-compatible.
--
-- Migration number 0258 was ASSIGNED in the coordinated schema batch with backend
-- #497/#506 (claimed-at-merge discipline, system CLAUDE.md §10.3 — if another migration
-- lands on this number first, renumber this file + the data-model.md/OKF references).
--
-- GRANTS: none needed — table-level grants cover new columns automatically. Backend
-- already holds SELECT/INSERT/UPDATE on connection (0047, +DELETE 0202) = the write
-- path for #506; web is SELECT-by-default (ADR-0127, 0216) = the #1502 read path;
-- pipeline SELECT/UPDATE (0049) and local-pipeline SELECT (0141) are unchanged.
-- Additive, idempotent, transactional. NOT prod-applied until Mark gates the apply.

BEGIN;

ALTER TABLE connection
  ADD COLUMN IF NOT EXISTS token_issued_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz NULL;

COMMENT ON COLUMN connection.token_issued_at IS
  'When the custodied OAuth token was issued (backend writes on connect/refresh, BE #497/#506). Timestamp ONLY — the token itself lives in Key Vault by keyvault_secret_ref (ADR-0102/0103), never here. NULL = unknown/not applicable.';
COMMENT ON COLUMN connection.token_expires_at IS
  'When the custodied OAuth token self-expires (drives the FE #1502 token-health badge; backend writes on connect/refresh, BE #497/#506). Timestamp ONLY — never token material (ADR-0102/0103). NULL = unknown/not applicable.';

COMMIT;
