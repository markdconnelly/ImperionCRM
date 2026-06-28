-- 0219: platform-scope credentials — AI provider keys in the connection registry (#1400,
-- ADR-0129). Migration number 0219 claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS (ADR-0129). The AI provider keys (Voyage embeddings, Claude generation) lived
-- OUTSIDE the connection registry — hand-seeded App Service settings pointing at ad-hoc Key Vault
-- names (Voyage-Embedding-API-Key / Claude-Platform-API-Key-Main), needing Azure-portal privilege
-- to seed/rotate and drifting from the conn-* naming standard. ADR-0129 folds them into the
-- registry as a new system-wide `platform` scope: a custody-only row (no account, no sync cadence,
-- no poll, no bronze) so a non-Azure-privileged app-admin can seed/rotate the AI keys from the GUI
-- (the Connections page platform card, #1400), with the backend owning the canonical KV name
-- conn-platform-<provider>. The value is a RAW SCALAR (auth_method='api_key' — already admitted by
-- the CHECK since 0150), not a JSON blob; the registry resolver branches on auth_method.
--
-- This migration adds: (1) `platform` to connection_scope, (2) `voyage` + `anthropic` to
-- connection_provider. Platform rows carry account_id=NULL, auth_method='api_key', no cadence —
-- enforced by the app, not the schema (the columns already allow it).
--
-- No silver entity / bronze table → no OKF concept file (the semantic-layer gate does not apply).
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). No secrets — the AI
-- keys live in Key Vault by reference (ADR-0103/0129); only the enum labels are registered here.
-- The new labels are added but not used by any row in this transaction (rows are inserted later by
-- the backend store), so a single txn is correct (cf. 0149/0161). DORMANT — NOT prod-applied until
-- the orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

-- (1) The system-wide scope: a platform credential serves the whole installation (no account).
ALTER TYPE connection_scope ADD VALUE IF NOT EXISTS 'platform';

-- (2) The AI provider labels the platform-key card + registry resolver write.
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'voyage';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'anthropic';

COMMIT;
