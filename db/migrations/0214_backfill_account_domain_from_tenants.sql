-- 0214: back-fill account_domain from mapped tenants (#1387, epic #1366, ADR-0126).
--
-- Migration number 0214 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY. #1375 wired the account_domain derivation (account → account_tenant → entra_domains
-- verified domains) into the client-link action `linkClientMappingAction` — but it fires ONLY
-- on a NEW link. Every tenant mapped BEFORE #1375 shipped never had its domains derived, so
-- account_domain is empty in prod even though tenants are mapped. With it empty, the ADR-0126
-- client-communications filter (#1369) cannot match ANY client thread. This is the one-shot
-- back-fill for the already-mapped accounts; new links stay covered by #1375, and recurring
-- bulk re-derivation is the LocalPipeline sibling (LP ADR-0026).
--
-- WHAT. Exactly the #1375 derivation rule, but SET-BASED across every account_tenant row (no
-- per-account filter): verified, non-initial domains (the *.onmicrosoft.com INITIAL domain is
-- not a mail domain), lower-cased, idempotently inserted. ON CONFLICT (account_id, domain)
-- DO NOTHING preserves any operator-curated row + its note/provenance. created_by = 'derived:entra'
-- matches #1375 so the two paths are indistinguishable downstream. Pure DATA migration (no DDL —
-- does not trip the semantic-layer gate). Idempotent: a named re-run inserts nothing new.
-- account_domain is operational (domains, not PII); no message bodies, no secrets.

BEGIN;

WITH candidate AS (
  SELECT DISTINCT t.account_id, lower(d.domain_name) AS domain
    FROM account_tenant t
    JOIN entra_domains d ON d.tenant_id = t.tenant_id
   WHERE d.domain_name IS NOT NULL AND d.domain_name <> ''
     AND d.is_verified = 'true'
     AND COALESCE(d.is_initial, 'false') <> 'true'
)
INSERT INTO account_domain (account_id, domain, note, created_by)
SELECT c.account_id, c.domain,
       'Derived from M365 verified domains (ADR-0126) — back-fill #1387',
       'derived:entra'
  FROM candidate c
ON CONFLICT (account_id, domain) DO NOTHING;

COMMIT;
