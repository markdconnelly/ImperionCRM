import { describe, expect, it } from "vitest";
import {
  accuracyPct,
  buildForecastAccuracyView,
  daysBetween,
} from "./forecast-accuracy";
import type { ForecastSnapshotRow } from "@/types";

function snap(over: Partial<ForecastSnapshotRow>): ForecastSnapshotRow {
  return {
    id: "s",
    capturedOn: "2026-01-01",
    ownerUserId: "owner-1",
    ownerName: "Avery",
    team: null,
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    weighted: 0,
    commitTotal: 0,
    bestCaseTotal: 0,
    pipelineTotal: 0,
    closedWon: 0,
    quota: 10000,
    ...over,
  };
}

describe("daysBetween", () => {
  it("counts whole days b − a", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
  });
  it("is negative when b precedes a", () => {
    expect(daysBetween("2026-03-31", "2026-01-01")).toBeLessThan(0);
  });
  it("returns 0 on unparseable input", () => {
    expect(daysBetween("nope", "2026-01-01")).toBe(0);
  });
});

describe("accuracyPct", () => {
  it("is 1 for a perfect call", () => {
    expect(accuracyPct(100, 100)).toBe(1);
  });
  it("is 1 − |error|/realised for a miss", () => {
    expect(accuracyPct(120, 100)).toBeCloseTo(0.8); // 20% over
    expect(accuracyPct(80, 100)).toBeCloseTo(0.8); // 20% under — same magnitude
  });
  it("clamps a wild over-forecast to 0, never negative", () => {
    expect(accuracyPct(300, 100)).toBe(0);
  });
  it("is null when realised is 0 (no divide-by-zero)", () => {
    expect(accuracyPct(50, 0)).toBeNull();
  });
});

describe("buildForecastAccuracyView", () => {
  // One settled period: three earlier calls + a settling snapshot whose closed_won
  // (12,000) is the realised actual.
  const settled: ForecastSnapshotRow[] = [
    snap({ id: "a", capturedOn: "2026-01-31", weighted: 15000, commitTotal: 9000 }),
    snap({ id: "b", capturedOn: "2026-02-28", weighted: 13500, commitTotal: 11000 }),
    snap({ id: "c", capturedOn: "2026-03-15", weighted: 12000, commitTotal: 11800 }),
    snap({ id: "settle", capturedOn: "2026-04-01", weighted: 12000, commitTotal: 12000, closedWon: 12000 }),
  ];

  it("grades only the earlier calls, not the settling snapshot", () => {
    const view = buildForecastAccuracyView(settled);
    expect(view.summary.settledPeriods).toBe(1);
    expect(view.summary.gradedCalls).toBe(3); // settling snapshot is the actual, not graded
  });

  it("uses the settling snapshot's closed_won as the realised actual for every call", () => {
    const view = buildForecastAccuracyView(settled);
    expect(view.points.every((p) => p.realised === 12000)).toBe(true);
  });

  it("orders trend points oldest capture first", () => {
    const view = buildForecastAccuracyView(settled);
    expect(view.points.map((p) => p.capturedOn)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-15",
    ]);
  });

  it("computes signed variance (forecast − realised)", () => {
    const view = buildForecastAccuracyView(settled);
    const first = view.points[0]; // weighted 15000 vs 12000 realised
    expect(first.variance).toBe(3000);
    expect(first.accuracyPct).toBeCloseTo(0.75); // 1 − 3000/12000
    expect(first.leadDays).toBe(daysBetween("2026-01-31", "2026-03-31"));
  });

  it("grades against the commit basis when asked", () => {
    const view = buildForecastAccuracyView(settled, "commit");
    // commit calls 9000 / 11000 / 11800 vs realised 12000
    expect(view.points.map((p) => p.forecast)).toEqual([9000, 11000, 11800]);
  });

  it("excludes a period with no settling snapshot (not yet settled)", () => {
    // All snapshots captured BEFORE the period ends → nothing realised → no grading.
    const open: ForecastSnapshotRow[] = [
      snap({ id: "x", capturedOn: "2026-01-31", weighted: 15000 }),
      snap({ id: "y", capturedOn: "2026-02-28", weighted: 13500 }),
    ];
    const view = buildForecastAccuracyView(open);
    expect(view.summary.settledPeriods).toBe(0);
    expect(view.summary.gradedCalls).toBe(0);
    expect(view.points).toEqual([]);
  });

  it("separates owner-scoped and team-scoped series of the same period", () => {
    const mixed: ForecastSnapshotRow[] = [
      // owner series, settled at 10,000
      snap({ id: "o1", capturedOn: "2026-02-28", weighted: 12000 }),
      snap({ id: "o-settle", capturedOn: "2026-04-01", closedWon: 10000 }),
      // team series, settled at 20,000
      snap({ id: "t1", ownerUserId: null, ownerName: null, team: "West", capturedOn: "2026-02-28", weighted: 25000 }),
      snap({ id: "t-settle", ownerUserId: null, ownerName: null, team: "West", capturedOn: "2026-04-01", closedWon: 20000 }),
    ];
    const view = buildForecastAccuracyView(mixed);
    expect(view.hasOwnerDimension).toBe(true);
    expect(view.summary.settledPeriods).toBe(2);
    const owner = view.points.find((p) => p.scope === "owner");
    const team = view.points.find((p) => p.scope === "team");
    expect(owner?.realised).toBe(10000);
    expect(team?.realised).toBe(20000);
    expect(team?.target).toBe("West");
  });

  it("reports meanVariance bias and meanAbsVariance miss size", () => {
    const view = buildForecastAccuracyView(settled);
    // variances: +3000, +1500, 0 → mean +1500 (over-forecasts), absMean 1500
    expect(view.summary.meanVariance).toBeCloseTo(1500);
    expect(view.summary.meanAbsVariance).toBeCloseTo(1500);
  });

  it("flags no owner dimension when every snapshot is team-scoped", () => {
    const teamOnly: ForecastSnapshotRow[] = [
      snap({ id: "t", ownerUserId: null, ownerName: null, team: "West", capturedOn: "2026-02-28", weighted: 9000 }),
      snap({ id: "ts", ownerUserId: null, ownerName: null, team: "West", capturedOn: "2026-04-01", closedWon: 10000 }),
    ];
    const view = buildForecastAccuracyView(teamOnly);
    expect(view.hasOwnerDimension).toBe(false);
  });
});
