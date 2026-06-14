/**
 * Admin expense lifecycle helpers (ADR-0083, mirrors timesheet #539).
 *
 * Pure filtering, sorting, and counting over the unified `AdminExpenseRow[]` feed
 * (every report, every state, every employee). The admin surface reads the feed once
 * via `listAllExpenseReports()` and applies these in memory — so the behavior is
 * unit-testable and identical across the postgres and mock repositories. Comp-free:
 * these never see pay/comp data (the feed doesn't carry it).
 */

import { periodKey, STATE_LABEL } from "@/lib/expenses/overview";
import type { AdminExpenseRow, ExpenseReportState } from "@/types";

export { STATE_LABEL };

/** Lifecycle states in order — drives the state filter + the state sort. */
export const STATE_ORDER = [
  "open",
  "submitted",
  "approved",
  "finance_approved",
  "reimbursed",
  "rejected",
] as const satisfies readonly ExpenseReportState[];

export type AdminStateFilter = ExpenseReportState | "all";
export type AdminSortKey = "period" | "employee" | "state" | "total";
export type SortDir = "asc" | "desc";

export interface AdminFilters {
  /** Case-insensitive substring match on employee name. */
  q?: string;
  /** Lifecycle state, or "all". */
  state?: AdminStateFilter;
  /** Inclusive period lower bound ("YYYY-MM"). */
  from?: string;
  /** Inclusive period upper bound ("YYYY-MM"). */
  to?: string;
  sort?: AdminSortKey;
  dir?: SortDir;
}

const DEFAULT_SORT: AdminSortKey = "period";
const DEFAULT_DIR: SortDir = "desc";

function keyOf(r: AdminExpenseRow): string {
  return periodKey({ year: r.periodYear, month: r.periodMonth });
}

function stateIndex(s: ExpenseReportState): number {
  return STATE_ORDER.indexOf(s);
}

/** Comparator for a sort key (ascending); callers flip for descending. */
function compare(a: AdminExpenseRow, b: AdminExpenseRow, key: AdminSortKey): number {
  switch (key) {
    case "employee":
      return a.employeeName.localeCompare(b.employeeName) || keyOf(a).localeCompare(keyOf(b));
    case "state":
      return stateIndex(a.state) - stateIndex(b.state) || keyOf(a).localeCompare(keyOf(b));
    case "total":
      return a.totalAmount - b.totalAmount || keyOf(a).localeCompare(keyOf(b));
    case "period":
    default:
      return keyOf(a).localeCompare(keyOf(b)) || a.employeeName.localeCompare(b.employeeName);
  }
}

/**
 * Filter then sort the lifecycle feed. Filtering and sorting are independent — an
 * empty/`"all"` filter passes everything through. Sorting is stable on a secondary key
 * (period / name) so equal primaries keep a deterministic order. Returns a new array;
 * the input is never mutated.
 */
export function filterSortAdminExpenses(
  rows: AdminExpenseRow[],
  filters: AdminFilters = {},
): AdminExpenseRow[] {
  const q = filters.q?.trim().toLowerCase();
  const state = filters.state ?? "all";
  const sort = filters.sort ?? DEFAULT_SORT;
  const dir = filters.dir ?? DEFAULT_DIR;

  const filtered = rows.filter((r) => {
    if (q && !r.employeeName.toLowerCase().includes(q)) return false;
    if (state !== "all" && r.state !== state) return false;
    if (filters.from && keyOf(r) < filters.from) return false;
    if (filters.to && keyOf(r) > filters.to) return false;
    return true;
  });

  const sign = dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => sign * compare(a, b, sort));
}

/** Count of reports per lifecycle state across the (unfiltered) feed — for the filter chips. */
export function adminStateCounts(rows: AdminExpenseRow[]): Record<AdminStateFilter, number> {
  const counts = {
    all: rows.length,
    open: 0,
    submitted: 0,
    approved: 0,
    finance_approved: 0,
    reimbursed: 0,
    rejected: 0,
  } as Record<AdminStateFilter, number>;
  for (const r of rows) counts[r.state] += 1;
  return counts;
}
