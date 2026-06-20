-- 0137: website_mileage (bronze) — manual mileage entry, v1 interim.
-- (ADR-0083, issue #851; parent #482.) Depends on 0089.
--
-- WHY: the MileIQ External API is paywalled (ops #495 → moved to v2 "Refined").
-- v1 lets employees log mileage MANUALLY on their open monthly report. The front
-- end writes bronze only (silver `expense_item` is cloud-pipeline-merged, ADR-0042),
-- so manual mileage needs its own per-source bronze table the web MI can INSERT —
-- exactly parallel to website_expense_item (out-of-pocket) but for the MILES fact.
--
-- Design (ADR-0039 per-source/per-kind bronze, ADR-0083 §Decision):
--   • mileiq_drive      — mileage from MileIQ (read-only pull, no report FK).  [v2]
--   • website_mileage   — mileage entered manually on the website (THIS table). [v1]
--   • website_expense_item — out-of-pocket entered on the website.            [shipped]
-- All three normalize into the ONE silver `expense_item` via the cloud-pipeline merge.
-- website_mileage carries the employee's open-report FK (like website_expense_item):
-- the entry targets the monthly container directly, unlike a pulled MileIQ drive which
-- the merge allocates to a month. MILES is authoritative; the reimbursement $ is
-- DERIVED by the backend (miles × effective Mileage Rate, the comp reader) — never
-- hand-typed, so no comp value lives in this broadly-granted table.
--
-- This migration also LOOSENS the silver `expense_item` source↔kind CHECK so the merge
-- may write a (source='website', kind='mileage') row. The kind-shape CHECK already
-- keys off `kind` (mileage ⇒ miles>0), so it is unchanged.
--
-- Ticket linking reuses the existing `ticket_ref` text column (mirrors timesheets'
-- ancillary_ticket_ref + website_expense_item.ticket_ref). Required-when-billable is a
-- GUI/policy rule (#853), not a DB constraint — internal mileage may omit it.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no comp data here.

BEGIN;

-- ── website_mileage (bronze, manual mileage — MILES authoritative, $ derived) ──
CREATE TABLE IF NOT EXISTS website_mileage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id   uuid NOT NULL REFERENCES expense_report(id) ON DELETE CASCADE,
  app_user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- denormalized for query
  item_date           date NOT NULL,
  miles               numeric(10,2) NOT NULL CHECK (miles > 0),  -- the authoritative fact ($ derived downstream)
  origin              text,
  destination         text,
  -- Independent legs (ADR-0083): reimbursable = owed back to the employee;
  -- billable = passed through to a client. Default internal/reimbursable.
  reimbursable        boolean NOT NULL DEFAULT true,
  billable            boolean NOT NULL DEFAULT false,
  autotask_company_id bigint,                         -- companyID (the client leg, when billable)
  project_ref         text,
  ticket_ref          text,                           -- linked Autotask ticket (#853; required-when-billable is a GUI rule)
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE website_mileage IS
  'Manual mileage bronze (ADR-0083/0039, #851): mileage the employee enters by hand on their open monthly report while the MileIQ API is paywalled (v1 interim; full MileIQ → v2). Source=website, kind=mileage. MILES is authoritative; the reimbursement $ is derived (miles × effective Mileage Rate) by the backend — never hand-typed. Reimbursable & billable are independent legs; ticket_ref links an Autotask ticket (required when billable, GUI rule #853).';
CREATE INDEX IF NOT EXISTS idx_website_mileage_report ON website_mileage (expense_report_id);
CREATE INDEX IF NOT EXISTS idx_website_mileage_employee_date ON website_mileage (app_user_id, item_date);

DROP TRIGGER IF EXISTS trg_website_mileage_updated ON website_mileage;
CREATE TRIGGER trg_website_mileage_updated BEFORE UPDATE ON website_mileage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Loosen the silver source↔kind CHECK to admit manual (website, mileage) ─────
-- Previously: website⇒out_of_pocket, mileiq⇒mileage. Now website may be either kind
-- (out_of_pocket OR mileage); mileiq stays mileage-only. The kind-shape CHECK
-- (mileage⇒miles>0 / out_of_pocket⇒amount>0, no miles) is unchanged — it already keys
-- off kind, so it correctly constrains a website-mileage row too.
ALTER TABLE expense_item DROP CONSTRAINT IF EXISTS expense_item_source_kind;
ALTER TABLE expense_item ADD CONSTRAINT expense_item_source_kind CHECK (
  (source = 'website' AND kind IN ('out_of_pocket','mileage'))
  OR (source = 'mileiq' AND kind = 'mileage')
);

-- ── Extend the build-ahead union view with the new bronze source ───────────────
-- Same output columns/order/types as 0089 (CREATE OR REPLACE requires it). Manual
-- mileage projects amount=NULL (derived later), category=NULL, merchant=destination
-- (mirrors the mileiq_drive branch), carrying its own reimbursable/billable/company.
-- NOTE (#947): the mileage branch's NULL amount MUST be cast NULL::numeric(12,2) —
-- a bare NULL::numeric widens the view's amount column to unconstrained numeric and
-- CREATE OR REPLACE then fails ("cannot change data type of view column amount").
CREATE OR REPLACE VIEW expense_item_all AS
  SELECT id, 'website'::text AS source, 'out_of_pocket'::text AS kind, app_user_id,
         item_date, amount, NULL::numeric AS miles, category_id, merchant,
         reimbursable, billable, autotask_company_id, receipt_id, updated_at AS last_seen_at
    FROM website_expense_item
  UNION ALL
  SELECT id, 'website'::text AS source, 'mileage'::text AS kind, app_user_id,
         item_date, NULL::numeric(12,2) AS amount, miles, NULL::uuid AS category_id,
         destination AS merchant, reimbursable, billable, autotask_company_id,
         NULL::uuid AS receipt_id, updated_at AS last_seen_at
    FROM website_mileage
  UNION ALL
  SELECT id, 'mileiq'::text AS source, 'mileage'::text AS kind, app_user_id,
         drive_date AS item_date, suggested_amount AS amount, miles, NULL::uuid AS category_id,
         destination AS merchant, true AS reimbursable, false AS billable,
         NULL::bigint AS autotask_company_id, NULL::uuid AS receipt_id, last_seen_at
    FROM mileiq_drive;

-- ── Grants (0089 defensive pattern; roles may be absent in some envs) ──────────
-- web: enters/edits/deletes manual mileage (GUI). backend: reads to derive the
-- reimbursement $ (comp reader). cloud-pipeline: reads to merge into silver. No
-- local-pipeline grant — this source is website-entered, not pulled.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON website_mileage TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON website_mileage TO "mgid-imperioncrmbackendfunction";  -- derive mileage amount
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON website_mileage TO "mgid-imperioncrmpipeline";  -- merge to silver expense_item
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grant.';
  END IF;
END $$;

COMMIT;
