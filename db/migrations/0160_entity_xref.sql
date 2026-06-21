-- 0160: entity-resolution golden-record registry — the canonical identity spine (#1054, epic #1049).
-- Migration number 0160 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. Entity resolution today is DISTRIBUTED: each silver merge carries its own
-- per-source FKs + match_confidence (ADR-0039), the CMDB has ci_relationship, and gold has
-- knowledge_object — but there is NO single golden record mapping every source identity to one
-- stable internal entity. An autonomous Technician acting across all clients (#1038) needs one
-- trustworthy identity spine so it never acts on the wrong "Acme": given (source_system,
-- source_key) it must resolve to exactly one internal entity, and given an internal entity it
-- must list every source identity that is the same thing.
--
-- `entity_xref` is that spine: one row per (entity_type, source_system, source_key) → one
-- internal_entity_id, with the confidence and method of the link. internal_entity_id is the
-- silver PK for that type (account.id, contact.id, device.id, cloud_asset.id, opportunity.id);
-- it is NOT a hard FK because the column is polymorphic across entity_type — referential
-- integrity is enforced per-type by the resolver/merge writers, not the column.
--
-- SCOPE: schema + uniqueness ONLY. Backfill from the existing merge FKs and the resolver API
-- that reads this are follow-up slices of #1049 (this PR is the ~400-line foundation). The
-- backfill plan + read contract are documented in
-- docs/database/entity-xref-registry.md (shipped in this PR).
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). data_class-agnostic
-- (identity mapping, not business data). source_key is a source-system identifier, NOT PII and
-- NOT a secret. DORMANT — NOT prod-applied until the orchestrator/Mark runs it (Mark-gated).

BEGIN;

CREATE TABLE IF NOT EXISTS entity_xref (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type        text NOT NULL
                       CHECK (entity_type IN ('account','contact','device','asset','opportunity')),
  internal_entity_id uuid NOT NULL,                  -- the silver PK for entity_type (polymorphic; no hard FK)
  source_system      text NOT NULL,                  -- 'website' | 'autotask' | 'itglue' | 'm365' | 'kqm' | 'qbo' | 'apollo' | 'pax8' | 'unifi' | …
  source_key         text NOT NULL,                  -- the entity's id WITHIN that source system
  match_confidence   numeric(4,3) NOT NULL DEFAULT 1.000
                       CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_method       text NOT NULL DEFAULT 'deterministic'
                       CHECK (match_method IN ('deterministic','fuzzy','manual')),
  valid_from         timestamptz NOT NULL DEFAULT now(),  -- when this mapping became authoritative (bitemporal is a later #1049 slice)
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- One source identity maps to exactly one internal entity (per type). This is the integrity
-- guarantee the Technician relies on: (entity_type, source_system, source_key) is unique.
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_xref_source
  ON entity_xref (entity_type, source_system, source_key);

-- The reverse lookup: every source identity for one internal entity.
CREATE INDEX IF NOT EXISTS entity_xref_internal_idx
  ON entity_xref (entity_type, internal_entity_id);

COMMENT ON TABLE entity_xref IS
  'Entity-resolution golden-record registry (#1054, epic #1049). One row per '
  '(entity_type, source_system, source_key) → one internal_entity_id (the silver PK for that '
  'type). The single identity spine an autonomous agent resolves before acting cross-client, '
  'replacing distributed per-merge resolution. internal_entity_id is polymorphic (no hard FK); '
  'integrity per-type is enforced by the resolver/merge writers. No PII, no secrets.';
COMMENT ON COLUMN entity_xref.internal_entity_id IS
  'The silver primary key for entity_type (account.id | contact.id | device.id | cloud_asset.id '
  '| opportunity.id). Polymorphic across entity_type, so not a hard FK.';
COMMENT ON COLUMN entity_xref.source_key IS
  'The entity''s identifier within source_system (e.g. Autotask company id, M365 tenant/user id, '
  'KQM/QBO/IT Glue/Pax8 id, device serial). A source identifier — not PII, not a secret.';

-- ── Least-privilege grants (0154 defensive pattern; roles may be absent in some envs) ─
DO $$
BEGIN
  -- Backend MI runs the resolver (reads to resolve; writes/curates links).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON entity_xref TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- The cloud Pipeline merges adopt the spine (read to resolve; write links during merge).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON entity_xref TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grants.';
  END IF;

  -- The on-prem LocalPipeline bulk merges likewise adopt the spine.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON entity_xref TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  -- Web reads for rendering (lineage / "same entity across systems" panels); never writes.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON entity_xref TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
