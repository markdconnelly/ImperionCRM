-- 0063: Posture snapshots — posture_snapshot + posture_snapshot_pillar (ADR-0051
-- decisions 4–5, issue #164; the pair deliberately deferred from 0062).
--
-- A Posture Snapshot is an IMMUTABLE, per-account record of the Imperion Secure
-- Score: composite, stored letter grade, and Score Model version at capture, plus
-- one row per pillar (normalized score, weight, covered flag, report-ready
-- metrics). Grades/composites are never recomputed after capture — formula changes
-- only affect future snapshots. Taken by the on-prem quarterly job (calendar
-- quarters), on demand, and automatically when a Business Review is created
-- (every QBR carries a fresh posture record).
--
-- business_review_id references strategic_business_review (migration 0015 — the
-- ADR's "implementer confirms table name" note, confirmed). ON DELETE SET NULL:
-- deleting a review must never destroy the immutable posture history it triggered.
-- Idempotent; grants no-op if a role is absent.

BEGIN;

CREATE TABLE IF NOT EXISTS posture_snapshot (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  taken_at            timestamptz NOT NULL DEFAULT now(),
  trigger             text NOT NULL CHECK (trigger IN ('scheduled','on_demand','business_review')),
  business_review_id  uuid REFERENCES strategic_business_review(id) ON DELETE SET NULL,
  score_model_version integer NOT NULL,
  composite_score     numeric NOT NULL,
  grade               text NOT NULL,
  UNIQUE (account_id, taken_at)
);
COMMENT ON TABLE posture_snapshot IS
  'Immutable per-account Imperion Secure Score snapshots (ADR-0051) — composite/grade/model stored at capture, never recomputed.';

CREATE TABLE IF NOT EXISTS posture_snapshot_pillar (
  snapshot_id uuid NOT NULL REFERENCES posture_snapshot(id) ON DELETE CASCADE,
  pillar      text NOT NULL CHECK (pillar IN
    ('m365_secure_score','policy_compliance','network','vulnerability','phishing','darkweb')),
  covered     boolean NOT NULL,
  score       numeric NOT NULL, -- 0–100; 0 when covered = false (no coverage is not "fine")
  weight      numeric NOT NULL,
  metrics     jsonb NOT NULL DEFAULT '{}'::jsonb, -- report-ready headline metrics for the quarterly report
  PRIMARY KEY (snapshot_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_posture_snapshot_account
  ON posture_snapshot(account_id, taken_at DESC);

DO $$
BEGIN
  -- Snapshots are append-only by design: writers get INSERT (+SELECT), no
  -- UPDATE/DELETE — immutability is enforced by the grant, not just convention.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT ON posture_snapshot, posture_snapshot_pillar TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT ON posture_snapshot, posture_snapshot_pillar TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
