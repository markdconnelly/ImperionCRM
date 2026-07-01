-- 0249: rev-rec / contract-schedule silver model (ASC 606) — `performance_obligation` +
-- `revenue_schedule` (#1619, epic #1534 — $100M gap-fill Cluster 2, Finance at scale).
--
-- Migration number 0249 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- assigned as part of a coordinated 11-PR schema batch. If a collision lands during the CI
-- window, renumber this file + every in-file reference (rename is data-safe).
--
-- THE OWN-vs-MIRROR DECISION (RESOLVED — OWN, the opposite pole of ADR-0140): QuickBooks
-- Online holds NO ASC 606 sub-ledger object — there is nothing external to mirror. The
-- rev-rec schedule is Imperion-COMPUTED, app-native silver working papers: Audrey computes
-- the schedule from the contract + delivery/milestone signals (procedure 09-18, B4
-- audit-attest + B6 money-gate), and the HUMAN (CFO — Nick, Mark proxy v1) performs the
-- recognition, which is the binding-book act. QBO REMAINS the system of record for the
-- posted books (ADR-0123): the app never posts to QBO; the human posts the journal entry
-- in QBO and the schedule row records the reference (`qbo_journal_ref`) for tie-out. This
-- complements ADR-0140 (AR/invoice = MIRROR because QBO owns the invoice object): mirror
-- when the external SoR has the object, own when it doesn't.
--
-- THE MODEL (ASC 606 steps 2/4/5 persisted; steps 1/3 live upstream in `contract`):
--   contract (mig 0050, Autotask-mirrored silver)
--     └── performance_obligation   — step 2 (identify obligations) + step 4 (allocate the
--         transaction price): one row per distinct promise, with the allocated amount, the
--         recognition method (ratable | point_in_time | usage | milestone |
--         percent_complete), and the satisfaction window. Contract MODIFICATIONS are new
--         obligation rows superseding the old (`superseded_by_id` lineage + `superseded`
--         status) — never destructive edits, so the schedule is auditable as of any moment.
--           └── revenue_schedule   — step 5 (recognize as satisfied): one row per obligation
--               × period with the scheduled (recognizable) amount; the CFO's recognition
--               stamps `recognized_amount` / `recognized_at` / `recognized_by` and the QBO
--               journal reference. Lifecycle: scheduled → proposed → recognized (| held).
--
-- DEFERRED REVENUE IS A DERIVED READ-MODEL, NOT A SILVER ENTITY (the ADR-0140 AR-aging
-- precedent): deferred = allocated_amount − recognized-to-date, and the deferred-revenue
-- rollforward is computed over these two tables at query time. We do NOT persist a
-- `deferred_revenue` table — that would be entity sprawl over the same facts.
--
-- WHAT THIS IS NOT:
--   * NOT a QBO write path. The app/agents never post to QBO; recognition is posted by the
--     human in QBO and referenced back here (`qbo_journal_ref`). No money moves here.
--   * NOT a second money SoR. QBO owns the posted books (ADR-0123); these are the ASC 606
--     working papers (schedule + audit trail) QBO cannot hold.
--   * NOT an autonomous-recognition surface. Audrey is L2 propose-only (09-18): she writes
--     scheduled/proposed rows; the recognized state is only ever reached through the
--     human always_gate in the backend runtime (B6 money-gate).
--   * NOT a billing schedule. Invoicing/billed-AR lives in `invoice` (0241, ADR-0140) +
--     `recurring_invoice_schedule`/`generated_invoice` (0199). Recognition ≠ billing.
--
-- ARCHETYPE: B (app-native, born silver — website/app system of record; nothing external
-- to merge). data_class FINANCIAL.
--
-- GRANTS (least-priv, ADR-0127): WEB gets SELECT only (renders the schedule + the CFO
-- recognition cockpit; the recognition ACT is a process → flows through the backend, §1).
-- BACKEND (agent runtime) gets SELECT/INSERT/UPDATE — Audrey computes/maintains the
-- schedule and the runtime records the human recognition decision behind the B6 gate.
-- NO pipeline grants (nothing is source-mirrored into these tables). NO DELETE for any
-- role — corrections are supersessions/status changes, never row loss (audit posture).
-- Defensive IF EXISTS blocks (roles may be absent), mirroring 0240/0241.
--
-- New silver entities → OKF concept files (performance_obligation.md, revenue_schedule.md)
-- + coverage-matrix rows + index rows in the SAME PR (system CLAUDE.md §11; semantic-layer
-- gate). Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. No PII —
-- contract-level commercial amounts only (no personal data, no pay/comp data). No secrets.
-- DORMANT — NOT prod-applied until Mark/the operator runs it (prod applies Mark-gated).

BEGIN;

-- ── rev_rec_method: how an obligation's revenue is recognized (ASC 606 step 5) ────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rev_rec_method') THEN
    CREATE TYPE rev_rec_method AS ENUM (
      'ratable',          -- over-time, straight-line over the term (managed services)
      'point_in_time',    -- on delivery/transfer of control (hardware, one-time projects)
      'usage',            -- as consumed/metered (usage-based line items)
      'milestone',        -- on defined milestone completion (project phases)
      'percent_complete'  -- over-time by input/output measure of progress
    );
  END IF;
END $$;

-- ── performance_obligation_status: obligation lifecycle ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'performance_obligation_status') THEN
    CREATE TYPE performance_obligation_status AS ENUM (
      'open',        -- being satisfied; schedule rows active
      'satisfied',   -- fully satisfied; all revenue recognized or scheduled
      'superseded',  -- replaced by a contract-modification successor (superseded_by_id)
      'cancelled'    -- contract terminated before satisfaction; remaining schedule void
    );
  END IF;
END $$;

-- ── revenue_schedule_status: per-period recognition lifecycle ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revenue_schedule_status') THEN
    CREATE TYPE revenue_schedule_status AS ENUM (
      'scheduled',  -- computed plan row (Audrey, L0/L2)
      'proposed',   -- period-close packet raised for the CFO decision (the worklist state)
      'recognized', -- human recognized; recognized_* stamped; QBO entry referenced
      'held'        -- human held it back (dispute/evidence gap); never auto-released
    );
  END IF;
END $$;

-- ── performance_obligation: ASC 606 steps 2+4 — the distinct promise + its allocation ─────
CREATE TABLE IF NOT EXISTS performance_obligation (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The contract the obligation belongs to (mig 0050 Autotask-mirrored silver). RESTRICT:
  -- rev-rec working papers are an audit trail — a contract with obligations cannot be
  -- silently deleted out from under the books.
  contract_id              uuid NOT NULL REFERENCES contract(id) ON DELETE RESTRICT,
  name                     text NOT NULL,      -- the distinct promise (e.g. "24/7 managed services — term")
  description              text,
  method                   rev_rec_method NOT NULL,
  -- Step 4: the transaction price allocated to THIS obligation (relative-SSP allocation).
  allocated_amount         numeric(14,2) NOT NULL CHECK (allocated_amount >= 0),
  standalone_selling_price numeric(14,2),      -- SSP used for the relative allocation (audit input)
  currency                 text NOT NULL DEFAULT 'USD',
  start_date               date,               -- satisfaction window (ratable/percent_complete term)
  end_date                 date,
  status                   performance_obligation_status NOT NULL DEFAULT 'open',
  satisfied_at             date,               -- when fully satisfied (point_in_time: the delivery date)
  -- Contract modification lineage: a modification allocates prospectively via NEW obligation
  -- rows; the replaced row points at its successor and flips to 'superseded'. Never edit
  -- amounts on a superseded row — the chain IS the audit trail.
  superseded_by_id         uuid REFERENCES performance_obligation(id) ON DELETE SET NULL,
  modification_note        text,               -- why the modification happened (cite the amendment)
  -- Evidence citation (A5 cite-discipline): contract clause / source row / as-of Audrey
  -- grounded the obligation on. Empty evidence → the obligation is parked, never fabricated.
  source_ref               text,
  version                  int NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT performance_obligation_window CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  ),
  -- Only superseded rows carry a successor pointer (one-directional so ON DELETE SET NULL
  -- can never wedge against the CHECK).
  CONSTRAINT performance_obligation_supersede CHECK (
    superseded_by_id IS NULL OR status = 'superseded'
  )
);
COMMENT ON TABLE performance_obligation IS
  'ASC 606 steps 2+4: one row per distinct performance obligation under a contract, with the allocated transaction price (relative-SSP), recognition method (ratable|point_in_time|usage|milestone|percent_complete) and satisfaction window (#1619, epic #1534). OWN not mirror — QBO holds no ASC 606 sub-ledger, so these are Imperion-computed working papers (the opposite pole of ADR-0140''s AR mirror); QBO remains SoR for the POSTED books (ADR-0123) and is never written by the app. Computed/maintained by Audrey (procedure 09-18, L2 propose-only, B4 audit-attest); recognition itself is the human CFO''s always_gate act on the child revenue_schedule rows. Contract MODIFICATIONS are new obligation rows superseding the old (superseded_by_id lineage) — never destructive edits. Archetype B (app-native silver), data_class FINANCIAL. No PII, no secrets. Migration 0249 (PLACEHOLDER — real number at merge).';
COMMENT ON COLUMN performance_obligation.allocated_amount IS
  'ASC 606 step 4: the portion of the contract transaction price allocated to this obligation (relative standalone-selling-price allocation). Deferred revenue = allocated_amount − recognized-to-date over the child revenue_schedule rows — DERIVED at query time, never persisted.';
COMMENT ON COLUMN performance_obligation.superseded_by_id IS
  'Contract-modification lineage: the successor obligation that prospectively replaced this one. Set together with status=superseded (CHECK-enforced); the chain is the modification audit trail.';
COMMENT ON COLUMN performance_obligation.source_ref IS
  'Evidence citation (contract clause / source row / as-of) Audrey grounded the obligation on — A5 cite-discipline; an obligation without evidence is parked, never fabricated.';

CREATE INDEX IF NOT EXISTS idx_perf_obligation_contract ON performance_obligation (contract_id);
-- Open-obligation partial index: the period-close sweep (09-18) scopes to open obligations.
CREATE INDEX IF NOT EXISTS idx_perf_obligation_open     ON performance_obligation (contract_id, end_date)
  WHERE status = 'open';

-- ── revenue_schedule: ASC 606 step 5 — per-period recognition rows ────────────────────────
CREATE TABLE IF NOT EXISTS revenue_schedule (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE is safe here: obligations are RESTRICT-protected above, so schedule rows only
  -- ever cascade with their obligation inside a deliberate, human-run correction.
  performance_obligation_id uuid NOT NULL REFERENCES performance_obligation(id) ON DELETE CASCADE,
  period_start              date NOT NULL,     -- recognition period (monthly close grain, ties 09-07)
  period_end                date NOT NULL,
  scheduled_amount          numeric(14,2) NOT NULL CHECK (scheduled_amount >= 0),
  -- Stamped by the human recognition (may differ from scheduled — partial holds, true-ups).
  recognized_amount         numeric(14,2) CHECK (recognized_amount >= 0),
  status                    revenue_schedule_status NOT NULL DEFAULT 'scheduled',
  recognized_at             timestamptz,       -- when the CFO recognized
  recognized_by             uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- the human who recognized (never an agent)
  -- Tie-out anchor: the QBO journal-entry reference the HUMAN posted (QBO = SoR for the
  -- posted books, ADR-0123). The app never posts; it records the reference and reconciles.
  qbo_journal_ref           text,
  reconciled_at             timestamptz,       -- when the row tied out against QBO actuals
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_schedule_period CHECK (period_end >= period_start),
  -- A recognized row must carry the recognition facts (amount + timestamp).
  CONSTRAINT revenue_schedule_recognized CHECK (
    status <> 'recognized' OR (recognized_amount IS NOT NULL AND recognized_at IS NOT NULL)
  ),
  -- One schedule row per obligation × period start (the merge/compute upsert key).
  CONSTRAINT revenue_schedule_obligation_period_uniq UNIQUE (performance_obligation_id, period_start)
);
COMMENT ON TABLE revenue_schedule IS
  'ASC 606 step 5: one row per performance_obligation × period with the scheduled (recognizable) amount; the deferred-vs-recognized split and the deferred-revenue rollforward are DERIVED read-models over these rows (allocated − recognized-to-date), never persisted (#1619, epic #1534 — the ADR-0140 AR-aging precedent). Lifecycle scheduled → proposed → recognized (| held): Audrey computes scheduled rows and raises the period-close proposed packet (09-18, L2 propose-only); RECOGNIZED is only ever reached through the human CFO''s always_gate (B6 money-gate) — a posted book entry is a binding act, so no agent ever sets it. The human posts the journal entry in QBO (SoR for money, ADR-0123; no app→QBO write path) and this row records qbo_journal_ref + reconciled_at for tie-out. Archetype B (app-native silver), data_class FINANCIAL. No PII, no secrets. Migration 0249 (PLACEHOLDER — real number at merge).';
COMMENT ON COLUMN revenue_schedule.status IS
  'scheduled (computed plan) → proposed (period-close packet awaiting the CFO) → recognized (human always_gate; recognition facts CHECK-enforced) | held (human hold — dispute/evidence gap; never auto-released).';
COMMENT ON COLUMN revenue_schedule.recognized_by IS
  'app_user of the HUMAN who recognized (CFO — Nick, Mark proxy v1). Always a human — recognition is the binding-book act agents never perform (09-18 autonomy floor).';
COMMENT ON COLUMN revenue_schedule.qbo_journal_ref IS
  'Reference to the QBO journal entry the human posted for this recognition (QBO = SoR for the posted books, ADR-0123). The app/agents never post to QBO; this is the reconcile-back anchor.';

CREATE INDEX IF NOT EXISTS idx_rev_schedule_obligation ON revenue_schedule (performance_obligation_id);
CREATE INDEX IF NOT EXISTS idx_rev_schedule_period     ON revenue_schedule (period_start);
-- The CFO recognition worklist: proposed rows by period.
CREATE INDEX IF NOT EXISTS idx_rev_schedule_proposed   ON revenue_schedule (period_start)
  WHERE status = 'proposed';

-- ── updated_at triggers (the 0210/0223/0238/0240/0241 convention) ─────────────────────────
DROP TRIGGER IF EXISTS trg_performance_obligation_updated ON performance_obligation;
CREATE TRIGGER trg_performance_obligation_updated BEFORE UPDATE ON performance_obligation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_revenue_schedule_updated ON revenue_schedule;
CREATE TRIGGER trg_revenue_schedule_updated BEFORE UPDATE ON revenue_schedule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (least-priv, ADR-0127): web reads; backend computes + records the gated act ────
-- The invariant: the recognition ACT only ever flows through the backend runtime's human
-- gate (§1: processes call the backend; B6 money-gate). Web renders the schedule + the CFO
-- cockpit → SELECT only. Backend (agent runtime) computes/maintains the schedule (Audrey,
-- 09-18) and records the human decision → SELECT/INSERT/UPDATE, NO DELETE (corrections are
-- supersessions/status changes — audit posture). No pipeline grants: nothing external is
-- mirrored into these tables. Defensive (roles may be absent), mirroring 0240/0241.
DO $$
BEGIN
  -- Web: renders the rev-rec schedule, deferred-revenue read-model, and CFO worklist.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON performance_obligation, revenue_schedule TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;

  -- Backend = the agent runtime (Audrey computes; the human gate records recognition).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON performance_obligation, revenue_schedule
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
END $$;

COMMIT;
