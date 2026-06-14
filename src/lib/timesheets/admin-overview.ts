/**
 * Admin timesheet lifecycle helpers (ADR-0082, #539).
 *
 * Pure filtering, sorting, and counting over the unified `AdminTimesheetRow[]` feed
 * (every sheet, every state, every employee). The admin surface reads the feed once
 * via `listAllTimesheets()` and applies these in memory — so the behavior is
 * unit-testable and identical across the postgres and mock repositories. Comp-free:
 * these never see Pay Rate (the feed doesn't carry it).
 */

import type { AdminTimesheetRow, TimesheetState } from "@/types";

/** Lifecycle states in order — drives the state filter + the state sort. */
export const STATE_ORDER = [
  "open",
  "submitted",
  "approved",
  "payroll_approved",
  "paid",
] as const satisfies readonly TimesheetState[];

export const STATE_LABEL: Record<TimesheetState, string> = {
  open: "Open",
  submitted: "Submitted",
  approved: "Admin approved",
  payroll_approved: "Finance approved",
  paid: "Paid",
};

export type AdminStateFilter = TimesheetState | "all";
export type AdminSortKey = "week" | "employee" | "state" | "attended";
export type SortDir = "asc" | "desc";

export interface AdminFilters {
  /** Case-insensitive substring match on employee name. */
  q?: string;
  /** Lifecycle state, or "all". */
  state?: AdminStateFilter;
  /** Inclusive week-start lower bound (yyyy-mm-dd). */
  from?: string;
  /** Inclusive week-start upper bound (yyyy-mm-dd). */
  to?: string;
  sort?: AdminSortKey;
  dir?: SortDir;
}

const DEFAULT_SORT: AdminSortKey = "week";
const DEFAULT_DIR: SortDir = "desc";

function stateIndex(s: TimesheetState): number {
  return STATE_ORDER.indexOf(s);
}

/** Comparator for a sort key (ascending); callers flip for descending. */
function compare(a: AdminTimesheetRow, b: AdminTimesheetRow, key: AdminSortKey): number {
  switch (key) {
    case "employee":
      return a.employeeName.localeCompare(b.employeeName) || a.weekStart.localeCompare(b.weekStart);
    case "state":
      return stateIndex(a.state) - stateIndex(b.state) || a.weekStart.localeCompare(b.weekStart);
    case "attended":
      return a.attendedMinutes - b.attendedMinutes || a.weekStart.localeCompare(b.weekStart);
    case "week":
    default:
      return a.weekStart.localeCompare(b.weekStart) || a.employeeName.localeCompare(b.employeeName);
  }
}

/**
 * Filter then sort the lifecycle feed. Filtering and sorting are independent — an
 * empty/`"all"` filter passes everything through. Sorting is stable on a secondary
 * key (week / name) so equal primaries keep a deterministic order. Returns a new
 * array; the input is never mutated.
 */
export function filterSortAdminTimesheets(
  rows: AdminTimesheetRow[],
  filters: AdminFilters = {},
): AdminTimesheetRow[] {
  const q = filters.q?.trim().toLowerCase();
  const state = filters.state ?? "all";
  const sort = filters.sort ?? DEFAULT_SORT;
  const dir = filters.dir ?? DEFAULT_DIR;

  const filtered = rows.filter((r) => {
    if (q && !r.employeeName.toLowerCase().includes(q)) return false;
    if (state !== "all" && r.state !== state) return false;
    if (filters.from && r.weekStart < filters.from) return false;
    if (filters.to && r.weekStart > filters.to) return false;
    return true;
  });

  const sign = dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => sign * compare(a, b, sort));
}

/** Count of sheets per lifecycle state across the (unfiltered) feed — for the filter chips. */
export function adminStateCounts(rows: AdminTimesheetRow[]): Record<AdminStateFilter, number> {
  const counts = {
    all: rows.length,
    open: 0,
    submitted: 0,
    approved: 0,
    payroll_approved: 0,
    paid: 0,
  } as Record<AdminStateFilter, number>;
  for (const r of rows) counts[r.state] += 1;
  return counts;
}

/** Minutes → "8h 0m". */
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}
