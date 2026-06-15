import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  buildWorkloadView,
  classifyAllocation,
} from "./workload";
import type { WorkloadRow } from "@/types";

/**
 * Tests for the workload / capacity classification (ADR-0069 D2, #347). Load is
 * measured in open-task COUNTS (estimates/`user_capacity` are D1, #346), so these
 * exercise the count-threshold over-allocation logic and the view-model build.
 */

const T = DEFAULT_WORKLOAD_THRESHOLDS;

describe("classifyAllocation", () => {
  it("flags over-allocation at or above the over threshold", () => {
    expect(classifyAllocation(T.over, 0)).toBe("over");
    expect(classifyAllocation(T.over + 3, 0)).toBe("over");
  });

  it("flags near-capacity between near and over thresholds", () => {
    expect(classifyAllocation(T.near, 0)).toBe("near");
    expect(classifyAllocation(T.over - 1, 0)).toBe("near");
  });

  it("is ok below the near threshold", () => {
    expect(classifyAllocation(0, 0)).toBe("ok");
    expect(classifyAllocation(T.near - 1, 0)).toBe("ok");
  });

  it("escalates a near user to over when they have overdue work", () => {
    expect(classifyAllocation(T.near, 2)).toBe("over");
    // overdue does not promote an otherwise-ok user
    expect(classifyAllocation(T.near - 1, 5)).toBe("ok");
  });

  it("honours custom thresholds", () => {
    expect(classifyAllocation(3, 0, { over: 3, near: 2 })).toBe("over");
    expect(classifyAllocation(2, 0, { over: 3, near: 2 })).toBe("near");
  });
});

describe("buildWorkloadView", () => {
  const rows: WorkloadRow[] = [
    { userId: "u1", name: "Ada", openTasks: 10, dueSoon: 4, overdue: 2 },
    { userId: "u2", name: "Grace", openTasks: 5, dueSoon: 1, overdue: 0 },
    { userId: "u3", name: "Alan", openTasks: 0, dueSoon: 0, overdue: 0 },
  ];

  it("sorts busiest-first and keeps idle assignees last", () => {
    const v = buildWorkloadView(rows);
    expect(v.rows.map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);
  });

  it("scales loadPct against the busiest user", () => {
    const v = buildWorkloadView(rows);
    expect(v.rows[0].loadPct).toBe(100); // 10/10
    expect(v.rows[1].loadPct).toBe(50); // 5/10
    expect(v.rows[2].loadPct).toBe(0);
  });

  it("computes totals and the over-allocated count", () => {
    const v = buildWorkloadView(rows);
    expect(v.totalOpen).toBe(15);
    expect(v.totalDueSoon).toBe(5);
    expect(v.totalOverdue).toBe(2);
    expect(v.busiest).toBe(10);
    expect(v.overAllocated).toBe(1); // only Ada (10 >= over)
  });

  it("handles an empty roster without dividing by zero", () => {
    const v = buildWorkloadView([]);
    expect(v.rows).toEqual([]);
    expect(v.busiest).toBe(0);
    expect(v.totalOpen).toBe(0);
    expect(v.overAllocated).toBe(0);
  });

  it("classifies a near user with overdue work as over", () => {
    const v = buildWorkloadView([
      { userId: "x", name: "X", openTasks: T.near, dueSoon: 0, overdue: 1 },
    ]);
    expect(v.rows[0].level).toBe("over");
    expect(v.overAllocated).toBe(1);
  });
});
