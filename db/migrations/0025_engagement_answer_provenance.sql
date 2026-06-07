-- Agent-gathered answers + human approval (ADR-0027). Pre-discovery automation can
-- pre-fill engagement answers; the salesperson then confirms/stamps each before the
-- discovery call's fit/nurture verdict is locked. Existing answers default to
-- human-sourced and confirmed, so this is backward-compatible. Idempotent and
-- transactional.

BEGIN;

ALTER TABLE engagement_answer
  ADD COLUMN IF NOT EXISTS source              text NOT NULL DEFAULT 'human',      -- human|agent|automation
  ADD COLUMN IF NOT EXISTS confidence          numeric,                            -- 0..1 (agent/automation)
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'confirmed',  -- draft|confirmed|rejected
  ADD COLUMN IF NOT EXISTS approved_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at         timestamptz;

COMMENT ON COLUMN engagement_answer.source IS
  'Who produced the answer: human (in-call), agent (LLM), or automation (workflow). Agent/automation answers start as draft and require human confirmation (ADR-0027).';

CREATE INDEX IF NOT EXISTS idx_answer_status ON engagement_answer(status);

COMMIT;
