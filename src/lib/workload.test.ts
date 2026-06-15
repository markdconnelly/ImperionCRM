import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAPACITY_RATIOS,
  buildWorkloadView,
  classifyAllocation,
} from "./workload";
import type { WorkloadRow } from "@/types";

/**
 * Tests for the workload / capacity classification (ADR-0069 D1/D2, #591). Load is
 * measured in ESTIMATED HOURS (`task.estimate`) classified against each user's own
 * `user_capacity.weekly_hours`, so these exercise the hours-vs-capacity ratios and
 * the view-model build.
 */

const R = DEFAULT_CAPACITY_RATIOS; // over: 1.0, near: 0.8
const CAP = 40; // a 40h/week capacity

describe("classifyAllocation", () => {
  it("flags over-allocation at or above 100% of capacity", () => {
    expect(classifyAllocation(CAP, CAP, 0)).toBe("over"); // exactly at capacity
    expect(classifyAllocation(CAP + 5, CAP, 0)).toBe("over");
  });

  it("flags near-capacity between 80% and 100% of capacity", () => {
    expect(classifyAllocation(R.near * CAP, CAP, 0)).toBe("near"); // 32h
    expect(classifyAllocation(CAP - 1, CAP, 0)).toBe("near"); // 39h
  });

  it("is ok below 80% of capacity", () => {
    expect(classifyAllocation(0, CAP, 0)).toBe("ok");
    expect(classifyAllocation(R.near * CAP - 1, CAP, 0)).toBe("ok"); // 31h
  });

  it("escalates a near user to over when they have overdue work", () => {
    expect(classifyAllocation(R.near * CAP, CAP, 2)).toBe("over"); // 32h + overdue
    // overdue does not promote an otherwise-ok user
    expect(classifyAllocation(R.near * CAP - 1, CAP, 5)).toBe("ok");
  });

  it("treats unset / non-positive capacity as ok (cannot judge)", () => {
    expect(classifyAllocation(100, null, 3)).toBe("ok");
    expect(classifyAllocation(100, 0, 3)).toBe("ok");
  });

  it("honours custom ratios", () => {
    expect(classifyAllocation(30, 40, 0, { over: 0.75, near: 0.5 })).toBe("over"); // 30 ≥ 0.75*40
    expect(classifyAllocation(22, 40, 0, { over: 0.75, near: 0.5 })).toBe("near"); // 22 ≥ 0.5*40
  });
});

describe("buildWorkloadView", () => {
  const rows: WorkloadRow[] = [
    { userId: "u1", name: "Ada", estimatedHours: 44, weeklyHours: 40, openTasks: 9, dueSoon: 4, overdue: 2 },
    { userId: "u2", name: "Grace", estimatedHours: 22, weeklyHours: 40, openTasks: 5, dueSoon: 1, overdue: 0 },
    { userId: "u3", name: "Alan", estimatedHours: 0, weeklyHours: 40, openTasks: 0, dueSoon: 0, overdue: 0 },
  ];

  it("sorts busiest-first (by hours) and keeps idle assignees last", () => {
    const v = buildWorkloadView(rows);
    expect(v.rows.map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);
  });

  it("scales loadPct against the busiest user's hours", () => {
    const v = buildWorkloadView(rows);
    expect(v.rows[0].loadPct).toBe(100); // 44/44
    expect(v.rows[1].loadPct).toBe(50); // 22/44
    expect(v.rows[2].loadPct).toBe(0);
  });

  it("computes totals and the over-allocated count", () => {
    const v = buildWorkloadView(rows);
    expect(v.totalHours).toBe(66);
    expect(v.totalDueSoon).toBe(5);
    expect(v.totalOverdue).toBe(2);
    expect(v.busiest).toBe(44);
    expect(v.overAllocated).toBe(1); // only Ada (44 >= 40)
  });

  it("handles an empty roster without dividing by zero", () => {
    const v = buildWorkloadView([]);
    expect(v.rows).toEqual([]);
    expect(v.busiest).toBe(0);
    expect(v.totalHours).toBe(0);
    expect(v.overAllocated).toBe(0);
  });

  it("classifies a near user with overdue work as over", () => {
    const v = buildWorkloadView([
      { userId: "x", name: "X", estimatedHours: 32, weeklyHours: 40, openTasks: 4, dueSoon: 0, overdue: 1 },
    ]);
    expect(v.rows[0].level).toBe("over");
    expect(v.overAllocated).toBe(1);
  });

  it("does not flag a user whose capacity is unset", () => {
    const v = buildWorkloadView([
      { userId: "y", name: "Y", estimatedHours: 99, weeklyHours: null, openTasks: 8, dueSoon: 0, overdue: 0 },
    ]);
    expect(v.rows[0].level).toBe("ok");
    expect(v.overAllocated).toBe(0);
  });
});
