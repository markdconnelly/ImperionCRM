-- 0236: `content_asset` silver — the single typed home for Belle's authored marketing artifacts
-- (#1697, epic #1696, decisions D2/D3). Content + sales-enablement + PR-authoring all in ONE entity,
-- differing only by `type`/`audience`: a blog/case_study/whitepaper for prospects, a
-- battlecard/one_pager for sellers, a press_release/announcement for press. The authored draft lives
-- in `body`; PUBLISH is a HANDOFF to Loveable (store the rendered `publish_ref` URL) — NOT a send.
-- Imperion owns the asset + its attribution lineage; Loveable only renders (D3).
--
-- Migration number 0236 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B). Real persisted rows with a
-- uuid PK, born silver — there is no bronze source; Belle authors the content in-app. `campaign_id`
-- FKs `campaign` (attribution asset→campaign→lead→won, #1316); `created_by_user_id` FKs `app_user`.
--
-- WHO WRITES IT. App-native: Belle's content.write executor writes it server-side, approval-gated
-- (a content-studio review-gate); NEVER a direct silver write. Read-only to web for render.
-- data_class OPERATIONAL.
--
-- NOTE: a `backed_by_reference_id` column (link to the `reference` that backs a case_study) is
-- ADDED LATER by migration 0237 — that reference migration owns the bidirectional link, to avoid a
-- circular FK. It is intentionally NOT added here.
--
-- New silver entity → its OKF concept file (docs/database/semantic-layer/tables/content_asset.md)
-- + a coverage-matrix row land in THIS PR (system CLAUDE.md §11; semantic-layer gate). This branch
-- writes the concept; the matrix row is the other half of the PR. Frontend-owned schema (ADR-0042).
-- Additive + idempotent + transactional. No PII, no secrets. DORMANT — NOT prod-applied until the
-- orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── content_asset_type: the typed kind of authored artifact ───────────────────────────────────
-- Content (blog/case_study/whitepaper), sales-enablement (battlecard/one_pager), PR-authoring
-- (press_release/announcement) — one vocabulary shared by the content-studio surface + Belle's
-- content.write procedure.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_asset_type') THEN
    CREATE TYPE content_asset_type AS ENUM ('blog', 'case_study', 'whitepaper', 'battlecard', 'one_pager', 'press_release', 'announcement');
  END IF;
END $$;

-- ── content_asset_audience: who the artifact is authored for ──────────────────────────────────
-- prospect (demand-gen content) · seller (sales enablement) · press (PR).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_asset_audience') THEN
    CREATE TYPE content_asset_audience AS ENUM ('prospect', 'seller', 'press');
  END IF;
END $$;

-- ── content_asset_status: authored-content lifecycle ──────────────────────────────────────────
-- draft → in_review → approved → published (publish = handoff to Loveable, publish_ref set) →
-- archived. Approval is the content-studio review-gate; Belle drafts, a human approves.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_asset_status') THEN
    CREATE TYPE content_asset_status AS ENUM ('draft', 'in_review', 'approved', 'published', 'archived');
  END IF;
END $$;

-- ── content_asset: the typed authored-content substrate ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_asset (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  content_asset_type NOT NULL,
  audience              content_asset_audience NOT NULL DEFAULT 'prospect',
  status                content_asset_status NOT NULL DEFAULT 'draft',
  title                 text NOT NULL,
  body                  text,                                  -- the authored draft (nullable)
  publish_ref           text,                                  -- external Loveable URL where it was rendered; null until publish-handoff (D3)
  campaign_id           uuid REFERENCES campaign(id) ON DELETE SET NULL,  -- attribution asset→campaign→lead→won (#1316)
  brand_compliance_note text,                                  -- stamped at the content-studio review-gate; references brand_asset (read-only, D5)
  brand_checked_at      timestamptz,
  created_by_user_id    uuid REFERENCES app_user(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
  -- NOTE: `backed_by_reference_id` (link to the backing `reference`) is added LATER by migration
  -- 0237 — that reference migration owns the bidirectional link, to avoid a circular FK.
);
COMMENT ON TABLE content_asset IS
  'App-native typed authored-content substrate (#1697, epic #1696, D2/D3): the single home for Belle''s marketing artifacts — content + sales-enablement + PR-authoring in one entity, differing by type/audience. `body` is the authored draft; PUBLISH is a HANDOFF to Loveable (store the rendered `publish_ref` URL), NOT a send — Imperion owns the asset + attribution lineage. Belle''s content.write executor writes it server-side, approval-gated (never a direct silver write). Archetype B (app-native single-SoR), OPERATIONAL data_class. No PII, no secrets. Migration 0236 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_content_asset_campaign ON content_asset (campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_asset_status   ON content_asset (status);
CREATE INDEX IF NOT EXISTS idx_content_asset_type     ON content_asset (type);

-- ── updated_at trigger (the 0210/0223/0227 convention) ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_content_asset_updated ON content_asset;
CREATE TRIGGER trg_content_asset_updated BEFORE UPDATE ON content_asset
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: web reads; backend reads+writes (Belle's content.write executor, approval-gated,
--    never a direct silver write); pipeline + local-pipeline read. Defensive (roles may be
--    absent), mirroring 0227's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON content_asset TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON content_asset TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON content_asset TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON content_asset TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
