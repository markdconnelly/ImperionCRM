import type { KanbanLane } from "@/components/ui/kanban-board";
import type { StatusDefRow } from "@/lib/data/repositories";

/**
 * Configurable-status board helpers (ADR-0065 B5, #613). The tasks (#341) and
 * projects (#441) kanban boards render their status columns from the resolved
 * `status_def` set — `listStatusDefs(context, projectTypeId)` ordered by `ordinal`
 * — instead of hard-coded status strings, so an admin-added status (e.g. a
 * per-project-type "Waiting on client") appears as a real column. The legacy
 * string/enum `status` column stays AUTHORITATIVE during the compatibility window;
 * the default-set keys reproduce the legacy enum values, so a card whose
 * `status_def_id` FK is still unset places into the matching default column via its
 * legacy `status`.
 *
 * Kept framework-free + pure so the derivation is unit-testable without a DOM.
 */

/** A board card carrying both the legacy status and its resolved status_def key. */
export interface StatusKeyed {
  status: string;
  statusDefKey?: string | null;
}

/**
 * Map an ordered `status_def` set to kanban lanes (ADR-0065 B5, #613). The
 * machine `key` is the lane key a drop persists; `label` + `color` are the display.
 * `wipLimit` (ADR-0066 C1, #616 part 2) is the admin-configured per-status board cap
 * — the baseline over-limit threshold the board highlights against (a personal,
 * per-browser override still wins where set). Input is assumed already ordered by
 * `ordinal` (the data layer orders it); this is a 1:1 shaping so the column order is
 * exactly the configured order.
 */
export function statusLanes(defs: StatusDefRow[]): KanbanLane[] {
  return defs.map((d) => ({
    key: d.key,
    label: d.label,
    color: d.color ?? undefined,
    wipLimit: d.wipLimit ?? undefined,
  }));
}

/**
 * The lane a card belongs in (ADR-0065 B5, #613): its resolved `statusDefKey` when
 * the FK is set, else the legacy `status`. Because the default-set keys equal the
 * legacy enum values, an unmigrated card (no FK) still buckets into its matching
 * default column — and a card stamped into a per-type custom status sits in that
 * custom column even though the legacy enum can't name it.
 */
export function statusLaneOf(card: StatusKeyed): string {
  return card.statusDefKey ?? card.status;
}

/**
 * Union several resolved `status_def` sets into one ordered, de-duped column set
 * (ADR-0065 B5, #613). The projects board shows every project type on one surface,
 * so its columns are the union of each present type's resolved set (typed-over-global
 * per type) plus the global defaults: a per-type custom status (e.g. Onboarding's
 * "Waiting on client") shows as its own column while shared default statuses appear
 * once. De-duped by `key` (first row for a key wins its display); ordered by
 * `ordinal`, then `label`, so the shared defaults keep their canonical order and
 * custom statuses slot in by their configured ordinal. Pure — unit-testable.
 */
export function unionStatusDefs(sets: StatusDefRow[][]): StatusDefRow[] {
  const byKey = new Map<string, StatusDefRow>();
  for (const set of sets) {
    for (const def of set) {
      if (!byKey.has(def.key)) byKey.set(def.key, def);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => a.ordinal - b.ordinal || a.label.localeCompare(b.label),
  );
}

/**
 * Resolve the `status_def.id` a dropped lane key targets, within an already-resolved
 * status set (ADR-0065 B5, #613). The board hands the move action the dropped lane
 * key; the action resolves it against the same set the columns were built from and
 * calls the dual-stamp writer. Returns null for an unknown key (a forged/stale drop)
 * so the action can no-op instead of writing a bad FK.
 */
export function statusDefIdForKey(defs: StatusDefRow[], key: string): string | null {
  return defs.find((d) => d.key === key)?.id ?? null;
}
