-- General task / to-do model used across sales and delivery (ADR-0010, D10).
-- Created now so the GUI can do manual CRUD on tasks.

BEGIN;

CREATE TABLE IF NOT EXISTS task (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid REFERENCES account(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  owner_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  title          text NOT NULL,
  detail         text,
  status         text NOT NULL DEFAULT 'open',   -- open|in_progress|done
  due_at         timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_status  ON task(status);
CREATE INDEX IF NOT EXISTS idx_task_account ON task(account_id);

DROP TRIGGER IF EXISTS trg_task_updated ON task;
CREATE TRIGGER trg_task_updated BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
