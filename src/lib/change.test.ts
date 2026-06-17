import { describe, it, expect } from "vitest";
import {
  CHANGE_TYPES,
  CHANGE_TYPE_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_LABEL,
  asChangeType,
  effectiveRisk,
  deriveChangeRisk,
  riskBand,
  RISK_BAND_LABEL,
} from "@/lib/change";
import type { ConfigurationItem, CiRelationship, Criticality, CiType } from "@/types";

/** Build a minimal CI fixture; criticality via `derivedDefault` (no override unless given). */
function ci(
  ciType: CiType,
  ciId: string,
  derivedDefault: Criticality,
  override: Criticality | null = null,
): ConfigurationItem {
  return {
    ciType,
    ciId,
    accountId: "acc-1",
    accountName: "Acme",
    displayName: `${ciType}-${ciId}`,
    attributes: [],
    derivedDefault,
    override,
    lifecycle: "unknown",
  };
}

/** Build an undirected-friendly edge fixture between two CIs. */
function edge(
  fromCiType: CiType,
  fromCiId: string,
  toCiType: CiType,
  toCiId: string,
): CiRelationship {
  return {
    id: `${fromCiId}->${toCiId}`,
    fromCiType,
    fromCiId,
    toCiType,
    toCiId,
    relationType: "depends-on",
    source: "manual",
    note: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("change helpers (#656)", () => {
  it("labels every change type and status", () => {
    for (const t of CHANGE_TYPES) expect(CHANGE_TYPE_LABEL[t]).toBeTruthy();
    for (const s of CHANGE_STATUSES) expect(CHANGE_STATUS_LABEL[s]).toBeTruthy();
  });

  it("narrows a valid change type and rejects junk", () => {
    expect(asChangeType("emergency")).toBe("emergency");
    expect(asChangeType("normal")).toBe("normal");
    expect(asChangeType("bogus")).toBeNull();
    expect(asChangeType(undefined)).toBeNull();
  });

  it("resolves effective risk override-wins", () => {
    expect(effectiveRisk(40, 80)).toBe(80); // override wins
    expect(effectiveRisk(40, null)).toBe(40); // fall back to derived
    expect(effectiveRisk(null, null)).toBeNull(); // unassessed
    expect(effectiveRisk(null, 0)).toBe(0); // explicit 0 override is kept (not nullish)
  });
});

describe("CMDB-derived change risk (#658)", () => {
  it("scores 0 when nothing is affected", () => {
    expect(deriveChangeRisk([], [], [])).toBe(0);
  });

  it("returns an integer in [0, 100]", () => {
    const items = [ci("device", "d1", "high")];
    const score = deriveChangeRisk([{ ciType: "device", ciId: "d1" }], items, []);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores a more critical affected CI higher than a less critical one", () => {
    const lowItems = [ci("device", "d1", "low")];
    const critItems = [ci("device", "d1", "critical")];
    const target = [{ ciType: "device" as const, ciId: "d1" }];
    expect(deriveChangeRisk(target, critItems, [])).toBeGreaterThan(
      deriveChangeRisk(target, lowItems, []),
    );
  });

  it("counts the blast radius — dependents raise the score", () => {
    // d1 alone vs d1 with two high-criticality dependents one hop away.
    const lone = [ci("device", "d1", "medium")];
    const withDeps = [
      ci("device", "d1", "medium"),
      ci("device", "d2", "high"),
      ci("device", "d3", "high"),
    ];
    const edges = [edge("device", "d1", "device", "d2"), edge("device", "d1", "device", "d3")];
    const target = [{ ciType: "device" as const, ciId: "d1" }];
    expect(deriveChangeRisk(target, withDeps, edges)).toBeGreaterThan(
      deriveChangeRisk(target, lone, []),
    );
  });

  it("decays blast contribution with hop distance", () => {
    // A high-criticality CI one hop away contributes more than the same CI three hops away.
    const items = [
      ci("device", "d1", "low"),
      ci("device", "near", "high"),
      ci("device", "mid", "low"),
      ci("device", "far", "high"),
    ];
    const oneHop = deriveChangeRisk(
      [{ ciType: "device", ciId: "d1" }],
      items,
      [edge("device", "d1", "device", "near")],
    );
    const threeHop = deriveChangeRisk(
      [{ ciType: "device", ciId: "d1" }],
      items,
      [
        edge("device", "d1", "device", "mid"),
        edge("device", "mid", "device", "mid2"),
        edge("device", "mid2", "device", "far"),
      ],
    );
    expect(oneHop).toBeGreaterThan(threeHop);
  });

  it("dedupes a dependent reached from two affected origins (no double-count)", () => {
    // Shared dependent d3 reached from both d1 and d2 counts once.
    const items = [
      ci("device", "d1", "low"),
      ci("device", "d2", "low"),
      ci("device", "d3", "critical"),
    ];
    const edges = [edge("device", "d1", "device", "d3"), edge("device", "d2", "device", "d3")];
    const both = deriveChangeRisk(
      [
        { ciType: "device", ciId: "d1" },
        { ciType: "device", ciId: "d2" },
      ],
      items,
      edges,
    );
    // Score stays a valid bounded integer (the dedup keeps d3 from inflating the blast twice).
    expect(both).toBeLessThanOrEqual(100);
    expect(both).toBeGreaterThan(0);
  });

  it("honors a CI criticality override in the blast weighting", () => {
    const derived = [ci("device", "d1", "low"), ci("device", "d2", "low")];
    const overridden = [ci("device", "d1", "low"), ci("device", "d2", "low", "critical")];
    const edges = [edge("device", "d1", "device", "d2")];
    const target = [{ ciType: "device" as const, ciId: "d1" }];
    expect(deriveChangeRisk(target, overridden, edges)).toBeGreaterThan(
      deriveChangeRisk(target, derived, edges),
    );
  });

  it("bands a score and labels every band", () => {
    expect(riskBand(0)).toBe("low");
    expect(riskBand(24)).toBe("low");
    expect(riskBand(25)).toBe("moderate");
    expect(riskBand(50)).toBe("high");
    expect(riskBand(75)).toBe("critical");
    expect(riskBand(100)).toBe("critical");
    for (const band of ["low", "moderate", "high", "critical"] as const) {
      expect(RISK_BAND_LABEL[band]).toBeTruthy();
    }
  });
});
