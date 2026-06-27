import { describe, expect, it } from "vitest";
import {
  CAP_BOUNDS,
  GOVERNANCE_DEFAULTS,
  clampInt,
  clampNumber,
  isOptoutDefault,
  parseKillSwitchScope,
  parseNumber,
  parseSlugList,
} from "@/lib/agent/governance";

/**
 * Pins the pure agent-governance helpers (#1408): the defensive jsonb parsers must
 * never trust the stored `value`, and the write-side clamps must keep every tunable
 * inside its documented bounds (the GUI saves clamped, never throws on bad input).
 */
describe("parseKillSwitchScope", () => {
  it("reads a well-formed scope verbatim", () => {
    expect(
      parseKillSwitchScope({ global: true, per_agent: ["felix"], per_workflow: ["technician"] }),
    ).toEqual({ global: true, per_agent: ["felix"], per_workflow: ["technician"] });
  });

  it("coerces malformed/missing fields to a safe off state", () => {
    expect(parseKillSwitchScope(null)).toEqual({ global: false, per_agent: [], per_workflow: [] });
    expect(parseKillSwitchScope("nope")).toEqual({ global: false, per_agent: [], per_workflow: [] });
    expect(parseKillSwitchScope({ global: "yes", per_agent: "felix" })).toEqual({
      global: false, // only literal true engages the switch (fail-safe)
      per_agent: [],
      per_workflow: [],
    });
  });

  it("drops non-string / blank entries from the lists", () => {
    expect(parseKillSwitchScope({ per_agent: ["felix", 7, "", "  chase  ", null] }).per_agent).toEqual([
      "felix",
      "chase",
    ]);
  });
});

describe("parseNumber", () => {
  it("accepts numbers and numeric strings, else the fallback", () => {
    expect(parseNumber(60, 1)).toBe(60);
    expect(parseNumber("0.25", 1)).toBe(0.25);
    expect(parseNumber("abc", 7)).toBe(7);
    expect(parseNumber(null, 5)).toBe(5);
    expect(parseNumber(NaN, 9)).toBe(9);
  });
});

describe("parseSlugList", () => {
  it("splits on commas + newlines, trims, lower-cases, dedupes", () => {
    expect(parseSlugList("Felix, chase\nFELIX,  technician ")).toEqual([
      "felix",
      "chase",
      "technician",
    ]);
  });
  it("returns [] for empty/whitespace", () => {
    expect(parseSlugList("   ,\n, ")).toEqual([]);
    expect(parseSlugList("")).toEqual([]);
  });
});

describe("clampInt", () => {
  it("rounds and clamps into [min,max]", () => {
    expect(clampInt(5.6, 1, 10, 3)).toBe(6);
    expect(clampInt(0, 1, 10, 3)).toBe(1);
    expect(clampInt(99, 1, 10, 3)).toBe(10);
    expect(clampInt(NaN, 1, 10, 3)).toBe(3);
  });
});

describe("clampNumber", () => {
  it("clamps and rounds to the given decimals", () => {
    expect(clampNumber(0.256, 0, 1, 0.25)).toBe(0.26);
    expect(clampNumber(-1, 0, 1, 0.25)).toBe(0);
    expect(clampNumber(2, 0, 1, 0.25)).toBe(1);
    expect(clampNumber(NaN, 0, 1, 0.25)).toBe(0.25);
  });
});

describe("isOptoutDefault", () => {
  it("accepts only the two literals", () => {
    expect(isOptoutDefault("opt_in")).toBe(true);
    expect(isOptoutDefault("opt_out")).toBe(true);
    expect(isOptoutDefault("maybe")).toBe(false);
    expect(isOptoutDefault(undefined)).toBe(false);
  });
});

describe("defaults", () => {
  it("match the seeded migration values + sit inside the bounds", () => {
    expect(GOVERNANCE_DEFAULTS.ratePerMinute).toBe(60);
    expect(GOVERNANCE_DEFAULTS.fanoutPerRun).toBe(10);
    expect(GOVERNANCE_DEFAULTS.costUsdPerRun).toBe(5);
    expect(GOVERNANCE_DEFAULTS.circuitBreakerErrorRate).toBe(0.25);
    expect(GOVERNANCE_DEFAULTS.approvalTtlDays).toBe(7);
    expect(GOVERNANCE_DEFAULTS.optoutDefault).toBe("opt_in");
    // every default is a legal value the clamps would accept unchanged
    expect(clampInt(GOVERNANCE_DEFAULTS.ratePerMinute, CAP_BOUNDS.ratePerMinute.min, CAP_BOUNDS.ratePerMinute.max, 1)).toBe(60);
    expect(
      clampNumber(GOVERNANCE_DEFAULTS.circuitBreakerErrorRate, CAP_BOUNDS.circuitBreakerErrorRate.min, CAP_BOUNDS.circuitBreakerErrorRate.max, 0),
    ).toBe(0.25);
  });
});
