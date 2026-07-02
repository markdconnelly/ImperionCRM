-- 0255: `price_book_entry` + `discount_tier` silver — the price-book / rate-card
-- governance model (#1652, epic #1534, gap-fill OP-02-C1 Stream 02).
-- Substrate for Sterling's GTM-governance procedures: 02-C1 (govern price book & rate-card —
-- margin floors, discount tiers) and the threshold side of 02-C2 (deal desk: a deal breaching
-- the published floor/tier routes to approval). Sterling (L2 delegate-only) GROUNDS + ASSEMBLES
-- a rate-card change and PARKS it; PUBLISHING a floor/tier is `always_gate` (ADR-0136 A2
-- class-1/6 standing money/term commitment, dial-proof — a human, Nick/Mark, ratifies).
-- Propose-only/dormant until built + applied (ADR-0136 A5c).
--
-- NOT the gutted CPQ price book (ADR-0067, superseded in part by ADR-0080/0096): that was a
-- quote-ENGINE catalog (quote/quote_line/quote-builder), and KQM remains the read-only quote
-- SoR. THIS is the governance STANDARD above the deal — the ratified list/cost/margin-floor
-- per SKU/service + the discount-tier approval thresholds that 02-A7 repricing and the 02-C2
-- deal desk READ as the standard. No quote objects, no quote engine.
--
-- Migration number 0255 is the batch-ASSIGNED number (coordinated 11-PR schema batch), still
-- claimed at MERGE per system CLAUDE.md §10.3 — if it collides at rebase time, renumber this
-- file + every reference (the OKF concepts, the coverage-matrix rows, the PR body).
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B), like 0226/0227/0243.
-- Real persisted rows; the rate card VERSIONS (one row per sku × version / tier_code × version;
-- publish supersedes the prior version — never destructive edit of a published standard, so the
-- audit trail is the table itself).
--
-- WHO WRITES IT. App-native: Sterling's 02-C1 drafts/proposes rows (backend-executed, server-
-- side); a human publishes (always_gate); on publish the prior version flips to superseded.
-- Web reads for render; agents (Chase 02-A3/A7, the 02-C2 deal desk, Vance catalog refs) read
-- the published standard. data_class FINANCIAL (always-gate).
--
-- New silver entities → each gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- price_book_entry.md, discount_tier.md) + coverage-matrix rows in THIS PR (system CLAUDE.md
-- §11; semantic-layer gate). Frontend-owned schema (ADR-0042). Additive + idempotent +
-- transactional. No PII (SKUs, prices, floors, tiers — commercial standards, not personal
-- data). No secrets. DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each
-- prod apply Mark-gated, §10.3).

BEGIN;

-- ── price_book_status: the governance lifecycle of a rate-card row ─────────────────────────
-- draft (Sterling assembling) → proposed (parked 4-part easy-button awaiting the human) →
-- published (ratified — THE standard 02-A7/02-C2 read) → superseded (a newer version published)
-- → rejected (the human declined; logged + re-parked). Shared by both tables so the rate card
-- and its discount tiers speak one lifecycle vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_book_status') THEN
    CREATE TYPE price_book_status AS ENUM ('draft', 'proposed', 'published', 'superseded', 'rejected');
  END IF;
END $$;

-- ── price_book_item_kind: what the SKU/service row prices ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_book_item_kind') THEN
    CREATE TYPE price_book_item_kind AS ENUM ('service', 'product', 'license', 'bundle', 'other');
  END IF;
END $$;

-- ── discount_approval_route: who must approve a deal landing in this tier ──────────────────
-- none (within the published standard — no escalation), deal_desk (the 02-C2 clock: Sterling
-- parks the packet, a human approves), executive (Nick/Mark directly — the deepest breaches).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_approval_route') THEN
    CREATE TYPE discount_approval_route AS ENUM ('none', 'deal_desk', 'executive');
  END IF;
END $$;

-- ── price_book_entry: one versioned rate-card line (SKU/service · list · cost · floor) ─────
CREATE TABLE IF NOT EXISTS price_book_entry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               text NOT NULL,                            -- the SKU / service code (e.g. 'MSP-SEAT-STD')
  name              text NOT NULL,                            -- human name: 'Managed seat — standard'
  kind              price_book_item_kind NOT NULL DEFAULT 'service',
  unit              text,                                     -- pricing unit: 'per user/month', 'per device/month', 'per hour', 'one-time'
  list_price        numeric(14,2) NOT NULL DEFAULT 0,         -- the published list price per unit
  unit_cost         numeric(14,2),                            -- the cost basis (Vance 02-B7 pass-through feeds this)
  margin_floor_pct  numeric(5,2),                             -- the ratified minimum margin % — a breach routes to the 02-C2 deal desk
  currency          text NOT NULL DEFAULT 'USD',
  version           integer NOT NULL DEFAULT 1,               -- the rate-card version of this line (publish = new version; prior → superseded)
  status            price_book_status NOT NULL DEFAULT 'draft',
  effective_from    date,                                     -- when the published line takes effect
  effective_to      date,
  published_at      timestamptz,                              -- set when status → published (the always_gate actuation)
  published_by      text,                                     -- the ratifying human (audit — Sterling never self-publishes)
  note              text,                                     -- the grounded why (cost shift, margin-at-risk), cited
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_book_entry_sku_version_uniq UNIQUE (sku, version),
  CONSTRAINT price_book_entry_list_nonneg  CHECK (list_price >= 0),
  CONSTRAINT price_book_entry_cost_nonneg  CHECK (unit_cost IS NULL OR unit_cost >= 0),
  CONSTRAINT price_book_entry_floor_pct    CHECK (margin_floor_pct IS NULL OR (margin_floor_pct >= 0 AND margin_floor_pct <= 100))
);
COMMENT ON TABLE price_book_entry IS
  'App-native versioned price-book / rate-card line (#1652, epic #1534, OP-02-C1): one row per sku × version carrying list price, cost basis, and the ratified margin floor. Sterling''s 02-C1 drafts/proposes (L2 delegate-only, backend-executed); PUBLISHING a floor is always_gate (ADR-0136 A2 class-1/6 — a human ratifies, published_by audited); publish supersedes the prior version (the table is its own audit trail). The published standard is what 02-A7 repricing and the 02-C2 deal desk read. NOT the gutted CPQ quote-engine price book (ADR-0067/0080 — KQM stays quote SoR). Archetype B (app-native single-SoR), FINANCIAL data_class. No PII, no secrets. Migration 0255 (batch-assigned — confirmed at merge, §10.3).';

CREATE INDEX IF NOT EXISTS idx_price_book_entry_sku    ON price_book_entry (sku);
CREATE INDEX IF NOT EXISTS idx_price_book_entry_status ON price_book_entry (status);

-- ── discount_tier: one versioned discount / approval-threshold band ────────────────────────
CREATE TABLE IF NOT EXISTS discount_tier (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code          text NOT NULL,                           -- e.g. 'T0-STANDARD', 'T1-MANAGER', 'T2-DEAL-DESK'
  name               text NOT NULL,                           -- human name: 'Within standard terms'
  max_discount_pct   numeric(5,2) NOT NULL DEFAULT 0,         -- the deepest discount this tier permits
  max_term_months    integer,                                 -- the longest term this tier permits (NULL = no term ceiling); term breaches also route (02-C2)
  approval_route     discount_approval_route NOT NULL DEFAULT 'deal_desk',  -- who must approve a deal landing in this band
  version            integer NOT NULL DEFAULT 1,              -- versions with the rate card (publish = new version; prior → superseded)
  status             price_book_status NOT NULL DEFAULT 'draft',
  effective_from     date,
  effective_to       date,
  published_at       timestamptz,                             -- set when status → published (the always_gate actuation)
  published_by       text,                                    -- the ratifying human (audit)
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_tier_code_version_uniq UNIQUE (tier_code, version),
  CONSTRAINT discount_tier_pct   CHECK (max_discount_pct >= 0 AND max_discount_pct <= 100),
  CONSTRAINT discount_tier_term  CHECK (max_term_months IS NULL OR max_term_months > 0)
);
COMMENT ON TABLE discount_tier IS
  'App-native versioned discount tier / approval threshold (#1652, epic #1534, OP-02-C1): one row per tier_code × version — the deepest discount + longest term a band permits and who must approve a deal landing in it (none / deal_desk / executive). Feeds the 02-C2 deal desk: a Chase deal breaching the published tier routes to the parked deal-desk packet. Publishing a tier is always_gate (ADR-0136 A2 — a human ratifies, published_by audited); publish supersedes the prior version. Archetype B (app-native single-SoR), FINANCIAL data_class. No PII, no secrets. Migration 0255 (batch-assigned — confirmed at merge, §10.3).';

CREATE INDEX IF NOT EXISTS idx_discount_tier_code   ON discount_tier (tier_code);
CREATE INDEX IF NOT EXISTS idx_discount_tier_status ON discount_tier (status);

-- ── updated_at triggers (the 0210/0223/0227/0243 convention) ───────────────────────────────
DROP TRIGGER IF EXISTS trg_price_book_entry_updated ON price_book_entry;
CREATE TRIGGER trg_price_book_entry_updated BEFORE UPDATE ON price_book_entry
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_discount_tier_updated ON discount_tier;
CREATE TRIGGER trg_discount_tier_updated BEFORE UPDATE ON discount_tier
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (ADR-0127 least-priv): web reads (render); backend reads+writes (Sterling's 02-C1
--    drafts/proposes server-side; the publish actuation is gated); pipeline + local-pipeline
--    read. Defensive (roles may be absent), mirroring 0227/0243's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON price_book_entry TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON discount_tier    TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON price_book_entry TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON discount_tier    TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON price_book_entry TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON discount_tier    TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON price_book_entry TO "imperion-localpipeline";
    GRANT SELECT ON discount_tier    TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
