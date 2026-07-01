-- 0256: security_standard_store — the versioned client security standard +
-- posture-vs-standard scoring verdicts (#1715; unblocks backend #439 / BE PR #469,
-- pairs LocalPipeline #399, backs FE Vera leaves #1468–#1472).
--
-- WHY THIS EXISTS. The backend Vera security-standard engine (BE #439, ADR-0105 there)
-- is built deploy-dormant against two FE-owned tables that do not exist yet — it fails
-- dormant (42P01 → empty / persisted:false) until this migration is applied, exactly
-- like the conformance engine handoff (#1532 / BE #438). Per the four-repo contract
-- (§1 / ADR-0042) the schema is FE-owned, so the tables land here; backend + LP are
-- the consumers.
--
-- CONSUMER CONTRACT (verified against BE PR #469 SQL):
--   * "current standard" = SELECT … FROM security_standard_version
--     WHERE status='ratified' ORDER BY version_number DESC LIMIT 1.
--   * ratify = Mark-gated conditional UPDATE … SET status='ratified',
--     ratified_by_user_id, ratified_at WHERE id=$1 AND status='draft' (audited;
--     never auto-ratifies).
--   * score persistence = INSERT INTO posture_score (account_id, posture_snapshot_id,
--     standard_version_id, overall_score, conformance_status) ON CONFLICT
--     (account_id, standard_version_id, posture_snapshot_id) DO NOTHING — the UNIQUE
--     below is the arbiter (idempotent re-score).
--   * LP #399 runs the same scoring on the scheduled cycle (LP owns posture bronze +
--     citation views) and reads prior verdicts for drift signals.
--
-- Migration number 0256 is the number ASSIGNED to this PR in the coordinated 11-PR
-- schema batch (claimed at merge per system CLAUDE.md §10.3 — renumbered on rebase if
-- a collision appears).
--
-- ARCHETYPES: security_standard_version = H (versioned reference/config — the standard
-- itself); posture_score = C (append-only verdict ledger over posture_snapshot, the
-- 0063 precedent). Both get OKF concept files + coverage-matrix rows in this PR
-- (ADR-0086 / §11). No PII, no secrets: governance/posture metadata only — criteria is
-- a declarative rule document, verdicts are scores + status enums, the only person ref
-- is the ratifying app_user id (audit attribution). data_class = security_credentials
-- (posture family, ADR-0118). Additive, idempotent, transactional. Deploy-dormant per
-- ADR-0123: NOT prod-applied until Mark gates the apply.

BEGIN;

-- ── The evolving client security standard, versioned + Mark-gated ratification ──────
CREATE TABLE IF NOT EXISTS security_standard_version (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number      integer NOT NULL UNIQUE,
  -- draft → ratified (Mark-gated) → superseded (when a newer version is ratified).
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','ratified','superseded')),
  -- The declarative posture criteria the score evaluates against (BE ADR-0105
  -- StandardCriteria: minCompositeScore / requiredPillars / criticalCompositeFloor;
  -- unknown fields are not enforced — forward-compatible, never a false critical).
  criteria            jsonb NOT NULL DEFAULT '{}'::jsonb,
  ratified_by_user_id uuid REFERENCES app_user(id),
  ratified_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  superseded_at       timestamptz
);

COMMENT ON TABLE security_standard_version IS
  'Versioned client security standard (Vera; #1715, consumer = backend #439 / ADR-0105 there, pairs LP #399). One row per standard version: draft → ratified (Mark-gated, audited) → superseded. The current standard = highest ratified version_number. criteria is the declarative rule document posture is scored against. Governance metadata — no PII, no secrets.';
COMMENT ON COLUMN security_standard_version.version_number IS
  'Monotonic human-meaningful standard version; UNIQUE. Current = MAX(version_number) WHERE status=''ratified''.';
COMMENT ON COLUMN security_standard_version.status IS
  'draft (editable, unratified) | ratified (Mark-gated conditional UPDATE from draft) | superseded (a newer version was ratified).';
COMMENT ON COLUMN security_standard_version.criteria IS
  'Declarative StandardCriteria jsonb (minCompositeScore / requiredPillars / criticalCompositeFloor, …). Unknown fields are ignored by the evaluator — forward-compatible.';
COMMENT ON COLUMN security_standard_version.ratified_by_user_id IS
  'The app_user who ratified (audit attribution for the Mark-gated ratify). NULL while draft.';

-- ── One scoring verdict per (account, standard version, posture snapshot) ───────────
CREATE TABLE IF NOT EXISTS posture_score (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  -- The immutable snapshot scored (0063/0064). Snapshots are append-only, but if one
  -- were ever removed its derived verdicts go with it.
  posture_snapshot_id uuid NOT NULL REFERENCES posture_snapshot(id) ON DELETE CASCADE,
  -- No ON DELETE action: a standard version that has verdicts is history — supersede
  -- it, never delete it.
  standard_version_id uuid NOT NULL REFERENCES security_standard_version(id),
  overall_score       numeric NOT NULL,
  conformance_status  text NOT NULL
                        CHECK (conformance_status IN ('conforming','drifting','critical')),
  scored_at           timestamptz NOT NULL DEFAULT now(),
  -- Idempotent re-score: the arbiter for the backend/LP INSERT … ON CONFLICT DO NOTHING.
  UNIQUE (account_id, standard_version_id, posture_snapshot_id)
);

COMMENT ON TABLE posture_score IS
  'Posture-vs-standard scoring verdicts (Vera; #1715, writers = backend #439 scoring API + LP #399 scheduled cycle). One row per (account, standard version, posture snapshot): overall_score + conforming|drifting|critical against that version''s criteria. Append-only ledger — re-scores are idempotent via the UNIQUE; verdicts are never recomputed in place. No PII, no secrets.';
COMMENT ON COLUMN posture_score.posture_snapshot_id IS
  'The immutable posture_snapshot (0063) this verdict scored.';
COMMENT ON COLUMN posture_score.standard_version_id IS
  'The security_standard_version whose criteria produced this verdict — a verdict is always reproducible against its version.';
COMMENT ON COLUMN posture_score.conformance_status IS
  'conforming | drifting | critical (BE ADR-0105 evaluatePostureScore).';

-- Account history reads ("how has this client tracked the standard?") — the
-- 0063 idx_posture_snapshot_account shape.
CREATE INDEX IF NOT EXISTS idx_posture_score_account
  ON posture_score (account_id, scored_at DESC);
-- Standard-evolution re-evaluation sweeps (FE leaf #1472; the UNIQUE leads with
-- account_id, so version-wide scans need their own path).
CREATE INDEX IF NOT EXISTS idx_posture_score_version
  ON posture_score (standard_version_id);

-- ── Grants (least-priv, ADR-0127; defensive role checks, the 0063/0246 pattern) ─────
-- Backend: SELECT on the standard (current-version read) + UPDATE for the Mark-gated
-- ratify; SELECT+INSERT on verdicts (idempotent persist; the #440 closure lifecycle
-- consumes the rows). No INSERT on security_standard_version yet — draft authoring
-- (FE leaf #1468) is not built; grant it when that process lands, not before.
-- LP: SELECT the ratified standard + SELECT/INSERT verdicts (scheduled scoring +
-- drift comparison against prior verdicts, LP #399). Cloud pipeline: nothing — this
-- is not an ingestion/merge surface. Web: SELECT only (governance surface renders;
-- every mutation is a backend process, ADR-0042). NOBODY gets DELETE — verdict
-- history and ratified standards are governance record.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, UPDATE ON security_standard_version TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT ON posture_score TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON security_standard_version TO "imperion-localpipeline";
    GRANT SELECT, INSERT ON posture_score TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON security_standard_version, posture_score TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
