-- 0254: `carrier_contract` + `circuit` silver — the carrier / circuit / telco-contract model.
-- (#1651, epic #1534 — gap-fill OP-04-14, carrier/circuit/telco lifecycle, Stream 04.)
-- No silver entity existed for carrier contracts or circuit/service inventory: the
-- Stream 04↔05↔07 seam (Vance owns the contract/renewal money clock, Ozzie owns the
-- technical turn-up/cutover act) had no substrate to watch. Two tables:
--
--   carrier_contract — the commercial half (Vance, Stream 07): provider, term,
--     renewal/cancel-by dates, MRC/NRC. The B9 deadline-sentinel (ADR-0136) reads
--     `renewal_date` / `cancel_by_date` and alerts at T-30/T-7/T-1; a renew/cancel is
--     NEVER auto-actuated — deadline pressure does not license an autonomous commit.
--   circuit — the technical half (Ozzie, Stream 05): carrier circuit id, site,
--     bandwidth, status/lifecycle dates; FK to its carrier_contract and to `account`.
--
-- Migration number 0254 is ASSIGNED for the coordinated 11-PR schema batch (per system
-- CLAUDE.md §10.3 numbers are otherwise claimed at merge — if a collision lands during
-- the CI window, renumber this file + every reference: the two OKF concepts, the
-- coverage-matrix rows, the PR body).
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B) for BOTH tables —
-- human-curated (source='curated') until a carrier feed/bill ingest exists; `source` +
-- `external_ref` carry the ADR-0039-style provenance so a later ingest merges
-- idempotently on (source, external_ref) without reshaping.
--
-- WHO WRITES IT. App-native: a backend telco executor (approval-gated, server-side,
-- never a direct silver write) maintains both from curation; read-only to web (render)
-- and to agents (Vance reads contract/deadline state, Ozzie reads circuit inventory).
-- data_class: carrier_contract = FINANCIAL (MRC/NRC/ETF — always-gate); circuit =
-- OPERATIONAL (CMDB-adjacent broad-read). No PII in either; the migration seeds NOTHING.
--
-- New silver entities → NEW OKF concept files (docs/database/semantic-layer/tables/
-- carrier_contract.md + circuit.md) + coverage-matrix rows in THIS PR (system CLAUDE.md
-- §11; semantic-layer gate). Frontend-owned schema (ADR-0042). Additive + idempotent +
-- transactional. Least-priv grants (ADR-0127). No secrets, no row-level data.
-- DORMANT — propose-only until built (ADR-0136 A5c); NOT prod-applied until the
-- orchestrator/Mark runs it (each prod apply Mark-gated).

BEGIN;

-- ── carrier_contract_status: the contract's commercial lifecycle ───────────────────────────
-- draft (being negotiated) · ordered (signed, service not live) · active (in term) ·
-- month_to_month (past initial term, rolling) · cancelled (notice given / terminated) ·
-- expired (term ended, not renewed) · unknown.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'carrier_contract_status') THEN
    CREATE TYPE carrier_contract_status AS ENUM (
      'draft', 'ordered', 'active', 'month_to_month', 'cancelled', 'expired', 'unknown'
    );
  END IF;
END $$;

-- ── circuit_status: the circuit's technical lifecycle ──────────────────────────────────────
-- ordered → installing → active; degraded (up but impaired) · pending_disconnect (notice
-- given, still up) · disconnected · unknown.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'circuit_status') THEN
    CREATE TYPE circuit_status AS ENUM (
      'ordered', 'installing', 'active', 'degraded', 'pending_disconnect', 'disconnected', 'unknown'
    );
  END IF;
END $$;

-- ── circuit_service_type: what kind of carrier service the circuit is ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'circuit_service_type') THEN
    CREATE TYPE circuit_service_type AS ENUM (
      'dia', 'broadband', 'fiber', 'mpls', 'sdwan', 'wavelength', 'dark_fiber',
      'sip_trunk', 'pri', 'pots', 'wireless', 'other'
    );
  END IF;
END $$;

-- ── carrier_contract: the commercial telco agreement (Vance's B9 sentinel substrate) ───────
CREATE TABLE IF NOT EXISTS carrier_contract (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The client the contract serves. NULL = Imperion's own carrier contract (dogfood).
  account_id              uuid REFERENCES account(id) ON DELETE SET NULL,
  carrier_name            text NOT NULL,                            -- the provider (e.g. an ISP/telco name)
  carrier_account_number  text,                                     -- the billing account at the carrier
  contract_number         text,                                     -- the carrier's agreement/order number
  status                  carrier_contract_status NOT NULL DEFAULT 'unknown',
  term_months             integer CHECK (term_months IS NULL OR term_months > 0),
  start_date              date,
  end_date                date,                                     -- term end
  renewal_date            date,                                     -- when it (auto-)renews — B9 sentinel input
  cancel_by_date          date,                                     -- last day to give non-renewal notice — B9 sentinel input
  auto_renew              boolean NOT NULL DEFAULT false,
  notice_days             integer CHECK (notice_days IS NULL OR notice_days >= 0),  -- required cancellation-notice window
  mrc                     numeric(12,2),                            -- monthly recurring cost
  nrc                     numeric(12,2),                            -- one-time / install cost
  early_termination_fee   numeric(12,2),
  currency                text NOT NULL DEFAULT 'USD',
  -- Provenance (ADR-0039 style): curated today; a future carrier/bill ingest merges
  -- idempotently on (source, external_ref).
  source                  text NOT NULL DEFAULT 'curated',
  external_ref            text,
  notes                   text,                                     -- short operational notes — never secrets or client verbatim
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carrier_contract_source_ref_uniq UNIQUE (source, external_ref)
);
COMMENT ON TABLE carrier_contract IS
  'Silver carrier/telco contract — the commercial half of OP-04-14 (#1651, epic #1534): provider, term, renewal/cancel-by dates, MRC/NRC/ETF. Vance''s B9 deadline-sentinel (ADR-0136) watches renewal_date/cancel_by_date at T-30/T-7/T-1; a renew/cancel/order commit is always_gate — never auto-actuated under deadline pressure (a missed cancel-by is a logged escalation failure). NULL account_id = Imperion''s own contract (dogfood). Archetype B (app-native single-SoR, curated; source+external_ref ready for a later ingest), FINANCIAL data_class (always-gate). Backend executor writes (approval-gated, never a direct silver write); read-only to web + agents. Migration 0254 (#1651).';

CREATE INDEX IF NOT EXISTS idx_carrier_contract_account    ON carrier_contract (account_id);
CREATE INDEX IF NOT EXISTS idx_carrier_contract_status     ON carrier_contract (status);
CREATE INDEX IF NOT EXISTS idx_carrier_contract_carrier    ON carrier_contract (carrier_name);
-- The B9 sentinel's watch queries: upcoming renewal / cancel-by windows.
CREATE INDEX IF NOT EXISTS idx_carrier_contract_renewal    ON carrier_contract (renewal_date)   WHERE renewal_date   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carrier_contract_cancel_by  ON carrier_contract (cancel_by_date) WHERE cancel_by_date IS NOT NULL;

-- ── circuit: the circuit / carrier-service inventory (Ozzie's turn-up/cutover substrate) ───
CREATE TABLE IF NOT EXISTS circuit (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The client the circuit serves. NULL = Imperion's own circuit (dogfood).
  account_id            uuid REFERENCES account(id) ON DELETE SET NULL,
  -- The commercial agreement it rides on (nullable — inventory can precede curation).
  carrier_contract_id   uuid REFERENCES carrier_contract(id) ON DELETE SET NULL,
  circuit_ref           text NOT NULL,                              -- the carrier's circuit id (ckt id)
  carrier_name          text,                                       -- denormalized provider (when no contract is linked)
  site_name             text,                                       -- the served site/location label (no silver site entity yet — free text)
  service_address       text,                                       -- the service/demarc address (business address, not personal data)
  service_type          circuit_service_type NOT NULL DEFAULT 'other',
  bandwidth_down_mbps   integer CHECK (bandwidth_down_mbps IS NULL OR bandwidth_down_mbps >= 0),
  bandwidth_up_mbps     integer CHECK (bandwidth_up_mbps   IS NULL OR bandwidth_up_mbps   >= 0),
  status                circuit_status NOT NULL DEFAULT 'unknown',
  ordered_date          date,
  install_date          date,                                       -- turned up / cutover verified
  disconnect_date       date,
  mrc                   numeric(12,2),                              -- per-circuit monthly recurring cost (rollup lives on the contract)
  -- Provenance (ADR-0039 style): curated today; a future ingest merges on (source, external_ref).
  source                text NOT NULL DEFAULT 'curated',
  external_ref          text,
  notes                 text,                                       -- short operational notes — never secrets or client verbatim
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT circuit_source_ref_uniq UNIQUE (source, external_ref)
);
COMMENT ON TABLE circuit IS
  'Silver circuit/carrier-service inventory — the technical half of OP-04-14 (#1651, epic #1534): carrier circuit id, site, bandwidth, lifecycle status/dates; FKs to account (NULL = Imperion''s own, dogfood) and carrier_contract. Ozzie (NOC, Stream 05) owns the turn-up/cutover/port act — a service-affecting cutover is always_gate, halt-on-fail, no auto-rollback; a live circuit links into cmdb via the OP-04-13 path. Archetype B (app-native single-SoR, curated; source+external_ref ready for a later ingest), OPERATIONAL data_class. Backend executor writes (approval-gated, never a direct silver write); read-only to web + agents. Migration 0254 (#1651).';

CREATE INDEX IF NOT EXISTS idx_circuit_account   ON circuit (account_id);
CREATE INDEX IF NOT EXISTS idx_circuit_contract  ON circuit (carrier_contract_id);
CREATE INDEX IF NOT EXISTS idx_circuit_ref       ON circuit (circuit_ref);
CREATE INDEX IF NOT EXISTS idx_circuit_status    ON circuit (status);

-- ── updated_at triggers (the 0210/0223/0237/0244 convention) ───────────────────────────────
DROP TRIGGER IF EXISTS trg_carrier_contract_updated ON carrier_contract;
CREATE TRIGGER trg_carrier_contract_updated BEFORE UPDATE ON carrier_contract
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_circuit_updated ON circuit;
CREATE TRIGGER trg_circuit_updated BEFORE UPDATE ON circuit
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (ADR-0127 least-priv): web reads (render); backend reads+writes (the telco
--    executor, approval-gated, never a direct silver write); pipeline + local-pipeline
--    read (a future carrier ingest earns its write grant in its own migration).
--    Defensive (roles may be absent), mirroring 0237/0244's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON carrier_contract, circuit TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON carrier_contract, circuit TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON carrier_contract, circuit TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON carrier_contract, circuit TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
