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

import type { ExpenseCategoryRow, ExpenseItemRow } from "@/types";

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

/** The three HARD rules an item can trip (the `expense_policy_violation` hard rows). */
export type HardViolationReason = "dated_outside_month" | "missing_receipt" | "over_category_cap";

/** Short, employee/admin-facing label per hard rule — shared by the surfaces that flag rows. */
export const HARD_VIOLATION_LABEL: Record<HardViolationReason, string> = {
  missing_receipt: "Missing receipt",
  over_category_cap: "Over category cap",
  dated_outside_month: "Dated outside month",
};

/**
 * Which HARD rule (if any) a single item trips — the single source of the per-item rule,
 * returning the specific reason so surfaces can tell the employee *why* a row blocks the
 * attest, not just that it does. Out-of-pocket items must have a receipt and stay within
 * the category hard cap; every item must be dated within the report month. Mileage items
 * are receipt-exempt (their $ is backend-derived) but still must fall in the month.
 */
export function itemHardViolationReason(
  item: ExpenseItemRow,
  period: ReportPeriod,
  caps: CategoryHardCaps = new Map(),
): HardViolationReason | null {
  // dated_outside_month (covers future_dated too — a future date is outside the month).
  if (!isInPeriod(item.itemDate, period)) return "dated_outside_month";
  if (item.kind === "out_of_pocket") {
    // missing_receipt — out-of-pocket only (mileage is exempt).
    if (!item.hasReceipt) return "missing_receipt";
    // over_category_cap — only when the category carries a hard cap.
    const cap = item.categoryName ? caps.get(item.categoryName) : null;
    if (cap != null && item.amount > cap) return "over_category_cap";
  }
  return null;
}

/** Does a single item trip a HARD policy rule? Boolean view of `itemHardViolationReason`. */
export function itemHasHardViolation(
  item: ExpenseItemRow,
  period: ReportPeriod,
  caps: CategoryHardCaps = new Map(),
): boolean {
  return itemHardViolationReason(item, period, caps) !== null;
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

/**
 * The ids of the items that trip a HARD rule — so the surfaces can highlight exactly
 * which rows block the attest (employee page + admin review), not just that the report
 * is blocked. Keeps the per-item rule in one place (`itemHasHardViolation`).
 */
export function hardViolationItemIds(
  items: ExpenseItemRow[],
  period: ReportPeriod,
  caps: CategoryHardCaps = new Map(),
): Set<string> {
  return new Set(items.filter((i) => itemHasHardViolation(i, period, caps)).map((i) => i.id));
}

/**
 * Build the `CategoryHardCaps` lookup the gate needs from the category catalog
 * (`listExpenseCategories`). Keyed by `displayName` — the field `ExpenseItemRow.categoryName`
 * carries — so the action, the employee page, and the admin review all resolve caps the
 * same way without restating the mapping.
 */
export function capsFromCategories(
  categories: Pick<ExpenseCategoryRow, "displayName" | "hardCap">[],
): CategoryHardCaps {
  return new Map(categories.map((c) => [c.displayName, c.hardCap]));
}
