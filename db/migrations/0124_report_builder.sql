-- 0124 self-serve report builder — report_definition + dashboard + dashboard_item (ADR-0075, #410)
-- Migration number 0124 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration
-- merges during the CI window, renumber the file (rename is data-safe) and fix
-- the in-file refs + docs/database/data-model.md.
--
-- The persistence layer for the governed self-serve report builder (ADR-0075 §3:
-- "report definition = generalised saved view"). Reuses the ADR-0046 saved-view
-- ownership/visibility model exactly — owner_user_id FK to app_user, a
-- `visibility` discriminator ('private' | 'shared'), the same web-role grants and
-- timestamp defaults. Three additive tables:
--
--   1. report_definition (NEW) — one saved report. { id, owner_user_id, name,
--      root_object, fields jsonb, filters jsonb, group_by jsonb, viz,
--      visibility, created_at, updated_at }. `root_object` and every field/agg in
--      `fields` MUST exist in the semantic registry (ADR-0075 §1) — that is
--      validated at the APP layer (the registry lives in code, #409), NOT as a DB
--      FK, so no FK to a registry table here by design. jsonb so the selected
--      field/filter/grouping shape grows without schema churn.
--
--   2. dashboard (NEW) — a named composition of report definitions. { id,
--      owner_user_id, name, layout jsonb, visibility, created_at, updated_at }.
--      `layout` is the grid/placement blob (positions resolved per item below).
--
--   3. dashboard_item (NEW) — one tile on a dashboard. { id, dashboard_id CASCADE,
--      report_definition_id, position jsonb, created_at }. Deleting a dashboard
--      cascades its items; deleting a referenced report definition cascades the
--      tiles that pointed at it (a tile with no report is meaningless).
--
-- RBAC/visibility (ADR-0075 §2, mirrors saved_view): reads return the viewer's own
-- rows plus any row with visibility='shared'; the field-level grant stripping
-- ("no report surfaces data its author could not see") is enforced at RUN time in
-- the query layer (#411), not in this schema. Owner-only mutation is enforced in
-- the write WHERE clause (the accessor), exactly like saved_view.
--
-- All three are app-native config objects (saved reports/dashboards) — like
-- saved_view / status_def / custom_field_def / intake_form — NOT ingested silver
-- entities with a source-of-record contract. So the OKF semantic-layer gate does
-- not apply: no concept file, no coverage-matrix row.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII (a report definition
-- stores a staff-authored query shape — object/field names + filter values — not
-- result rows).

BEGIN;

-- ── report_definition: a saved, governed report (ADR-0075 §3) ───────────────────
CREATE TABLE IF NOT EXISTS report_definition (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name           text NOT NULL,
  root_object    text NOT NULL,                              -- must exist in the semantic registry (app-validated)
  fields         jsonb NOT NULL DEFAULT '[]'::jsonb,         -- selected fields + aggregations (registry-validated)
  filters        jsonb NOT NULL DEFAULT '{}'::jsonb,
  group_by       jsonb NOT NULL DEFAULT '[]'::jsonb,
  viz            text NOT NULL DEFAULT 'table',              -- table | bar | line | … (render via ADR-0021)
  visibility     text NOT NULL DEFAULT 'private'
                   CHECK (visibility IN ('private', 'shared')),  -- reuse ADR-0046 sharing model
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

COMMENT ON TABLE report_definition IS
  'A saved self-serve report (ADR-0075 §3): root object + selected fields/aggregations + filters + grouping + viz. Generalised saved_view (ADR-0046) — owner_user_id + visibility(private|shared). root_object/fields are validated against the in-code semantic registry (ADR-0075 §1) at the app layer, not by FK. App-native config, not a silver entity.';

CREATE INDEX IF NOT EXISTS idx_report_definition_owner ON report_definition (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_report_definition_shared ON report_definition (visibility) WHERE visibility = 'shared';

-- ── dashboard: a named composition of report definitions (ADR-0075 §3) ──────────
CREATE TABLE IF NOT EXISTS dashboard (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name           text NOT NULL,
  layout         jsonb NOT NULL DEFAULT '{}'::jsonb,         -- grid/placement blob
  visibility     text NOT NULL DEFAULT 'private'
                   CHECK (visibility IN ('private', 'shared')),  -- reuse ADR-0046 sharing model
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

COMMENT ON TABLE dashboard IS
  'A named dashboard composing report definitions (ADR-0075 §3). owner_user_id + visibility(private|shared), same ownership/sharing model as saved_view (ADR-0046). Tiles live in dashboard_item. App-native config, not a silver entity.';

CREATE INDEX IF NOT EXISTS idx_dashboard_owner ON dashboard (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_shared ON dashboard (visibility) WHERE visibility = 'shared';

-- ── dashboard_item: one report tile on a dashboard ──────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_item (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id          uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
  report_definition_id  uuid NOT NULL REFERENCES report_definition(id) ON DELETE CASCADE,
  position              jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { x, y, w, h, ordinal } placement
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dashboard_item IS
  'One report tile on a dashboard (ADR-0075 §3). Deleting the dashboard cascades its items; deleting the referenced report_definition cascades the tile (a tile with no report is meaningless). position holds the grid placement.';

CREATE INDEX IF NOT EXISTS idx_dashboard_item_dashboard ON dashboard_item (dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_item_report ON dashboard_item (report_definition_id);

-- Least-privilege grants (0052/0111 saved-view pattern): the report builder is a
-- pure GUI concern — only the web identity reads/writes; pipeline/backend/local
-- identities get no access. Defensive (the role may be absent on a fresh server).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON report_definition TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard         TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_item    TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
