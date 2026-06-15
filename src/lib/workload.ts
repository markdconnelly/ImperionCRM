/**
 * Workload / capacity view — pure classification helpers (ADR-0069 D1/D2, #591).
 *
 * This module is PURE — no `pg`, no `node:*`, no env, no React. It turns the
 * per-user load (the `WorkloadRow` read model) into a sortable, over-allocation-
 * aware view model the page renders. It is unit-tested in isolation
 * (`workload.test.ts`).
 *
 * ## Hours, against per-user capacity (#591)
 * Load is the SUM of estimated hours (`task.estimate` where the unit is hours)
 * over a user's open, in-range tasks, and over-allocation is classified against
 * that user's own `user_capacity.weekly_hours` (the D1 inputs the #346/#580 heavy
 * lane authored this wave). This replaces the earlier count-with-a-flat-threshold
 * stand-in (#347): the bucketing + verdict math here are unchanged in shape — only
 * the UNIT (hours, not task counts) and the THRESHOLD source (each user's weekly
 * capacity, not one flat number) changed, exactly as #591 specified.
 *
 * A user with no capacity row set has `weeklyHours = null`; we cannot judge them
 * over/under capacity, so they classify `ok` (unknown capacity is not a flag) and
 * the surface nudges an admin to set their weekly hours.
 */

import type { WorkloadRow } from "@/types";

/**
 * Fractions of a user's weekly capacity at/above which they are treated as
 * over-/near-allocated. Per-user capacity replaces the old flat task-count
 * threshold (#347 → #591): `over` at ≥100% of capacity, `near` at ≥80%. The page
 * passes them so a future settings surface can override without touching this
 * module.
 */
export const DEFAULT_CAPACITY_RATIOS = {
  /** At or above this fraction of weekly capacity → `over` (red). */
  over: 1.0,
  /** At or above this fraction (but below `over`) → `near` (amber). */
  near: 0.8,
} as const;

export type AllocationLevel = "ok" | "near" | "over";

export interface CapacityRatios {
  over: number;
  near: number;
}

/** A `WorkloadRow` plus its derived allocation level and a stable share %. */
export interface WorkloadViewRow extends WorkloadRow {
  level: AllocationLevel;
  /** This user's estimated hours as a percentage (0–100) of the busiest user's. */
  loadPct: number;
}

export interface WorkloadView {
  rows: WorkloadViewRow[];
  /** Total estimated hours across everyone in range. */
  totalHours: number;
  totalDueSoon: number;
  totalOverdue: number;
  /** How many assignees are at the `over` level (the over-allocation count). */
  overAllocated: number;
  /** The largest single estimated-hours load (the bar-scale denominator). */
  busiest: number;
}

/**
 * Classify one assignee's estimated hours against their own weekly capacity. At
 * or over `over × weeklyHours` they are over-allocated; at or over `near ×
 * weeklyHours` they are approaching capacity; otherwise ok. Overdue work nudges a
 * `near` user to `over` — being behind on already-late tasks is itself an
 * over-allocation signal. A user with no capacity set (`weeklyHours == null`, or
 * ≤ 0) cannot be judged, so they classify `ok`.
 */
export function classifyAllocation(
  estimatedHours: number,
  weeklyHours: number | null,
  overdue: number,
  ratios: CapacityRatios = DEFAULT_CAPACITY_RATIOS,
): AllocationLevel {
  if (weeklyHours == null || weeklyHours <= 0) return "ok";
  if (estimatedHours >= ratios.over * weeklyHours) return "over";
  if (estimatedHours >= ratios.near * weeklyHours) return overdue > 0 ? "over" : "near";
  return "ok";
}

/**
 * Build the workload view model: sort busiest-first, classify each assignee, and
 * compute totals + a bar-scale denominator. Rows with zero estimated hours are
 * kept (an idle assignee is meaningful capacity) but sort last. Pure +
 * deterministic.
 */
export function buildWorkloadView(
  rows: readonly WorkloadRow[],
  ratios: CapacityRatios = DEFAULT_CAPACITY_RATIOS,
): WorkloadView {
  const busiest = rows.reduce((m, r) => Math.max(m, r.estimatedHours), 0);
  const viewRows: WorkloadViewRow[] = rows
    .map((r) => ({
      ...r,
      level: classifyAllocation(r.estimatedHours, r.weeklyHours, r.overdue, ratios),
      loadPct: busiest > 0 ? Math.round((r.estimatedHours / busiest) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.estimatedHours - a.estimatedHours ||
        b.overdue - a.overdue ||
        a.name.localeCompare(b.name),
    );

  return {
    rows: viewRows,
    totalHours: rows.reduce((s, r) => s + r.estimatedHours, 0),
    totalDueSoon: rows.reduce((s, r) => s + r.dueSoon, 0),
    totalOverdue: rows.reduce((s, r) => s + r.overdue, 0),
    overAllocated: viewRows.filter((r) => r.level === "over").length,
    busiest,
  };
}
