/**
 * Generic attested-snapshot diff for the admin inline-correction surfaces (#891).
 *
 * Extracted from the timesheet (ADR-0082, #477) and expense (ADR-0083, #488) correction
 * helpers, which were identical but for the row type and which fields define a meaningful
 * change. When an admin corrects a Submitted item, the employee's **attested original**
 * snapshot is preserved immutably; this compares the live rows against that snapshot so the
 * review surface can flag what was **added** / **edited** vs the attest, and which snapshot
 * rows were **removed**. Pure, no I/O, no comp data — a deterministic diff over two lists.
 *
 * Each domain supplies a `sig` that hashes the correction-relevant fields of a row (the row
 * `id` is the join key); two rows sharing an id but differing in `sig` are an "edit". This is
 * the ONE genuinely shared piece of the two attestation surfaces — the hard-violation gates
 * and the lifecycle states are domain-specific (paid vs reimbursed, weekly vs monthly,
 * reconciliation verdicts vs policy rules) and deliberately stay in their own modules.
 */

export type CorrectionStatus = "unchanged" | "edited" | "added";

export interface SnapshotDiff<T> {
  /** Live-row id → its status vs the attested original. */
  status: Map<string, CorrectionStatus>;
  /** Attested rows no longer present on the live item (deleted in correction). */
  removed: T[];
  /** True when the live item differs from the attested original in any way. */
  changed: boolean;
}

/**
 * Diff live rows against the attested snapshot using `sig` to detect edits. A `null` snapshot
 * (attested before snapshots existed, or never attested) yields an all-`unchanged` diff with
 * no removals — nothing to compare against, so nothing is flagged.
 */
export function diffAgainstSnapshot<T extends { id: string }>(
  rows: T[],
  snapshot: T[] | null,
  sig: (row: T) => string,
): SnapshotDiff<T> {
  const status = new Map<string, CorrectionStatus>();
  if (!snapshot) {
    for (const r of rows) status.set(r.id, "unchanged");
    return { status, removed: [], changed: false };
  }

  const snapById = new Map(snapshot.map((r) => [r.id, r]));
  const liveIds = new Set(rows.map((r) => r.id));
  let changed = false;

  for (const r of rows) {
    const orig = snapById.get(r.id);
    if (!orig) {
      status.set(r.id, "added");
      changed = true;
    } else if (sig(orig) !== sig(r)) {
      status.set(r.id, "edited");
      changed = true;
    } else {
      status.set(r.id, "unchanged");
    }
  }

  const removed = snapshot.filter((r) => !liveIds.has(r.id));
  if (removed.length > 0) changed = true;

  return { status, removed, changed };
}
