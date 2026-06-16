/**
 * Pure helpers for the app-native collections / dunning overlay (#677, parent #668).
 *
 * The overlay (`collections_activity` table, migration 0122) is the dunning workflow
 * state QuickBooks can't give us, layered on the read-only `invoice_mirror` (migration
 * 0121, ADR-0085 QBO read-only). These helpers are PURE — no pg, no node:*, no env — so
 * the enum vocabulary, the reminder-append rule, and the empty-overlay default are
 * unit-testable directly and shareable with the worklist UI (#678) and the Collections
 * agent. App-native: nothing here writes QuickBooks or moves money (ADR-0087).
 */
import {
  DUNNING_STATUSES,
  type CollectionsActivity,
  type CollectionsReminder,
  type DunningStatus,
} from "@/types";

/** Type guard: is `value` a known dunning status? (validate before trusting input). */
export function isDunningStatus(value: unknown): value is DunningStatus {
  return typeof value === "string" && (DUNNING_STATUSES as readonly string[]).includes(value);
}

/**
 * Append a reminder to an overlay's log WITHOUT mutating the input — returns a new array
 * (oldest first). Mirrors the DB upsert's `reminders || EXCLUDED.reminders` append (the
 * log is never rewritten), so client and server agree on ordering.
 */
export function appendReminder(
  existing: readonly CollectionsReminder[],
  reminder: CollectionsReminder,
): CollectionsReminder[] {
  return [...existing, reminder];
}

/**
 * The implicit overlay state for an invoice that has never been worked: status `none`,
 * no escalation, no assignee, empty reminder log. The read accessor returns null in this
 * case (no row yet); the UI uses this to render a not-yet-worked invoice uniformly.
 */
export function emptyCollectionsActivity(qboInvoiceId: string): CollectionsActivity {
  return {
    id: "",
    qboInvoiceId,
    status: "none",
    escalationLevel: 0,
    assigneeUserId: null,
    reminders: [],
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

/**
 * Whether an invoice is actively being pursued — i.e. has had at least one reminder or
 * moved off the `none` status. `paused` and `disputed` count as worked-but-suspended.
 */
export function isCollectionsWorked(activity: CollectionsActivity | null): boolean {
  if (!activity) return false;
  return activity.status !== "none" || activity.reminders.length > 0;
}
