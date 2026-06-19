import { describe, expect, test } from "vitest";
import {
  analyzeImpact,
  groupByType,
  clampDepth,
  DEFAULT_IMPACT_DEPTH,
  MAX_IMPACT_DEPTH,
  type AffectedCi,
} from "@/lib/cmdb/impact";
import type { CiRelationship, ConfigurationItem, CiType, Criticality } from "@/types";

/**
 * Pure CMDB impact-analysis (#650): an n-hop, cycle-safe, depth-bounded walk over the
 * `ci_relationship` graph that enumerates affected CIs grouped by type + criticality-
 * weighted. No DB — synthetic CI sets + edge sets exercise every requirement.
 */

const ci = (
  ciType: CiType,
  ciId: string,
  over: Partial<ConfigurationItem> = {},
): ConfigurationItem => ({
  ciType,
  ciId,
  accountId: "a-owner",
  accountName: "Owner",
  displayName: `${ciType}-${ciId}`,
  attributes: [],
  derivedDefault: "low",
  override: null,
  lifecycle: "unknown",
  ...over,
});

const edge = (
  from: [CiType, string],
  to: [CiType, string],
  over: Partial<CiRelationship> = {},
): CiRelationship => ({
  id: `${from.join("")}-${to.join("")}`,
  fromCiType: from[0],
  fromCiId: from[1],
  toCiType: to[0],
  toCiId: to[1],
  relationType: "depends-on",
  source: "derived",
  note: null,
  createdAt: "",
  updatedAt: "",
  ...over,
});

const crit = (c: Criticality) => ({ derivedDefault: c, override: null });

describe("clampDepth", () => {
  test("defaults when unset / NaN", () => {
    expect(clampDepth(undefined)).toBe(DEFAULT_IMPACT_DEPTH);
    expect(clampDepth(NaN)).toBe(DEFAULT_IMPACT_DEPTH);
  });
  test("floors at 1 and caps at MAX_IMPACT_DEPTH", () => {
    expect(clampDepth(0)).toBe(1);
    expect(clampDepth(-5)).toBe(1);
    expect(clampDepth(999)).toBe(MAX_IMPACT_DEPTH);
    expect(clampDepth(2.9)).toBe(2);
  });
});

describe("analyzeImpact — n-hop traversal", () => {
  const items = [ci("device", "d1"), ci("account", "a1"), ci("user", "u1")];
  // d1 -> a1 -> u1 : a chain so depth gates the reach.
  const chain = [edge(["device", "d1"], ["account", "a1"]), edge(["account", "a1"], ["user", "u1"])];

  test("default depth reaches the whole chain", () => {
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, chain);
    expect(r.depth).toBe(DEFAULT_IMPACT_DEPTH);
    expect(r.affected.map((a) => a.ci.ciId).sort()).toEqual(["a1", "u1"]);
    // a1 is one hop, u1 is two.
    expect(r.affected.find((a) => a.ci.ciId === "a1")?.hops).toBe(1);
    expect(r.affected.find((a) => a.ci.ciId === "u1")?.hops).toBe(2);
  });

  test("depth bound stops the walk", () => {
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, chain, { maxDepth: 1 });
    expect(r.affected.map((a) => a.ci.ciId)).toEqual(["a1"]); // u1 is 2 hops, excluded
  });

  test("origin is never counted among the affected", () => {
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, chain);
    expect(r.affected.some((a) => a.ci.ciId === "d1")).toBe(false);
  });
});

describe("analyzeImpact — cycle safety", () => {
  test("a cycle terminates and counts each CI once at its shortest hop", () => {
    const items = [ci("device", "d1"), ci("account", "a1"), ci("user", "u1")];
    // d1 -> a1 -> u1 -> d1 (a 3-cycle).
    const cyc = [
      edge(["device", "d1"], ["account", "a1"]),
      edge(["account", "a1"], ["user", "u1"]),
      edge(["user", "u1"], ["device", "d1"]),
    ];
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, cyc, {
      maxDepth: MAX_IMPACT_DEPTH,
    });
    // Both other nodes appear exactly once; the origin never re-enters.
    expect(r.affected).toHaveLength(2);
    expect(r.affected.filter((a) => a.ci.ciId === "d1")).toHaveLength(0);
  });

  test("a self-loop edge is ignored", () => {
    const items = [ci("device", "d1"), ci("account", "a1")];
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, [
      edge(["device", "d1"], ["device", "d1"]),
      edge(["device", "d1"], ["account", "a1"]),
    ]);
    expect(r.affected.map((a) => a.ci.ciId)).toEqual(["a1"]);
  });
});

describe("analyzeImpact — criticality weighting", () => {
  test("totalWeight sums effective weights; peak is the highest", () => {
    const items = [
      ci("device", "d1"),
      ci("account", "a1", crit("high")), // weight 3
      ci("user", "u1", { derivedDefault: "low", override: "critical" }), // override wins -> 4
    ];
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, [
      edge(["device", "d1"], ["account", "a1"]),
      edge(["device", "d1"], ["user", "u1"]),
    ]);
    expect(r.totalWeight).toBe(7);
    expect(r.peakCriticality).toBe("critical");
    expect(r.affected.find((a) => a.ci.ciId === "u1")?.criticality).toBe("critical");
  });

  test("empty result has null peak and zero weight", () => {
    const r = analyzeImpact({ ciType: "device", ciId: "lonely" }, [ci("device", "lonely")], []);
    expect(r.totalAffected).toBe(0);
    expect(r.totalWeight).toBe(0);
    expect(r.peakCriticality).toBeNull();
  });
});

describe("analyzeImpact — missing edges graceful", () => {
  test("an edge to a CI absent from the register is skipped, not surfaced", () => {
    const items = [ci("device", "d1"), ci("account", "a1")];
    // d1 -> a1 (known) and d1 -> ghost user (unknown) and ghost -> a1 (loop-back).
    const r = analyzeImpact({ ciType: "device", ciId: "d1" }, items, [
      edge(["device", "d1"], ["account", "a1"]),
      edge(["device", "d1"], ["user", "ghost"]),
      edge(["user", "ghost"], ["account", "a1"]),
    ]);
    expect(r.affected.map((a) => a.ci.ciId)).toEqual(["a1"]);
    expect(r.affected.every((a) => a.ci.ciId !== "ghost")).toBe(true);
  });
});

describe("analyzeImpact — direction", () => {
  const items = [ci("device", "d1"), ci("account", "a1")];
  const e = [edge(["device", "d1"], ["account", "a1"])]; // d1 --(from->to)--> a1

  test("downstream follows from->to only", () => {
    expect(
      analyzeImpact({ ciType: "device", ciId: "d1" }, items, e, { direction: "downstream" })
        .affected,
    ).toHaveLength(1);
    expect(
      analyzeImpact({ ciType: "account", ciId: "a1" }, items, e, { direction: "downstream" })
        .affected,
    ).toHaveLength(0);
  });

  test("upstream follows to->from only", () => {
    expect(
      analyzeImpact({ ciType: "account", ciId: "a1" }, items, e, { direction: "upstream" })
        .affected,
    ).toHaveLength(1);
  });

  test("any (default) is undirected — reachable from either end", () => {
    expect(analyzeImpact({ ciType: "account", ciId: "a1" }, items, e).affected).toHaveLength(1);
    expect(analyzeImpact({ ciType: "device", ciId: "d1" }, items, e).affected).toHaveLength(1);
  });
});

describe("cloud CIs enter the impact blast radius (#653)", () => {
  test("an account's neighbourhood includes its cloud assets, criticality-weighted", () => {
    const items = [
      ci("account", "a1"),
      ci("cloud", "c-db", crit("high")), // a database cloud asset → weight 3
      ci("cloud", "c-net", crit("medium")), // a network cloud asset → weight 2
    ];
    // cloud belongs-to account edges (derived from cloud_asset.account_id, migration 0144).
    const edges = [
      edge(["cloud", "c-db"], ["account", "a1"]),
      edge(["cloud", "c-net"], ["account", "a1"]),
    ];
    const r = analyzeImpact({ ciType: "account", ciId: "a1" }, items, edges);
    expect(r.affected.map((a) => a.ci.ciId).sort()).toEqual(["c-db", "c-net"]);
    expect(r.totalWeight).toBe(5);
    expect(r.peakCriticality).toBe("high");
    const groups = groupByType(r.affected);
    expect(groups.find((g) => g.ciType === "cloud")?.items).toHaveLength(2);
  });
});

describe("groupByType", () => {
  test("groups non-empty types, most-weighted group first", () => {
    const affected: AffectedCi[] = [
      { ci: ci("user", "u1"), hops: 1, criticality: "low", weight: 1 },
      { ci: ci("account", "a1"), hops: 1, criticality: "critical", weight: 4 },
      { ci: ci("account", "a2"), hops: 2, criticality: "high", weight: 3 },
    ];
    const groups = groupByType(affected);
    expect(groups.map((g) => g.ciType)).toEqual(["account", "user"]); // 7 vs 1
    expect(groups[0].weight).toBe(7);
    expect(groups[0].items).toHaveLength(2);
    expect(groups.some((g) => g.ciType === "device")).toBe(false); // empty type omitted
  });
});
