-- 0248: `contract_renewal` silver — the app-native renewal satellite + `opportunity.kind`.
-- (#1324, epic #1304 — contract renewals & repricing. Design fork resolved by ADR-0130.)
--
-- Migration number 0248 was PRE-ASSIGNED by the batch orchestrator (block 0248–0258) to avoid
-- §10.3 races within the coordinated schema batch. §10.3 still applies at merge: if a competing
-- file merges first, rebase, renumber to the next free number, and fix every reference (this
-- header, the OKF concept, coverage-matrix, data-model.md, the PR body).
--
-- WHAT THIS IS (ADR-0130). A renewal is NOT a flavor of opportunity — the silver `opportunity`
-- is externally merged every cycle (precedence website > autotask > kqm), so app-native renewal
-- fields on it would be clobbered on every run. `contract_renewal` is a FIRST-CLASS APP-NATIVE
-- SATELLITE (D1): Imperion is its source of record; THE OPPORTUNITY MERGE NEVER WRITES IT. It
-- holds the renewal lifecycle (identified → priced → quoted → sent → renewed | repriced |
-- churned) and its pricing, and links the expiring `contract` (required), the `kind=renewal`
-- `opportunity` (nullable — minted at PURSUIT, not identification; D3 two-stage trigger), and
-- the `esign_envelope` (nullable, set when the renewal quote goes out for signature).
--
-- ARCHETYPE: B (app-native single-source-of-record silver), like `stakeholder` (0244). The
-- issue's working label was "H (app-native)"; B is the doctrine-correct letter — H is
-- reference/config, a renewal is a lifecycle working object. Not archetype D: Imperion is the
-- SoR outright (ADR-0130 D1); the Autotask write-back is a separate gated backend slice.
--
-- WHO WRITES IT. The renewals radar (#1323, FE routine over contract.end_date) creates rows at
-- status=identified when a contract crosses the 90-day lead-time threshold (D3). Pursuit (a
-- human via the worklist #1327, or the backend repricing/Chase executor #1326) prices it, mints
-- the kind=renewal opportunity, and advances the lifecycle. Pipelines READ ONLY — never write.
--
-- ALSO IN THIS SLICE (ADR-0130 D2): `opportunity.kind` discriminator (`new` | `renewal` |
-- `upsell` | …) — a loose vocabulary TEXT (the ci_relationship precedent: new kinds need no
-- migration), app/website-owned; the bronze merges do not carry it.
--
-- data_class: OPERATIONAL (ADR-0130 D7); the revenue columns (`current_revenue`,
-- `proposed_revenue`, `proposed_pricing`) are FINANCIAL-GATED at render (`canSeeRevenue`,
-- ADR-0030) — exactly like opportunity.amount_mrr. No row-level PII is seeded; the renewal row
-- carries commercial numbers, not personal data.
--
-- New silver entity → NEW OKF concept file (docs/database/semantic-layer/tables/contract_renewal.md)
-- + coverage-matrix row + index row in THIS PR (system CLAUDE.md §11 semantic-layer gate);
-- `opportunity.md` / `contract.md` / `esign_envelope.md` updated for the new joins.
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. Least-priv grants
-- (ADR-0127): web read+insert+update (radar + worklist), backend read+insert+update (repricing
-- executor), pipelines read-only. DORMANT — NOT prod-applied until Mark runs it (Mark-gated).

BEGIN;

-- ── contract_renewal_status: the renewal lifecycle (ADR-0130 D1) ───────────────────────────
-- identified = radar-created, app-only, no opportunity yet (D3) · priced = repricing produced
-- a proposal (D6) · quoted = KQM quote attached to the kind=renewal opportunity (D4 SOP) ·
-- sent = renewal quote out for signature (esign_envelope_id set) · renewed = closed at flat
-- price · repriced = closed with a price change · churned = client did not renew.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_renewal_status') THEN
    CREATE TYPE contract_renewal_status AS ENUM
      ('identified', 'priced', 'quoted', 'sent', 'renewed', 'repriced', 'churned');
  END IF;
END $$;

-- ── contract_renewal: the app-native renewal satellite (archetype B) ───────────────────────
CREATE TABLE IF NOT EXISTS contract_renewal (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  account_id         uuid NOT NULL REFERENCES account(id)  ON DELETE CASCADE,   -- the client
  contract_id        uuid NOT NULL REFERENCES contract(id) ON DELETE CASCADE,   -- the expiring agreement (Autotask SoR)
  status             contract_renewal_status NOT NULL DEFAULT 'identified',
  -- Snapshot of contract.estimated_revenue taken when the radar OPENS the renewal — the
  -- repricing base (ADR-0130 D6). A snapshot, not a live read: the merge may move the
  -- contract row under us mid-cycle. Nullable (the contract may carry no estimate).
  current_revenue    numeric,
  -- The proposed renewal number a human can override before it goes to the client (D6).
  proposed_revenue   numeric,
  -- Full repricing derivation for margin display + audit (D6):
  -- { base, escalation_pct, escalation_source ('contract_clause'|'baseline'), term_incentive,
  --   cost_passthrough, final, overridden_by? } — commercial numbers, never PII.
  proposed_pricing   jsonb,
  -- The kind=renewal opportunity documenting the pursuit — minted at PURSUIT (D3), so NULL
  -- while status=identified. SET NULL: losing the sales artifact never deletes renewal state.
  opportunity_id     uuid REFERENCES opportunity(id)    ON DELETE SET NULL,
  -- The envelope the renewal quote went out on (set when status → sent). SET NULL likewise.
  esign_envelope_id  uuid REFERENCES esign_envelope(id) ON DELETE SET NULL,
  -- The contract.end_date this renewal renews — pinned per-cycle so a contract that renews
  -- year after year gets one row per term (see the uniqueness below).
  term_end           date NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- Radar idempotency: ONE renewal per contract per expiring term — re-running the radar
  -- (or a dual-plane overlap) never duplicates an in-flight renewal.
  CONSTRAINT contract_renewal_contract_term_uniq UNIQUE (contract_id, term_end)
);
COMMENT ON TABLE contract_renewal IS
  'App-native renewal satellite (#1324, epic #1304, ADR-0130 D1): the in-flight renewal of an expiring contract — lifecycle identified→priced→quoted→sent→renewed|repriced|churned + layered repricing (D6). Imperion is SoR; the opportunity merge NEVER writes it (that is why it is not a flavored opportunity). Links contract (required), kind=renewal opportunity (nullable, minted at pursuit — D3), esign_envelope (nullable, set when sent). UNIQUE (contract_id, term_end) = radar idempotency (#1323). Archetype B, data_class operational; revenue columns financial-gated at render (canSeeRevenue, ADR-0030 / D7). Migration 0248 (batch pre-assigned; renumber-at-merge per §10.3 if collided).';
COMMENT ON COLUMN contract_renewal.current_revenue IS
  'Snapshot of contract.estimated_revenue at renewal open — the repricing base (ADR-0130 D6). Financial-gated at render (ADR-0030).';
COMMENT ON COLUMN contract_renewal.proposed_pricing IS
  'Full repricing derivation jsonb (base · escalation % · source-of-% · term incentive · cost pass-through · final · override) for margin display + audit (ADR-0130 D6). Commercial numbers only — never PII. Financial-gated at render.';
COMMENT ON COLUMN contract_renewal.opportunity_id IS
  'The kind=renewal opportunity documenting the pursuit (ADR-0130 D2/D3). NULL while status=identified — pursuit mints it; the radar never creates Autotask opportunities 90 days early.';
COMMENT ON COLUMN contract_renewal.term_end IS
  'The contract.end_date this renewal renews. (contract_id, term_end) unique = one renewal per expiring term (radar idempotency, #1323).';

CREATE INDEX IF NOT EXISTS idx_contract_renewal_account     ON contract_renewal (account_id);
CREATE INDEX IF NOT EXISTS idx_contract_renewal_contract    ON contract_renewal (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_renewal_opportunity ON contract_renewal (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_contract_renewal_status      ON contract_renewal (status);
-- The renewal worklist (#1327) / radar queue: OPEN renewals ordered by how soon they expire.
CREATE INDEX IF NOT EXISTS idx_contract_renewal_open_by_term
  ON contract_renewal (term_end)
  WHERE status IN ('identified', 'priced', 'quoted', 'sent');

-- ── updated_at trigger (the 0210/0223/0227/0237/0244 convention) ───────────────────────────
DROP TRIGGER IF EXISTS trg_contract_renewal_updated ON contract_renewal;
CREATE TRIGGER trg_contract_renewal_updated BEFORE UPDATE ON contract_renewal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── opportunity.kind: the discriminator (ADR-0130 D2) ──────────────────────────────────────
-- Loose vocabulary TEXT, not an enum (the ci_relationship precedent — `new` | `renewal` |
-- `upsell` | … extends without a migration). App/website-owned: the bronze sources do not
-- carry it and the rank-guarded merge does not project it, so it is never clobbered.
ALTER TABLE opportunity ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'new';
COMMENT ON COLUMN opportunity.kind IS
  'Opportunity kind discriminator (ADR-0130 D2): new | renewal | upsell | … (loose vocabulary, app-owned — the bronze merges do not project it). A kind=renewal opportunity is minted at renewal PURSUIT (D3) and linked from contract_renewal.opportunity_id; the renewal-specific lifecycle/pricing live on that satellite, never here.';
CREATE INDEX IF NOT EXISTS idx_opportunity_kind ON opportunity (kind);

-- ── Grants (ADR-0127 least-priv, defensive per 0237/0244 — roles may be absent locally):
--    web read+insert+update (the #1323 radar creates; the #1327 worklist advances/overrides —
--    no DELETE: a renewal terminates via lifecycle, never by row deletion); backend
--    read+insert+update (the #1326 repricing/Chase executor + the future gated Autotask
--    write-back); both pipelines READ-ONLY — the opportunity merge never writes this table
--    (ADR-0130 D1). opportunity.kind rides the existing table-level opportunity grants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON contract_renewal TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON contract_renewal TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON contract_renewal TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON contract_renewal TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
