import { describe, expect, test } from "vitest";
import {
  CRITICALITY_LEVELS,
  CRITICALITY_WEIGHT,
  asCriticality,
  deriveCriticality,
  effectiveCriticality,
} from "@/lib/cmdb/criticality";

/**
 * Pure CMDB criticality helpers (#648). The DERIVED-DEFAULT rule (account tier / device
 * role) and the EFFECTIVE-criticality resolution (override ?? derived) are unit-tested
 * here without a DB — the SAME rule is encoded in the migration seed (0132), so these
 * tests pin the contract both sides must agree on.
 */

describe("scale", () => {
  test("levels are highest → lowest", () => {
    expect([...CRITICALITY_LEVELS]).toEqual(["critical", "high", "medium", "low"]);
  });

  test("weights strictly decrease down the scale", () => {
    expect(CRITICALITY_WEIGHT.critical).toBeGreaterThan(CRITICALITY_WEIGHT.high);
    expect(CRITICALITY_WEIGHT.high).toBeGreaterThan(CRITICALITY_WEIGHT.medium);
    expect(CRITICALITY_WEIGHT.medium).toBeGreaterThan(CRITICALITY_WEIGHT.low);
  });

  test("asCriticality narrows known levels and rejects junk", () => {
    expect(asCriticality("high")).toBe("high");
    expect(asCriticality("inherit")).toBeNull();
    expect(asCriticality("")).toBeNull();
    expect(asCriticality(null)).toBeNull();
    expect(asCriticality(undefined)).toBeNull();
  });
});

describe("deriveCriticality — account (tier × lifecycle)", () => {
  test("a live managed customer is high", () => {
    expect(
      deriveCriticality("account", {
        accountRelationship: "customer",
        accountLifecycleStage: "managed_active",
      }),
    ).toBe("high");
  });

  test("a customer still onboarding is medium", () => {
    expect(
      deriveCriticality("account", {
        accountRelationship: "customer",
        accountLifecycleStage: "onboarding",
      }),
    ).toBe("medium");
  });

  test("a partner is medium", () => {
    expect(deriveCriticality("account", { accountRelationship: "partner" })).toBe("medium");
  });

  test("a prospect / unknown is low", () => {
    expect(deriveCriticality("account", { accountRelationship: "prospect" })).toBe("low");
    expect(deriveCriticality("account", {})).toBe("low");
  });
});

describe("deriveCriticality — device (role)", () => {
  test("server / network infrastructure is high", () => {
    expect(deriveCriticality("device", { deviceType: "server" })).toBe("high");
    expect(deriveCriticality("device", { deviceType: "Network" })).toBe("high");
  });

  test("workstation / mobile endpoint is medium", () => {
    expect(deriveCriticality("device", { deviceType: "workstation" })).toBe("medium");
    expect(deriveCriticality("device", { deviceType: "mobile" })).toBe("medium");
  });

  test("an untyped device is low", () => {
    expect(deriveCriticality("device", { deviceType: null })).toBe("low");
    expect(deriveCriticality("device", {})).toBe("low");
  });
});

describe("deriveCriticality — user", () => {
  test("end-user is a flat medium baseline (no silver seniority signal)", () => {
    expect(deriveCriticality("user", {})).toBe("medium");
  });
});

describe("deriveCriticality — cloud (category)", () => {
  test("data/identity/security plane is high", () => {
    expect(deriveCriticality("cloud", { cloudCategory: "database" })).toBe("high");
    expect(deriveCriticality("cloud", { cloudCategory: "identity" })).toBe("high");
    expect(deriveCriticality("cloud", { cloudCategory: "security" })).toBe("high");
  });
  test("run/connectivity plane is medium", () => {
    expect(deriveCriticality("cloud", { cloudCategory: "compute" })).toBe("medium");
    expect(deriveCriticality("cloud", { cloudCategory: "network" })).toBe("medium");
  });
  test("supporting/unknown categories are low", () => {
    expect(deriveCriticality("cloud", { cloudCategory: "storage" })).toBe("low");
    expect(deriveCriticality("cloud", { cloudCategory: null })).toBe("low");
    expect(deriveCriticality("cloud", {})).toBe("low");
  });
});

describe("deriveCriticality never auto-assigns critical", () => {
  test("no input combination yields critical (reserved for override)", () => {
    const combos = [
      deriveCriticality("account", { accountRelationship: "customer", accountLifecycleStage: "managed_active" }),
      deriveCriticality("device", { deviceType: "server" }),
      deriveCriticality("cloud", { cloudCategory: "database" }),
      deriveCriticality("user", {}),
    ];
    expect(combos).not.toContain("critical");
  });
});

describe("effectiveCriticality (override ?? derived)", () => {
  test("override wins when set", () => {
    expect(effectiveCriticality("low", "critical")).toBe("critical");
    expect(effectiveCriticality("high", "low")).toBe("low");
  });

  test("falls back to the derived default when no override", () => {
    expect(effectiveCriticality("high", null)).toBe("high");
  });

  test("an override SURVIVES a changed derived default (the survival contract)", () => {
    // Simulate re-derivation moving the derived default; the override is unchanged, so
    // the effective value stays pinned to the human assertion.
    const override = "critical" as const;
    expect(effectiveCriticality("low", override)).toBe("critical");
    expect(effectiveCriticality("high", override)).toBe("critical"); // derived changed, effective didn't
  });
});
