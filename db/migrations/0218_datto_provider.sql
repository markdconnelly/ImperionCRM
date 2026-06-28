-- 0218: Datto as a first-class company-credential provider (#1569, epic #1256 S4, ADR-0122).
-- Migration number 0218 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. If another
-- migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS. The connections catalog renders Datto as TWO "Planned" cards
-- (`dattoendpoint` = endpoint backups, `dattosaas` = SaaS backups) but there was no way to
-- enter the key: no `datto` connection_provider label, so the company-credential save path
-- (FE saveCredentialAction → backend /credentials) could not custody it. ADR-0122 settles
-- "Datto = TWO cards over ONE company key + per-client data mapping" — so ONE `datto`
-- provider (one Key Vault secret `conn-company-datto`) backs both Endpoint and SaaS views.
-- This adds only the enum label the company-credential UI + credential registry write
-- (ADR-0103); the per-source bronze tables + collectors + merge are a later build (the two
-- catalog cards stay flagged `planned` until then).
--
-- No silver entity, no bronze table in this migration → no OKF concept file (the
-- semantic-layer gate does not apply). The two Planned catalog cards already carry the
-- ⏳ coverage intent.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). No secrets — the
-- Datto credential lives in Key Vault by reference (ADR-0103); only the `datto` enum label is
-- registered here. The label is added but not used by any row in this transaction, so a single
-- txn is correct (cf. 0149/0161). DORMANT — NOT prod-applied until the orchestrator/Mark runs
-- it (each prod apply is Mark-gated).

BEGIN;

-- The provider label the company-credential UI + credential registry write. ONE label backs
-- both Datto catalog views (endpoint + SaaS) over the single `conn-company-datto` secret.
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'datto';

COMMIT;
