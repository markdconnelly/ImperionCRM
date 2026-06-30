-- 0244: `stakeholder` silver — the per-account relationship/influence map on contacts.
-- (#1695, epic #1396 — Celeste operator-readiness). The stakeholder-role model Celeste's
-- client-success procedures were missing: WHO at a client is the champion, the economic
-- buyer, the technical decision-maker, an influencer, a plain user, or a detractor — plus
-- their influence, sentiment, and relationship status. A health verdict without a
-- stakeholder map misses the single biggest churn signal there is: *the champion left*.
--
-- Migration number 0244 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a placeholder; the rebased branch takes the next free number just before
-- squash. If another migration merges during the CI window, renumber this file + every
-- reference (the OKF concept, the coverage-matrix row, the PR body).
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B). Real persisted rows
-- with a uuid PK, one current profile per (account, contact). FKs `account` + `contact`.
-- Derived from interaction/comms patterns (source=derived) OR human-curated (source=curated)
-- — the source is always recorded so the signal-vs-inference discipline holds (a "detractor"
-- is never asserted without evidence; celeste.md guardrail 3).
--
-- WHO WRITES IT. App-native: a backend stakeholder-mapping executor (approval-gated,
-- server-side, never a direct silver write) maintains it from derived signals + human
-- curation; backend-executed. Read-only to web for render and to agents (Celeste reads it
-- in her client-360 / QBR / health procedures).
-- data_class CLIENT_PII (always-gate) — this table HOLDS pii at runtime (a named person's
-- role/influence/sentiment at a named client) but the migration seeds NOTHING.
--
-- New silver entity → a NEW OKF concept file (docs/database/semantic-layer/tables/stakeholder.md)
-- + a coverage-matrix row in THIS PR (system CLAUDE.md §11; semantic-layer gate). Frontend-owned
-- schema (ADR-0042). Additive + idempotent + transactional. No row-level PII values, no secrets.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── stakeholder_role: the person's role in the account relationship ───────────────────────
-- champion (advocates internally) · economic_buyer (signs/funds) · technical_decision_maker
-- (owns the technical call) · influencer (sways without deciding) · user (day-to-day, no
-- decision weight) · detractor (actively negative) · unknown (not yet classified).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stakeholder_role') THEN
    CREATE TYPE stakeholder_role AS ENUM (
      'champion', 'economic_buyer', 'technical_decision_maker', 'influencer', 'user', 'detractor', 'unknown'
    );
  END IF;
END $$;

-- ── stakeholder_influence: how much weight this person carries in the account ──────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stakeholder_influence') THEN
    CREATE TYPE stakeholder_influence AS ENUM ('high', 'medium', 'low', 'unknown');
  END IF;
END $$;

-- ── stakeholder_sentiment: this person's disposition toward Imperion ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stakeholder_sentiment') THEN
    CREATE TYPE stakeholder_sentiment AS ENUM ('positive', 'neutral', 'negative', 'unknown');
  END IF;
END $$;

-- ── stakeholder_relationship_status: active vs departed — the churn-signal axis ───────────
-- A champion flipping to `departed` is the single strongest leading churn signal (08-D).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stakeholder_relationship_status') THEN
    CREATE TYPE stakeholder_relationship_status AS ENUM ('active', 'departed', 'unknown');
  END IF;
END $$;

-- ── stakeholder_source: how the assessment was reached (signal vs inference provenance) ───
-- derived = inferred from interaction/comms patterns; curated = a human set it. Always
-- recorded so a downstream reader can weigh measured signal vs inference (guardrail 3).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stakeholder_source') THEN
    CREATE TYPE stakeholder_source AS ENUM ('derived', 'curated');
  END IF;
END $$;

-- ── stakeholder: the per-account relationship/influence map on contacts ───────────────────
CREATE TABLE IF NOT EXISTS stakeholder (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,   -- the client
  contact_id            uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,   -- the person
  role                  stakeholder_role NOT NULL DEFAULT 'unknown',
  influence             stakeholder_influence NOT NULL DEFAULT 'unknown',
  sentiment             stakeholder_sentiment NOT NULL DEFAULT 'unknown',
  relationship_status   stakeholder_relationship_status NOT NULL DEFAULT 'active',
  source                stakeholder_source NOT NULL DEFAULT 'derived',
  -- Provenance pointer — NOT pii: a short basis note ('N inbound approvals over 90d', a
  -- human-curation reference). Never client verbatim or personal data.
  evidence_note         text,
  as_of                 timestamptz NOT NULL DEFAULT now(),                       -- the as-of of this assessment
  departed_at           timestamptz,                                             -- set when relationship_status → departed (the churn-signal ts)
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  -- One CURRENT stakeholder profile per person per account (history is via departed_at + as_of).
  CONSTRAINT stakeholder_account_contact_uniq UNIQUE (account_id, contact_id)
);
COMMENT ON TABLE stakeholder IS
  'App-native per-account stakeholder/relationship map on contacts (#1695, epic #1396): WHO at a client is champion/economic_buyer/technical_decision_maker/influencer/user/detractor, plus influence, sentiment, and active-vs-departed status. Derived from interaction patterns (source=derived) or human-curated (source=curated) — source always recorded for signal-vs-inference (a detractor is never asserted without evidence, celeste.md guardrail 3). Champion→departed is the strongest leading churn signal (08-D). Archetype B (app-native single-SoR), CLIENT_PII data_class (always-gate) — holds pii at runtime, seeds none. Backend executor writes (approval-gated, never a direct silver write); read-only to web + agents. Migration 0244 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_stakeholder_account   ON stakeholder (account_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_contact   ON stakeholder (contact_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_role      ON stakeholder (role);
CREATE INDEX IF NOT EXISTS idx_stakeholder_status    ON stakeholder (relationship_status);

-- ── updated_at trigger (the 0210/0223/0227/0237 convention) ───────────────────────────────
DROP TRIGGER IF EXISTS trg_stakeholder_updated ON stakeholder;
CREATE TRIGGER trg_stakeholder_updated BEFORE UPDATE ON stakeholder
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: web reads (render); backend reads+writes (the stakeholder-mapping executor,
--    approval-gated, never a direct silver write); pipeline + local-pipeline read. Defensive
--    (roles may be absent), mirroring 0237's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON stakeholder TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON stakeholder TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON stakeholder TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON stakeholder TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
