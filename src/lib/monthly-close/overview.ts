/**
 * Unified Monthly Close helpers (ADR-0083 #491, amends ADR-0082).
 *
 * Pure filtering, sorting, counting, and per-leg status derivation over the
 * all-employees `AdminMonthlyCloseRow[]` feed (the comp-free `monthly_close` view, one
 * row per employee per month, joined to the employee name). The finance surface reads
 * the feed once via `listAllMonthlyClose()` and applies these in memory — so the
 * behavior is unit-testable and identical across the postgres and mock repositories.
 *
 * Comp-free throughout: the feed carries minutes + dollar amounts only, never a pay or
 * mileage rate (expected pay = hours × rate stays in the backend, the sole comp reader).
 * The two legs are independent: the time leg pays the wage (per weekly timesheet, rolled
 * up by month here), the expense leg reimburses out-of-pocket (a separate AP bill). Each
 * has its own QuickBooks read-back status.
 */

import type { AdminMonthlyCloseRow, ExpenseReportState } from "@/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-06" — sortable string key for an employee-month. */
export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "June 2026". */
export function periodLabel(year: number, month: number): string {
  return `${MONTHS[month - 1] ?? "?"} ${year}`;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** USD formatting (defensive against NaN/Infinity). */
export function fmtUsd(n: number): string {
  return usd.format(Number.isFinite(n) ? n : 0);
}

/** Approved time minutes as decimal hours, e.g. "12.50h". */
export function fmtHours(minutes: number): string {
  return `${((Number.isFinite(minutes) ? minutes : 0) / 60).toFixed(2)}h`;
}

/**
 * The status of one leg of the close, derived from the view fields:
 * - `none`     — nothing on this leg this month (no timesheet / no reimbursable expense).
 * - `open`     — an obligation is authorized but not yet confirmed paid (the work to do).
 * - `pending`  — work exists but isn't yet finance-approved (upstream, not finance's queue).
 * - `mismatch` — the backend reconciliation found a QuickBooks discrepancy that blocks the
 *                auto-flip to Paid / Reimbursed (an exception finance must resolve).
 * - `settled`  — confirmed paid / reimbursed (matched read-back of the QuickBooks payment).
 */
export type LegStatus = "none" | "open" | "pending" | "mismatch" | "settled";

/**
 * The time leg's status for one close row. Time pays per weekly timesheet, rolled up by
 * month: `settled` only when every counted timesheet is paid; `open` while an obligation
 * is outstanding; `none` when no timesheet falls in the month.
 */
export function timeLegStatus(r: AdminMonthlyCloseRow): LegStatus {
  if (r.timesheetCount === 0) return "none";
  if (r.paidCount >= r.timesheetCount) return "settled";
  if (r.timeObligationOpen) return "open";
  return "pending";
}

/**
 * The expense leg's status for one close row. Expense reimburses per monthly report
 * (1:1 with the close row): a `mismatch` recon verdict surfaces as a blocking exception;
 * a `reimbursed` report is `settled`; a finance-approved report is the `open` obligation;
 * anything earlier is `pending`; no report at all is `none`.
 */
export function expenseLegStatus(r: AdminMonthlyCloseRow): LegStatus {
  if (r.expenseReportId === null) return "none";
  if (r.expenseState === "reimbursed") return "settled";
  if (r.reimbursementVerdict === "mismatch") return "mismatch";
  if (r.expenseObligationOpen) return "open"; // finance_approved, awaiting confirmation
  return "pending";
}

/** Whether the close row carries an exception that blocks an auto-flip (a recon mismatch). */
export function hasException(r: AdminMonthlyCloseRow): boolean {
  return expenseLegStatus(r) === "mismatch";
}

/** Whether either leg has an outstanding obligation finance still needs to act on. */
export function hasOpenObligation(r: AdminMonthlyCloseRow): boolean {
  return r.timeObligationOpen || r.expenseObligationOpen;
}

// ── Filtering + sorting ─────────────────────────────────────────────────────

export type CloseFilter = "all" | "open" | "exceptions" | "settled";
export type SortKey = "period" | "employee" | "time" | "expense";
export type SortDir = "asc" | "desc";

export interface Filters {
  /** Case-insensitive substring match on employee name. */
  q?: string;
  /** Coarse close-status bucket. */
  bucket?: CloseFilter;
  /** Inclusive period lower bound ("YYYY-MM"). */
  from?: string;
  /** Inclusive period upper bound ("YYYY-MM"). */
  to?: string;
  sort?: SortKey;
  dir?: SortDir;
}

const DEFAULT_SORT: SortKey = "period";
const DEFAULT_DIR: SortDir = "desc";

function keyOf(r: AdminMonthlyCloseRow): string {
  return periodKey(r.periodYear, r.periodMonth);
}

/** Whether a row is fully settled — both legs either settled or absent (nothing owed). */
export function isSettled(r: AdminMonthlyCloseRow): boolean {
  const t = timeLegStatus(r);
  const e = expenseLegStatus(r);
  const legSettled = (s: LegStatus) => s === "settled" || s === "none";
  return legSettled(t) && legSettled(e) && (t === "settled" || e === "settled");
}

function inBucket(r: AdminMonthlyCloseRow, bucket: CloseFilter): boolean {
  switch (bucket) {
    case "open":
      return hasOpenObligation(r);
    case "exceptions":
      return hasException(r);
    case "settled":
      return isSettled(r);
    case "all":
    default:
      return true;
  }
}

function compare(a: AdminMonthlyCloseRow, b: AdminMonthlyCloseRow, key: SortKey): number {
  switch (key) {
    case "employee":
      return a.employeeName.localeCompare(b.employeeName) || keyOf(a).localeCompare(keyOf(b));
    case "time":
      return a.approvedTimeMinutes - b.approvedTimeMinutes || keyOf(a).localeCompare(keyOf(b));
    case "expense":
      return a.reimbursableTotal - b.reimbursableTotal || keyOf(a).localeCompare(keyOf(b));
    case "period":
    default:
      return keyOf(a).localeCompare(keyOf(b)) || a.employeeName.localeCompare(b.employeeName);
  }
}

/**
 * Filter then sort the Monthly Close feed. Filtering and sorting are independent — an
 * empty/`"all"` filter passes everything through. Sorting is stable on a secondary key
 * (period / name) so equal primaries keep a deterministic order. Returns a new array;
 * the input is never mutated.
 */
export function filterSortClose(
  rows: AdminMonthlyCloseRow[],
  filters: Filters = {},
): AdminMonthlyCloseRow[] {
  const q = filters.q?.trim().toLowerCase();
  const bucket = filters.bucket ?? "all";
  const sort = filters.sort ?? DEFAULT_SORT;
  const dir = filters.dir ?? DEFAULT_DIR;

  const filtered = rows.filter((r) => {
    if (q && !r.employeeName.toLowerCase().includes(q)) return false;
    if (filters.from && keyOf(r) < filters.from) return false;
    if (filters.to && keyOf(r) > filters.to) return false;
    return inBucket(r, bucket);
  });

  const sign = dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => sign * compare(a, b, sort));
}

/** Counts per coarse bucket across the (unfiltered) feed — drives the filter chips. */
export function bucketCounts(rows: AdminMonthlyCloseRow[]): Record<CloseFilter, number> {
  const counts: Record<CloseFilter, number> = { all: rows.length, open: 0, exceptions: 0, settled: 0 };
  for (const r of rows) {
    if (hasOpenObligation(r)) counts.open += 1;
    if (hasException(r)) counts.exceptions += 1;
    if (isSettled(r)) counts.settled += 1;
  }
  return counts;
}

/** Short human label per expense-report state (for the expense-leg badge). */
export const EXPENSE_STATE_LABEL: Record<ExpenseReportState, string> = {
  open: "Open",
  submitted: "Submitted",
  approved: "Admin approved",
  finance_approved: "Finance approved",
  reimbursed: "Reimbursed",
  rejected: "Rejected",
};
