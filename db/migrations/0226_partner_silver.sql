-- 0226: `partner` + `partner_deal` silver — channel/alliance partnerships, app-native (#1623,
-- parent #1534). The substrate for the Partnerships agent **Bridget** (#1624, under Sterling /
-- Deputy CFO) — her `partner-deal-routing` tracer + the Stream-02 channel procedures (02-D1/D2):
-- manage channel/alliance/co-sell, attribute partner-sourced pipeline, adjudicate channel
-- conflict. SELL-side channel — the twin of Vance's BUY-side procurement (Pax8 is both; split at
-- the Bridget↔Vance seam, ADR-0133 catalog / ADR-0136 A11).
--
-- Migration number 0226 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- WHY THIS EXISTS. A `partner` is a channel/alliance org Imperion sells THROUGH or co-sells WITH
-- (a distributor like Pax8, a vendor alliance, a referral partner). A `partner_deal` is the
-- co-sell / referral registration that links a partner to an opportunity + account and stamps
-- attribution — the record that lets Bridget answer "what pipeline did this partner source?" and
-- hand the close to Chase with attribution intact. Until this lands, Bridget's procedures are
-- procedure-only / dormant (the catalog ships them propose-only, ADR-0136 A5c).
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B) — like `problem` (0223) and
-- `change_request` (0135). A `partner` / `partner_deal` is a REAL persisted row with a uuid PK;
-- the website is the SoR for the partnership relationship + the co-sell registration. NOT a
-- bronze→silver merge (no external SoR owns Imperion's partner relationships). `partner_deal`
-- FKs to `partner`, to `account`, and (nullable) to `opportunity` — it references the deal, it
-- does not own it (Chase owns the opportunity, ADR-0044/sales).
--
-- V1 GRAIN (deliberately lean, the 0223 "minimum the tracer needs" discipline). Partner `tier`
-- and `program` are TEXT bands (the 0223 `severity`-as-text precedent) — no enum/lookup-table
-- proliferation until the bands stabilize. **DEFERRED to a follow-on slice:** MDF
-- (market-development funds) + `referral_payout` — those are MONEY (always_gate, B6) and their
-- procedures (02-D2 referral payout, MDF) are dormant regardless; modeled when that money slice
-- is built, without reshaping these tables.
--
-- WHO WRITES IT. App-native: the Partnerships surface + Bridget's procedures write it
-- (partner:write, ADR-0045), backend-executed, ≤ L3 (Bridget never binds/commits — A11 / spec).
-- Read-only to web for render.
--
-- New silver entities → each gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- partner.md, partner_deal.md) + a coverage-matrix row in THIS PR (system CLAUDE.md §11; the
-- semantic-layer gate requires the concept file for a CREATE of a concept-bearing silver table).
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. No row-level PII
-- (a partner is an organization + program/tier bands + external refs; a partner_deal links
-- existing records and stamps attribution — operational data_class). No secrets. DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── partner_status: the partnership lifecycle ─────────────────────────────────────────────
-- prospect → active → inactive (a lapsed/dead partnership — Bridget is "allergic to dead/
-- shelfware partnerships", spec). An ENUM (not a CHECK) so the Partnerships board + Bridget's
-- procedures share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_status') THEN
    CREATE TYPE partner_status AS ENUM ('prospect', 'active', 'inactive');
  END IF;
END $$;

-- ── partner_deal_type: how a partner touches an opportunity ───────────────────────────────
-- co_sell (joint pursuit) · referral (partner hands a lead, Imperion closes) · direct (partner
-- is the reseller of record). Drives Bridget's classify/route step (02-D1) + attribution.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_deal_type') THEN
    CREATE TYPE partner_deal_type AS ENUM ('co_sell', 'referral', 'direct');
  END IF;
END $$;

-- ── partner: the app-native channel/alliance partner record ───────────────────────────────
CREATE TABLE IF NOT EXISTS partner (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text           NOT NULL,
  -- Partnership program band (free text: e.g. 'pax8-marketplace', 'microsoft-csp',
  -- 'vendor-alliance') — text not enum so programs evolve without a migration (0223 precedent).
  program         text,
  -- Tier/certification band (free text: e.g. 'gold', 'silver', 'registered') — gates partner-tier
  -- benefits (Bridget's 02-D track-tier procedure). Text band, not enum.
  tier            text,
  status          partner_status NOT NULL DEFAULT 'prospect',
  -- The opaque external identifier in the partner's / marketplace's system (e.g. Pax8 partner id).
  -- A reference for reconciliation, NEVER a secret. Nullable.
  external_ref    text,
  -- Optional owning account: a partner may also BE a managed client (Imperion is a real client of
  -- itself — the dogfood/subject parameter, ADR-0133 D7). Nullable.
  account_id      uuid REFERENCES account(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);
COMMENT ON TABLE partner IS
  'App-native channel/alliance partner (#1623, parent #1534): an org Imperion sells THROUGH or co-sells WITH (distributor/alliance/referral partner). SELL-side — the twin of Vance buy-side procurement (Pax8 is both; split at the Bridget↔Vance seam). The website is the SoR; Bridget''s procedures + the Partnerships surface write it (partner:write, ADR-0045). Archetype B (app-native single-SoR), operational data_class. program/tier are text bands (no enum proliferation). No PII, no secrets (external_ref is an opaque id, never a credential). Migration 0226 (PLACEHOLDER — real number at merge).';
COMMENT ON COLUMN partner.external_ref IS
  'Opaque external/marketplace partner id (e.g. Pax8) for reconciliation — a reference, NEVER a secret/credential (ADR-0060).';

CREATE INDEX IF NOT EXISTS idx_partner_status  ON partner (status);
CREATE INDEX IF NOT EXISTS idx_partner_account ON partner (account_id);
CREATE INDEX IF NOT EXISTS idx_partner_name    ON partner (name);

-- ── partner_deal: the co-sell / referral registration + attribution ───────────────────────
-- Links a partner to an opportunity + account and stamps how the partner sourced/influenced it.
-- This is what lets Bridget attribute partner-sourced pipeline and hand the close to Chase with
-- attribution intact (the Bridget→Chase seam). Channel-conflict adjudication (02-D) reads the set
-- of deals registered against an account to detect a registered-deal collision.
CREATE TABLE IF NOT EXISTS partner_deal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  -- The account the partner is co-selling into / referring (the collision axis for channel
  -- conflict). Nullable while the deal is still a raw lead.
  account_id      uuid REFERENCES account(id) ON DELETE SET NULL,
  -- The opportunity Chase owns once the deal is qualified (the Bridget→Chase seam). Nullable
  -- until the opportunity is opened; references it, never owns it (Chase owns it, ADR-0044).
  opportunity_id  uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  deal_type       partner_deal_type NOT NULL DEFAULT 'co_sell',
  -- When the partner registered the deal (the channel-conflict "first to register" signal).
  registered_at   timestamptz   NOT NULL DEFAULT now(),
  -- Free-text attribution note (how the partner sourced/influenced it) — pipeline ROI input.
  attribution     text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE partner_deal IS
  'Co-sell / referral registration + attribution (#1623): links a partner to an account + opportunity and stamps how the partner sourced/influenced the deal. Drives partner-sourced pipeline attribution (the Bridget→Chase seam, attribution stamped on the opportunity) + channel-conflict adjudication (registered-deal collision on account_id). App-native (archetype B), operational data_class. References opportunity/account, does not own them (Chase owns the opportunity, ADR-0044). No PII, no secrets. Migration 0226 (PLACEHOLDER — real number at merge).';
COMMENT ON COLUMN partner_deal.opportunity_id IS
  'FK → silver opportunity (the Bridget→Chase close seam; Chase owns the opportunity). Nullable until opened. Attribution is stamped here, not owned by the partner.';

CREATE INDEX IF NOT EXISTS idx_partner_deal_partner     ON partner_deal (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_deal_account     ON partner_deal (account_id);
CREATE INDEX IF NOT EXISTS idx_partner_deal_opportunity ON partner_deal (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_partner_deal_type        ON partner_deal (deal_type);

-- ── updated_at triggers (the 0210/0211/0223 convention) ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_partner_updated ON partner;
CREATE TRIGGER trg_partner_updated BEFORE UPDATE ON partner
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_partner_deal_updated ON partner_deal;
CREATE TRIGGER trg_partner_deal_updated BEFORE UPDATE ON partner_deal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: the app reads + writes (the Partnerships surface + Bridget's procedures,
--    partner:write, ADR-0045); the backend reads + writes (Bridget executes server-side); the
--    pipeline + local-pipeline read (observability of the app-native working object). Defensive
--    (roles may be absent), mirroring 0135/0211/0223's grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON partner      TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON partner_deal TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON partner      TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON partner_deal TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON partner      TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON partner_deal TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON partner      TO "imperion-localpipeline";
    GRANT SELECT ON partner_deal TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
