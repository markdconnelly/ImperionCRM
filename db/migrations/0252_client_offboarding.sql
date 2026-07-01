-- 0252: `client_offboarding` + `client_offboarding_step` silver — the client-offboarding /
-- retention-state model (#1622, epic #1534 — $100M gap-fill Cluster 5). The persistence the
-- 08-O procedure (Celeste + Osiris + Pierce: termination → data-return + deprovision) was
-- missing: the termination request, the data-return obligation + status, the deprovision
-- checklist, the retention/legal-hold clock (deadline-sentinel B9), and final-invoice/credit
-- reconciliation status.
--
-- Migration number 0252 was ASSIGNED for the coordinated 11-PR schema batch (system CLAUDE.md
-- §10.3 — numbers are claimed at MERGE; if another migration lands on 0252 during the CI
-- window, renumber this file + every reference: the OKF concepts, the coverage-matrix rows,
-- the PR body).
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B). `client_offboarding`
-- is the header: ONE open offboarding per account (partial unique), a status state machine
-- requested → data_returned → deprovisioned → closed (+ cancelled = save-the-account off-ramp,
-- 08-Q). `client_offboarding_step` is the checklist child (the onboarding_step mirror, run in
-- reverse): stable per-offboarding `code` for idempotent upserts, an owner SEAM label (Celeste
-- never actuates the destructive acts — Osiris owns deprovision, Pierce owns teardown, A11),
-- `always_gate` per step, and close-on-VERIFICATION (A9c: `fired` is never terminal — `verified`
-- is).
--
-- WHO WRITES IT. App-native: the backend offboarding executor (approval-gated, server-side,
-- never a direct silver write) + admin GUI via backend. Read-only to web (render) and to agents
-- (Celeste reads it to plan/watch; the retention clock is a structural refuse-precondition —
-- NO deletion before retention_hold_until / while legal_hold, dial-proof, B9 + A10 row 4).
-- data_class CLIENT_PII (always-gate): a named client's termination, data-return scope, and
-- legal-hold posture. The migration seeds NOTHING. Money stays in invoice/collections (QBO SoR,
-- ADR-0123) — this model carries reconciliation STATUS only, never amounts.
--
-- New silver entities → NEW OKF concept files (docs/database/semantic-layer/tables/
-- client_offboarding.md + client_offboarding_step.md) + coverage-matrix rows in THIS PR
-- (system CLAUDE.md §11; semantic-layer gate). Frontend-owned schema (ADR-0042). Additive +
-- idempotent + transactional. Least-priv grants (ADR-0127). No row-level PII, no secrets.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (prod apply Mark-gated).

BEGIN;

-- ── client_offboarding_status: the header state machine ───────────────────────────────────
-- requested → data_returned → deprovisioned → closed; cancelled = the save-the-account
-- off-ramp (08-Q) — a rescinded termination. Closed hardens: a re-onboard is a NEW gated
-- provision (OP-03-01), never an undo (B8-reverse close).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_offboarding_status') THEN
    CREATE TYPE client_offboarding_status AS ENUM (
      'requested', 'data_returned', 'deprovisioned', 'closed', 'cancelled'
    );
  END IF;
END $$;

-- ── client_offboarding_reason: how the termination signal arrived (the 08-O triggers) ─────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_offboarding_reason') THEN
    CREATE TYPE client_offboarding_reason AS ENUM (
      'non_renewal', 'termination_notice', 'admin_declared', 'other'
    );
  END IF;
END $$;

-- ── client_offboarding_data_return_status: the data-return obligation track ───────────────
-- confirmed = the client acknowledged receipt (the B7 client-facing confirmation, always-gate).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_offboarding_data_return_status') THEN
    CREATE TYPE client_offboarding_data_return_status AS ENUM (
      'pending', 'in_progress', 'returned', 'confirmed', 'not_required'
    );
  END IF;
END $$;

-- ── client_offboarding_invoice_status: final-invoice/credit reconciliation STATUS only ────
-- Amounts live in invoice/collections (QBO SoR, ADR-0123); the credit half is 08-P (B6
-- money-gate, routes to Audrey/Nick). waived = final invoice deliberately not raised.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_offboarding_invoice_status') THEN
    CREATE TYPE client_offboarding_invoice_status AS ENUM (
      'pending', 'issued', 'reconciled', 'waived'
    );
  END IF;
END $$;

-- ── client_offboarding_step_category: the checklist buckets (08-O step 2) ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_offboarding_step_category') THEN
    CREATE TYPE client_offboarding_step_category AS ENUM (
      'data_return', 'deprovision', 'teardown', 'license_reclaim', 'finance', 'comms'
    );
  END IF;
END $$;

-- ── client_offboarding_step_status: close-on-VERIFICATION (A9c) ───────────────────────────
-- fired = the act was kicked off; verified = read-back confirmed it landed (the only DONE).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_offboarding_step_status') THEN
    CREATE TYPE client_offboarding_step_status AS ENUM (
      'pending', 'blocked', 'approved', 'fired', 'verified', 'skipped'
    );
  END IF;
END $$;

-- ── client_offboarding: the offboarding/retention-state header ─────────────────────────────
CREATE TABLE IF NOT EXISTS client_offboarding (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,   -- the client
  contract_id               uuid REFERENCES contract(id) ON DELETE SET NULL,          -- the terminating contract (optional)
  status                    client_offboarding_status NOT NULL DEFAULT 'requested',
  reason                    client_offboarding_reason NOT NULL DEFAULT 'other',
  -- Provenance/basis note — NOT pii: a short grounding pointer ('contract #N non-renewal,
  -- as-of …'), never client verbatim (A5 ground-with-citation).
  reason_note               text,
  initiated_by              text,                                                     -- attributed principal (UPN or agent slug)
  termination_notice_at     timestamptz,                                              -- when the termination signal landed
  effective_at              timestamptz,                                              -- contractual termination effective date
  -- Data-return obligation (the B7 peel): scope note is a description, never client data.
  data_return_required      boolean NOT NULL DEFAULT true,
  data_return_status        client_offboarding_data_return_status NOT NULL DEFAULT 'pending',
  data_return_scope         text,
  data_return_confirmed_at  timestamptz,
  -- Retention / legal-hold clock (deadline-sentinel B9): NO deletion before
  -- retention_hold_until and NEVER while legal_hold — a structural refuse-precondition,
  -- dial-proof (A10 row 4). Enforced by the executor, watched by Celeste.
  retention_hold_until      timestamptz,
  legal_hold                boolean NOT NULL DEFAULT false,
  legal_hold_reason         text,
  legal_hold_released_at    timestamptz,
  -- Final invoice / credit reconciliation (the B6 peel): STATUS + pointer only, no amounts.
  final_invoice_status      client_offboarding_invoice_status NOT NULL DEFAULT 'pending',
  final_invoice_id          uuid REFERENCES invoice(id) ON DELETE SET NULL,           -- the QBO-mirror final invoice, once issued
  credit_ref                text,                                                     -- pointer to the 08-P service-credit record (no amounts)
  -- State-machine timestamps (history axis).
  requested_at              timestamptz NOT NULL DEFAULT now(),
  data_returned_at          timestamptz,
  deprovisioned_at          timestamptz,
  closed_at                 timestamptz,
  cancelled_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE client_offboarding IS
  'App-native client-offboarding / retention-state header (#1622, epic #1534 — 08-O termination → data-return + deprovision). State machine requested → data_returned → deprovisioned → closed (cancelled = save-the-account off-ramp); one OPEN offboarding per account (partial unique). Carries the termination request, data-return obligation+status (B7 confirmation always-gate), retention/legal-hold clock (deadline-sentinel B9 — no deletion before retention_hold_until / while legal_hold; structural refuse-precondition, dial-proof), and final-invoice/credit reconciliation STATUS (amounts stay in invoice/collections, QBO SoR ADR-0123; credit half = 08-P). Archetype B (app-native single-SoR), CLIENT_PII data_class (always-gate); backend offboarding executor writes (approval-gated), read-only to web + agents; seeds nothing. Migration 0252 (assigned for the 11-PR batch; renumber at merge if collided, §10.3).';

-- One OPEN offboarding per account; closed/cancelled rows are history.
CREATE UNIQUE INDEX IF NOT EXISTS client_offboarding_open_account_uniq
  ON client_offboarding (account_id)
  WHERE status NOT IN ('closed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_client_offboarding_account  ON client_offboarding (account_id);
CREATE INDEX IF NOT EXISTS idx_client_offboarding_status   ON client_offboarding (status);
CREATE INDEX IF NOT EXISTS idx_client_offboarding_hold     ON client_offboarding (retention_hold_until)
  WHERE retention_hold_until IS NOT NULL;                   -- the B9 sentinel scan

-- ── client_offboarding_step: the deprovision/teardown checklist (onboarding_step mirror) ──
CREATE TABLE IF NOT EXISTS client_offboarding_step (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id   uuid NOT NULL REFERENCES client_offboarding(id) ON DELETE CASCADE,
  code             text NOT NULL,                                     -- stable per-offboarding key (idempotent upsert target)
  category         client_offboarding_step_category NOT NULL,
  title            text NOT NULL,
  -- The A11 owner SEAM label ('celeste-comms', 'osiris-jml', 'pierce-teardown',
  -- 'vance-license', 'audrey-finance'): WHO owns the act. Celeste never actuates the delete.
  owner_seam       text,
  -- Destructive/irreversible/client-visible steps stay human-approved regardless of dial
  -- (A2 class 1-4). Defaults TRUE — a step must be explicitly marked reversible-internal.
  always_gate      boolean NOT NULL DEFAULT true,
  status           client_offboarding_step_status NOT NULL DEFAULT 'pending',
  fired_at         timestamptz,                                       -- the act was kicked off
  verified_at      timestamptz,                                       -- read-back confirmed (A9c — the only DONE)
  note             text,                                              -- basis/verification note, never client verbatim
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_offboarding_step_code_uniq UNIQUE (offboarding_id, code)
);
COMMENT ON TABLE client_offboarding_step IS
  'Checklist child of client_offboarding (#1622 — the onboarding_step mirror run in reverse): one row per deprovision/data-return/teardown/license-reclaim/finance/comms step, stable per-offboarding code (idempotent upsert), owner_seam = the A11 cross-owner label (Osiris owns deprovision, Pierce owns teardown — Celeste never actuates the destructive act), always_gate default TRUE, close-on-verification (A9c: fired is never terminal, verified is). Archetype B child, CLIENT_PII data_class via parent; backend-written, read-only to web + agents. Migration 0252 (assigned; renumber at merge if collided, §10.3).';

CREATE INDEX IF NOT EXISTS idx_client_offboarding_step_parent  ON client_offboarding_step (offboarding_id);
CREATE INDEX IF NOT EXISTS idx_client_offboarding_step_status  ON client_offboarding_step (status);

-- ── updated_at triggers (the 0210/0223/0237/0244 convention) ──────────────────────────────
DROP TRIGGER IF EXISTS trg_client_offboarding_updated ON client_offboarding;
CREATE TRIGGER trg_client_offboarding_updated BEFORE UPDATE ON client_offboarding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_client_offboarding_step_updated ON client_offboarding_step;
CREATE TRIGGER trg_client_offboarding_step_updated BEFORE UPDATE ON client_offboarding_step
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (least-priv, ADR-0127): web reads (render); backend reads+writes (the offboarding
--    executor, approval-gated, never a direct silver write); pipeline + local-pipeline read.
--    Defensive (roles may be absent), mirroring 0237/0244's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON client_offboarding, client_offboarding_step TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON client_offboarding, client_offboarding_step TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON client_offboarding, client_offboarding_step TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON client_offboarding, client_offboarding_step TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
