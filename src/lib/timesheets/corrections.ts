/**
 * Snapshot diff for the admin inline-correction surface (ADR-0082, #477).
 *
 * When an admin corrects a Submitted timesheet, the employee's **attested original**
 * (`timesheet.attested_snapshot`) is preserved immutably. This flags exactly what changed —
 * which live entries were **added** or **edited** vs the attest, and which snapshot entries
 * were **removed** — over the generic attested-snapshot diff (`@/lib/snapshot-diff`, #891).
 * This module owns only the timesheet entry `sig` (the correction-relevant fields); the diff
 * mechanics are shared with the expense correction surface.
 */
import type { TimeEntryRow } from "@/types";
import {
  diffAgainstSnapshot as diffBySig,
  type CorrectionStatus,
  type SnapshotDiff,
} from "@/lib/snapshot-diff";

export type EntryCorrectionStatus = CorrectionStatus;
export type TimesheetCorrectionDiff = SnapshotDiff<TimeEntryRow>;

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
 * snapshots existed, or never attested) yields an all-`unchanged` diff with no removals.
 */
export function diffAgainstSnapshot(
  entries: TimeEntryRow[],
  snapshot: TimeEntryRow[] | null,
): TimesheetCorrectionDiff {
  return diffBySig(entries, snapshot, sig);
}
