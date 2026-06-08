-- Task category (ADR-0034). The single `task` object serves BOTH the sales
-- pipeline and project/onboarding management; categorize each task so the PM
-- dashboard and the sales views can filter the shared object. Idempotent.

BEGIN;

DO $$ BEGIN
  CREATE TYPE task_category AS ENUM ('sales', 'project', 'onboarding', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE task
  ADD COLUMN IF NOT EXISTS category task_category NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_task_category ON task(category);

COMMIT;
