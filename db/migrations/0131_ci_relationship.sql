-- 0131: `ci_relationship` — the CMDB relationship (edge) layer (#647, parent #372,
-- ADR-0078; CMDB authority ADR authored in parallel under #646).
-- Migration number 0131 claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch took the next free number just before
-- squash. If another migration merges during the CI window, renumber this file.
--
-- WHY THIS EXISTS. #645 gave the CMDB a READ-ONLY Configuration Item (CI) register —
-- a `cmdb_ci` UNION read-model projected over silver `account` / `contact` / `device`
-- (NO `cmdb_ci` table; the union lives in `listConfigurationItems`). A CI is therefore
-- a polymorphic `(ci_type, ci_id)` pair, NOT a row of its own. This slice adds the
-- relationship layer: a typed, directional EDGE store between CIs. Unlike the register,
-- the relationship layer IS persisted (it is curated knowledge — derived AND manually
-- authored — that has nowhere in silver to live), so this is the CMDB's first real table.
--
-- ARCHETYPE: app-native overlay/curation layer keyed by BUSINESS keys to the read-model
-- (the twin of `collections_activity`, migration 0122 — an app-owned sidecar hung off a
-- read-only projection). CIs are projections, so the endpoint columns are
-- `(from_ci_type, from_ci_id)` / `(to_ci_type, to_ci_id)` text pairs — NOT FKs (there is
-- no `cmdb_ci` table to reference, and `ci_id` is unique only within a `ci_type`). The
-- app validates both endpoints exist in `listConfigurationItems` before an INSERT.
--
-- EDGES ARE DIRECTIONAL. `from -> to` carries an oriented `relation_type` read forward
-- (e.g. a device `belongs-to` an account; a user `belongs-to` an account). The CI-detail
-- "Relationships" panel and the neighbourhood graph query BOTH directions for a CI
-- (`from_ci = X OR to_ci = X`) and render the edge from that CI's point of view.
--
-- SOURCE = derived | manual.
--   * derived — auto-seeded from EXISTING silver foreign keys (the seed block at the
--     bottom of this migration; also re-runnable on demand via
--     `crm.deriveCiRelationships()`). v1 derivations, limited to the FKs silver actually
--     carries today:
--       - device  belongs-to account   (device.account_id)
--       - user    belongs-to account   (contact.account_id)
--     NOTE: the issue also names device -> assigned-user (`assigned-to`). Silver `device`
--     carries NO assigned-user FK today (migration 0036 — only `account_id`), so that
--     derivation is intentionally OMITTED rather than fabricated; it lands when/if a
--     device->user link is added to silver (a future front-end schema change, ADR-0042).
--   * manual — authored/overridden by an admin (`cmdb:write`, ADR-0045). MANUAL EDGES
--     SURVIVE RE-DERIVATION: the derivation deletes + reinserts ONLY `source='derived'`
--     rows (WHERE source = 'derived'); manual rows are never touched. The unique key is
--     also scoped by `source`, so a manual edge and a derived edge with the same shape can
--     coexist (manual = a deliberate human assertion, derived = a recomputable projection).
--
-- WHAT THIS IS NOT:
--   * NOT a new CI store — CIs remain the read-only `cmdb_ci` union (#645). This table
--     stores ONLY the edges between them.
--   * NOT an IT Glue write path — this is the app-native working copy. Pushing edges out
--     to IT Glue is the separate, gated round-trip slice (a later #372 child).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. No secrets; no row-level PII (an edge
-- is two CI business keys + a relation type — it mints no personal data of its own).

BEGIN;

-- ── ci_relation_source: how an edge got into the table ──────────────────────────────────
-- derived = recomputed from silver FKs (replaceable) · manual = human-authored (sticky).
-- An ENUM (not a CHECK) so the panel UI, the derivation, and any agent share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_relation_source') THEN
    CREATE TYPE ci_relation_source AS ENUM ('derived', 'manual');
  END IF;
END $$;

-- ── ci_relationship: a typed, directional edge between two Configuration Items ──────────
-- Endpoints are polymorphic CI business keys (type + id text), NOT FKs — a CI is a
-- projection over silver (#645), there is no `cmdb_ci` table to reference, and `ci_id` is
-- unique only within a `ci_type`. The app validates both endpoints exist in the CI union
-- before insert.
CREATE TABLE IF NOT EXISTS ci_relationship (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FROM endpoint (the subject of the oriented relation_type).
  from_ci_type  text NOT NULL CHECK (from_ci_type IN ('account', 'user', 'device')),
  from_ci_id    text NOT NULL,
  -- TO endpoint (the object).
  to_ci_type    text NOT NULL CHECK (to_ci_type IN ('account', 'user', 'device')),
  to_ci_id      text NOT NULL,
  -- The oriented relation, read FROM -> TO (e.g. 'belongs-to', 'assigned-to', 'runs',
  -- 'depends-on'). A loose vocabulary string (product/CMDB convention), not an enum, so new
  -- relation types don't need a migration; the app supplies a curated pick-list.
  relation_type text NOT NULL,
  source        ci_relation_source NOT NULL DEFAULT 'manual',
  -- Optional human note on a manual edge (why this dependency exists). NULL for derived.
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- An edge can't point a CI at itself.
  CONSTRAINT ci_relationship_no_self_loop CHECK (
    NOT (from_ci_type = to_ci_type AND from_ci_id = to_ci_id)
  ),
  -- One edge per (from, to, relation_type, source): re-derivation UPSERTs derived rows
  -- without duplicating, and a manual edge of the same shape coexists with a derived one
  -- (source is part of the key) so a human assertion is never silently merged into a
  -- recomputable projection.
  CONSTRAINT ci_relationship_edge_uq UNIQUE (
    from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source
  )
);
COMMENT ON TABLE ci_relationship IS
  'CMDB relationship layer (#647, parent #372, ADR-0078): a typed, directional edge between two Configuration Items. Endpoints are polymorphic CI business keys (from/to ci_type+ci_id text, NOT FKs — a CI is the read-only cmdb_ci union projection over silver, #645). source = derived (auto-seeded from silver FKs, recomputable) | manual (human-authored via cmdb:write, sticky). Re-derivation replaces ONLY source=derived rows, so manual edges survive. App-native working copy — pushing edges to IT Glue is a separate gated slice. No PII, no secrets. Migration 0131.';
COMMENT ON COLUMN ci_relationship.relation_type IS
  'Oriented relation read from -> to (belongs-to | assigned-to | runs | depends-on | …). Loose vocabulary string (product convention), not an enum — new types need no migration; the app supplies a curated pick-list.';
COMMENT ON COLUMN ci_relationship.source IS
  'derived = recomputed from silver FKs (replaced on re-derivation) · manual = human-authored (cmdb:write, never touched by derivation). Part of the unique key so a manual edge and a derived edge of the same shape coexist.';

-- Neighbourhood lookups for a CI hit BOTH endpoints — one index per direction so
-- "edges where this CI is the from" and "…the to" are both index-served.
CREATE INDEX IF NOT EXISTS idx_ci_relationship_from
  ON ci_relationship (from_ci_type, from_ci_id);
CREATE INDEX IF NOT EXISTS idx_ci_relationship_to
  ON ci_relationship (to_ci_type, to_ci_id);
-- Re-derivation deletes by source; index it so the replace is cheap.
CREATE INDEX IF NOT EXISTS idx_ci_relationship_source
  ON ci_relationship (source);

-- ── Grants: the app reads + writes (the CI-detail panel authors manual edges and runs the
--    on-demand derivation, ADR-0042); the backend reads + writes (a future CMDB/impact
--    agent); the pipeline reads (observability of the app-native overlay; it does not
--    author CMDB curation). Defensive (roles may be absent), mirroring 0122's grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ci_relationship TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ci_relationship TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON ci_relationship TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;

-- ── Derivation seed: edges recomputed from EXISTING silver FKs ──────────────────────────
-- Re-runnable and manual-safe: delete ONLY source='derived' rows, then reinsert from the
-- current silver state. Manual edges (source='manual') are never touched. This is the same
-- query `crm.deriveCiRelationships()` runs on demand from the CI-detail panel; running it
-- here seeds the table at apply time. ON CONFLICT keeps it idempotent even if the delete is
-- skipped on a partial re-run.
DELETE FROM ci_relationship WHERE source = 'derived';

-- device belongs-to account (device.account_id)
INSERT INTO ci_relationship
  (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
SELECT 'device', d.id::text, 'account', d.account_id::text, 'belongs-to', 'derived'
  FROM device d
 WHERE d.account_id IS NOT NULL
ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
DO NOTHING;

-- user belongs-to account (contact.account_id)
INSERT INTO ci_relationship
  (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
SELECT 'user', c.id::text, 'account', c.account_id::text, 'belongs-to', 'derived'
  FROM contact c
 WHERE c.account_id IS NOT NULL
ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
DO NOTHING;

COMMIT;
