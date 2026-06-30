-- 0237: `reference` silver — consent-gated captured customer proof (advocacy).
-- (#1698, epic #1696, decision D4). The substrate for Belle's reference/advocacy procedures:
-- captured customer proof (testimonials/reviews/reference-cases/logo-use) on a
-- solicit→consent→capture lifecycle. CONSENT is a HARD precondition — a reference cannot reach
-- `captured`/`published` without a recorded `consent_event` (D4). Belle captures only POST-consent
-- and NEVER contacts the client; Celeste owns the client touch. Logo/name-use rights are
-- always_gate, human, marketing-owned. Until applied, the reference procedures stay dormant.
--
-- Migration number 0237 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B). Real persisted rows with a
-- uuid PK. FKs `account` (client source), `contact`, `opportunity`, `campaign`, `consent_event`
-- (the recorded consent), and `content_asset` (the case_study it backs, created by 0236 — which
-- runs before this, so we FK AND alter it for the bidirectional back-link).
--
-- WHO WRITES IT. App-native: Belle's reference.write executor (approval-gated, server-side, never a
-- direct silver write) captures post-consent; backend-executed. Read-only to web for render.
-- data_class CLIENT_PII (always-gate) — this table HOLDS pii at runtime (names, verbatim words,
-- consent scope) but the migration seeds NOTHING.
--
-- New silver entity → a NEW OKF concept file (docs/database/semantic-layer/tables/reference.md) +
-- a coverage-matrix row in THIS PR (system CLAUDE.md §11; semantic-layer gate). Frontend-owned
-- schema (ADR-0042). Additive + idempotent + transactional. No row-level PII values, no secrets.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── reference_kind: the form of customer proof ────────────────────────────────────────────
-- testimonial · review · reference_case · logo_use. An ENUM so the advocacy surface + Belle's
-- reference procedure share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reference_kind') THEN
    CREATE TYPE reference_kind AS ENUM ('testimonial', 'review', 'reference_case', 'logo_use');
  END IF;
END $$;

-- ── reference_status: solicit→consent→capture lifecycle ───────────────────────────────────
-- candidate → consent_pending → consented → captured → published (or withdrawn). The HARD
-- precondition (D4): cannot reach captured/published without a recorded consent_event.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reference_status') THEN
    CREATE TYPE reference_status AS ENUM ('candidate', 'consent_pending', 'consented', 'captured', 'published', 'withdrawn');
  END IF;
END $$;

-- ── reference: captured, consent-gated customer proof ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reference (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                    reference_kind NOT NULL,
  account_id              uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,        -- the client source
  contact_id              uuid REFERENCES contact(id) ON DELETE SET NULL,
  opportunity_id          uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  campaign_id             uuid REFERENCES campaign(id) ON DELETE SET NULL,
  status                  reference_status NOT NULL DEFAULT 'candidate',
  -- The recorded client consent (who approved, when, scope); required before captured (D4).
  consent_event_id        uuid REFERENCES consent_event(id) ON DELETE SET NULL,
  consent_scope           text,                                  -- scope of use approved (e.g. 'name+logo on website case study')
  -- The case_study content_asset this reference backs (created by 0236).
  spawns_content_asset_id uuid REFERENCES content_asset(id) ON DELETE SET NULL,
  captured_body           text,                                  -- verbatim approved client words, consent-clean
  captured_by             text,                                  -- provenance: agent_key or human who captured
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- The HARD precondition (D4): cannot reach captured/published without a recorded consent_event.
  CONSTRAINT reference_consent_required CHECK (status NOT IN ('captured', 'published') OR consent_event_id IS NOT NULL)
);
COMMENT ON TABLE reference IS
  'App-native consent-gated customer proof (#1698, epic #1696 D4): a client''s testimonial/review/reference_case/logo_use on a solicit→consent→capture lifecycle. CONSENT is a HARD precondition — cannot reach captured/published without a recorded consent_event (reference_consent_required, D4). Belle captures only POST-consent and never contacts the client; Celeste owns the client touch. Logo/name-use rights are always_gate, human, marketing-owned. Archetype B (app-native single-SoR), CLIENT_PII data_class (always-gate) — holds pii at runtime, seeds none. Migration 0237 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_reference_account ON reference (account_id);
CREATE INDEX IF NOT EXISTS idx_reference_status  ON reference (status);
CREATE INDEX IF NOT EXISTS idx_reference_kind    ON reference (kind);
CREATE INDEX IF NOT EXISTS idx_reference_spawns_content_asset ON reference (spawns_content_asset_id);

-- ── updated_at trigger (the 0210/0223/0227 convention) ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_reference_updated ON reference;
CREATE TRIGGER trg_reference_updated BEFORE UPDATE ON reference
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Bidirectional back-link on content_asset (created by 0236, runs before this) ──────────
-- The reverse of reference.spawns_content_asset_id: the case_study points back at its reference.
ALTER TABLE content_asset ADD COLUMN IF NOT EXISTS backed_by_reference_id uuid REFERENCES reference(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_content_asset_backed_by_reference ON content_asset (backed_by_reference_id);

-- ── Grants: web reads; backend reads+writes (Belle's reference.write executor, approval-gated,
--    never a direct silver write); pipeline + local-pipeline read. Defensive (roles may be
--    absent), mirroring 0227's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON reference TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON reference TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON reference TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON reference TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
