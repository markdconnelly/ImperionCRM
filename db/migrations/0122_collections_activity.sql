-- 0122: `collections_activity` app-native dunning overlay keyed to the read-only invoice
-- mirror (#677, parent #668, epic #667). (Number claimed at merge per system CLAUDE.md §10.3 —
--  0121 was the latest applied/repo migration; 0122 was free after rebasing on main.)
--
-- WHY THIS EXISTS (own-vs-mirror, RESOLVED — #668): QuickBooks is the invoice system of record
-- and is READ-ONLY on our side (ADR-0085; the `invoice_mirror` VIEW, migration 0121, is the AR
-- observability projection). The dunning *workflow state* — who we reminded, when, on what
-- channel, where the conversation now stands — does NOT live in QBO and has nowhere else to go.
-- This table is that workflow state, and ONLY that: agents and humans READ the mirror, WRITE
-- here. There is still NO app→QBO write path. Moving money / voiding / re-issuing happens in
-- QuickBooks by a human; this overlay never does.
--
-- ARCHETYPE: D (write-back-sidecar-style overlay) per the data-and-automation-doctrine — an
-- app-owned sidecar keyed to an external-SoR fact — BUT **app-native, NOT synced to QBO**. The
-- "write-back" target is the website's own collections worklist (#678), never QuickBooks. It is
-- the AR twin of `defender_incident_ticket_link` (archetype D): app-owned context hung off a
-- read-only mirrored fact.
--
-- KEYING: the mirror is a VIEW, so there is no real FK target. We key by the QBO invoice id
-- business key (`invoice_mirror.qbo_invoice_id` = bronze `qbo_invoices.external_id`, a stable
-- natural key) carried as a plain text column — exactly how the mirror itself keys back to
-- bronze. `tenant_id` scopes the row. One overlay row per (tenant, invoice): the CURRENT dunning
-- state. The per-reminder history is an append-only JSONB log on that one row (a reminder is a
-- low-volume, read-as-a-unit timeline, not a queryable entity) — keeps this a single-table,
-- single-PR overlay with no child table to join.
--
-- WHAT THIS IS NOT:
--   * NOT a second invoice / AR store. No amounts, no balances, no due dates are copied here —
--     those are READ live from `invoice_mirror`. This table holds workflow state only.
--   * NOT a QBO write path. App-native. Nothing here ever propagates to QuickBooks.
--   * NOT a payment ledger. `promised` is a human-recorded promise-to-pay note, not a payment.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT prod-applied until
-- the orchestrator runs it (Mark-gated). No secrets, no row-level PII (no customer email/
-- phone/address; amounts/balances are NOT stored here — they live only in the read-only mirror).

BEGIN;

-- ── dunning_status: where the collections conversation on an invoice currently stands ─────────
-- none      = not yet worked  · reminded  = a courtesy/standard reminder has gone out
-- escalated = pushed to a higher tier (formal demand / account manager / hold)
-- promised  = client gave a promise-to-pay (human-recorded; NOT a payment)
-- paused    = collections deliberately on hold (e.g. account-level negotiation)
-- disputed  = client disputes the invoice — collections suspended pending resolution
-- An ENUM (not a CHECK) so the worklist UI (#678) and agents share one typed vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dunning_status') THEN
    CREATE TYPE dunning_status AS ENUM
      ('none', 'reminded', 'escalated', 'promised', 'paused', 'disputed');
  END IF;
END $$;

-- ── collections_activity: the app-native dunning overlay (one CURRENT-state row per invoice) ──
-- Keyed by the QBO invoice id business key (the mirror is a VIEW — no real FK; see header).
CREATE TABLE IF NOT EXISTS collections_activity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  -- Business key into invoice_mirror.qbo_invoice_id (= bronze qbo_invoices.external_id). Text,
  -- not an FK: the mirror is a VIEW and QBO is read-only, so referential integrity to the
  -- invoice is observational (the app validates the invoice exists in the mirror before insert).
  qbo_invoice_id  text NOT NULL,
  status          dunning_status NOT NULL DEFAULT 'none',
  -- Escalation tier: 0 = none, increasing = further escalated. A small integer dial the worklist
  -- and agents bump; the meaning of each tier is product/ICM convention, not encoded here.
  escalation_level smallint NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
  -- The employee who owns chasing this invoice (NULL = unassigned). SET NULL on user delete so
  -- the overlay row survives an offboarding.
  assignee_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  -- Append-only reminder history: [{ at, channel, kind, note }]. A reminder is a low-volume
  -- timeline read as a unit with its invoice, so it is a JSONB log on the one overlay row, not a
  -- child table. Newest-appended-last; the app/agent appends, never rewrites prior entries.
  reminders       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Free-text collections notes (internal; NOT client-facing, NOT PII about a person).
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- One CURRENT-state overlay row per invoice per tenant (the per-reminder history is the JSONB log).
  CONSTRAINT collections_activity_tenant_invoice_uniq UNIQUE (tenant_id, qbo_invoice_id)
);
COMMENT ON TABLE collections_activity IS
  'App-native dunning/collections workflow overlay keyed to the read-only invoice mirror by QBO invoice id (#677, parent #668; ADR-0085 QBO read-only / ADR-0087 agent orchestration). Archetype D (write-back sidecar) but APP-NATIVE — NOT synced to QuickBooks: agents READ invoice_mirror (mig 0121), WRITE here; there is NO app→QBO write path and no money movement. One CURRENT-state row per (tenant, invoice): status (none|reminded|escalated|promised|paused|disputed), escalation_level, assignee, and an append-only reminders JSONB log. Holds workflow state ONLY — no amounts/balances/due dates (those are read live from the mirror). Caps collections:read / collections:write (admin/finance, ADR-0030). No PII, no secrets.';

COMMENT ON COLUMN collections_activity.qbo_invoice_id IS
  'Business key into invoice_mirror.qbo_invoice_id (= bronze qbo_invoices.external_id). Text, not an FK — the mirror is a VIEW and QBO is read-only.';
COMMENT ON COLUMN collections_activity.reminders IS
  'Append-only reminder log: array of { at: timestamptz, channel: text, kind: text, note: text }. App/agent appends; prior entries are never rewritten.';

-- The collections worklist (#678) reads the overlay for a given invoice and partitions by status.
CREATE INDEX IF NOT EXISTS idx_collections_activity_invoice
  ON collections_activity (tenant_id, qbo_invoice_id);
CREATE INDEX IF NOT EXISTS idx_collections_activity_status
  ON collections_activity (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_collections_activity_assignee
  ON collections_activity (assignee_user_id) WHERE assignee_user_id IS NOT NULL;

-- ── Grants: the app reads/writes the overlay (collections worklist #678 + finance UI); the
--    backend reads/writes it for the Collections (AR-dunning) agent (#667). Pipeline does NOT
--    touch it — this is app-native state, not pipeline-merged data. Defensive (roles may be
--    absent), mirroring 0121's invoice_mirror grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON collections_activity TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON collections_activity TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    -- Read-only for pipeline (observability of app-native state); it never writes the overlay.
    GRANT SELECT ON collections_activity TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;

COMMIT;
