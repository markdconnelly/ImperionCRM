/**
 * Snapshot diff for the admin inline-correction surface (ADR-0082, #477).
 *
 * When an admin corrects a Submitted timesheet, the employee's **attested original**
 * (`timesheet.attested_snapshot`) is preserved immutably. This pure helper compares the
 * live entries against that snapshot so the approvals view can flag exactly what changed:
 * which live entries were **added** or **edited** vs the attest, and which snapshot entries
 * were **removed**. No I/O, no comp data — just a deterministic diff over two entry lists.
 */
import type { TimeEntryRow } from "@/types";

export type EntryCorrectionStatus = "unchanged" | "edited" | "added";

export interface TimesheetCorrectionDiff {
  /** Live-entry id → its status vs the attested original. */
  status: Map<string, EntryCorrectionStatus>;
  /** Attested entries no longer present on the live sheet (deleted in correction). */
  removed: TimeEntryRow[];
  /** True when the live sheet differs from the attested original in any way. */
  changed: boolean;
}

/** The correction-relevant fields of an entry (id is the join key, minutes is derived). */
function sig(e: TimeEntryRow): string {
  return [
    e.workDate,
    e.startedAt,
    e.endedAt,
    e.category,
    e.ancillaryTicketRef ?? "",
    e.notes ?? "",
  ].join("|");
}

/**
 * Diff the live entries against the attested snapshot. A `null` snapshot (attested before
 * snapshots existed, or never attested) yields an all-`unchanged` diff with no removals —
 * nothing to compare against, so nothing is flagged.
 */
export function diffAgainstSnapshot(
  entries: TimeEntryRow[],
  snapshot: TimeEntryRow[] | null,
): TimesheetCorrectionDiff {
  const status = new Map<string, EntryCorrectionStatus>();
  if (!snapshot) {
    for (const e of entries) status.set(e.id, "unchanged");
    return { status, removed: [], changed: false };
  }

  const snapById = new Map(snapshot.map((e) => [e.id, e]));
  const liveIds = new Set(entries.map((e) => e.id));
  let changed = false;

  for (const e of entries) {
    const orig = snapById.get(e.id);
    if (!orig) {
      status.set(e.id, "added");
      changed = true;
    } else if (sig(orig) !== sig(e)) {
      status.set(e.id, "edited");
      changed = true;
    } else {
      status.set(e.id, "unchanged");
    }
  }

  const removed = snapshot.filter((e) => !liveIds.has(e.id));
  if (removed.length > 0) changed = true;

  return { status, removed, changed };
}
