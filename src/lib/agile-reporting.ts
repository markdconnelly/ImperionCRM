import type {
  BurndownPoint,
  SprintBurndownData,
  SprintVelocityRow,
} from "@/types";

/**
 * Agile-reporting domain math (C5, ADR-0066, #345) — burndown + velocity computed
 * from the sprint/estimate read model. PURE and framework-free so it is unit-tested
 * in isolation; the page and the data layer stay dumb around it.
 *
 * HONEST DEGRADATION (verified against the schema): there is NO task status-history
 * table, so we cannot reconstruct what remaining effort *was* on each past day. We
 * derive an honest best-effort actual from current state instead:
 *   - remaining effort on day D = Σ estimate of tasks NOT done as of D, where a done
 *     task's completion day is its best-available `completedAt` (task.updated_at).
 *   - the ideal line is the textbook straight line from total effort (sprint start)
 *     to 0 (sprint end).
 * Cumulative-flow (todo/doing/done bands over time) genuinely requires status
 * history, so it is OMITTED rather than faked — see the page's honesty caveat.
 */

/** UTC-midnight date key (yyyy-mm-dd) for a parsed date — avoids tz drift. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a yyyy-mm-dd (or ISO) date at UTC midnight; null/invalid → null. */
function parseDay(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days from a→b (b − a), both UTC-midnight. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Total estimated effort committed to a sprint (Σ estimate of estimated tasks). */
export function totalEffort(data: SprintBurndownData): number {
  return data.tasks.reduce((sum, t) => sum + t.estimate, 0);
}

/** Done effort: Σ estimate of tasks whose status is done. */
export function completedEffort(data: SprintBurndownData): number {
  return data.tasks.reduce((sum, t) => (t.done ? sum + t.estimate : sum), 0);
}

/**
 * Build the day-by-day burndown series across the sprint window [start, end].
 *
 * Returns an empty array when the sprint has no dated window or no estimated work —
 * the caller renders an honest empty state rather than a flat/zero chart.
 *
 * For each day D in the window:
 *   - ideal      = linear total → 0 across the window (the reference line).
 *   - remaining  = Σ estimate of tasks not yet completed on/before D, but ONLY for
 *                  days up to `today` (future days get null so the actual line stops
 *                  at the present instead of implying we burned nothing).
 *
 * A done task with no usable completion date (or one outside the window) is treated
 * as completed on the sprint start day for the actual line, so finished work never
 * lingers as phantom remaining effort — the honest floor, given no status history.
 */
export function buildBurndownSeries(
  data: SprintBurndownData,
  today: Date = new Date(),
): BurndownPoint[] {
  const start = parseDay(data.sprint.startsAt);
  const end = parseDay(data.sprint.endsAt);
  if (!start || !end || end < start) return [];

  const total = totalEffort(data);
  if (total <= 0) return [];

  const span = daysBetween(start, end); // number of day-steps; ≥ 0
  const todayKey = dayKey(today);

  // Pre-resolve each done task's effective completion day-key (clamped to start).
  const completions = data.tasks
    .filter((t) => t.done)
    .map((t) => {
      const c = parseDay(t.completedAt);
      const day = c && c > start ? c : start; // unknown/early → start
      return { estimate: t.estimate, dayKey: dayKey(day > end ? end : day) };
    });

  const points: BurndownPoint[] = [];
  for (let i = 0; i <= span; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const key = dayKey(d);
    const ideal = span === 0 ? 0 : total * (1 - i / span);

    // Actual remaining only up to today; future days are unknown (null).
    let remaining: number | null = null;
    if (key <= todayKey) {
      const burned = completions
        .filter((c) => c.dayKey <= key)
        .reduce((sum, c) => sum + c.estimate, 0);
      remaining = Math.max(0, total - burned);
    }
    points.push({ date: key, ideal: round1(ideal), remaining: remaining == null ? null : round1(remaining) });
  }
  return points;
}

/** Round to 1 decimal so points/hours don't render long float tails. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Rolling-average velocity over the completed sprints in a velocity list. Averages
 * `completedEffort` across sprints with status 'completed' (the only ones whose
 * velocity is settled); returns null when there are none. Units are NOT mixed — the
 * caller groups by unit before calling, or accepts that a points+hours mix is
 * nonsensical (the UI scopes velocity to one unit family in practice).
 */
export function averageVelocity(rows: SprintVelocityRow[]): number | null {
  const settled = rows.filter((r) => r.status === "completed");
  if (settled.length === 0) return null;
  const sum = settled.reduce((s, r) => s + r.completedEffort, 0);
  return round1(sum / settled.length);
}

/** A sprint's commitment-completion ratio (0..1), or null when nothing committed. */
export function commitmentRatio(row: SprintVelocityRow): number | null {
  if (row.committedEffort <= 0) return null;
  return row.completedEffort / row.committedEffort;
}
