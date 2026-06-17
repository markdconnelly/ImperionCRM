-- 0132: `cmdb_ci_overlay` — per-CI criticality / business-impact overlay (#648,
-- parent #372, ADR-0078; CMDB authority ADR authored in parallel under #646 / PR #812).
-- Migration number 0132 ASSIGNED for this slice (per system CLAUDE.md §10.3, the real
-- number is taken at MERGE — authored against this placeholder; if another migration
-- merges during the CI window, renumber this file and fix references).
--
-- WHY THIS EXISTS. #645 gave the CMDB a READ-ONLY Configuration Item (CI) register —
-- the `cmdb_ci` UNION over silver `account` / `contact` / `device` (NO `cmdb_ci` table;
-- a CI is a polymorphic `(ci_type, ci_id)` pair). #647 added `ci_relationship` (the
-- EDGE overlay). This slice adds the per-CI ATTRIBUTE overlay: a criticality /
-- business-impact rating per CI, the weighting input for impact analysis (#650).
--
-- ARCHETYPE: app-native overlay/sidecar keyed by the CI BUSINESS key — the twin of
-- `ci_relationship` (#647, migration 0131) and `collections_activity` (0122): an
-- app-owned table hung off a read-only projection. There is no `cmdb_ci` row to add a
-- column to, so this is ONE ROW PER CI keyed by `(ci_type, ci_id)` text (NOT FKs — a CI
-- is a projection, `ci_id` is unique only within a `ci_type`). A NEW overlay table
-- rather than extending `ci_relationship`: that table is the EDGE store (a row is an edge
-- between two CIs); criticality is a per-CI ATTRIBUTE (a row is one CI). Different grain,
-- different concern → a separate, single-row-per-CI table.
--
-- CRITICALITY = derived_default + nullable override (effective = override ?? derived_default).
--   * derived_default — computed from EXISTING silver attributes (the seed at the bottom;
--     also recomputable on demand via `crm.deriveCiCriticality()`). v1 rule, limited to the
--     silver signals a CI carries today:
--       - account → account.relationship (customer|partner|prospect) × lifecycle_stage:
--           customer & managed_active → high · customer (other stage) | partner → medium ·
--           prospect / unknown → low
--       - device  → device.device_type:  server|network → high · workstation|mobile|laptop|
--           desktop → medium · unknown → low
--       - user    → medium  (silver `contact` carries no seniority/role signal today; an
--           admin override is the escape hatch until such a signal lands — a future
--           front-end schema change, ADR-0042)
--     The IDENTICAL rule is encoded in `src/lib/cmdb/criticality.ts::deriveCriticality`
--     (the in-code read path + unit tests) so SQL and code never diverge.
--   * override — an admin's explicit rating (`cmdb:write`, ADR-0045). OVERRIDE SURVIVES
--     RE-DERIVATION: the derivation only ever rewrites `derived_default`; `override` is
--     never touched (the same survival pattern #647 used for manual edges). Nullable —
--     NULL means "no override, use the derived default".
--   The derived rule NEVER assigns 'critical' — a machine shouldn't silently declare a CI
--   business-critical; that level is reserved for an explicit human override.
--
-- WHAT THIS IS NOT:
--   * NOT a new CI store — CIs remain the read-only `cmdb_ci` union (#645). This stores
--     ONLY a per-CI criticality rating.
--   * NOT an IT Glue write path — app-native working copy. Pushing criticality out to
--     IT Glue is the separate, gated round-trip slice (a later #372 child).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. No secrets; no row-level PII (a row is
-- a CI business key + a rating — it mints no personal data of its own).

BEGIN;

-- ── ci_criticality: the business-impact scale ─────────────────────────────────────────
-- Ordered highest → lowest. An ENUM (not a CHECK) so the badge UI, the derivation, the
-- override action, and any impact-analysis job (#650) share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ci_criticality') THEN
    CREATE TYPE ci_criticality AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;
END $$;

-- ── cmdb_ci_overlay: one row per CI carrying its criticality overlay ────────────────────
-- Keyed by the polymorphic CI business key `(ci_type, ci_id)` — NOT FKs (a CI is the
-- read-only `cmdb_ci` union projection over silver, #645; there is no table to reference and
-- `ci_id` is unique only within a `ci_type`). `derived_default` is recomputed from silver;
-- `override` is the admin's sticky rating (NULL = use the derived default).
CREATE TABLE IF NOT EXISTS cmdb_ci_overlay (
  ci_type          text NOT NULL CHECK (ci_type IN ('account', 'user', 'device')),
  ci_id            text NOT NULL,
  -- Recomputed from silver attributes (the derivation rewrites this column only).
  derived_default  ci_criticality NOT NULL DEFAULT 'low',
  -- Admin's explicit rating; NULL = no override → effective = derived_default. NEVER
  -- touched by re-derivation.
  override         ci_criticality,
  -- Audit of the last override change (who/when) — populated by the override action.
  override_by      text,
  override_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- One overlay row per CI.
  CONSTRAINT cmdb_ci_overlay_pk PRIMARY KEY (ci_type, ci_id)
);
COMMENT ON TABLE cmdb_ci_overlay IS
  'CMDB per-CI criticality / business-impact overlay (#648, parent #372, ADR-0078): one row per Configuration Item keyed by the polymorphic CI business key (ci_type, ci_id text, NOT FKs — a CI is the read-only cmdb_ci union projection over silver, #645). derived_default = recomputed from silver attributes (account relationship×lifecycle, device_type); override = admin''s explicit rating (cmdb:write, sticky — survives re-derivation). Effective criticality = override ?? derived_default — the weighting input for impact analysis (#650). App-native working copy; IT Glue write-back is a separate gated slice. No PII, no secrets. Migration 0132.';
COMMENT ON COLUMN cmdb_ci_overlay.derived_default IS
  'Computed from silver attributes (account.relationship × lifecycle_stage; device.device_type). Recomputed by the derivation (rewrites THIS column only). Never ''critical'' — that level is reserved for an explicit override.';
COMMENT ON COLUMN cmdb_ci_overlay.override IS
  'Admin''s explicit criticality (cmdb:write). NULL = use derived_default. Survives re-derivation — the derivation never touches it. Effective criticality = override ?? derived_default.';

-- Register/impact lookups filter by effective criticality and by type — index both ends.
CREATE INDEX IF NOT EXISTS idx_cmdb_ci_overlay_override
  ON cmdb_ci_overlay (override);
CREATE INDEX IF NOT EXISTS idx_cmdb_ci_overlay_derived
  ON cmdb_ci_overlay (derived_default);

-- ── Grants: the app reads + writes (the register/detail badge + the admin override + the
--    on-demand derivation, ADR-0042); the backend reads + writes (a future CMDB/impact
--    agent, #650); the pipeline reads (observability of the app-native overlay; it does not
--    author CMDB curation). Defensive (roles may be absent), mirroring 0131's grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON cmdb_ci_overlay TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON cmdb_ci_overlay TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON cmdb_ci_overlay TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;

-- ── Derivation seed: derived_default recomputed from EXISTING silver attributes ─────────
-- Re-runnable and override-safe: UPSERT one overlay row per CI, rewriting ONLY
-- `derived_default` on conflict; `override` (+ its audit) is preserved. This is the same
-- query `crm.deriveCiCriticality()` runs on demand; running it here seeds the table at
-- apply time. The CASE expressions encode the IDENTICAL rule as
-- `src/lib/cmdb/criticality.ts::deriveCriticality`.

-- account → relationship × lifecycle
INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
SELECT 'account', a.id::text,
       (CASE
          WHEN a.relationship::text = 'customer' AND a.lifecycle_stage::text = 'managed_active' THEN 'high'
          WHEN a.relationship::text = 'customer' THEN 'medium'
          WHEN a.relationship::text = 'partner' THEN 'medium'
          ELSE 'low'
        END)::ci_criticality
  FROM account a
ON CONFLICT (ci_type, ci_id)
DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now();

-- device → device_type
INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
SELECT 'device', d.id::text,
       (CASE
          WHEN lower(d.device_type) IN ('server', 'network') THEN 'high'
          WHEN lower(d.device_type) IN ('workstation', 'mobile', 'laptop', 'desktop') THEN 'medium'
          ELSE 'low'
        END)::ci_criticality
  FROM device d
 WHERE d.account_id IS NOT NULL
ON CONFLICT (ci_type, ci_id)
DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now();

-- user → flat baseline (no silver seniority signal today)
INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
SELECT 'user', c.id::text, 'medium'::ci_criticality
  FROM contact c
 WHERE c.account_id IS NOT NULL
ON CONFLICT (ci_type, ci_id)
DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now();

COMMIT;
