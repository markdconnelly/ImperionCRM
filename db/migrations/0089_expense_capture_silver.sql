-- 0089: Expense capture + silver — expense_report + receipt_attachment +
-- website_expense_item (bronze) + mileiq_drive (bronze) + expense_item (silver)
-- + expense_item_all view. (ADR-0083, issue #484.) Depends on 0088.
-- Second of the three expense schema migrations (0088 config/comp →
-- 0089 capture/silver → 0090 autotask-write/recon).
--
-- Two expense signals (ADR-0083 §Decision), each in its own per-source bronze
-- (ADR-0039), normalize into ONE silver table — exactly mirroring time (0086):
--   • website_expense_item — manual out-of-pocket entries the employee enters on
--     the site (date, category, amount, merchant, billable/companyID, receipt).
--     Authoritative for out-of-pocket. Belongs to the employee's monthly report.
--   • mileiq_drive — business-classified drives pulled read-only (per-user OAuth)
--     by the local pipeline. Authoritative for the MILES fact only; the dollar
--     amount is Imperion's (miles × effective Mileage Rate). Personal drives never
--     enter. Resolved to an employee by the 0088 MileIQ user-id mapping.
--   • expense_item (silver) — one normalized row per source fact, discriminated by
--     source(website|mileiq) + kind(out_of_pocket|mileage). The unified surface the
--     app + reconciliation read; the cloud pipeline merge writes it.
-- The monthly container is the expense_report: one employee, one calendar month,
-- lifecycle Open→Submitted→Approved→Finance-Approved→Reimbursed (+ Rejected→reopen),
-- mirroring the timesheet. The attested original is preserved (attested_snapshot).
-- Receipts land in receipt_attachment (blob ref → pushed to Autotask → verified →
-- 90-day blob lifecycle), guarded so an unverified receipt is never silently deleted.
--
-- Comp note (ADR-0083 §Security): the Mileage Rate is comp data the pipelines may
-- NOT read (0088). So a mileage row's `miles` is the bronze fact (non-comp) and its
-- reimbursement `amount` is DERIVED by the backend (the comp reader) — never hand-
-- typed. Out-of-pocket `amount` is entered. The merge may seed a mileage amount from
-- the MileIQ-suggested rate snapshot (non-comp); the backend reconciles the system
-- override. No comp value lives in these broadly-granted tables.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it (issue #494). No secrets, no comp data here.

BEGIN;

-- ── expense_report: the monthly per-employee container ─────────────────────────
-- One report per employee per calendar month (created only when ≥1 expense exists).
-- Lifecycle mirrors the timesheet; rejected→reopen returns it to open (same row).
CREATE TABLE IF NOT EXISTS expense_report (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id   uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,    -- the Employee
  period_year   integer NOT NULL,
  period_month  integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  state         text NOT NULL DEFAULT 'open'
                  CHECK (state IN ('open','submitted','approved','finance_approved','reimbursed','rejected')),
  -- Attestation (→ submitted): the employee affirms; this hard-locks them out.
  attested_at   timestamptz,
  attested_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,            -- the employee
  attested_snapshot jsonb,                            -- attested original, preserved for audit
  -- Admin approval (→ approved): triggers the idempotent Autotask ExpenseReport write (0090/backend).
  approved_at   timestamptz,
  approved_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,            -- an admin
  -- Finance approval (→ finance_approved; CFO/finance∨admin): authorizes reimbursement.
  finance_approved_at timestamptz,
  finance_approved_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  -- Reimbursed (terminal): set by Reimbursement Reconciliation against the QuickBooks bill-payment.
  reimbursed_at timestamptz,
  qb_bill_payment_ref text,                           -- matched QuickBooks bill-payment id (read-only SoR)
  -- Rejection (→ rejected, reopen returns to open): who/why.
  rejected_at   timestamptz,
  rejected_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  rejection_note text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_user_id, period_year, period_month)     -- one employee, one month, one report
);
COMMENT ON TABLE expense_report IS
  'Monthly per-employee expense container (ADR-0083). Lifecycle open→submitted(attest, self-locks)→approved(admin → Autotask ExpenseReport write)→finance_approved(finance∨admin)→reimbursed(matched to a QuickBooks bill-payment); rejected→reopen returns to open. attested_snapshot preserves the employee''s attested original for audit when an admin corrects.';
CREATE INDEX IF NOT EXISTS idx_expense_report_employee_period ON expense_report (app_user_id, period_year DESC, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_expense_report_state ON expense_report (state);

DROP TRIGGER IF EXISTS trg_expense_report_updated ON expense_report;
CREATE TRIGGER trg_expense_report_updated BEFORE UPDATE ON expense_report
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── receipt_attachment: the receipt blob ref + Autotask custody lifecycle ──────
-- Uploaded to a private Azure storage account (v1 web upload). On approval the
-- backend pushes it to Autotask as an ExpenseItemAttachment and verifies it stored
-- (read-back). The local pipeline then enforces a 90-day blob lifecycle — GUARDED:
-- a receipt not yet verified_in_autotask is retained/flagged, never silently deleted.
CREATE TABLE IF NOT EXISTS receipt_attachment (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id           uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  blob_path             text NOT NULL,                -- private storage-account path/key
  content_hash          text,                         -- integrity (e.g. sha256) for verify-stored
  content_type          text,
  byte_size             bigint,
  original_filename     text,
  autotask_attachment_id bigint,                      -- Autotask ExpenseItemAttachment id (NULL until pushed)
  verified_in_autotask  boolean NOT NULL DEFAULT false,  -- read-back confirmed (gates blob delete)
  uploaded_at           timestamptz NOT NULL DEFAULT now(),
  pushed_at             timestamptz,                  -- when sent to Autotask
  verified_at           timestamptz,                  -- when read-back confirmed
  blob_deleted_at       timestamptz,                  -- 90-day lifecycle delete (only after verified)
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE receipt_attachment IS
  'Receipt blob ref + Autotask custody lifecycle (ADR-0083). Web upload → private Azure storage; backend pushes to Autotask (ExpenseItemAttachment) + verifies stored; local pipeline enforces a 90-day blob lifecycle, GUARDED — an unverified receipt is retained/flagged, never silently deleted (Autotask is the durable SoR once verified).';
CREATE INDEX IF NOT EXISTS idx_receipt_attachment_employee ON receipt_attachment (app_user_id);
-- The lifecycle guard scan: live blobs whose verify-in-Autotask gate decides deletion.
CREATE INDEX IF NOT EXISTS idx_receipt_attachment_lifecycle ON receipt_attachment (uploaded_at) WHERE blob_deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_receipt_attachment_updated ON receipt_attachment;
CREATE TRIGGER trg_receipt_attachment_updated BEFORE UPDATE ON receipt_attachment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── website_expense_item (bronze, out-of-pocket — AUTHORITATIVE) ───────────────
-- A manual out-of-pocket entry on the employee's open monthly report. Reimbursable
-- and billable are INDEPENDENT legs (ADR-0083): an item can be both. companyID
-- (+ project/ticket) carries the client leg when billable. Receipt required at
-- attest (a soft/hard policy check, not a DB constraint — mileage is exempt).
CREATE TABLE IF NOT EXISTS website_expense_item (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id   uuid NOT NULL REFERENCES expense_report(id) ON DELETE CASCADE,
  app_user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- denormalized for query
  item_date           date NOT NULL,
  category_id         uuid REFERENCES expense_category(id) ON DELETE SET NULL,  -- NULL = uncategorized (soft)
  amount              numeric(12,2) NOT NULL CHECK (amount > 0),  -- entered (out-of-pocket)
  merchant            text,
  description         text,
  -- The two independent legs (ADR-0083): reimbursable = owed back to the employee;
  -- billable = passed through to a client. Default internal/reimbursable.
  reimbursable        boolean NOT NULL DEFAULT true,
  billable            boolean NOT NULL DEFAULT false,
  autotask_company_id bigint,                         -- companyID (the client leg, when billable)
  project_ref         text,
  ticket_ref          text,
  receipt_id          uuid REFERENCES receipt_attachment(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE website_expense_item IS
  'Out-of-pocket bronze (ADR-0083/0039): the employee''s manually-entered expenses on their monthly report. Source=website. Reimbursable & billable are independent legs; companyID carries the client leg when billable. amount is entered (>0).';
CREATE INDEX IF NOT EXISTS idx_website_expense_item_report ON website_expense_item (expense_report_id);
CREATE INDEX IF NOT EXISTS idx_website_expense_item_employee_date ON website_expense_item (app_user_id, item_date);

DROP TRIGGER IF EXISTS trg_website_expense_item_updated ON website_expense_item;
CREATE TRIGGER trg_website_expense_item_updated BEFORE UPDATE ON website_expense_item
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── mileiq_drive (bronze, mileage — MILES authoritative, $ derived) ────────────
-- Business-classified drives pulled read-only by the local pipeline (per-user
-- OAuth). MileIQ owns the miles fact + a suggested rate/amount snapshot (non-comp);
-- Imperion owns the reimbursement dollar (miles × effective Mileage Rate, derived by
-- the backend). Resolved to an employee via the 0088 MileIQ user-id mapping. No
-- report FK — the silver merge assigns the drive to a month's report (like Autotask
-- allocation rows in 0086).
CREATE TABLE IF NOT EXISTS mileiq_drive (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mileiq_drive_id text UNIQUE,                        -- MileIQ drive id (idempotent upsert)
  app_user_id     uuid REFERENCES app_user(id) ON DELETE SET NULL,          -- resolved employee (null until matched)
  mileiq_user_id  text,                               -- raw MileIQ user id → employee_profile mapping (0088)
  drive_date      date NOT NULL,
  miles           numeric(10,2) NOT NULL CHECK (miles > 0),
  origin          text,
  destination     text,
  suggested_rate  numeric(8,4),                       -- MileIQ-suggested USD/mile (non-comp snapshot)
  suggested_amount numeric(12,2),                     -- MileIQ-suggested amount (non-comp snapshot)
  payload_bronze  jsonb,                              -- raw MileIQ payload
  matched_at      timestamptz,                        -- when resolved to app_user
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE mileiq_drive IS
  'Mileage bronze (ADR-0083/0039): business-classified MileIQ drives pulled read-only by the local pipeline. Source=mileiq. MileIQ is authoritative for miles + a suggested rate/amount (non-comp); the reimbursement dollar is derived (miles × effective Mileage Rate) by the backend. Resolved to an employee by the 0088 MileIQ mapping.';
CREATE INDEX IF NOT EXISTS idx_mileiq_drive_employee_date ON mileiq_drive (app_user_id, drive_date);
CREATE INDEX IF NOT EXISTS idx_mileiq_drive_user ON mileiq_drive (mileiq_user_id) WHERE mileiq_user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_mileiq_drive_updated ON mileiq_drive;
CREATE TRIGGER trg_mileiq_drive_updated BEFORE UPDATE ON mileiq_drive
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── expense_item (silver, the unified expense surface) ─────────────────────────
-- One normalized row per source fact. The cloud pipeline merge writes it from both
-- bronze sources; the app + reconciliation read it. source↔kind is fixed:
-- website→out_of_pocket, mileiq→mileage. Mileage carries `miles` (and a derived
-- `amount`); out-of-pocket carries `amount` (entered, >0) and no miles.
CREATE TABLE IF NOT EXISTS expense_item (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expense_report_id   uuid NOT NULL REFERENCES expense_report(id) ON DELETE CASCADE,
  source              text NOT NULL CHECK (source IN ('website','mileiq')),
  kind                text NOT NULL CHECK (kind IN ('out_of_pocket','mileage')),
  item_date           date NOT NULL,
  category_id         uuid REFERENCES expense_category(id) ON DELETE SET NULL,
  -- amount = the reimbursement dollar. Entered for out-of-pocket; DERIVED (miles ×
  -- effective Mileage Rate) by the backend for mileage — never hand-typed. Nullable
  -- so the merge can write a mileage row before the comp-reader stamps the amount.
  amount              numeric(12,2),
  miles               numeric(10,2),                  -- mileage only
  -- Independent legs (ADR-0083).
  reimbursable        boolean NOT NULL DEFAULT true,
  billable            boolean NOT NULL DEFAULT false,
  autotask_company_id bigint,                         -- client leg when billable
  project_ref         text,
  ticket_ref          text,
  merchant            text,                           -- out-of-pocket only
  receipt_id          uuid REFERENCES receipt_attachment(id) ON DELETE SET NULL,
  source_ref          uuid,                           -- bronze row id (website_expense_item.id / mileiq_drive.id)
  external_ref        text,                           -- mileiq_drive_id when source=mileiq
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- website is always out_of_pocket; mileiq is always mileage (ADR-0083).
  CONSTRAINT expense_item_source_kind CHECK (
    (source = 'website' AND kind = 'out_of_pocket')
    OR (source = 'mileiq' AND kind = 'mileage')
  ),
  -- Mileage carries miles (amount derived later); out-of-pocket carries amount, no miles.
  CONSTRAINT expense_item_kind_shape CHECK (
    (kind = 'mileage'       AND miles IS NOT NULL AND miles > 0)
    OR (kind = 'out_of_pocket' AND miles IS NULL AND amount IS NOT NULL AND amount > 0)
  )
);
COMMENT ON TABLE expense_item IS
  'Silver unified expense surface (ADR-0083): one row per source fact, source(website|mileiq)+kind(out_of_pocket|mileage). Written by the cloud pipeline bronze→silver merge; the app + reconciliation read it. Out-of-pocket amount is entered; mileage amount is derived (miles × effective rate) by the backend (the comp reader) — never hand-typed.';
CREATE INDEX IF NOT EXISTS idx_expense_item_report ON expense_item (expense_report_id);
CREATE INDEX IF NOT EXISTS idx_expense_item_employee_date ON expense_item (app_user_id, item_date);
CREATE INDEX IF NOT EXISTS idx_expense_item_source_kind ON expense_item (source, kind);

DROP TRIGGER IF EXISTS trg_expense_item_updated ON expense_item;
CREATE TRIGGER trg_expense_item_updated BEFORE UPDATE ON expense_item
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Union read view over the two bronze sources (ADR-0039 discipline) ──────────
-- Parallels time_entry_bronze_all (0086): a common-subset read surface exposing the
-- raw per-source facts side by side with a `source` literal. Writes always target the
-- physical bronze tables; the silver expense_item is the true unification point.
CREATE OR REPLACE VIEW expense_item_all AS
  SELECT id, 'website'::text AS source, 'out_of_pocket'::text AS kind, app_user_id,
         item_date, amount, NULL::numeric AS miles, category_id, merchant,
         reimbursable, billable, autotask_company_id, receipt_id, updated_at AS last_seen_at
    FROM website_expense_item
  UNION ALL
  SELECT id, 'mileiq'::text AS source, 'mileage'::text AS kind, app_user_id,
         drive_date AS item_date, suggested_amount AS amount, miles, NULL::uuid AS category_id,
         destination AS merchant, true AS reimbursable, false AS billable,
         NULL::bigint AS autotask_company_id, NULL::uuid AS receipt_id, last_seen_at
    FROM mileiq_drive;

-- ── Grants (0086 defensive pattern; roles may be absent in some envs) ──────────
-- web: enters/edits out-of-pocket + uploads receipts + drives report state (GUI);
--   reads drives/silver to render. backend: reads all + writes report (reimbursed,
--   stamps), derives mileage amount + pushes receipts (the comp reader). cloud-
--   pipeline: writes silver (merge) + upserts the monthly report container, reads
--   bronze. local-pipeline: ingests mileiq_drive (MileIQ pull) + runs the receipt
--   90-day lifecycle.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON expense_report        TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON website_expense_item  TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON receipt_attachment    TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON mileiq_drive      TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON expense_item      TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON expense_item_all  TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, UPDATE ON expense_report     TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, UPDATE ON expense_item       TO "mgid-imperioncrmbackendfunction";  -- derive mileage amount
    GRANT SELECT, UPDATE ON receipt_attachment TO "mgid-imperioncrmbackendfunction";  -- push + verify
    GRANT SELECT ON website_expense_item       TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON mileiq_drive               TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- cloud pipeline (silver merge): writes expense_item + upserts the report container.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON expense_item   TO "mgid-imperioncrmpipeline";
    GRANT SELECT, INSERT, UPDATE ON expense_report         TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON website_expense_item TO "mgid-imperioncrmpipeline";
    GRANT SELECT, UPDATE ON mileiq_drive TO "mgid-imperioncrmpipeline";  -- resolve app_user
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  END IF;

  -- local pipeline (MileIQ pull + receipt 90-day lifecycle).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON mileiq_drive       TO "imperion-localpipeline";
    GRANT SELECT, UPDATE ON receipt_attachment         TO "imperion-localpipeline";  -- lifecycle delete + flag
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
