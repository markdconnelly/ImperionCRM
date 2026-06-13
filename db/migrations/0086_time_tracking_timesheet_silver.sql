-- 0086: Time tracking — attendance bronze + Autotask allocation bronze + weekly
-- timesheet + silver time_record (ADR-0082, issue #462). Depends on 0085.
-- Second of the three time-tracking schema migrations (0085 comp/mapping →
-- 0086 attendance/timesheet/silver → 0087 time_ticket/recon).
--
-- Two time signals (ADR-0082 §Decision), each in its own per-source bronze
-- (ADR-0039), normalize into ONE silver table:
--   • website_time_entry — the employee's attendance blocks entered on the site
--     (start+end on a day, duration DERIVED, category, notes, optional Ancillary
--     Ticket). The AUTHORITATIVE source.
--   • autotask_time_entry — native Autotask Ticket Time Entries, read in as
--     CORROBORATION (generally less total than attendance, scattered across
--     tickets). Never authoritative. Ingested by the local pipeline.
--   • time_record (silver) — one normalized row per source fact, discriminated by
--     source(website|autotask) + kind(attendance|allocation). The unified timeline
--     the app + reconciliation read; the cloud pipeline merge writes it. Website
--     attendance rows are the source of truth; Autotask allocation rows corroborate.
-- The weekly container is the timesheet: one employee, one Monday–Sunday week, one
-- sheet, lifecycle Open→Submitted→Approved→Payroll-Approved→Paid (ADR-0082). The
-- attested original is preserved (attested_snapshot) so admin corrections are audited.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no comp data here (that's 0085).

BEGIN;

-- ── timesheet: the weekly (Mon–Sun) per-employee container ────────────────────
CREATE TABLE IF NOT EXISTS timesheet (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id   uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,   -- the Employee
  week_start    date NOT NULL,                       -- Monday (ISO week start)
  week_end      date NOT NULL,                        -- Sunday; CHECK keeps it +6
  state         text NOT NULL DEFAULT 'open'
                  CHECK (state IN ('open','submitted','approved','payroll_approved','paid')),
  -- Attestation (→ submitted): the employee affirms; this hard-locks them out.
  attested_at   timestamptz,
  attested_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,           -- the employee
  attested_snapshot jsonb,                            -- attested original, preserved for audit
  -- Approval (→ approved, admin): triggers the Time Ticket write (0087/backend).
  approved_at   timestamptz,
  approved_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,           -- an admin
  -- Payroll approval (→ payroll_approved; CFO/finance∨admin): authorizes payment.
  payroll_approved_at timestamptz,
  payroll_approved_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  -- Paid (terminal): set by Payroll Reconciliation against the QuickBooks payment.
  paid_at       timestamptz,
  qb_payment_ref text,                                -- matched QuickBooks payment id (read-only SoR)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_user_id, week_start),                   -- one employee, one week, one sheet
  CONSTRAINT timesheet_week_is_mon_sun CHECK (week_end = week_start + 6)
);
COMMENT ON TABLE timesheet IS
  'Weekly (Mon–Sun) per-employee time container (ADR-0082). Lifecycle open→submitted(attest, self-locks)→approved(admin → Time Ticket write)→payroll_approved(finance∨admin)→paid(matched to QuickBooks). attested_snapshot preserves the employee''s attested original for audit when an admin corrects.';
CREATE INDEX IF NOT EXISTS idx_timesheet_employee_week ON timesheet (app_user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_timesheet_state ON timesheet (state);

DROP TRIGGER IF EXISTS trg_timesheet_updated ON timesheet;
CREATE TRIGGER trg_timesheet_updated BEFORE UPDATE ON timesheet
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── website_time_entry (bronze, attendance — AUTHORITATIVE) ───────────────────
-- A structured Time Entry, not a raw external payload: start+end on a day, duration
-- DERIVED (never typed), a category, notes, optional Ancillary Ticket. Belongs to
-- the employee's open timesheet for that week.
CREATE TABLE IF NOT EXISTS website_time_entry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id  uuid NOT NULL REFERENCES timesheet(id) ON DELETE CASCADE,
  app_user_id   uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,   -- denormalized for query
  work_date     date NOT NULL,
  started_at    timestamptz NOT NULL,
  ended_at      timestamptz NOT NULL,
  -- Category (ADR-0082): billable → Ancillary Ticket · internal · admin.
  -- pto/holiday are W2-dormant (added by a later migration), excluded from v1.
  category      text NOT NULL CHECK (category IN ('billable','internal','admin')),
  ancillary_ticket_ref text,                          -- noted Autotask ticket id (billable)
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Duration is derived (ended_at - started_at); a block must be positive length.
  CONSTRAINT website_time_entry_positive CHECK (ended_at > started_at)
);
COMMENT ON TABLE website_time_entry IS
  'Attendance bronze (ADR-0082/0039): the employee''s authoritative Time Entries — start+end blocks with duration DERIVED, a category, optional Ancillary Ticket. Source=website. Entered manually (live punch-clock is a later add).';
CREATE INDEX IF NOT EXISTS idx_website_time_entry_timesheet ON website_time_entry (timesheet_id);
CREATE INDEX IF NOT EXISTS idx_website_time_entry_employee_date ON website_time_entry (app_user_id, work_date);

DROP TRIGGER IF EXISTS trg_website_time_entry_updated ON website_time_entry;
CREATE TRIGGER trg_website_time_entry_updated BEFORE UPDATE ON website_time_entry
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── autotask_time_entry (bronze, allocation — CORROBORATION) ──────────────────
-- Native Autotask TimeEntry rows. Ingested-bronze envelope shape (external_ref +
-- raw payload) per ADR-0039; resolved to an employee via the 0085 Resource mapping.
-- Autotask may give start/end or just hours worked — both are accommodated.
CREATE TABLE IF NOT EXISTS autotask_time_entry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref  text UNIQUE,                          -- Autotask TimeEntry id (idempotent upsert)
  app_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL,           -- resolved employee (null until matched)
  autotask_resource_id bigint,                        -- raw AT resource id → employee_profile mapping (0085)
  autotask_ticket_id   bigint,                        -- the Ancillary Ticket / project task it logs against
  work_date     date,
  started_at    timestamptz,
  ended_at      timestamptz,
  hours_worked  numeric(8,2),                          -- AT often stores hours directly (no start/end)
  payload_bronze jsonb,                               -- raw AT payload
  matched_at    timestamptz,                          -- when resolved to app_user
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE autotask_time_entry IS
  'Allocation bronze (ADR-0082/0039): native Autotask Ticket Time Entries read in as corroboration — never authoritative. Source=autotask. Resolved to an employee by the 0085 Autotask Resource mapping; ingested by the local pipeline.';
CREATE INDEX IF NOT EXISTS idx_autotask_time_entry_employee_date ON autotask_time_entry (app_user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_autotask_time_entry_resource ON autotask_time_entry (autotask_resource_id) WHERE autotask_resource_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_autotask_time_entry_updated ON autotask_time_entry;
CREATE TRIGGER trg_autotask_time_entry_updated BEFORE UPDATE ON autotask_time_entry
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── time_record (silver, the unified timeline) ────────────────────────────────
-- One normalized row per source fact. The cloud pipeline merge writes it from both
-- bronze sources; the app + both reconciliations read it. source↔kind is fixed:
-- website→attendance (authoritative), autotask→allocation (corroborating).
CREATE TABLE IF NOT EXISTS time_record (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id   uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  source        text NOT NULL CHECK (source IN ('website','autotask')),
  kind          text NOT NULL CHECK (kind IN ('attendance','allocation')),
  work_date     date NOT NULL,
  started_at    timestamptz,                          -- null for hours-only allocation rows
  ended_at      timestamptz,
  minutes       integer NOT NULL,                     -- derived duration (attendance: end-start; allocation: hours*60)
  category      text,                                 -- billable|internal|admin (attendance); null for allocation
  ancillary_ticket_ref text,                          -- ticket id when present
  source_ref    uuid,                                 -- bronze row id (website_time_entry.id / autotask_time_entry.id)
  external_ref  text,                                 -- Autotask TimeEntry id when source=autotask
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Website is always attendance; Autotask is always allocation (ADR-0082).
  CONSTRAINT time_record_source_kind CHECK (
    (source = 'website'  AND kind = 'attendance')
    OR (source = 'autotask' AND kind = 'allocation')
  )
);
COMMENT ON TABLE time_record IS
  'Silver unified time timeline (ADR-0082): one row per source fact, source(website|autotask)+kind(attendance|allocation). Website attendance is authoritative; Autotask allocation corroborates. Written by the cloud pipeline bronze→silver merge; the Reconciliation read model (0087) is derived over it.';
CREATE INDEX IF NOT EXISTS idx_time_record_employee_date ON time_record (app_user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_time_record_source_kind ON time_record (source, kind);

DROP TRIGGER IF EXISTS trg_time_record_updated ON time_record;
CREATE TRIGGER trg_time_record_updated BEFORE UPDATE ON time_record
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Union read view over the two bronze sources (ADR-0039 discipline) ─────────
-- Common-subset read surface for the merge/QA; writes always target the physical
-- bronze tables. The silver time_record is the true unification point — this view
-- only exposes the raw per-source facts side by side with a `source` literal.
CREATE OR REPLACE VIEW time_entry_bronze_all AS
  SELECT id, 'website'::text AS source, app_user_id, work_date, started_at, ended_at,
         category, ancillary_ticket_ref, NULL::text AS external_ref, last_seen_at
    FROM (SELECT id, app_user_id, work_date, started_at, ended_at, category,
                 ancillary_ticket_ref, updated_at AS last_seen_at FROM website_time_entry) w
  UNION ALL
  SELECT id, 'autotask'::text AS source, app_user_id, work_date, started_at, ended_at,
         NULL::text AS category, autotask_ticket_id::text AS ancillary_ticket_ref,
         external_ref, last_seen_at
    FROM autotask_time_entry;

-- ── Grants (0084/0085 defensive pattern; roles may be absent in some envs) ────
-- web: enters/edits attendance + drives timesheet state (GUI); reads allocation for
--   the memory-jogger; reads silver to render. backend: reads attendance+allocation+
--   silver for reconciliation, writes timesheet (sets paid, stamps Time Ticket link).
-- cloud-pipeline: writes silver (merge), reads both bronze; resolves autotask rows.
-- local-pipeline: ingests autotask_time_entry (scheduled Autotask TimeEntry pull).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON timesheet          TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON website_time_entry TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON autotask_time_entry  TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON time_record          TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON time_entry_bronze_all TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, UPDATE ON timesheet    TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON website_time_entry   TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON autotask_time_entry  TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON time_record          TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON time_record        TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON website_time_entry   TO "mgid-imperioncrmpipeline";
    GRANT SELECT, UPDATE ON autotask_time_entry TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON timesheet            TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON autotask_time_entry TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
