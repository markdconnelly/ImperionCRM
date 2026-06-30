-- 0238: `brand_asset` silver — the human-owned, AGENT-READ-ONLY governing brand registry
-- (#1699, epic #1696, decision D5).
-- The single source of truth for the brand: logos, imagery/templates, color/type tokens,
-- messaging pillars, approved boilerplate, and do/don't rules — versioned + point-in-time
-- auditable (effective_from/effective_to). Substrate for content-studio's brand-compliance
-- review-gate and Vera's marketing-conformance audit; the existing `brand-voice.md` runtime
-- skill is the prose companion that points HERE as system-of-truth.
--
-- THE CRITICAL INVARIANT (D5): **no agent ever writes this table.** There is NO agent write
-- path, NO autonomous-action kind, ever. Agents ONLY read it. The invariant is enforced at the
-- GRANT layer below — every role, including the backend/agent runtime, gets SELECT only; no
-- role gets INSERT/UPDATE/DELETE in this migration. The human populate surface (an admin GUI /
-- seed, a future write-bearing role) is a follow-up per #1699 and is deliberately NOT granted
-- here — it is the ONLY write path and it does not exist yet.
--
-- Migration number 0238 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- ARCHETYPE: app-native, human-curated single-source-of-record silver (archetype B). Real
-- persisted rows with a uuid PK. No FKs out — it is a standalone governing registry, referenced
-- read-only. No binary blobs in the DB: `asset_ref` holds an EXTERNAL pointer (DAM/SharePoint
-- URL) to any binary asset; textual assets (rules/tokens/pillars/boilerplate) live in `content`.
--
-- New silver entity → a NEW OKF concept file (docs/database/semantic-layer/tables/brand_asset.md)
-- + a coverage-matrix row in THIS PR (system CLAUDE.md §11; semantic-layer gate). Frontend-owned
-- schema (ADR-0042). Additive + idempotent + transactional. No PII (brand governance, not
-- personal). No secrets. data_class OPERATIONAL.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── brand_asset_kind: the governed asset categories ───────────────────────────────────────
-- An ENUM so the brand admin surface + content-studio's review-gate + Vera's audit share one
-- vocabulary for what kind of brand asset a row is.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brand_asset_kind') THEN
    CREATE TYPE brand_asset_kind AS ENUM (
      'logo', 'imagery', 'template', 'color_token', 'type_token',
      'messaging_pillar', 'boilerplate', 'rule'
    );
  END IF;
END $$;

-- ── brand_asset: human-owned, agent-read-only governing brand registry ────────────────────
CREATE TABLE IF NOT EXISTS brand_asset (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            brand_asset_kind NOT NULL,
  name            text NOT NULL,
  -- The textual asset itself: the rule text / token value / messaging pillar / boilerplate copy.
  content         text,
  -- External pointer (DAM/SharePoint URL) to a binary asset (logo/image/template file).
  -- NO blob ever lives in the DB — store the URL only.
  asset_ref       text,
  version         int  NOT NULL DEFAULT 1,
  effective_from  date,
  effective_to    date,                                  -- null = currently effective; point-in-time auditable
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE brand_asset IS
  'Human-owned, AGENT-READ-ONLY governing brand registry (#1699, D5): logos/imagery/templates/color+type tokens/messaging pillars/approved boilerplate/do-dont rules — versioned + effective_from/to for point-in-time audit. NO agent write path EVER — every role (incl. backend/agent runtime) has SELECT only; the human populate surface (admin GUI/seed, a future write-bearing role) is a follow-up per #1699 and is the ONLY write path, deliberately NOT granted here. No binary in DB — asset_ref points to the DAM. Archetype B (app-native, human-curated), OPERATIONAL data_class. No PII, no secrets. Migration 0238 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_brand_asset_kind           ON brand_asset (kind);
CREATE INDEX IF NOT EXISTS idx_brand_asset_effective_from ON brand_asset (effective_from);

-- ── updated_at trigger (the 0210/0223/0226/0227 convention) ───────────────────────────────
DROP TRIGGER IF EXISTS trg_brand_asset_updated ON brand_asset;
CREATE TRIGGER trg_brand_asset_updated BEFORE UPDATE ON brand_asset
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: SELECT ONLY to EVERY role — the D5 read-only invariant enforced at the grant ──
-- This is the KEY part of the migration. No role gets INSERT/UPDATE/DELETE: agents (the backend
-- runtime) READ the brand registry, they NEVER write it. Defensive (roles may be absent),
-- mirroring 0227's block — but with backend reduced to SELECT only.
--
-- The human populate surface (a future admin role / seed per #1699) is the ONLY write path and
-- is deliberately NOT granted here. No agent or app role gets write in this migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON brand_asset TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  -- D5: backend = the agent runtime. SELECT ONLY — agents read the brand registry, never write it.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON brand_asset TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON brand_asset TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON brand_asset TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
