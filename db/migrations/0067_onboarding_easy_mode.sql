-- Easy-mode onboarding deploys (ADR-0052 §3/§4, issue #101).
--
-- An onboarding step flagged with a deploy_key renders the easy-mode Deploy
-- button (the key names the backend configuration function); verify_key names
-- the posture-silver state whose observation closes the step AND its linked
-- project task (verify-to-close — never close-on-click). Applying the playbook
-- template auto-creates ONE linked project task per deploy-flagged step
-- (onboarding_step.task_id); ordinary checklist steps create nothing.
--
-- Also ships the verification grants deferred from 0058: the backend role needs
-- to read posture silver and update task/onboarding_step to run the check.
-- Idempotent and transactional.

BEGIN;

ALTER TABLE onboarding_step
  ADD COLUMN IF NOT EXISTS deploy_key          text,
  ADD COLUMN IF NOT EXISTS verify_key          text,
  ADD COLUMN IF NOT EXISTS task_id             uuid REFERENCES task(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deploy_requested_at timestamptz;

COMMENT ON COLUMN onboarding_step.deploy_key IS
  'Names the backend configuration function the easy-mode button fires (ADR-0052 §3). NULL = ordinary checklist step. v1 ships sparse — keys come from the project-plan solidification exercise.';
COMMENT ON COLUMN onboarding_step.verify_key IS
  'Names the expected posture-silver observed state that verifies the deploy and closes the step + linked task (ADR-0052 §4).';
COMMENT ON COLUMN onboarding_step.task_id IS
  'The linked project task auto-created when the template is applied to a deploy-flagged step; closed by verification (#101). SET NULL on task delete.';
COMMENT ON COLUMN onboarding_step.deploy_requested_at IS
  'Set when the easy-mode Deploy button fires; cleared never (latest request wins).';

CREATE INDEX IF NOT EXISTS onboarding_step_task_idx
  ON onboarding_step (task_id) WHERE task_id IS NOT NULL;

-- Verification grants (deferred from 0058 §grants): the backend check reads the
-- account's posture silver and closes steps/tasks. No-op if the role is absent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping easy-mode verification grants.';
    RETURN;
  END IF;

  GRANT SELECT ON posture_policy, tenant_posture, account_tenant
    TO "mgid-imperioncrmbackendfunction";
  GRANT SELECT, UPDATE ON task, onboarding_step
    TO "mgid-imperioncrmbackendfunction";
END $$;

COMMIT;
