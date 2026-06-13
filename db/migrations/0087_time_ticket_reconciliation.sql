-- 0087: Time Ticket write-tracking + Reconciliation read-model support
-- (ADR-0082, issue #463). Depends on 0086. Third and last of the time-tracking
-- schema migrations (0085 comp/mapping → 0086 attendance/timesheet/silver → 0087).
--
-- Two pieces (ADR-0082 §Autotask write, §Reconciliation #1/#2):
--   1. time_ticket — tracks the ONE idempotent summary ticket Imperion writes to
--      Autotask per employee per week (one per timesheet) on its own house company,
--      in the Timesheets queue. Backend ADR-0044 idempotency pattern (mirrors
--      project_provisioning, 0082): a stable idempotency_key + write_state + the
--      stored external_ref, so re-approval UPDATES the same Autotask ticket rather
--      than creating a duplicate. The body links the Ancillary Tickets — it does NOT
--      re-create their native TimeEntries, so summing Autotask never double-counts.
--   2. Reconciliation read-model support — Reconciliation is DERIVED (not a stored
--      source, ADR-0082). This migration adds:
--        • time_reconciliation_day: per employee, per day, attended (envelope) vs
--          logged (allocation) minutes + the Balanced/Under-logged/Over-logged
--          verdict (default ±30 min tolerance). Over the silver time_record only —
--          NO comp data. The six Deviations are detected by the backend process on
--          top of this base (overlap/orphan/etc. need row-pair logic, not a view).
--        • timesheet_payroll_status: approved attendance hours per timesheet for the
--          payroll match — hours + state + matched QB payment, NO Pay Rate. Expected
--          pay (hours × effective rate) is computed in the backend reconciliation
--          process, which alone may read pay_rate (0085) — kept OUT of any broadly-
--          granted view so comp data never leaks through the read model.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no comp data.

BEGIN;

-- ── time_ticket: the idempotent weekly Autotask summary ticket tracker ────────
-- 1:1 with the timesheet (one ticket per employee per week). Idempotency is OURS,
-- not Autotask's (creates are non-idempotent): the stable idempotency_key + state
-- let the backend executor check before every write; external_ref is the AT ticket
-- id, so re-approval updates the same ticket.
CREATE TABLE IF NOT EXISTS time_ticket (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id    uuid NOT NULL UNIQUE REFERENCES timesheet(id) ON DELETE CASCADE,
  app_user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,   -- the Employee (denormalized)
  week_start      date NOT NULL,                       -- convenience for the weekly query
  external_ref    bigint,                              -- Autotask Time Ticket id; NULL until written
  write_state     text NOT NULL DEFAULT 'pending'
                    CHECK (write_state IN ('pending','writing','written','failed')),
  idempotency_key text NOT NULL UNIQUE,                -- stable: imperioncrm-timeticket-{timesheet_id}
  -- House-company + queue the ticket lands on (config values, ADR-0082 §Operational);
  -- recorded per row for audit/repro. The actual ids are backend config, not secrets.
  autotask_company_id bigint,
  autotask_queue_id   bigint,
  written_at      timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE time_ticket IS
  'Write-tracking for the ONE idempotent Autotask Time Ticket per employee per week (ADR-0082, backend ADR-0044). One per timesheet; stable idempotency_key + write_state + stored external_ref → re-approval updates the same ticket, never a duplicate. The ticket links Ancillary Tickets, does not re-create their TimeEntries (no double-count).';

-- The executor's work queue: approved timesheets awaiting / mid write.
CREATE INDEX IF NOT EXISTS idx_time_ticket_pending ON time_ticket (write_state)
  WHERE write_state IN ('pending','writing','failed');
CREATE INDEX IF NOT EXISTS idx_time_ticket_employee_week ON time_ticket (app_user_id, week_start DESC);

DROP TRIGGER IF EXISTS trg_time_ticket_updated ON time_ticket;
CREATE TRIGGER trg_time_ticket_updated BEFORE UPDATE ON time_ticket
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supporting index for the daily reconciliation aggregation (envelope vs logged).
CREATE INDEX IF NOT EXISTS idx_time_record_recon ON time_record (app_user_id, work_date, kind);

-- ── time_reconciliation_day: derived daily verdict (NO comp data) ─────────────
-- Reconciliation #1 base (ADR-0082): attended attendance minutes (the envelope) vs
-- the same day's Autotask allocation minutes, with the Balanced/Under-logged/
-- Over-logged verdict. Tolerance defaults to 30 min/day (configurable later — baked
-- as the v1 default). Over time_record only; the six Deviations are layered on top
-- by the backend process (overlap/orphan need row-pair logic beyond a sum-vs-sum view).
CREATE OR REPLACE VIEW time_reconciliation_day AS
  SELECT
    app_user_id,
    work_date,
    attended_minutes,
    logged_minutes,
    (logged_minutes - attended_minutes) AS delta_minutes,
    CASE
      WHEN logged_minutes - attended_minutes >  30 THEN 'over_logged'   -- Hard (impossible) — blocks attest
      WHEN logged_minutes - attended_minutes < -30 THEN 'under_logged'  -- Soft — unallocated gap
      ELSE 'balanced'
    END AS verdict
  FROM (
    SELECT
      app_user_id,
      work_date,
      COALESCE(SUM(minutes) FILTER (WHERE kind = 'attendance'), 0) AS attended_minutes,
      COALESCE(SUM(minutes) FILTER (WHERE kind = 'allocation'),  0) AS logged_minutes
    FROM time_record
    GROUP BY app_user_id, work_date
  ) day;
COMMENT ON VIEW time_reconciliation_day IS
  'Reconciliation #1 base (ADR-0082): per employee per day, attended (envelope) vs logged (allocation) minutes + verdict (±30 min default tolerance). Derived over silver time_record; no comp data. The six Deviations are detected by the backend reconciliation process on this base.';

-- ── timesheet_payroll_status: approved hours for the payroll match (NO Pay Rate) ─
-- Reconciliation #2 SUPPORT: the approved attendance hours per timesheet + state +
-- the matched QB payment ref. Expected pay (hours × effective Pay Rate) is computed
-- in the BACKEND reconciliation process (the only reader of pay_rate) — deliberately
-- NOT joined here so comp data never leaks through a broadly-granted view.
CREATE OR REPLACE VIEW timesheet_payroll_status AS
  SELECT
    t.id            AS timesheet_id,
    t.app_user_id,
    t.week_start,
    t.week_end,
    t.state,
    COALESCE(SUM(w.minutes_total), 0) AS approved_minutes,   -- attendance minutes on the sheet
    t.payroll_approved_at,
    t.paid_at,
    t.qb_payment_ref
  FROM timesheet t
  LEFT JOIN (
    SELECT timesheet_id,
           SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::integer AS minutes_total
    FROM website_time_entry
    GROUP BY timesheet_id
  ) w ON w.timesheet_id = t.id
  GROUP BY t.id, w.minutes_total;
COMMENT ON VIEW timesheet_payroll_status IS
  'Reconciliation #2 support (ADR-0082): approved attendance minutes per timesheet + lifecycle state + matched QuickBooks payment ref. NO Pay Rate — expected-pay math (hours × rate) lives in the backend process, the sole reader of the comp store (0085).';

-- ── Grants (0082/0084 defensive pattern; roles may be absent in some envs) ────
-- time_ticket: web requests (creates pending on approval) + renders; backend writes
--   (executor). Pipelines read to reconcile the written ticket back from AT bronze.
-- Reconciliation views: web + backend + pipeline read (no comp; safe to expose).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON time_ticket TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON time_reconciliation_day  TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON timesheet_payroll_status TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, UPDATE ON time_ticket TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON time_reconciliation_day  TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON timesheet_payroll_status TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON time_ticket TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grant.';
  END IF;
END $$;

COMMIT;
