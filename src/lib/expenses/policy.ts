/**
 * Expense policy hard-gate helper (ADR-0083, #486) — the server-side attest gate that
 * mirrors the timesheet `hasHardDeviation` helper. A report cannot be attested while any
 * of its out-of-pocket items trips a HARD policy rule; soft rules only nudge.
 *
 * This is the deterministic, per-item subset of the `expense_policy_violation` view
 * (migration 0090) computed in TypeScript so the attest action can block without a round
 * trip and the surfaces can highlight the offending items. The three hard rules the issue
 * specifies (and the view encodes) are:
 *   • missing_receipt    — an out-of-pocket item with no receipt (mileage is exempt).
 *   • over_category_cap  — amount over the item's category hard cap.
 *   • dated_outside_month — item dated outside the report's calendar month (incl. future).
 *
 * Pure, no I/O — the caller passes the items, the report period, and a category hard-cap
 * lookup (resolved from `listExpenseCategories`), so it is unit-testable like the rest of
 * `src/lib/expenses`. Comp-free: it never sees the mileage rate.
 */

import type { ExpenseItemRow } from "@/types";

/** The report's calendar month an item is checked against. */
export interface ReportPeriod {
  year: number;
  month: number; // 1–12
}

/**
 * Hard cap per category, keyed by the category's `displayName` (the field
 * `ExpenseItemRow` carries). A missing entry / null means "no cap" for that category.
 */
export type CategoryHardCaps = Map<string, number | null>;

/** Is the item dated within the report's calendar month? */
function isInPeriod(itemDate: string, period: ReportPeriod): boolean {
  const year = Number(itemDate.slice(0, 4));
  const month = Number(itemDate.slice(5, 7));
  return year === period.year && month === period.month;
}

/**
 * Does a single item trip a HARD policy rule? Out-of-pocket items must have a receipt
 * and stay within the category hard cap; every item must be dated within the report
 * month. Mileage items are receipt-exempt (their $ is backend-derived) but still must
 * fall in the month. Mirrors the `expense_policy_violation` hard rows.
 */
export function itemHasHardViolation(
  item: ExpenseItemRow,
  period: ReportPeriod,
  caps: CategoryHardCaps = new Map(),
): boolean {
  // dated_outside_month (covers future_dated too — a future date is outside the month).
  if (!isInPeriod(item.itemDate, period)) return true;
  if (item.kind === "out_of_pocket") {
    // missing_receipt — out-of-pocket only (mileage is exempt).
    if (!item.hasReceipt) return true;
    // over_category_cap — only when the category carries a hard cap.
    const cap = item.categoryName ? caps.get(item.categoryName) : null;
    if (cap != null && item.amount > cap) return true;
  }
  return false;
}

/**
 * Does the report have ANY hard violation across its items? This is the attest gate —
 * the submit action calls it (server-side) and refuses while it is true, exactly as the
 * timesheet attest refuses while `hasHardDeviation` is true. An empty report is clean.
 */
export function hasHardViolation(
  items: ExpenseItemRow[],
  period: ReportPeriod,
  caps: CategoryHardCaps = new Map(),
): boolean {
  return items.some((i) => itemHasHardViolation(i, period, caps));
}
