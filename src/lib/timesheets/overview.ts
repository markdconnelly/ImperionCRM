/**
 * Employee timesheets overview helpers (ADR-0082, #538).
 *
 * Pure, UTC-safe functions backing the list-first `/timesheets` landing: the
 * "active & upcoming" strip, the full weeks table, and the bottom lifecycle
 * ledger (Submitted → Approved → Payroll approved → Paid). No I/O — the page
 * fetches `TimesheetRow[]` (self-scoped via `listTimesheets`) and feeds it here,
 * so the behavior is unit-testable the way the rest of `src/lib/timesheets` is.
 */

import { addDays, mondayOf, weekLabel } from "@/lib/week";
import type { TimesheetRow, TimesheetState } from "@/types";

/** The attested lifecycle, in order — the ledger renders this as a progress track. */
export const LIFECYCLE_STAGES = [
  "submitted",
  "approved",
  "payroll_approved",
  "paid",
] as const satisfies readonly TimesheetState[];

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** Short human label per state. */
export const STATE_LABEL: Record<TimesheetState, string> = {
  open: "Open",
  submitted: "Submitted",
  approved: "Admin approved",
  payroll_approved: "Finance approved",
  paid: "Paid",
};

/** A current/near week the employee can open or start. */
export interface OverviewWeek {
  weekStart: string; // yyyy-mm-dd (Monday)
  weekEnd: string; // yyyy-mm-dd (Sunday)
  label: string; // "Jun 8 – Jun 14, 2026"
  isCurrent: boolean; // the week containing `today`
  /** The existing sheet for this week, or null if not started yet (lazy). */
  sheet: TimesheetRow | null;
}

/**
 * The "active & upcoming" strip: any still-open sheet from a PAST week (started
 * but not yet attested — needs attention), plus the current week and the next
 * `ahead` weeks. Each week carries its existing sheet or `null` — absent weeks are
 * never fabricated, so the employee is offered a create button but is not forced to
 * make weeks early (Mark's UX). Ascending by week.
 */
export function buildActiveUpcoming(
  today: string,
  rows: TimesheetRow[],
  ahead = 1,
): OverviewWeek[] {
  const byWeek = new Map(rows.map((r) => [r.weekStart, r]));
  const current = mondayOf(today);

  const weeks = new Set<string>();
  // Past weeks still Open (entries possibly started, not attested) — surface them.
  for (const r of rows) {
    if (r.state === "open" && r.weekStart < current) weeks.add(r.weekStart);
  }
  // Current + the next `ahead` weeks.
  for (let i = 0; i <= ahead; i++) weeks.add(addDays(current, i * 7));

  return [...weeks]
    .sort()
    .map((weekStart) => ({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      label: weekLabel(weekStart),
      isCurrent: weekStart === current,
      sheet: byWeek.get(weekStart) ?? null,
    }));
}

/** A ledger row — an attested sheet annotated with its stage on the lifecycle track. */
export interface LedgerRow extends TimesheetRow {
  /** Index into `LIFECYCLE_STAGES` (0..3). */
  stageIndex: number;
}

/**
 * The bottom "status & payments" ledger: every sheet the employee has attested
 * (submitted or beyond), newest week first, annotated with its lifecycle stage so
 * the UI can show progress as admins approve, finance approves, and it gets paid.
 */
export function buildLifecycleLedger(rows: TimesheetRow[]): LedgerRow[] {
  return rows
    .filter((r) => r.state !== "open")
    .map((r) => ({
      ...r,
      stageIndex: LIFECYCLE_STAGES.indexOf(r.state as LifecycleStage),
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : a.weekStart > b.weekStart ? -1 : 0));
}

/** Minutes → "8h 0m" (shared by the overview surfaces). */
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}
