-- 0102 custom fields (ADR-0065 B4, issue #338)
--
-- PM task-structure B4 (ADR-0065): ADMIN-DEFINABLE custom fields on work objects
-- (tasks / projects), optionally SCOPED to a single project_type, so an admin can
-- add (e.g.) a "Risk level" single-select that appears only on Implementation
-- projects and is filterable in reporting (the B4 acceptance criterion).
--
-- Two tables, the EAV shape ADR-0065 chose (config jsonb + a *_value jsonb table),
-- mirroring the polymorphic application pattern of work_tag (0096) / work_comment
-- (0094):
--   * custom_field_def    — the DEFINITION: one row per admin-created field. `scope`
--                           says which work-object kind it attaches to (task|project);
--                           `project_type_id` (nullable) narrows a project-scoped
--                           field to ONE project_type (NULL = applies to every project
--                           / every task of the scope). `field_type` is the input
--                           kind; `options` jsonb holds the choice list for the
--                           select types; `required` is the per-type required flag
--                           (B4-F3). `key` is a stable machine key, unique within a
--                           (scope, project_type_id) group so reporting can address a
--                           field by key.
--   * custom_field_value  — the polymorphic VALUE: (field_id, parent_type, parent_id)
--                           holds one field's value for one work object as jsonb
--                           (text/number/date as scalars, multi-select as an array,
--                           checkbox as bool, user/currency as scalars). No DB-level
--                           FK on parent_id (polymorphic, same tradeoff as work_tag);
--                           a CHECK bounds parent_type and the app validates the
--                           parent exists before insert.
--
-- The VALUE jsonb carries a GIN index (issue #338 data-model note) so reporting can
-- filter "all Implementation projects where Risk level = High" without a full scan.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here (a custom field
-- CAN capture PII at runtime — handled as any task field, ADR-0065 security impact —
-- but the SCHEMA holds none).
--
-- `custom_field_def`/`custom_field_value` are app-native operational state (not
-- ingested silver entities with a source-of-record contract — same as `task` /
-- `work_tag` / `work_comment`), so the OKF semantic-layer gate does not apply: there
-- is no concept file for them.

BEGIN;

-- ── custom_field_def: an admin-defined custom field ──────────────────────────
-- scope discriminates the work-object kind the field hangs off. project_type_id
-- narrows a project-scoped field to one type (NULL = all). field_type is the input
-- kind (mirrors the CHECK below). options jsonb is the choice list for the select
-- types ([] otherwise); required is the B4-F3 per-type required flag. ordinal
-- orders fields on a form. key is a stable machine handle (reporting addresses a
-- field by it), unique within a (scope, project_type_id) group.
CREATE TABLE IF NOT EXISTS custom_field_def (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           text NOT NULL CHECK (scope IN ('task', 'project')),
  project_type_id uuid REFERENCES project_type(id) ON DELETE CASCADE,  -- NULL = every project/task of the scope
  key             text NOT NULL,                       -- stable machine key, e.g. 'risk_level'
  label           text NOT NULL,                        -- human label shown on the form
  field_type      text NOT NULL
                    CHECK (field_type IN (
                      'text', 'number', 'date', 'single_select',
                      'multi_select', 'checkbox', 'user', 'currency')),
  options         jsonb NOT NULL DEFAULT '[]'::jsonb,    -- choice list for the *_select types; [] otherwise
  required        boolean NOT NULL DEFAULT false,        -- B4-F3 per-type required-field enforcement
  ordinal         integer NOT NULL DEFAULT 0,            -- display order on the form
  created_by      uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE custom_field_def IS
  'Admin-defined custom field (ADR-0065 B4, #338) on a work object. scope=task|project; project_type_id narrows a project field to one type (NULL=all). field_type drives the input; options jsonb is the select choice list; required is the B4-F3 flag. key is a stable machine handle, unique within (scope, project_type_id) so reporting can address a field by key.';

-- A field key is unique within its (scope, project_type_id) group. A NULL
-- project_type_id is a distinct group from any specific type, so a global
-- 'risk_level' and an Implementation-only 'risk_level' can coexist. Two partial
-- unique indexes cover the NULL and non-NULL cases (NULLs aren't equal in a plain
-- unique index).
CREATE UNIQUE INDEX IF NOT EXISTS uq_custom_field_def_key_typed
  ON custom_field_def (scope, project_type_id, key)
  WHERE project_type_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_custom_field_def_key_global
  ON custom_field_def (scope, key)
  WHERE project_type_id IS NULL;

-- The per-form read: every field for a (scope, project_type) in display order.
CREATE INDEX IF NOT EXISTS idx_custom_field_def_scope
  ON custom_field_def (scope, project_type_id, ordinal);

DROP TRIGGER IF EXISTS trg_custom_field_def_updated ON custom_field_def;
CREATE TRIGGER trg_custom_field_def_updated BEFORE UPDATE ON custom_field_def
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── custom_field_value: a field's value on one work object (polymorphic) ──────
-- (field_id, parent_type, parent_id) is the PK so a field has at most one value per
-- object and an upsert is idempotent. value is jsonb (scalar / array / bool by
-- field_type). No FK on parent_id (polymorphic, ADR-0064/0065 tradeoff); the CHECK
-- bounds parent_type and the app validates the parent exists. Deleting a field
-- cascades its values.
CREATE TABLE IF NOT EXISTS custom_field_value (
  field_id     uuid NOT NULL REFERENCES custom_field_def(id) ON DELETE CASCADE,
  parent_type  text NOT NULL CHECK (parent_type IN ('task', 'project')),
  parent_id    uuid NOT NULL,
  value        jsonb NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (field_id, parent_type, parent_id)
);
COMMENT ON TABLE custom_field_value IS
  'Polymorphic value of a custom_field_def on a work object (task|project), ADR-0065 B4 / #338. PK (field_id,parent_type,parent_id) makes a write idempotent; ON DELETE CASCADE from custom_field_def removes values when a field is deleted. value is jsonb keyed by field_type (scalar/array/bool). No FK on parent_id (polymorphic).';

-- Covering index for the per-object value read (a work object's whole field set).
CREATE INDEX IF NOT EXISTS idx_custom_field_value_parent
  ON custom_field_value (parent_type, parent_id);

-- GIN index on the value jsonb (issue #338) so reporting can filter work objects by
-- a custom field's value (e.g. Risk level = High) without a sequential scan.
CREATE INDEX IF NOT EXISTS idx_custom_field_value_gin
  ON custom_field_value USING gin (value);

COMMIT;
