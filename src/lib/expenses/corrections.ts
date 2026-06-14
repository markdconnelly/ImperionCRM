/**
 * Snapshot diff for the admin inline-correction surface (ADR-0083, #488).
 *
 * When an admin corrects a Submitted expense report, the employee's **attested original**
 * (`expense_report.attested_snapshot`) is preserved immutably. This pure helper compares
 * the live items against that snapshot so the admin review panel can flag exactly what
 * changed: which live items were **added** or **edited** vs the attest, and which snapshot
 * items were **removed**. The exact mirror of the timesheet `diffAgainstSnapshot` (#477):
 * no I/O, no comp data — just a deterministic diff over two item lists.
 *
 * Only out-of-pocket (`source: "website"`) items are correctable — mileage comes from
 * MileIQ and its $ is backend-derived, so it is never hand-edited here. The diff still
 * reports mileage rows (as `unchanged`) so the panel renders the whole report faithfully.
 */
import type { ExpenseItemRow } from "@/types";

export type ItemCorrectionStatus = "unchanged" | "edited" | "added";

export interface ExpenseCorrectionDiff {
  /** Live-item id → its status vs the attested original. */
  status: Map<string, ItemCorrectionStatus>;
  /** Attested items no longer present on the live report (deleted in correction). */
  removed: ExpenseItemRow[];
  /** True when the live report differs from the attested original in any way. */
  changed: boolean;
}

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
 * snapshots existed, or never attested) yields an all-`unchanged` diff with no removals —
 * nothing to compare against, so nothing is flagged.
 */
export function diffAgainstSnapshot(
  items: ExpenseItemRow[],
  snapshot: ExpenseItemRow[] | null,
): ExpenseCorrectionDiff {
  const status = new Map<string, ItemCorrectionStatus>();
  if (!snapshot) {
    for (const i of items) status.set(i.id, "unchanged");
    return { status, removed: [], changed: false };
  }

  const snapById = new Map(snapshot.map((i) => [i.id, i]));
  const liveIds = new Set(items.map((i) => i.id));
  let changed = false;

  for (const i of items) {
    const orig = snapById.get(i.id);
    if (!orig) {
      status.set(i.id, "added");
      changed = true;
    } else if (sig(orig) !== sig(i)) {
      status.set(i.id, "edited");
      changed = true;
    } else {
      status.set(i.id, "unchanged");
    }
  }

  const removed = snapshot.filter((i) => !liveIds.has(i.id));
  if (removed.length > 0) changed = true;

  return { status, removed, changed };
}
