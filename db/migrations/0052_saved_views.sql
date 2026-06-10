-- 0052: Saved list views (ADR-0046).
--
-- Named, reusable filter sets for list pages — tickets first. A view is owned
-- by its creator; `is_shared` publishes it to the whole company ("company
-- views as well as individual views"). One default view per (owner, entity):
-- applied automatically when the list page opens with no explicit filters.
-- Filters live as jsonb so new list pages (tasks, contacts, devices) reuse the
-- table without schema churn — `entity_type` discriminates.

CREATE TABLE IF NOT EXISTS saved_view (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    text NOT NULL,                -- 'ticket' (tasks/devices later)
  name           text NOT NULL,
  owner_user_id  uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  is_shared      boolean NOT NULL DEFAULT false,
  is_default     boolean NOT NULL DEFAULT false,
  filters        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, entity_type, name)
);

COMMENT ON TABLE saved_view IS
  'Named filter sets for list pages (ADR-0046). is_shared publishes a view company-wide; one default per owner+entity.';

-- One default view per owner per entity type.
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_view_default
  ON saved_view (owner_user_id, entity_type) WHERE is_default;

CREATE INDEX IF NOT EXISTS idx_saved_view_entity ON saved_view (entity_type);

-- Least-privilege grants (0045/0050 defensive pattern — do not rely on 0002's
-- ALTER DEFAULT PRIVILEGES having matched the migration-running role).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON saved_view TO "mgid-imperioncrm-web-prd";
  END IF;
  -- Views are a GUI concern: the pipeline/backend/local identities get no access.
END $$;
