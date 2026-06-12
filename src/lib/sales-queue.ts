/**
 * Sales Queue grouping (ADR-0052 §6).
 *
 * The Sales Activity page is a pure read model: a rep's open sales tasks
 * grouped by due date and deal. This module owns the due-date bucketing so the
 * grouping rule is a tested pure function, not JSX arithmetic. PURE — no pg,
 * no node:*, no env reads.
 */
import type { SalesTaskRow } from "@/types";

/** Due buckets, in render order. */
export const DUE_BUCKETS = ["overdue", "today", "this_week", "later", "no_due"] as const;
export type DueBucket = (typeof DUE_BUCKETS)[number];

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  this_week: "This week",
  later: "Later",
  no_due: "No due date",
};

/** Day-precision bucket for an ISO `yyyy-mm-dd` due date relative to `today`. */
export function dueBucket(dueAt: string | null, today: string): DueBucket {
  if (!dueAt) return "no_due";
  if (dueAt < today) return "overdue";
  if (dueAt === today) return "today";
  // End of "this week" = 6 days out (a rolling 7-day window, day-precision).
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return dueAt <= end.toISOString().slice(0, 10) ? "this_week" : "later";
}

/** Tasks grouped into ordered due buckets; empty buckets are omitted. */
export function groupByDueBucket(
  tasks: readonly SalesTaskRow[],
  today: string,
): Array<{ bucket: DueBucket; label: string; tasks: SalesTaskRow[] }> {
  const groups = new Map<DueBucket, SalesTaskRow[]>();
  for (const t of tasks) {
    const b = dueBucket(t.dueAt, today);
    const list = groups.get(b) ?? [];
    list.push(t);
    groups.set(b, list);
  }
  return DUE_BUCKETS.filter((b) => groups.has(b)).map((b) => ({
    bucket: b,
    label: DUE_BUCKET_LABELS[b],
    tasks: groups.get(b)!,
  }));
}

/**
 * Split the queue per owner: the signed-in rep's queue first ("mine"), then the
 * rest of the team grouped by owner name, unassigned last.
 */
export function splitByOwner(
  tasks: readonly SalesTaskRow[],
  currentUserId: string | null,
): { mine: SalesTaskRow[]; others: Array<{ owner: string; tasks: SalesTaskRow[] }> } {
  const mine: SalesTaskRow[] = [];
  const byOwner = new Map<string, SalesTaskRow[]>();
  for (const t of tasks) {
    if (currentUserId && t.ownerUserId === currentUserId) {
      mine.push(t);
      continue;
    }
    const key = t.owner ?? "Unassigned";
    const list = byOwner.get(key) ?? [];
    list.push(t);
    byOwner.set(key, list);
  }
  const others = [...byOwner.entries()]
    .sort(([a], [b]) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)))
    .map(([owner, list]) => ({ owner, tasks: list }));
  return { mine, others };
}
