-- Auto-enroll responders into workflows (ADR-0053 §4 slice D, #112).
--
-- 1. `campaign.workflow_id` — the workflow that campaign-attributed responders
--    (lead captures whose hook config names the campaign) auto-enroll into on
--    resolution. `event.workflow_id` already shipped in 0070.
-- 2. One ACTIVE enrollment per (workflow, contact) — the partial unique index
--    makes auto-enroll idempotent on re-resolution via ON CONFLICT DO NOTHING,
--    while still allowing deliberate re-enrollment after a contact has exited
--    or completed (re-engagement workflows are legitimate repeats).
--
-- Existing-data note: applying the index fails if duplicate active enrollments
-- already exist; dedupe keeps the earliest. Idempotent and transactional.

BEGIN;

ALTER TABLE campaign
  ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES workflow(id) ON DELETE SET NULL;
COMMENT ON COLUMN campaign.workflow_id IS
  'Auto-enroll workflow for campaign-attributed responders (ADR-0053 §4, #112).';

-- Dedupe any pre-existing duplicate active enrollments (keep the earliest).
DELETE FROM workflow_enrollment we
USING workflow_enrollment dup
WHERE we.status = 'active' AND dup.status = 'active'
  AND we.workflow_id = dup.workflow_id AND we.contact_id = dup.contact_id
  AND we.id <> dup.id
  AND (dup.enrolled_at, dup.id) < (we.enrolled_at, we.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_active_workflow_contact
  ON workflow_enrollment (workflow_id, contact_id) WHERE status = 'active';

COMMIT;
