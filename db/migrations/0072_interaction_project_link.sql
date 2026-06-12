-- Meetings attach to projects via their interaction (ADR-0052 §5, issue #97).
-- A meeting stays a communication object (1:1 meeting silver row, timeline-
-- rendered); this adds the project linkage with the same SET NULL convention as
-- interaction.opportunity_id. Sales meetings carry opportunity/account linkage
-- and NO project_id (ADR-0052 §6). Idempotent and transactional.

BEGIN;

ALTER TABLE interaction
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES project(id) ON DELETE SET NULL;

COMMENT ON COLUMN interaction.project_id IS
  'The project this interaction (typically a meeting) belongs to (ADR-0052 §5). SET NULL on project delete, matching opportunity_id. NULL on sales meetings.';

CREATE INDEX IF NOT EXISTS interaction_project_idx
  ON interaction (project_id) WHERE project_id IS NOT NULL;

COMMIT;
