-- 0188: entity-resolution spine slice — the resolver function + the external_identity backfill
-- (#1111, epic #1049). Migration number 0188 is a PLACEHOLDER claimed at MERGE per system
-- CLAUDE.md §10.3 — authored against the next free number; the rebased branch takes whatever is
-- free just before squash (parallel sessions may grab 0188+ concurrently).
--
-- WHY THIS EXISTS. The identity spine `entity_xref` (migration 0160, #1054) is the canonical
-- golden record an autonomous Technician (#1038) resolves BEFORE acting cross-client, but two
-- pieces the registry doc deferred as "follow-up slices of #1049" are still missing:
--
--   1. THE RESOLVER. The read contract in docs/database/entity-xref-registry.md is two raw
--      SELECTs every caller (every merge, the backend resolver API, the Technician) is expected
--      to re-implement. That spreads the uniqueness/precedence/forward-compat rules across N
--      call sites — exactly the distributed-resolution problem the spine exists to END. This
--      migration makes the forward lookup ONE grant-controlled, STABLE callable:
--      `entity_resolve(entity_type, source_system, source_key) -> internal_entity_id`. Every
--      consumer calls the function instead of hand-rolling the SELECT, so the matching rule has
--      exactly one home.
--
--   2. THE BACKFILL FROM external_identity. `external_identity` (migration 0020, ADR-0012/0024)
--      is the populated CRM-side identity store: "this account/contact is `external_id` in
--      provider X", written by the connector syncs. Those are already-resolved links — the
--      registry doc's backfill table names them as a spine seed. This migration copies them in
--      as `entity_type` account|contact, `source_system` = the provider, `match_method`
--      'deterministic' (already-resolved FK), confidence 1.000, idempotent ON CONFLICT DO
--      NOTHING. A human-curated `manual` link already in the spine WINS and is left untouched.
--
-- BITEMPORAL-SAFE SEAM (so #1112 does not have to change the signature). The resolver filters
-- `valid_from <= now()`; when #1112 adds `valid_to`, the predicate extends to
-- `now() < COALESCE(valid_to, 'infinity')` WITHOUT changing `entity_resolve`'s signature or any
-- caller. The function returns the single live mapping per the `uq_entity_xref_source` guarantee.
--
-- SCOPE: the forward resolver + the external_identity backfill ONLY. The reverse-expansion
-- (internal entity → all source identities) stays the indexed SELECT in the read contract (it
-- returns a set, not a scalar, and has no precedence rule to centralise). The merge-lineage
-- backfills (account/contact/device/opportunity per-source FKs) remain later slices.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). data_class
-- 'operational' (identity mapping, not business data). No PII, no secrets — source_key /
-- external_id are source-system identifiers. external_identity is EMPTY in prod today, so the
-- backfill moves 0 rows now and lights up as connectors hydrate it (deploy-dormant, like the
-- rest of the spine). DORMANT — NOT prod-applied until Mark runs it (Mark-gated, standing
-- turn-word).

BEGIN;

-- ── 1. The forward resolver ───────────────────────────────────────────────────────────────────
-- (source_system, source_key) within an entity_type → the one internal entity, or NULL when
-- unresolved. STABLE (no writes; safe in a read transaction) + SECURITY INVOKER (it reads only
-- entity_xref, which every consumer role can already SELECT — no privilege escalation). The
-- `valid_from <= now()` filter is the bitemporal seam for #1112. At most one row by
-- `uq_entity_xref_source`, so the scalar return is well-defined.
CREATE OR REPLACE FUNCTION entity_resolve(
  p_entity_type   text,
  p_source_system text,
  p_source_key    text
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT x.internal_entity_id
  FROM entity_xref AS x
  WHERE x.entity_type   = p_entity_type
    AND x.source_system = p_source_system
    AND x.source_key    = p_source_key
    AND x.valid_from   <= now()        -- bitemporal seam (#1112 extends to valid_to here)
  ORDER BY x.valid_from DESC           -- defensive: newest live mapping wins if ever >1
  LIMIT 1;
$$;

COMMENT ON FUNCTION entity_resolve(text, text, text) IS
  'Entity-resolution forward lookup (#1111, epic #1049): (entity_type, source_system, '
  'source_key) -> internal_entity_id, or NULL when unresolved. The ONE callable every merge / '
  'resolver / Technician uses to resolve a source identity to its internal entity before '
  'acting, so the matching rule has a single home. STABLE, reads only entity_xref. valid_from '
  '<= now() is the bitemporal seam #1112 extends. No PII, no secrets.';

-- ── 2. Backfill from external_identity (already-resolved CRM-side links) ─────────────────────────
-- external_identity (0020) maps a known account/contact to its id in a provider; those are
-- resolved FKs, so they seed the spine deterministically. provider (the connection_provider
-- enum) is the source_system; the subject column that is set decides entity_type. ON CONFLICT
-- keeps it idempotent and re-runnable: a link already curated through the Client-Mapping write
-- path (manual / higher authority) is left untouched — the spine row WINS over the backfill.
INSERT INTO entity_xref (entity_type, internal_entity_id, source_system, source_key,
                         match_method, match_confidence)
SELECT 'account', ei.account_id, ei.provider::text, ei.external_id, 'deterministic', 1.000
FROM external_identity AS ei
WHERE ei.account_id IS NOT NULL
ON CONFLICT (entity_type, source_system, source_key) DO NOTHING;

INSERT INTO entity_xref (entity_type, internal_entity_id, source_system, source_key,
                         match_method, match_confidence)
SELECT 'contact', ei.contact_id, ei.provider::text, ei.external_id, 'deterministic', 1.000
FROM external_identity AS ei
WHERE ei.contact_id IS NOT NULL
ON CONFLICT (entity_type, source_system, source_key) DO NOTHING;

-- ── 3. Least-privilege grants on the resolver (0160 defensive pattern; roles may be absent) ─────
-- Every role that can SELECT entity_xref may call the resolver (it reads only that table). Web
-- gets EXECUTE too: lineage / "same entity across systems" render paths resolve a single id.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT EXECUTE ON FUNCTION entity_resolve(text, text, text) TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT EXECUTE ON FUNCTION entity_resolve(text, text, text) TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT EXECUTE ON FUNCTION entity_resolve(text, text, text) TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT EXECUTE ON FUNCTION entity_resolve(text, text, text) TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
END $$;

COMMIT;
