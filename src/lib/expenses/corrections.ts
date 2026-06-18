/**
 * Snapshot diff for the admin inline-correction surface (ADR-0083, #488).
 *
 * When an admin corrects a Submitted expense report, the employee's **attested original**
 * (`expense_report.attested_snapshot`) is preserved immutably. This flags exactly what
 * changed — which live items were **added** or **edited** vs the attest, and which snapshot
 * items were **removed** — over the generic attested-snapshot diff (`@/lib/snapshot-diff`,
 * #891), shared with the timesheet correction surface (#477). This module owns only the
 * expense item `sig` (the correction-relevant fields).
 *
 * Only out-of-pocket (`source: "website"`) items are correctable — mileage comes from
 * MileIQ and its $ is backend-derived, so it is never hand-edited here. The diff still
 * reports mileage rows (as `unchanged`) so the panel renders the whole report faithfully.
 */
import type { ExpenseItemRow } from "@/types";
import {
  diffAgainstSnapshot as diffBySig,
  type CorrectionStatus,
  type SnapshotDiff,
} from "@/lib/snapshot-diff";

export type ItemCorrectionStatus = CorrectionStatus;
export type ExpenseCorrectionDiff = SnapshotDiff<ExpenseItemRow>;

/** The correction-relevant fields of an item (id is the join key; amount is the entered $). */
function sig(i: ExpenseItemRow): string {
  return [
    i.itemDate,
    i.amount.toFixed(2),
    i.categoryName ?? "",
    i.merchant ?? "",
    i.reimbursable ? "1" : "0",
    i.billable ? "1" : "0",
    i.notes ?? "",
  ].join("|");
}

/**
 * Diff the live items against the attested snapshot. A `null` snapshot (attested before
 * snapshots existed, or never attested) yields an all-`unchanged` diff with no removals.
 */
export function diffAgainstSnapshot(
  items: ExpenseItemRow[],
  snapshot: ExpenseItemRow[] | null,
): ExpenseCorrectionDiff {
  return diffBySig(items, snapshot, sig);
}
