-- 0901 (PLACEHOLDER — claimed at merge per system CLAUDE.md §10.3; 0195 was the latest
-- applied/repo migration when this was authored. Rebase on main, take the next free number,
-- rename this file — rename is data-safe — and fix the in-file refs + data-model.md + the two
-- OKF concept timestamps before squash-merge.): recurring invoice GENERATION (QBO).
-- Tracer slice of epic #1045 (AR/AP & cash-flow operations); this is child #1095.
--
-- WHAT THIS IS (the inverse leg of the AR mirror). `invoice_mirror` (migration 0121) and
-- `collections_activity` (0122) cover money ALREADY billed: a READ-ONLY projection of
-- QuickBooks invoices plus an app-native dunning overlay. This slice covers the BILLING side:
-- a recurring template + cadence the MSP owns app-side, and the per-period DRAFT it generates.
--
-- THE QBO-WRITE GATE (ADR-0085 QBO read-only posture). QuickBooks is the invoice system of
-- record and is read-only on our side TODAY — there is no QBO write path and the QBO app
-- registration / OAuth scopes for a write are Mark-gated. Recurring invoice generation is the
-- ONE place the system intends to eventually WRITE an invoice to QBO, but that push is NOT in
-- this slice. So generation is built behind the gate: this slice produces app-native DRAFT
-- rows (`generated_invoice`, status `pending`/`drafted`) — the payload a future Mark-gated
-- backend job will POST to QBO. No row here calls QuickBooks; `pushed_at` / `qbo_invoice_id`
-- stay NULL until that gated push lands. App-native until then, exactly like collections_activity.
--
-- ARCHETYPE. `recurring_invoice_schedule` = archetype H (app-native config/template — the
-- cadence + line items the MSP authors; no external SoR). `generated_invoice` = archetype D
-- write-back sidecar: an app-owned draft keyed to a schedule, whose eventual (gated) write
-- target is QBO. Until the push exists it is app-native, like collections_activity (0122).
--
-- CADENCE. The schedule stores an RFC-5545 RRULE *subset* string (`FREQ=MONTHLY;INTERVAL=1`),
-- the SAME shape already parsed by `src/lib/recurrence.ts` (ADR-0070 E2, used by task
-- recurrence) — we reuse that engine rather than add a second cadence vocabulary. `next_run_on`
-- is the materialised next-due calendar day the generator advances; `last_generated_period`
-- is the idempotency anchor.
--
-- IDEMPOTENCY. One draft per (schedule, period) — `UNIQUE (schedule_id, period_key)`. A
-- period_key is the occurrence's calendar day (`yyyy-mm-dd`); re-running the generator for an
-- already-generated period is a no-op (ON CONFLICT DO NOTHING in the accessor), so a retry or
-- an overlapping run never double-bills. This mirrors the time/expense → Autotask idempotency-
-- key discipline (ADR-0074 / ADR-0082 / ADR-0083) applied to the QBO write leg.
--
-- WHAT THIS IS NOT:
--   * NOT a QBO write. Nothing here POSTs to QuickBooks; drafts wait for the gated backend push.
--   * NOT the AR mirror. It does not read or duplicate `invoice_mirror` — that is billed AR;
--     this is the to-be-billed template + draft. The mirror picks the invoice up once QBO has it.
--   * NOT a payment ledger and NOT a tax engine. Line items are a simple JSONB list
--     (description / qty / unit_amount); QBO computes tax/totals at push time. `total_amount`
--     here is the app-side draft subtotal for display/approval only.
--   * NOT client PII. customer is the billed BUSINESS (account/QBO customer), never a person.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT prod-applied
-- until the orchestrator runs it (Mark-gated). No secrets, no row-level PII.

BEGIN;

-- ── recurring_invoice_status: lifecycle of a schedule ─────────────────────────────────────────
-- active  = generating on cadence · paused = temporarily halted (no generation) ·
-- ended   = finished (past end_on or manually closed; kept for history).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_invoice_status') THEN
    CREATE TYPE recurring_invoice_status AS ENUM ('active', 'paused', 'ended');
  END IF;
END $$;

-- ── generated_invoice_status: lifecycle of one generated draft on its way to QBO ──────────────
-- pending = generated, awaiting review/approval · drafted = approved app-side, queued for the
-- (gated) QBO push · pushed = written to QBO by the gated backend job (sets qbo_invoice_id) ·
-- failed  = the gated push errored (retryable) · skipped = deliberately not billed this period.
-- pushed/failed are written ONLY by the future Mark-gated backend push — never by this slice.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generated_invoice_status') THEN
    CREATE TYPE generated_invoice_status AS ENUM
      ('pending', 'drafted', 'pushed', 'failed', 'skipped');
  END IF;
END $$;

-- ── recurring_invoice_schedule: the app-native recurring-billing template (archetype H) ───────
CREATE TABLE IF NOT EXISTS recurring_invoice_schedule (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  -- The billed BUSINESS. account_id is the firm app-side link; qbo_customer_id is the QBO
  -- customer the gated push will bill (= bronze qbo_customers.customer_id), carried as text
  -- (QBO is read-only / has no FK target on our side). At least the account link is required;
  -- the QBO customer id is resolved/filled when present (LEFT-resolvable, like the mirror).
  account_id       uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  qbo_customer_id  text,
  -- Human label for the worklist (e.g. "Managed services — monthly retainer"). Not PII.
  name             text NOT NULL,
  -- RFC-5545 RRULE subset (FREQ=DAILY|WEEKLY|MONTHLY;INTERVAL=n) — parsed by src/lib/recurrence.ts.
  rrule            text NOT NULL,
  -- Line items as JSONB: [{ description, quantity, unit_amount }]. QBO computes tax/totals at
  -- push; app-side subtotal is display/approval only. No PII — these are service descriptions.
  line_items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency         text NOT NULL DEFAULT 'USD',
  -- The aging-clock terms the draft carries to QBO (net days from txn date → due date).
  net_terms_days   smallint NOT NULL DEFAULT 30 CHECK (net_terms_days >= 0),
  status           recurring_invoice_status NOT NULL DEFAULT 'active',
  -- Cadence window. start_on seeds the first occurrence; end_on (nullable) closes the schedule.
  start_on         date NOT NULL,
  end_on           date,
  -- Materialised next-due calendar day the generator targets, advanced via recurrence.nextOccurrence.
  next_run_on      date NOT NULL,
  -- Idempotency anchor: the period_key of the most recently generated draft (NULL = none yet).
  last_generated_period text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_invoice_schedule_window_ck CHECK (end_on IS NULL OR end_on >= start_on)
);
COMMENT ON TABLE recurring_invoice_schedule IS
  'App-native recurring-billing template (#1095, epic #1045; archetype H config). The MSP authors a cadence (RRULE subset, parsed by src/lib/recurrence.ts) + line items per account; the generator emits one generated_invoice draft per due period. NO QBO write here — QuickBooks is read-only on our side (ADR-0085) and the invoice push is Mark-gated; this is only the to-be-billed template. No PII (billed entity is a business). Caps invoicing:read / invoicing:write (admin∨finance, ADR-0030).';
COMMENT ON COLUMN recurring_invoice_schedule.rrule IS
  'RFC-5545 RRULE subset (FREQ=DAILY|WEEKLY|MONTHLY;INTERVAL=n), parsed by src/lib/recurrence.ts (ADR-0070 E2). Same cadence vocabulary as task_recurrence.';
COMMENT ON COLUMN recurring_invoice_schedule.line_items IS
  'JSONB list [{ description, quantity, unit_amount }]. QBO computes tax/totals at the gated push; app-side total is display/approval only. No PII.';

CREATE INDEX IF NOT EXISTS idx_recurring_invoice_schedule_tenant_status
  ON recurring_invoice_schedule (tenant_id, status);
-- The generator's worklist: active schedules whose next run is due.
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_schedule_due
  ON recurring_invoice_schedule (next_run_on)
  WHERE status = 'active';

-- ── generated_invoice: one DRAFT per (schedule, period) — the gated QBO-push queue/ledger ─────
CREATE TABLE IF NOT EXISTS generated_invoice (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  schedule_id      uuid NOT NULL REFERENCES recurring_invoice_schedule(id) ON DELETE CASCADE,
  -- The occurrence this draft bills, as a calendar day (yyyy-mm-dd). The idempotency anchor.
  period_key       text NOT NULL,
  -- Snapshot of the draft the generator built (line_items + computed dates). QBO is the SoR
  -- once pushed; until then this is the app-side draft the approver reviews.
  txn_date         date NOT NULL,
  due_date         date NOT NULL,
  line_items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency         text NOT NULL DEFAULT 'USD',
  -- App-side subtotal (sum of line qty×unit_amount) for display/approval. QBO recomputes at push.
  total_amount     numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status           generated_invoice_status NOT NULL DEFAULT 'pending',
  -- Filled ONLY by the future Mark-gated QBO push (ADR-0085). NULL until then.
  qbo_invoice_id   text,
  pushed_at        timestamptz,
  -- Last push error (failed status), for retry diagnostics. Operational text, no PII/secrets.
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- One draft per schedule per period — the idempotency guarantee against double-billing.
  CONSTRAINT generated_invoice_period_uniq UNIQUE (schedule_id, period_key)
);
COMMENT ON TABLE generated_invoice IS
  'One generated invoice DRAFT per (schedule, period) — the gated QBO-push queue/ledger (#1095, epic #1045; archetype D, app-native until the push exists). The recurring generator emits a draft per due period; status pending→drafted→pushed walks it toward QBO, but the push is Mark-gated (ADR-0085 QBO read-only) — qbo_invoice_id/pushed_at stay NULL and are written ONLY by the future gated backend job. UNIQUE (schedule_id, period_key) makes generation idempotent — a retry never double-bills. total_amount is an app-side draft subtotal; QBO recomputes tax/totals at push. No PII.';
COMMENT ON COLUMN generated_invoice.period_key IS
  'The billed occurrence as a calendar day (yyyy-mm-dd). Idempotency anchor: UNIQUE (schedule_id, period_key) — re-generating a period is a no-op.';
COMMENT ON COLUMN generated_invoice.qbo_invoice_id IS
  'QBO Invoice Id once pushed (= invoice_mirror.qbo_invoice_id). NULL until the Mark-gated QBO push (ADR-0085) writes it; the mirror then picks the invoice up read-only.';

CREATE INDEX IF NOT EXISTS idx_generated_invoice_schedule
  ON generated_invoice (schedule_id, period_key);
CREATE INDEX IF NOT EXISTS idx_generated_invoice_tenant_status
  ON generated_invoice (tenant_id, status);
-- The (future, gated) push worklist: drafts approved app-side and queued for QBO.
CREATE INDEX IF NOT EXISTS idx_generated_invoice_push_queue
  ON generated_invoice (status)
  WHERE status = 'drafted';

-- ── Grants: the app reads/writes both (recurring-billing config + draft review/approval); the
--    backend reads/writes them for the future gated QBO-push job. Pipeline does NOT touch them —
--    app-native state, not pipeline-merged data. Defensive (roles may be absent), mirroring 0122.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['recurring_invoice_schedule', 'generated_invoice'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO "mgid-imperioncrm-web-prd"', t);
    ELSE
      RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant on %.', t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO "mgid-imperioncrmbackendfunction"', t);
    ELSE
      RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant on %.', t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmpipeline"', t);
    ELSE
      RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant on %.', t;
    END IF;
  END LOOP;
END $$;

COMMIT;
