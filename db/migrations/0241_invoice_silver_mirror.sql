-- 0241: silver `invoice` — curated, PIPELINE-POPULATED read-only MIRROR of bronze `qbo_invoices`
-- (#1580, parent #668, epic #1394 — Audrey FP&A AR/cash-flow expansion).
--
-- Migration number 0241 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder (0240 `budget` was the latest repo migration). If another migration merges
-- during the CI window, renumber this file + every in-file reference (rename is data-safe).
--
-- THE OWN-vs-MIRROR DECISION (RESOLVED — MIRROR, #668 / ADR-NNNN): Imperion does NOT own an
-- app-native AR/invoice ledger. QuickBooks Online is the system of record for money (ADR-0123)
-- and is READ-ONLY on our side. The curated silver `invoice` is a thin, type-cast MIRROR of
-- bronze `qbo_invoices` (mig 0120, LP #197 QBO pull) — the order-to-cash / revenue-in surface the
-- Collections (AR-dunning) and Controller (reconciliation-assurance) agents reason over (#667),
-- and the actuals side Audrey's cash-flow / AR-aging read-models tie out against (#1580/#1722).
-- App-native state exists ONLY for the dunning *workflow* (who we reminded, when, where it stands)
-- and already lives in `collections_activity` (mig 0122) — this migration does NOT duplicate it.
--
-- WHY A TABLE NOW (supersedes the 0121 `invoice_mirror` VIEW as the curated silver surface):
-- the read-only VIEW (mig 0121) was the first AR observability projection — self-contained, aging
-- recomputed on every read. Audrey's FP&A read-models (AR-aging rollups, cash-flow forecast,
-- plan-vs-actual) need a STABLE, indexable, joinable silver `invoice` they can build derived
-- read-models over without re-deriving the bronze cast on every query. So the curated silver
-- entity is now a real table populated by the pipeline's bronze→silver merge (a PROCESS, not an
-- agent), in line with every other pipeline-merged silver mirror. The 0121 VIEW and
-- `collections_activity`'s text business-key into it are LEFT IN PLACE (unchanged) — the table
-- carries the same `qbo_invoice_id` natural key, so the dunning overlay keeps resolving. Retiring
-- the VIEW in favour of the table is a follow-up cutover (filed separately; see the PR body).
--
-- AR-AGING IS A DERIVED READ-MODEL, NOT A SILVER ENTITY (ADR-NNNN): aging buckets (current /
-- 1-30 / 31-60 / 61-90 / 90+) are a read-model computed over `invoice` (due_date + balance +
-- status → bucket) at query time — NOT a separate `ar_item` silver table. We do not persist a
-- second AR object; that would be entity sprawl over the same QBO fact.
--
-- WHAT THIS IS NOT:
--   * NOT a second invoice SoR. QBO remains the system of record; this is a read-only mirror.
--   * NOT an app→QBO write path. The app never writes QuickBooks; no money moves here.
--   * NOT an agent write target. Agents (the backend runtime) READ this mirror only — Audrey is
--     READ-ONLY L2; any dunning SEND is a human easy-button on another agent's side.
--   * NOT a payment ledger. `balance > 0` from the invoice envelope is the open-AR signal;
--     `qbo_payments` (mig 0120) match/apply stays a future Pipeline/Backend concern.
--
-- ARCHETYPE: B (external-SoR read-only mirror), populated by the pipeline merge — the `ticket`
-- (Autotask mirror) precedent, ADR-0044 mirror discipline. data_class FINANCIAL.
--
-- GRANTS (the key invariant): finance read-data. WEB + BACKEND/agent runtime get SELECT ONLY —
-- Audrey reads, never writes (ADR-0123 finance read-only). The pipeline merge role populates the
-- mirror, so it gets SELECT/INSERT/UPDATE; the local pipeline (which may own the QBO-fed merge
-- per the LP↔cloud parity contract) gets the same write grant. Defensive IF EXISTS blocks
-- (roles may be absent), mirroring 0120/0240.
--
-- New silver entity already has an OKF concept file — this PR UPDATES docs/database/semantic-
-- layer/tables/invoice.md + the coverage-matrix row in the SAME PR (system CLAUDE.md §11;
-- semantic-layer gate). Frontend-owned schema (ADR-0042). Additive + idempotent (CREATE TABLE
-- IF NOT EXISTS) + transactional. No PII beyond what the QBO mirror already holds (customer name
-- + amounts — existing posture; no email/phone/address selected). No secrets.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── invoice: curated silver AR/invoice mirror (pipeline-populated from bronze qbo_invoices) ──
CREATE TABLE IF NOT EXISTS invoice (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  -- The stable QBO natural key (= bronze qbo_invoices.external_id). Carried as text so the
  -- read-only `collections_activity` overlay (mig 0122) and the 0121 invoice_mirror VIEW keep
  -- resolving by the same business key. One mirror row per (tenant, QBO invoice).
  qbo_invoice_id  text NOT NULL,
  doc_number      text,                 -- QBO Invoice.DocNumber (human invoice number; may be null)
  -- Billed entity. customer_ref joins bronze qbo_customers.customer_id; the silver `account`
  -- resolution is a best-effort follow-up (no FK yet) and lives in read-models, not stored here.
  qbo_customer_id   text,               -- QBO CustomerRef.value
  qbo_customer_name text,               -- QBO CustomerRef.name (business identifier, not personal PII)
  issue_date      date,                 -- QBO Invoice.TxnDate (invoice date; aging-clock anchor partner)
  due_date        date,                 -- QBO Invoice.DueDate (the AR-aging clock start)
  total_amount    numeric(14,2),        -- QBO Invoice.TotalAmt (cast from the all-text bronze envelope)
  balance         numeric(14,2),        -- QBO Invoice.Balance (open AR; balance > 0 ⟺ open)
  status          text,                 -- QBO Invoice.EmailStatus / settlement status (mirrored as-is)
  currency        text,                 -- QBO Invoice.CurrencyRef.value
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- One curated mirror row per (tenant, QBO invoice) — the pipeline merge upserts on this key.
  CONSTRAINT invoice_tenant_qbo_uniq UNIQUE (tenant_id, qbo_invoice_id)
);
COMMENT ON TABLE invoice IS
  'Curated silver AR/invoice MIRROR of bronze qbo_invoices (#1580, parent #668; ADR-0123 QBO=SoR for money / ADR-0044 external-SoR mirror discipline). Pipeline-populated (bronze→silver merge, a PROCESS — NOT an agent): one row per (tenant, QBO invoice) carrying the meaningful invoice fields type-cast from the all-text bronze envelope (mig 0120, LP #197 QBO pull). READ-ONLY mirror — QBO is the system of record, there is NO app→QBO write path and no agent write path: web + backend/agent runtime (Audrey) get SELECT only; the pipeline merge role populates it. AR-aging (current|1-30|31-60|61-90|90+) is a DERIVED read-model over due_date + balance + status, NOT a separate ar_item silver entity. App-native dunning workflow-state lives in collections_activity (mig 0122), keyed by qbo_invoice_id — not duplicated here. Supersedes the 0121 invoice_mirror VIEW as the curated silver surface (VIEW left in place; cutover is a follow-up). Archetype B, FINANCIAL data_class. No PII beyond the QBO mirror posture (customer name + amounts; no email/phone/address), no secrets. Migration 0241 (PLACEHOLDER — real number at merge).';

COMMENT ON COLUMN invoice.qbo_invoice_id IS
  'QBO Invoice Id (= bronze qbo_invoices.external_id). Stable natural key; also the business key collections_activity (mig 0122) and the 0121 invoice_mirror VIEW resolve by.';
COMMENT ON COLUMN invoice.balance IS
  'Open AR balance (QBO Invoice.Balance). balance > 0 ⟺ open invoice — the single open-AR signal the AR-aging read-model partitions on.';

CREATE INDEX IF NOT EXISTS idx_invoice_tenant_customer ON invoice (tenant_id, qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date        ON invoice (due_date);
-- Open-AR partial index: the AR-aging / collections read-models filter to open invoices.
CREATE INDEX IF NOT EXISTS idx_invoice_open            ON invoice (tenant_id, due_date)
  WHERE balance > 0;

-- ── updated_at trigger (the 0210/0223/0238/0240 convention) ─────────────────────────────────
DROP TRIGGER IF EXISTS trg_invoice_updated ON invoice;
CREATE TRIGGER trg_invoice_updated BEFORE UPDATE ON invoice
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: READ-ONLY mirror — web + backend/agent read; the PIPELINE merge populates it ──────
-- The invariant: agents NEVER write the AR mirror (ADR-0123 finance read-only; Audrey read-only
-- L2). Web reads (AR observability / collections worklist / cash-flow surface) and backend/agent
-- runtime reads (Collections + Controller agents, Audrey FP&A) get SELECT only. The pipeline
-- merge role (which runs the bronze→silver merge) gets SELECT/INSERT/UPDATE so it can populate
-- the mirror; the local pipeline gets the same write grant per the LP↔cloud merge-parity contract
-- (whichever plane ingests the QBO bronze owns its merge). Defensive (roles may be absent),
-- mirroring the 0120/0240 blocks.
DO $$
BEGIN
  -- Web: reads the mirror for AR observability / collections worklist / cash-flow surfaces.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON invoice TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;

  -- Backend = the agent runtime (Collections + Controller + Audrey FP&A). SELECT ONLY — agents
  -- READ the AR mirror, NEVER write it (ADR-0123, finance read-only; Audrey read-only L2).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON invoice TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;

  -- Cloud pipeline: may run the bronze→silver merge that POPULATES the mirror → SELECT/INSERT/UPDATE.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON invoice TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline merge grant.';
  END IF;

  -- Local pipeline: same write grant — whichever plane ingests the QBO bronze owns its merge
  -- (LP↔cloud merge-parity contract; idempotent replace-from-source, so dual-run converges).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON invoice TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline merge grant.';
  END IF;
END $$;

COMMIT;
