-- 0227: `partner_mdf` + `referral_payout` silver — the MONEY half of the partner model
-- (#1657, parent #1534, deferred from #1623 which shipped the partner/partner_deal spine in 0226).
-- Substrate for Bridget's money-gated channel procedures: MDF (market-development funds,
-- request→spend→ROI) + the referral-partner payout (register→track→payout, Stream-02 02-D2). Both
-- are MONEY: every actuation is `always_gate` (ADR-0136 A2 money class / B6 money-gate); Bridget
-- drafts/proposes, a human (Sterling/Audrey) approves and the payout/spend exits via the gated
-- finance path. Until applied, the MDF + referral-payout procedures stay procedure-only/dormant.
--
-- Migration number 0227 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B), like `partner` (0226). Real
-- persisted rows with a uuid PK. `partner_mdf` FKs `partner`; `referral_payout` FKs `partner` and
-- (the earning registration) `partner_deal`. Money values are app-native PROPOSALS/records — the
-- actual money movement is QBO's (ADR-0044/finance), gated; these tables never move money.
--
-- WHO WRITES IT. App-native: Bridget's MDF / referral-payout procedures draft+propose
-- (partner:write), a human approves; backend-executed; the payout/spend actuation is gated
-- finance (Audrey/Sterling). Read-only to web for render. data_class FINANCIAL (always-gate).
--
-- New silver entities → each gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- partner_mdf.md, referral_payout.md) + a coverage-matrix row in THIS PR (system CLAUDE.md §11;
-- semantic-layer gate). Frontend-owned schema (ADR-0042). Additive + idempotent + transactional.
-- No row-level PII (amounts + status + period + FKs — financial, not personal). No secrets.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── partner_mdf_status: MDF fund lifecycle ────────────────────────────────────────────────
-- requested → approved → spent → closed (ROI recorded). An ENUM so the Partnerships surface +
-- Bridget's MDF procedure share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_mdf_status') THEN
    CREATE TYPE partner_mdf_status AS ENUM ('requested', 'approved', 'spent', 'closed');
  END IF;
END $$;

-- ── referral_payout_status: referral payout lifecycle ─────────────────────────────────────
-- pending → approved → paid (or rejected). The payout actuation (approved→paid) is gated finance.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_payout_status') THEN
    CREATE TYPE referral_payout_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
  END IF;
END $$;

-- ── partner_mdf: market-development fund request / spend / ROI ─────────────────────────────
CREATE TABLE IF NOT EXISTS partner_mdf (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  -- Requested/approved fund amount (the app-native proposal; money movement is QBO's, gated).
  amount        numeric(14,2) NOT NULL DEFAULT 0,
  status        partner_mdf_status NOT NULL DEFAULT 'requested',
  purpose       text,                                  -- what the fund is for (campaign/event/enablement)
  period        text,                                  -- the program period band (e.g. 'FY26-Q3')
  roi_note      text,                                  -- the ROI write-up, populated on close
  requested_at  timestamptz   NOT NULL DEFAULT now(),
  approved_at   timestamptz,                           -- set when status → approved (gated)
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT partner_mdf_amount_nonneg CHECK (amount >= 0)
);
COMMENT ON TABLE partner_mdf IS
  'App-native market-development fund (MDF) record (#1657): a partner''s fund request→approved→spent→closed (with ROI). Money is a PROPOSAL/record — the actual movement is QBO''s (ADR-0044), gated; this table never moves money. Bridget drafts, a human (Sterling/Audrey) approves (always_gate, ADR-0136 B6). Archetype B (app-native single-SoR), FINANCIAL data_class. No PII, no secrets. Migration 0227 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_partner_mdf_partner ON partner_mdf (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_mdf_status  ON partner_mdf (status);

-- ── referral_payout: referral-partner payout register ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_payout (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  -- The referral registration that earned the payout (silver partner_deal, 0226). Nullable: a
  -- payout may predate or not map to a single registered deal.
  partner_deal_id uuid REFERENCES partner_deal(id) ON DELETE SET NULL,
  amount          numeric(14,2) NOT NULL DEFAULT 0,
  status          referral_payout_status NOT NULL DEFAULT 'pending',
  period          text,                                -- the payout period band
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  approved_at     timestamptz,                         -- set when status → approved (gated)
  paid_at         timestamptz,                         -- set when status → paid (gated finance actuation)
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_payout_amount_nonneg CHECK (amount >= 0)
);
COMMENT ON TABLE referral_payout IS
  'App-native referral-partner payout record (#1657, Stream-02 02-D2): pending→approved→paid for a referral a partner sourced (FK partner + the earning partner_deal). Money is a PROPOSAL/record — the actual payout is gated finance (QBO/Audrey, ADR-0044); approved→paid is always_gate (ADR-0136 B6). Archetype B (app-native single-SoR), FINANCIAL data_class. No PII, no secrets. Migration 0227 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_referral_payout_partner ON referral_payout (partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_payout_deal    ON referral_payout (partner_deal_id);
CREATE INDEX IF NOT EXISTS idx_referral_payout_status  ON referral_payout (status);

-- ── updated_at triggers (the 0210/0223/0226 convention) ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_partner_mdf_updated ON partner_mdf;
CREATE TRIGGER trg_partner_mdf_updated BEFORE UPDATE ON partner_mdf
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_referral_payout_updated ON referral_payout;
CREATE TRIGGER trg_referral_payout_updated BEFORE UPDATE ON referral_payout
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: web reads; backend reads+writes (Bridget proposes, finance actuates server-side);
--    pipeline + local-pipeline read. Defensive (roles may be absent), mirroring 0226's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON partner_mdf     TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON referral_payout TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON partner_mdf     TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON referral_payout TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON partner_mdf     TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON referral_payout TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON partner_mdf     TO "imperion-localpipeline";
    GRANT SELECT ON referral_payout TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
