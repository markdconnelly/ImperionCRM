/**
 * Timeline / Gantt layout (ADR-0066 C3, #343).
 *
 * Lays project tasks onto a horizontal time axis keyed on their due date, and
 * resolves dependency edges into drawable connectors (predecessor → successor).
 * This module owns the date→x arithmetic and the row assignment so the layout
 * rule is a tested pure function, not JSX date math. PURE — no pg, no node:*,
 * no env reads; all dates are ISO `yyyy-mm-dd` strings handled in UTC to dodge
 * the local-timezone off-by-one that plagues calendar code.
 *
 * NOTE — point bars, not spans (start_at gap). A full Gantt bar needs a
 * task start *and* end. The schema has only `task.due_at` (migration 0007); the
 * `task.start_at` column that would give true start→end spans does NOT exist yet
 * and is tracked in FE #580. Until then every task renders as a point/short bar
 * anchored on its due date. When #580 lands, widen `TimelineTask` with `startAt`
 * and have `layoutTimeline` derive bar width from (start..due) instead of the
 * fixed point width — the axis math here is already span-ready.
 */

/** A task as the timeline consumes it — id, label, due date, status. */
export interface TimelineTask {
  id: string;
  title: string;
  status: string;
  /** ISO `yyyy-mm-dd` due date, or null when undated (excluded from the axis). */
  due: string | null;
}

/** One predecessor → successor dependency edge within the project (#336). */
export interface TimelineDependencyEdge {
  predecessorId: string;
  successorId: string;
}

/** A task placed on the axis: its column position and the row it occupies. */
export interface TimelineBar {
  id: string;
  title: string;
  status: string;
  /** ISO `yyyy-mm-dd` the bar is anchored on (the due date). */
  due: string;
  /** Fractional 0..1 position of the bar's anchor across the axis date range. */
  fraction: number;
  /** Row index (0-based) — undated-free tasks stack top-to-bottom by due then title. */
  row: number;
}

/** A connector to draw: the two bars it joins and whether the link is unmet. */
export interface TimelineConnector {
  predecessorId: string;
  successorId: string;
  /** True when the successor's due date is on/before the predecessor's — an
   * ordering smell the UI can flag (the predecessor can't finish in time). */
  outOfOrder: boolean;
}

/** Axis tick: an ISO date label and its fractional position across the range. */
export interface TimelineTick {
  date: string;
  fraction: number;
}

/** The fully laid-out timeline: bars, connectors, axis bounds and month ticks. */
export interface Timeline {
  bars: TimelineBar[];
  connectors: TimelineConnector[];
  /** Inclusive ISO `yyyy-mm-dd` axis bounds (earliest..latest due, padded). */
  start: string;
  end: string;
  /** First-of-month ticks within the range, for the axis gridlines. */
  ticks: TimelineTick[];
  /** Count of tasks dropped because they have no due date (shown as a footer). */
  undatedCount: number;
}

/** Days between two ISO dates (b − a), UTC, ignoring time-of-day. */
function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86_400_000);
}

/** Two-digit zero-pad. */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Add `days` to an ISO date, returning a new ISO `yyyy-mm-dd` (UTC). */
function addDays(iso: string, days: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** First-of-month ISO ticks from `start` to `end` inclusive. */
function monthTicks(start: string, end: string, span: number): TimelineTick[] {
  const ticks: TimelineTick[] = [];
  let year = +start.slice(0, 4);
  let month = +start.slice(5, 7); // 1..12
  // Advance to the first month boundary on/after start.
  if (+start.slice(8, 10) !== 1) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  // Guard against pathological ranges (hand-edited data) — cap the loop.
  for (let i = 0; i < 240; i++) {
    const date = `${year}-${pad(month)}-01`;
    if (daysBetween(start, date) > span) break;
    ticks.push({ date, fraction: span === 0 ? 0 : daysBetween(start, date) / span });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return ticks;
}

/**
 * Lay tasks onto a horizontal time axis by due date and resolve dependency
 * connectors (#343). Undated tasks are excluded from the axis (and counted).
 * The axis runs from the earliest to the latest due date, padded by `padDays`
 * on each side so end bars aren't flush against the frame; a single-date project
 * (or all tasks on one day) still gets a non-zero span via the padding.
 *
 * Bars are row-assigned in due-then-title order so the layout is deterministic
 * and connectors never overlap their own endpoints ambiguously. Connector
 * endpoints reference dated bars only — an edge touching an undated task is
 * dropped (it has no position to draw to).
 */
export function layoutTimeline(
  tasks: readonly TimelineTask[],
  edges: readonly TimelineDependencyEdge[],
  padDays = 2,
): Timeline {
  const dated = tasks.filter((t): t is TimelineTask & { due: string } => !!t.due);
  const undatedCount = tasks.length - dated.length;

  if (dated.length === 0) {
    return { bars: [], connectors: [], start: "", end: "", ticks: [], undatedCount };
  }

  // Deterministic order: due date, then title (stable tiebreak).
  const sorted = [...dated].sort((a, b) =>
    a.due === b.due ? a.title.localeCompare(b.title) : a.due.localeCompare(b.due),
  );

  const minDue = sorted[0].due;
  const maxDue = sorted[sorted.length - 1].due;
  const start = addDays(minDue, -padDays);
  const end = addDays(maxDue, padDays);
  const span = daysBetween(start, end); // > 0 because padDays > 0

  const bars: TimelineBar[] = sorted.map((t, row) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    due: t.due,
    fraction: span === 0 ? 0 : daysBetween(start, t.due) / span,
    row,
  }));

  const byId = new Map(bars.map((b) => [b.id, b]));
  const connectors: TimelineConnector[] = [];
  for (const e of edges) {
    const p = byId.get(e.predecessorId);
    const s = byId.get(e.successorId);
    if (!p || !s) continue; // an endpoint is undated / not in this project
    connectors.push({
      predecessorId: e.predecessorId,
      successorId: e.successorId,
      outOfOrder: s.due <= p.due,
    });
  }

  return { bars, connectors, start, end, ticks: monthTicks(start, end, span), undatedCount };
}
