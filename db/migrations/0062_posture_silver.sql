-- 0062: Posture silver — posture_policy + tenant_posture (ADR-0051 decisions 2–3,
-- issue #151; pipeline #20's blocker with 0061's account_tenant).
--
-- Bronze is raw, silver is curated, refresh is two-tier: the on-prem pipeline owns
-- scheduled bulk posture merges; the cloud pipeline owns the narrow on-demand
-- single-account refresh (pipeline #20). Both implement the SAME classification
-- rules (ADR-0051 decision 3 — the Get-ImperionPolicyDrift FULL OUTER JOIN
-- semantics): compliant (observed hash = golden), drift (both, differ),
-- ungoverned (observed, no golden), missing (golden, not observed).
--
-- posture_policy is CURRENT STATE, replaced per merge (hence DELETE for both
-- pipeline roles); tenant_posture is the one-row-per-tenant rollup. The immutable
-- posture_snapshot(_pillar) tables are deferred to the snapshot-job work (on-prem
-- quarterly + QBR side-effect). Idempotent; grants no-op if a role is absent.

BEGIN;

CREATE TABLE IF NOT EXISTS posture_policy (
  tenant_id      text NOT NULL,
  policy_family  text NOT NULL CHECK (policy_family IN
    ('conditional_access','intune_security','device_configuration','autopilot','defender_xdr')),
  policy_id      text NOT NULL,
  policy_name    text,
  classification text NOT NULL CHECK (classification IN ('compliant','drift','ungoverned','missing')),
  observed_hash  text,
  golden_hash    text,
  observed_modified_at timestamptz,
  golden_approved_at   timestamptz,
  refreshed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, policy_family, policy_id)
);

CREATE TABLE IF NOT EXISTS tenant_posture (
  tenant_id            text PRIMARY KEY,
  secure_score_current numeric,
  secure_score_max     numeric,
  licensed_user_count  integer,
  active_user_count    integer,
  policies_compliant   integer NOT NULL DEFAULT 0,
  policies_drift       integer NOT NULL DEFAULT 0,
  policies_ungoverned  integer NOT NULL DEFAULT 0,
  policies_missing     integer NOT NULL DEFAULT 0,
  exposures_open       integer NOT NULL DEFAULT 0,
  refreshed_at         timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    -- Cloud: on-demand single-account refresh (pipeline #20) — replace-per-merge
    -- needs DELETE on posture_policy; the rollup upserts.
    GRANT SELECT, INSERT, UPDATE, DELETE ON posture_policy  TO "mgid-imperioncrmpipeline";
    GRANT SELECT, INSERT, UPDATE         ON tenant_posture  TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    -- On-prem: scheduled bulk merges, same write shape.
    GRANT SELECT, INSERT, UPDATE, DELETE ON posture_policy  TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE         ON tenant_posture  TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
