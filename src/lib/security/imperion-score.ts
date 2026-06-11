/**
 * Imperion Secure Score — Score Model v1 (ADR-0051 §4).
 *
 * The composite 0–100 security score for an account, computed live from its
 * mapped tenants' `tenant_posture` rollups. Model v1 pillars (equal weight):
 * m365_secure_score · policy_compliance · darkweb. A pillar with no data for
 * the account is `covered: false` and scores 0 — no coverage is not "fine" —
 * but renders as "No coverage" (grey), never as failure (red).
 *
 * PURE / edge-safe: no pg, no node:*, no env — unit-tested directly, and the
 * same math the snapshot job must reproduce (snapshots store their result
 * immutably; this function only ever describes "now").
 */
import type { TenantPostureRollup } from "@/types";

export const SCORE_MODEL_VERSION = 1;

export type PillarKey = "m365_secure_score" | "policy_compliance" | "darkweb";

export interface PillarResult {
  pillar: PillarKey;
  covered: boolean;
  /** 0–100; always 0 when covered is false. */
  score: number;
}

export interface ImperionScore {
  modelVersion: number;
  /** Equal-weight mean across ALL model pillars (uncovered pillars contribute 0). */
  composite: number;
  grade: "A" | "B" | "C" | "D" | "F";
  pillars: PillarResult[];
}

/** Grade bands (ADR-0051): A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F. */
export function gradeFor(composite: number): ImperionScore["grade"] {
  if (composite >= 90) return "A";
  if (composite >= 80) return "B";
  if (composite >= 70) return "C";
  if (composite >= 60) return "D";
  return "F";
}

export function computeImperionScore(rollups: TenantPostureRollup[]): ImperionScore {
  // m365_secure_score: licensed-user-weighted mean of current/max × 100 across
  // tenants that report a score. A tenant without a licensed-user count weighs 1
  // (still counted, never silently dropped).
  let weighted = 0;
  let weightSum = 0;
  for (const t of rollups) {
    if (t.secureScoreCurrent === null || t.secureScoreMax === null || t.secureScoreMax <= 0) {
      continue;
    }
    const weight = t.licensedUserCount ?? 1;
    weighted += (t.secureScoreCurrent / t.secureScoreMax) * 100 * weight;
    weightSum += weight;
  }
  const m365: PillarResult = {
    pillar: "m365_secure_score",
    covered: weightSum > 0,
    score: weightSum > 0 ? weighted / weightSum : 0,
  };

  // policy_compliance: compliant / all classified, across all families + tenants.
  let compliant = 0;
  let classified = 0;
  for (const t of rollups) {
    compliant += t.policiesCompliant;
    classified +=
      t.policiesCompliant + t.policiesDrift + t.policiesUngoverned + t.policiesMissing;
  }
  const policy: PillarResult = {
    pillar: "policy_compliance",
    covered: classified > 0,
    score: classified > 0 ? (compliant / classified) * 100 : 0,
  };

  // darkweb: max(0, 100 − 10 × open exposures). Covered only once the pipeline
  // has computed a rollup for at least one tenant — exposures_open defaults to 0,
  // so an unrefreshed account must read "No coverage", not a perfect 100.
  const refreshed = rollups.some((t) => t.refreshedAt !== null);
  const exposures = rollups.reduce((sum, t) => sum + t.exposuresOpen, 0);
  const darkweb: PillarResult = {
    pillar: "darkweb",
    covered: refreshed,
    score: refreshed ? Math.max(0, 100 - 10 * exposures) : 0,
  };

  const pillars = [m365, policy, darkweb];
  const composite = pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length;
  return {
    modelVersion: SCORE_MODEL_VERSION,
    composite: Math.round(composite * 10) / 10,
    grade: gradeFor(composite),
    pillars,
  };
}
