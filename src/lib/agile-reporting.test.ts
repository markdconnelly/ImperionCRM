import { describe, expect, it } from "vitest";
import {
  averageVelocity,
  buildBurndownSeries,
  commitmentRatio,
  completedEffort,
  totalEffort,
} from "./agile-reporting";
import type { SprintBurndownData, SprintRow, SprintVelocityRow } from "@/types";

function sprint(over: Partial<SprintRow> = {}): SprintRow {
  return {
    id: "sp1",
    name: "Sprint 1",
    projectId: null,
    project: null,
    startsAt: "2026-06-01",
    endsAt: "2026-06-05",
    status: "active",
    taskCount: 0,
    doneCount: 0,
    ...over,
  };
}

function data(over: Partial<SprintBurndownData> = {}): SprintBurndownData {
  return {
    sprint: sprint(),
    tasks: [],
    unit: "points",
    unestimatedCount: 0,
    ...over,
  };
}

describe("agile reporting math (C5, ADR-0066, #345)", () => {
  describe("totals", () => {
    it("totalEffort sums every estimated task", () => {
      const d = data({
        tasks: [
          { estimate: 3, done: true, completedAt: "2026-06-02" },
          { estimate: 5, done: false, completedAt: null },
        ],
      });
      expect(totalEffort(d)).toBe(8);
      expect(completedEffort(d)).toBe(3);
    });
  });

  describe("buildBurndownSeries", () => {
    it("returns empty when the sprint has no window", () => {
      expect(buildBurndownSeries(data({ sprint: sprint({ startsAt: null }) }))).toEqual([]);
      expect(buildBurndownSeries(data({ sprint: sprint({ endsAt: null }) }))).toEqual([]);
    });

    it("returns empty when there is no estimated work", () => {
      expect(buildBurndownSeries(data({ tasks: [] }))).toEqual([]);
    });

    it("draws a straight ideal line from total to zero across the window", () => {
      // 4-day span (Jun 1..5 = 5 points), total 8 → ideal steps 8,6,4,2,0.
      const d = data({
        tasks: [{ estimate: 8, done: false, completedAt: null }],
      });
      // freeze 'today' past the window so every actual point is populated.
      const series = buildBurndownSeries(d, new Date("2026-07-01T00:00:00Z"));
      expect(series.map((p) => p.date)).toEqual([
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
      ]);
      expect(series.map((p) => p.ideal)).toEqual([8, 6, 4, 2, 0]);
      // nothing done → remaining stays at the full total every day.
      expect(series.map((p) => p.remaining)).toEqual([8, 8, 8, 8, 8]);
    });

    it("burns down actual remaining as tasks complete on their completedAt day", () => {
      const d = data({
        tasks: [
          { estimate: 4, done: true, completedAt: "2026-06-02" },
          { estimate: 4, done: true, completedAt: "2026-06-04" },
          { estimate: 2, done: false, completedAt: null },
        ],
      });
      const series = buildBurndownSeries(d, new Date("2026-07-01T00:00:00Z"));
      // total 10; 4 burned by Jun 2, another 4 by Jun 4; 2 never done.
      expect(series.map((p) => p.remaining)).toEqual([10, 6, 6, 2, 2]);
    });

    it("treats a done task with no completion date as completed at sprint start (honest floor)", () => {
      const d = data({
        tasks: [{ estimate: 5, done: true, completedAt: null }],
      });
      const series = buildBurndownSeries(d, new Date("2026-07-01T00:00:00Z"));
      // already burned on day 0 → remaining 0 throughout.
      expect(series.every((p) => p.remaining === 0)).toBe(true);
    });

    it("leaves future days null so the actual line stops at today", () => {
      const d = data({
        tasks: [{ estimate: 8, done: false, completedAt: null }],
      });
      // today is Jun 3 → Jun 4 and Jun 5 are unknown.
      const series = buildBurndownSeries(d, new Date("2026-06-03T12:00:00Z"));
      expect(series.map((p) => p.remaining)).toEqual([8, 8, 8, null, null]);
    });
  });

  describe("velocity", () => {
    const rows: SprintVelocityRow[] = [
      { id: "a", name: "S1", endsAt: "2026-05-15", status: "completed", committedEffort: 20, completedEffort: 18, unit: "points" },
      { id: "b", name: "S2", endsAt: "2026-05-29", status: "completed", committedEffort: 20, completedEffort: 22, unit: "points" },
      { id: "c", name: "S3", endsAt: "2026-06-12", status: "active", committedEffort: 24, completedEffort: 10, unit: "points" },
    ];

    it("averages completed effort over settled sprints only", () => {
      expect(averageVelocity(rows)).toBe(20); // (18+22)/2, excludes the active one
    });

    it("returns null when no sprint has settled", () => {
      expect(averageVelocity([rows[2]])).toBeNull();
    });

    it("commitmentRatio is completed/committed, null when nothing committed", () => {
      expect(commitmentRatio(rows[0])).toBeCloseTo(0.9, 5);
      expect(commitmentRatio({ ...rows[0], committedEffort: 0 })).toBeNull();
    });
  });
});
