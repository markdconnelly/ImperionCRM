-- 0165: Client Mapping foundation — backfill account_tenant → entity_xref (epic #1141, unit C).
-- Migration number 0165 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. "Client Mapping" (ADR-0112) is the unified, admin-curated link from a
-- connector's external unit (company / tenant / site / domain) → an `account`. Today the M365
-- instance of that link lives in its own table — `account_tenant` (0061, "Tenant Mapping",
-- ADR-0051): Microsoft tenant GUID → account. The identity spine `entity_xref` (0160, epic
-- #1049) is the canonical golden record an autonomous agent resolves before acting cross-client,
-- but the M365 tenant→account links are NOT in it yet. This migration backfills them so the
-- spine is complete: one `entity_xref` row per tenant mapping as
-- ('account', m365, <tenant_guid>) with match_method='manual' (these are human-curated links).
--
-- TRANSITION POSTURE (ADR-0112). `account_tenant` is NOT dropped or replaced by a view here.
-- It still has live WRITERS (the admin Settings → Tenant mapping surface, 0061) and READERS in
-- BOTH pipeline repos (cloud + on-prem posture merges resolve account→tenants by GUID). This
-- migration is purely ADDITIVE: it copies the links into the spine so curation can migrate to the
-- Client Mapping write path (unit D, backend ImperionCRM_Backend#295) without breaking those
-- consumers. The cutover (make `account_tenant` a view over `entity_xref`, or drop it once every
-- reader/writer moves onto the spine) is a deliberately deferred later slice of epic #1049 — see
-- ADR-0112 "Future considerations". Until then both stores carry the M365 links; backend writes
-- keep them in lock-step (unit D writes entity_xref and may dual-write account_tenant during the
-- overlap).
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). data_class-agnostic
-- (identity mapping, not business data). tenant GUID is a source identifier — NOT PII, NOT a
-- secret. account_tenant currently has 1 row in prod (home tenant); the spine is empty. DORMANT —
-- NOT prod-applied until Mark runs it (Mark-gated, standing turn-word).

BEGIN;

-- Backfill every account_tenant link into the identity spine as a manual M365 account link.
-- ON CONFLICT keeps this idempotent and re-runnable: a link already curated through the unit-D
-- Client Mapping write path (deterministic/fuzzy/manual) is the authority and is left untouched.
INSERT INTO entity_xref (entity_type, internal_entity_id, source_system, source_key,
                         match_method, match_confidence)
SELECT 'account', at.account_id, 'm365', at.tenant_id, 'manual', 1.000
FROM account_tenant AS at
ON CONFLICT (entity_type, source_system, source_key) DO NOTHING;

COMMIT;
