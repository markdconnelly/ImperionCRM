/**
 * Employee expenses overview helpers (ADR-0083, mirrors the timesheet #538 redesign).
 *
 * Pure functions backing the list-first `/expenses` landing: the "needs attention &
 * current" strip, the full reports table, and the bottom lifecycle ledger (Submitted →
 * Admin approved → Finance approved → Reimbursed). No I/O — the page fetches
 * `ExpenseReportRow[]` (self-scoped via `listExpenseReports`) and feeds it here, so the
 * behavior is unit-testable the way the rest of `src/lib/expenses` is. Monthly cadence:
 * one report per employee per calendar month, unlike the weekly timesheet.
 */

import type { ExpenseReportRow, ExpenseReportState } from "@/types";

/** The attested lifecycle, in order — the ledger renders this as a progress track. */
export const LIFECYCLE_STAGES = [
  "submitted",
  "approved",
  "finance_approved",
  "reimbursed",
] as const satisfies readonly ExpenseReportState[];

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** Short human label per state. */
export const STATE_LABEL: Record<ExpenseReportState, string> = {
  open: "Open",
  submitted: "Submitted",
  approved: "Admin approved",
  finance_approved: "Finance approved",
  reimbursed: "Reimbursed",
  rejected: "Rejected",
};

/** A calendar month (1–12). */
export interface Period {
  year: number;
  month: number;
}

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

/** "2026-06" — sortable string key for a period. */
export function periodKey(p: Period): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/** "June 2026". */
export function periodLabel(p: Period): string {
  return `${MONTHS[p.month - 1]} ${p.year}`;
}

/** Parse "YYYY-MM" → Period, or null if malformed / out of range. */
export function parsePeriod(s: string): Period | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(m[1]), month };
}

/** The calendar month containing an ISO date ("YYYY-MM-DD…"). */
export function periodOf(isoDate: string): Period {
  return { year: Number(isoDate.slice(0, 4)), month: Number(isoDate.slice(5, 7)) };
}

function keyOf(r: ExpenseReportRow): string {
  return periodKey({ year: r.periodYear, month: r.periodMonth });
}

/** A current/recent month the employee can open or start a report for. */
export interface OverviewMonth {
  year: number;
  month: number;
  key: string; // "2026-06"
  label: string; // "June 2026"
  isCurrent: boolean; // the month containing `today`
  /** The existing report for this month, or null if not started yet (lazy). */
  report: ExpenseReportRow | null;
}

/**
 * The "needs attention & current" strip: the current month, plus any PAST month whose
 * report is still actionable by the employee — Open (entries in progress, not attested)
 * or Rejected (bounced back, needs fixing + re-attest). Each month carries its report or
 * `null` — past months without an actionable report are never fabricated. Newest first.
 */
export function buildAttentionMonths(today: string, rows: ExpenseReportRow[]): OverviewMonth[] {
  const current = periodOf(today);
  const curKey = periodKey(current);
  const byKey = new Map(rows.map((r) => [keyOf(r), r]));

  const keys = new Set<string>([curKey]);
  for (const r of rows) {
    const k = keyOf(r);
    if ((r.state === "open" || r.state === "rejected") && k < curKey) keys.add(k);
  }

  return [...keys]
    .sort()
    .reverse()
    .map((k) => {
      const p = parsePeriod(k)!;
      return {
        year: p.year,
        month: p.month,
        key: k,
        label: periodLabel(p),
        isCurrent: k === curKey,
        report: byKey.get(k) ?? null,
      };
    });
}

/** A ledger row — an attested report annotated with its stage on the lifecycle track. */
export interface LedgerRow extends ExpenseReportRow {
  /** Index into `LIFECYCLE_STAGES` (0..3). */
  stageIndex: number;
}

/**
 * The bottom "status & reimbursements" ledger: every report the employee has attested
 * (submitted or beyond), newest month first, annotated with its lifecycle stage so the
 * UI can show progress as admins approve, finance approves, and it gets reimbursed.
 * Open and Rejected reports are not here — they live in the attention strip.
 */
export function buildLifecycleLedger(rows: ExpenseReportRow[]): LedgerRow[] {
  return rows
    .filter((r) => r.state !== "open" && r.state !== "rejected")
    .map((r) => ({
      ...r,
      stageIndex: LIFECYCLE_STAGES.indexOf(r.state as LifecycleStage),
    }))
    .sort((a, b) =>
      a.periodYear !== b.periodYear ? b.periodYear - a.periodYear : b.periodMonth - a.periodMonth,
    );
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** USD formatting shared by the overview surfaces. */
export function fmtUsd(n: number): string {
  return usd.format(Number.isFinite(n) ? n : 0);
}
