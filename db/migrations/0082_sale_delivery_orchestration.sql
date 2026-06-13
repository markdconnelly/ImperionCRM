-- 0082: Sale→delivery orchestration tracking tables (ADR-0080 §4, epic #425).
--
-- ADR-0080 makes Imperion the INTENT/SCHEDULE plane and Autotask the EXECUTION SoR:
-- a won KQM quote provisions an Autotask Project (template-emulated) and JIT
-- project-queue Tickets. The native `project`/`task` model (0009/0058) is the plan;
-- these two sidecar tables track the binding to Autotask + the provisioning state.
--
-- WHY SIDECAR (not columns on project/task): one task model ever (ADR-0052 §2). The
-- orchestration concern (provisioning idempotency, fire-state, schedule) is 1:1 with
-- project/task but richer than the narrow `task.autotask_ticket_ref` (#19 push); a
-- 1:1 sidecar keeps the core tables clean and is dropped with its parent (CASCADE).
--
-- IDEMPOTENCY IS OURS, NOT AUTOTASK'S: Autotask creates are non-idempotent — every POST
-- mints a new id, no upsert/external key (spike #426). So each row carries a stable
-- `idempotency_key` + a `provision_state`/`fire_state` the backend executor checks
-- BEFORE every write; a retry converges instead of double-provisioning.
--
-- Schema is frontend-owned (ADR-0042); the backend executor reads/writes these, the web
-- board reads them + requests a fire, the pipelines read them to reconcile the round-trip
-- from bronze. Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── project_provisioning: native project ↔ Autotask project (1:1, idempotent) ─────────
CREATE TABLE IF NOT EXISTS project_provisioning (
  project_id              uuid PRIMARY KEY REFERENCES project(id) ON DELETE CASCADE,
  -- Provenance: the won KQM quote that triggered provisioning + the Autotask seam it
  -- carried (spike #427: quote header holds autotaskOpportunityID/OrganizationID).
  source_kqm_quote_id     text,
  autotask_opportunity_id bigint,
  -- The Autotask Project this native project maps to (NULL until created).
  autotask_project_id     bigint,
  provision_state         text NOT NULL DEFAULT 'pending'
                            CHECK (provision_state IN ('pending','creating','created','failed')),
  -- Stable key the executor checks before any create — 'imperioncrm-project-{project_id}'.
  idempotency_key         text NOT NULL UNIQUE,
  provisioned_at          timestamptz,
  last_error              text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE project_provisioning IS
  'Binds a native delivery project to its Autotask Project + owns provisioning idempotency (ADR-0080 §4). Autotask creates are non-idempotent — the executor checks provision_state/idempotency_key before every write.';
COMMENT ON COLUMN project_provisioning.autotask_opportunity_id IS
  'The Autotask opportunity id the won KQM quote carried (spike #427) — the won→Autotask seam, no mapping table needed.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_provisioning_autotask
  ON project_provisioning (autotask_project_id) WHERE autotask_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_provisioning_state ON project_provisioning (provision_state);

DROP TRIGGER IF EXISTS trg_project_provisioning_updated ON project_provisioning;
CREATE TRIGGER trg_project_provisioning_updated BEFORE UPDATE ON project_provisioning
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── task_ticket_fire: per-task project-queue ticket fire-state (1:1, JIT) ──────────────
CREATE TABLE IF NOT EXISTS task_ticket_fire (
  task_id            uuid PRIMARY KEY REFERENCES task(id) ON DELETE CASCADE,
  -- none → scheduled (JIT window or manual request) → fired; failed on executor error.
  fire_state         text NOT NULL DEFAULT 'none'
                       CHECK (fire_state IN ('none','scheduled','fired','failed')),
  -- When JIT firing should happen; NULL = manual-only (board "fire now"). The executor
  -- fires scheduled rows whose window has arrived (rolling window, never 100 up front).
  scheduled_for      timestamptz,
  -- The Autotask Ticket created on fire (NULL until fired) + the queue it landed on
  -- (Project Management = 29683483 in prod; stored per-row, it is env config not a const).
  autotask_ticket_id bigint,
  autotask_queue_id  bigint,
  -- Stable key the executor checks before create — 'imperioncrm-taskticket-{task_id}'.
  idempotency_key    text NOT NULL UNIQUE,
  fired_at           timestamptz,
  last_error         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE task_ticket_fire IS
  'Per-task JIT project-queue ticket fire-state (ADR-0080 §4/§7). The board reads it + requests a fire; the backend executor fires (creates the Autotask Ticket linked via ticket.projectID) and stamps the typed id. Idempotency is the executor''s, not the API''s.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_task_ticket_fire_autotask
  ON task_ticket_fire (autotask_ticket_id) WHERE autotask_ticket_id IS NOT NULL;
-- The executor's work queue: scheduled rows due to fire.
CREATE INDEX IF NOT EXISTS idx_task_ticket_fire_due
  ON task_ticket_fire (scheduled_for) WHERE fire_state = 'scheduled';

DROP TRIGGER IF EXISTS trg_task_ticket_fire_updated ON task_ticket_fire;
CREATE TRIGGER trg_task_ticket_fire_updated BEFORE UPDATE ON task_ticket_fire
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (0081 defensive pattern; roles may be absent in some envs) ──────────────────
DO $$
BEGIN
  -- Web (the delivery board): reads state, requests a fire (set scheduled_for / fire_state
  -- → 'scheduled'). It never writes Autotask itself (ADR-0042) — the backend executor does.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON project_provisioning TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE ON task_ticket_fire     TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  -- Backend (the orchestration executor): full read/write — it owns provisioning + firing.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON project_provisioning TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE ON task_ticket_fire     TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- Local-pipeline: reads to reconcile the written Project/Ticket back from autotask_* bronze.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON project_provisioning TO "imperion-localpipeline";
    GRANT SELECT ON task_ticket_fire     TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;

  -- Cloud-pipeline: reads (Autotask ticket webhook → match a fired row by autotask_ticket_id).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON project_provisioning TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON task_ticket_fire     TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
END $$;

COMMIT;
