/**
 * Workload / capacity view — pure classification helpers (ADR-0069 D2, #347).
 *
 * This module is PURE — no `pg`, no `node:*`, no env, no React. It turns the
 * per-user open-task load (the `WorkloadRow` read model) into a sortable,
 * over-allocation-aware view model the page renders. It is unit-tested in
 * isolation (`workload.test.ts`).
 *
 * ## Why task COUNTS, not hours
 * The full D2 acceptance ("a user over capacity in a week is flagged") wants
 * load = open assignments × estimates, compared against `user_capacity.weekly_hours`.
 * Neither input exists yet: `task.estimate` / `task.estimate_unit` and the
 * `user_capacity` table are D1 (#346), which has no migration in this VIEW-lane
 * change. So we render the load that DOES exist — open-task counts per assignee —
 * and classify over-allocation by a task-count threshold. When D1 lands, swap the
 * threshold for true hours-vs-capacity; the read model and page shell stay.
 */

import type { WorkloadRow } from "@/types";

/**
 * Open-task counts above which an assignee is treated as over-/near-allocated,
 * the count-based stand-in for hours-vs-capacity until D1 (#346) lands estimates
 * and `user_capacity`. Deliberately conservative defaults; the page passes them
 * in so a future settings surface can override without touching this module.
 */
export const DEFAULT_WORKLOAD_THRESHOLDS = {
  /** At or above this many open tasks → `over` (red). */
  over: 8,
  /** At or above this many (but below `over`) → `near` (amber). */
  near: 5,
} as const;

export type AllocationLevel = "ok" | "near" | "over";

export interface WorkloadThresholds {
  over: number;
  near: number;
}

/** A `WorkloadRow` plus its derived allocation level and a stable share %. */
export interface WorkloadViewRow extends WorkloadRow {
  level: AllocationLevel;
  /** This user's open tasks as a percentage (0–100) of the busiest user's. */
  loadPct: number;
}

export interface WorkloadView {
  rows: WorkloadViewRow[];
  /** Totals across everyone with at least one open task. */
  totalOpen: number;
  totalDueSoon: number;
  totalOverdue: number;
  /** How many assignees are at the `over` level (the over-allocation count). */
  overAllocated: number;
  /** The largest single open-task count (the bar-scale denominator). */
  busiest: number;
}

/**
 * Classify one assignee's open-task count against the thresholds. An assignee at
 * or over `over` is over-allocated; at or over `near` is approaching capacity;
 * otherwise ok. Overdue work nudges a `near` user to `over` — being behind on
 * already-late tasks is itself an over-allocation signal.
 */
export function classifyAllocation(
  openTasks: number,
  overdue: number,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
): AllocationLevel {
  if (openTasks >= thresholds.over) return "over";
  if (openTasks >= thresholds.near) return overdue > 0 ? "over" : "near";
  return "ok";
}

/**
 * Build the workload view model: sort busiest-first, classify each assignee, and
 * compute totals + a bar-scale denominator. Rows with zero open tasks are kept
 * (an idle assignee is meaningful capacity) but sort last. Pure + deterministic.
 */
export function buildWorkloadView(
  rows: readonly WorkloadRow[],
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
): WorkloadView {
  const busiest = rows.reduce((m, r) => Math.max(m, r.openTasks), 0);
  const viewRows: WorkloadViewRow[] = rows
    .map((r) => ({
      ...r,
      level: classifyAllocation(r.openTasks, r.overdue, thresholds),
      loadPct: busiest > 0 ? Math.round((r.openTasks / busiest) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.openTasks - a.openTasks ||
        b.overdue - a.overdue ||
        a.name.localeCompare(b.name),
    );

  return {
    rows: viewRows,
    totalOpen: rows.reduce((s, r) => s + r.openTasks, 0),
    totalDueSoon: rows.reduce((s, r) => s + r.dueSoon, 0),
    totalOverdue: rows.reduce((s, r) => s + r.overdue, 0),
    overAllocated: viewRows.filter((r) => r.level === "over").length,
    busiest,
  };
}
