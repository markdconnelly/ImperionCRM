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
 * SPAN BARS (#628). `task.start_at` landed (migration 0105), so a task with both
 * a `startAt` and a `due` renders as a true Gantt bar spanning start→due. A task
 * with only a `due` collapses to a zero-width point on its due date (the legacy
 * behaviour); a task with neither has no axis position and is returned in
 * `unscheduled` for an honest "not yet scheduled" area — dates are never
 * fabricated. The axis range covers every start AND due endpoint so a bar whose
 * start precedes the earliest due is not clipped. A degenerate task whose start
 * is after its due is clamped to a point on `due` (so the bar never runs
 * backwards) and flagged `inverted` for the UI.
 */

/** A task as the timeline consumes it — id, label, due date, optional start, status. */
export interface TimelineTask {
  id: string;
  title: string;
  status: string;
  /** ISO `yyyy-mm-dd` due date, or null when undated (no axis position → unscheduled). */
  due: string | null;
  /** ISO `yyyy-mm-dd` start date (#628), or null/undefined → bar collapses to a due point. */
  startAt?: string | null;
}

/** One predecessor → successor dependency edge within the project (#336). */
export interface TimelineDependencyEdge {
  predecessorId: string;
  successorId: string;
}

/** A task placed on the axis: its span position and the row it occupies. */
export interface TimelineBar {
  id: string;
  title: string;
  status: string;
  /** ISO `yyyy-mm-dd` the bar ends on (the due date) — also the connector anchor. */
  due: string;
  /** ISO `yyyy-mm-dd` the bar starts on, or null when the task has no start_at. */
  startAt: string | null;
  /** Fractional 0..1 position of the bar's END (due) across the axis date range.
   * Connectors anchor here so the legacy point-marker geometry is preserved. */
  fraction: number;
  /** Fractional 0..1 position of the bar's START. Equals `fraction` when there is
   * no start_at (the bar collapses to a point on its due date). */
  startFraction: number;
  /** True when the task has a real start_at that precedes its due — a drawable span. */
  hasSpan: boolean;
  /** True when start_at is after due (bad data): clamped to a point, flagged for the UI. */
  inverted: boolean;
  /** Row index (0-based) — bars stack top-to-bottom by start (then due, then title). */
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

/** A task that can't be placed on the axis (no due date) — shown separately. */
export interface UnscheduledTask {
  id: string;
  title: string;
  status: string;
  /** Whether the task at least has a start_at (so the UI can say "no due date"
   * vs "no dates at all") — never fabricated into a position. */
  hasStart: boolean;
}

/** The fully laid-out timeline: bars, connectors, axis bounds and month ticks. */
export interface Timeline {
  bars: TimelineBar[];
  connectors: TimelineConnector[];
  /** Inclusive ISO `yyyy-mm-dd` axis bounds — covers every start AND due, padded. */
  start: string;
  end: string;
  /** First-of-month ticks within the range, for the axis gridlines. */
  ticks: TimelineTick[];
  /** Count of tasks dropped because they have no due date (shown as a footer). */
  undatedCount: number;
  /** The undated tasks themselves (#628), for an honest "not yet scheduled" area. */
  unscheduled: UnscheduledTask[];
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

  // Tasks with no due date have no axis position — return them honestly rather
  // than inventing a date (#628). A task may have a start_at but no due; it still
  // can't draw a bar (no end), so it's unscheduled with hasStart = true.
  const unscheduled: UnscheduledTask[] = tasks
    .filter((t) => !t.due)
    .map((t) => ({ id: t.id, title: t.title, status: t.status, hasStart: !!t.startAt }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const undatedCount = unscheduled.length;

  if (dated.length === 0) {
    return { bars: [], connectors: [], start: "", end: "", ticks: [], undatedCount, unscheduled };
  }

  // A usable start_at is one that is on/before the due date. A start after its due
  // is bad data — drop it to a point on `due` (never draw a backwards bar).
  const effStart = (t: TimelineTask & { due: string }): string | null =>
    t.startAt && t.startAt <= t.due ? t.startAt : null;

  // Deterministic order: start (effective, falling back to due), then due, then title.
  const sorted = [...dated].sort((a, b) => {
    const sa = effStart(a) ?? a.due;
    const sb = effStart(b) ?? b.due;
    if (sa !== sb) return sa.localeCompare(sb);
    if (a.due !== b.due) return a.due.localeCompare(b.due);
    return a.title.localeCompare(b.title);
  });

  // Axis must span every endpoint — earliest of (start, due) to latest due — so a
  // bar whose start precedes the earliest due is not clipped off the left edge.
  let minDate = sorted[0].due;
  let maxDate = sorted[0].due;
  for (const t of sorted) {
    const s = effStart(t) ?? t.due;
    if (s < minDate) minDate = s;
    if (t.due > maxDate) maxDate = t.due;
  }
  const start = addDays(minDate, -padDays);
  const end = addDays(maxDate, padDays);
  const span = daysBetween(start, end); // > 0 because padDays > 0
  const fractionOf = (iso: string) => (span === 0 ? 0 : daysBetween(start, iso) / span);

  const bars: TimelineBar[] = sorted.map((t, row) => {
    const es = effStart(t);
    const inverted = !!t.startAt && t.startAt > t.due;
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      due: t.due,
      startAt: es,
      fraction: fractionOf(t.due),
      startFraction: es ? fractionOf(es) : fractionOf(t.due),
      hasSpan: !!es && es !== t.due,
      inverted,
      row,
    };
  });

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

  return {
    bars,
    connectors,
    start,
    end,
    ticks: monthTicks(start, end, span),
    undatedCount,
    unscheduled,
  };
}
