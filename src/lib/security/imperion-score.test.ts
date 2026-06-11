import { describe, expect, it } from "vitest";
import { computeImperionScore, gradeFor } from "./imperion-score";
import type { TenantPostureRollup } from "@/types";

function rollup(partial: Partial<TenantPostureRollup>): TenantPostureRollup {
  return {
    tenantId: "t-1",
    displayName: null,
    secureScoreCurrent: null,
    secureScoreMax: null,
    licensedUserCount: null,
    activeUserCount: null,
    policiesCompliant: 0,
    policiesDrift: 0,
    policiesUngoverned: 0,
    policiesMissing: 0,
    exposuresOpen: 0,
    refreshedAt: null,
    ...partial,
  };
}

describe("Imperion Secure Score — Score Model v1 (ADR-0051 §4)", () => {
  it("weights the m365 pillar by licensed users across tenants", () => {
    const score = computeImperionScore([
      rollup({
        tenantId: "t-1", secureScoreCurrent: 50, secureScoreMax: 100,
        licensedUserCount: 90, refreshedAt: "2026-06-11",
      }),
      rollup({
        tenantId: "t-2", secureScoreCurrent: 100, secureScoreMax: 100,
        licensedUserCount: 10, refreshedAt: "2026-06-11",
      }),
    ]);
    const m365 = score.pillars.find((p) => p.pillar === "m365_secure_score")!;
    // (50% × 90 + 100% × 10) / 100 = 55%
    expect(m365.covered).toBe(true);
    expect(m365.score).toBeCloseTo(55);
  });

  it("computes policy_compliance across all families and tenants", () => {
    const score = computeImperionScore([
      rollup({ policiesCompliant: 6, policiesDrift: 2, refreshedAt: "2026-06-11" }),
      rollup({ tenantId: "t-2", policiesUngoverned: 1, policiesMissing: 1, refreshedAt: "2026-06-11" }),
    ]);
    const policy = score.pillars.find((p) => p.pillar === "policy_compliance")!;
    expect(policy.covered).toBe(true);
    expect(policy.score).toBeCloseTo(60); // 6 / 10
  });

  it("darkweb pillar: 100 − 10 per open exposure, floored at 0", () => {
    const score = computeImperionScore([
      rollup({ exposuresOpen: 3, refreshedAt: "2026-06-11" }),
    ]);
    const darkweb = score.pillars.find((p) => p.pillar === "darkweb")!;
    expect(darkweb.score).toBe(70);

    const floored = computeImperionScore([
      rollup({ exposuresOpen: 15, refreshedAt: "2026-06-11" }),
    ]);
    expect(floored.pillars.find((p) => p.pillar === "darkweb")!.score).toBe(0);
  });

  it("no coverage scores 0 and never reads as fine — an unrefreshed account is not a perfect 100", () => {
    const score = computeImperionScore([rollup({})]); // mapped, never classified
    expect(score.pillars.every((p) => !p.covered && p.score === 0)).toBe(true);
    expect(score.composite).toBe(0);
    expect(score.grade).toBe("F");
  });

  it("composite is the equal-weight mean over ALL pillars (uncovered contribute 0)", () => {
    const score = computeImperionScore([
      rollup({
        secureScoreCurrent: 90, secureScoreMax: 100, licensedUserCount: 10,
        refreshedAt: "2026-06-11", // m365 = 90, darkweb = 100, policy uncovered = 0
      }),
    ]);
    expect(score.composite).toBeCloseTo((90 + 0 + 100) / 3, 1);
  });

  it("grade bands: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F", () => {
    expect(gradeFor(95)).toBe("A");
    expect(gradeFor(90)).toBe("A");
    expect(gradeFor(85)).toBe("B");
    expect(gradeFor(72)).toBe("C");
    expect(gradeFor(60)).toBe("D");
    expect(gradeFor(59.9)).toBe("F");
  });
});
