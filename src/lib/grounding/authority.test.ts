import { describe, expect, it } from "vitest";
import {
  labelAnswer,
  resolveGrounding,
  TIER_LABEL,
  TIER_ORDER,
  type TierClaim,
} from "./authority";

describe("authority — tier ordering", () => {
  it("orders canon > company_silver > personal", () => {
    expect(TIER_ORDER).toEqual(["canon", "company_silver", "personal"]);
  });
  it("labels each tier", () => {
    expect(labelAnswer("canon", "x")).toBe("Canon (OKF): x");
    expect(labelAnswer("company_silver", "y")).toBe(`${TIER_LABEL.company_silver}: y`);
  });
});

describe("resolveGrounding — interim answer (anti-stall)", () => {
  it("serves the most-authoritative tier, labelled, when tiers agree (no conflict)", () => {
    const claims: TierClaim[] = [
      { tier: "company_silver", claim: "ARR is $1.2M" },
      { tier: "personal", claim: "ARR is $1.2M" },
    ];
    const r = resolveGrounding(claims);
    expect(r.servedTier).toBe("company_silver");
    expect(r.servedLabel).toBe("Company silver: ARR is $1.2M");
    expect(r.conflict).toBeNull();
  });

  it("serves canon over company over personal even on disagreement", () => {
    const claims: TierClaim[] = [
      { tier: "personal", claim: "tier P" },
      { tier: "canon", claim: "tier C" },
      { tier: "company_silver", claim: "tier S" },
    ];
    const r = resolveGrounding(claims, { concept: "account" });
    expect(r.servedTier).toBe("canon");
    expect(r.servedLabel).toBe("Canon (OKF): tier C");
  });

  it("raises a conflict carrying all valid claims + the served answer when tiers disagree", () => {
    const claims: TierClaim[] = [
      { tier: "canon", claim: "C" },
      { tier: "company_silver", claim: "S" },
      { tier: "personal", claim: "P" },
    ];
    const r = resolveGrounding(claims, { concept: "account" });
    expect(r.conflict).not.toBeNull();
    expect(r.conflict).toMatchObject({
      servedTier: "canon",
      servedLabel: "Canon (OKF): C",
      canonClaim: "C",
      companyClaim: "S",
      personalClaim: "P",
    });
    expect(r.conflict!.detail).toContain("account");
    expect(r.conflict!.detail).toContain("disagree");
  });

  it("never raises a conflict when only one tier makes a claim", () => {
    const r = resolveGrounding([{ tier: "personal", claim: "only me" }]);
    expect(r.servedTier).toBe("personal");
    expect(r.conflict).toBeNull();
  });
});

describe("resolveGrounding — temporal validity gating", () => {
  it("skips an expired claim so a fresh lower tier can out-rank a stale higher one", () => {
    const claims: TierClaim[] = [
      { tier: "canon", claim: "stale canon", valid: false },
      { tier: "personal", claim: "fresh personal", valid: true },
    ];
    const r = resolveGrounding(claims);
    expect(r.servedTier).toBe("personal");
    expect(r.servedLabel).toBe("Personal: fresh personal");
    // single valid claim → no conflict
    expect(r.conflict).toBeNull();
  });

  it("an expired claim does not by itself create a conflict", () => {
    const claims: TierClaim[] = [
      { tier: "company_silver", claim: "current", valid: true },
      { tier: "personal", claim: "outdated", valid: false },
    ];
    const r = resolveGrounding(claims);
    expect(r.conflict).toBeNull();
    expect(r.servedTier).toBe("company_silver");
  });
});

describe("resolveGrounding — agreement is normalize-exact", () => {
  it("treats whitespace/case-different claims as agreement", () => {
    const r = resolveGrounding([
      { tier: "canon", claim: "Open Now" },
      { tier: "personal", claim: "open  now" },
    ]);
    expect(r.conflict).toBeNull();
  });
});

describe("resolveGrounding — genuinely no data", () => {
  it("returns nulls when no tier has a valid claim (caller hedges only here)", () => {
    const r = resolveGrounding([{ tier: "canon", claim: "  ", valid: true }]);
    expect(r.servedLabel).toBeNull();
    expect(r.servedTier).toBeNull();
    expect(r.conflict).toBeNull();
  });
});
