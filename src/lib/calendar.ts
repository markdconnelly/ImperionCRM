/**
 * Month-calendar layout (ADR-0066 C2, #342).
 *
 * The Tasks calendar view lays out tasks on a month grid by due date. This
 * module owns the grid arithmetic and the by-day bucketing so the layout rule
 * is a tested pure function, not JSX date math. PURE — no pg, no node:*, no env
 * reads, all dates handled as ISO `yyyy-mm-dd` strings in UTC to dodge the
 * local-timezone off-by-one that plagues calendar code.
 *
 * Due dates arrive already normalised to `yyyy-mm-dd` (the data layer's
 * `fmtDate` slices `toISOString()`), so day bucketing is a plain string-equality
 * map — no Date parsing per task.
 */

/** A single day cell in the month grid. */
export interface CalendarDay {
  /** ISO `yyyy-mm-dd` for this cell. */
  date: string;
  /** Day-of-month number (1–31), for the cell label. */
  day: number;
  /** False for the leading/trailing days that belong to an adjacent month. */
  inMonth: boolean;
  /** True when this cell is `today` (the caller supplies "today" for testability). */
  isToday: boolean;
}

/** Month metadata + the 6×7 grid of day cells (always full weeks, Sun-start). */
export interface CalendarMonth {
  /** Four-digit year of the displayed month. */
  year: number;
  /** 1–12 month of the displayed month. */
  month: number;
  /** e.g. "June 2026" — the header label. */
  label: string;
  /** `yyyy-mm` for the previous month (calendar nav). */
  prev: string;
  /** `yyyy-mm` for the next month (calendar nav). */
  next: string;
  /** 6 weeks × 7 days, Sunday-first; covers the whole month plus padding. */
  weeks: CalendarDay[][];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Two-digit zero-pad for month/day. */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Compose an ISO `yyyy-mm-dd` from a UTC Date. */
function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** `yyyy-mm` shorthand from a year/month pair. */
function ym(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

/**
 * Parse a `yyyy-mm` (or `yyyy-mm-dd`) string to a {year, month} pair, falling
 * back to the month of `today` when the input is missing or malformed. Clamps an
 * out-of-range month so a hand-edited URL can never throw.
 */
export function parseMonth(value: string | undefined | null, today: string): { year: number; month: number } {
  const m = value?.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Math.min(12, Math.max(1, Number(m[2])));
    return { year, month };
  }
  const t = today.match(/^(\d{4})-(\d{2})/);
  return t ? { year: Number(t[1]), month: Number(t[2]) } : { year: 1970, month: 1 };
}

/**
 * Build the 6-week month grid for `year`/`month` (1–12). Always 42 cells so the
 * grid height is stable across months; leading/trailing cells from adjacent
 * months are flagged `inMonth: false`. `today` is injected for deterministic
 * tests.
 */
export function buildMonth(year: number, month: number, today: string): CalendarMonth {
  // First day of the month (UTC), and the Sunday on/before it that starts week 0.
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay()); // back up to Sunday

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: iso(cursor),
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month - 1,
        isToday: iso(cursor) === today,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return {
    year,
    month,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    prev: ym(prevMonth.year, prevMonth.month),
    next: ym(nextMonth.year, nextMonth.month),
    weeks,
  };
}

/**
 * Bucket items by their ISO `yyyy-mm-dd` due date into a `date → items[]` map.
 * Items with a null/blank due date are dropped (they have no cell). Order within
 * a day preserves the input order (callers pre-sort by due then title).
 */
export function bucketByDay<T>(items: readonly T[], dueOf: (item: T) => string | null): Map<string, T[]> {
  const by = new Map<string, T[]>();
  for (const item of items) {
    const due = dueOf(item);
    if (!due) continue;
    const key = due.slice(0, 10);
    const list = by.get(key) ?? [];
    list.push(item);
    by.set(key, list);
  }
  return by;
}

/** Short weekday headers, Sunday-first, matching the grid column order. */
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// ── Week view (#628): a 7-day Sunday-start window for the project span calendar ──

/** One day cell in the 7-day week strip. */
export interface WeekDay {
  /** ISO `yyyy-mm-dd` for this cell. */
  date: string;
  /** Day-of-month number (1–31), for the cell label. */
  day: number;
  /** 0–6 index of the column (Sunday = 0). */
  index: number;
  /** True when this cell is `today` (caller supplies "today" for testability). */
  isToday: boolean;
}

/** Metadata for a displayed week: its 7 days plus prev/next nav anchors. */
export interface CalendarWeek {
  /** ISO `yyyy-mm-dd` of the Sunday that starts the week. */
  start: string;
  /** ISO `yyyy-mm-dd` of the Saturday that ends the week. */
  end: string;
  /** e.g. "Jun 1 – 7, 2026" — the header label. */
  label: string;
  /** ISO date of the previous week's Sunday (week nav). */
  prev: string;
  /** ISO date of the next week's Sunday (week nav). */
  next: string;
  /** The 7 day cells, Sunday-first. */
  days: WeekDay[];
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Add `days` to an ISO `yyyy-mm-dd`, returning a new ISO date (UTC). */
function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/**
 * Build the Sunday-start 7-day window that CONTAINS `anchor` (an ISO date, or
 * `yyyy-mm-dd` slice of one); falls back to the week of `today` when `anchor` is
 * missing/malformed. `today` is injected for deterministic tests. Pure / UTC.
 */
export function buildWeek(anchor: string | undefined | null, today: string): CalendarWeek {
  const base = (anchor && /^\d{4}-\d{2}-\d{2}/.test(anchor) ? anchor : today).slice(0, 10);
  const d = new Date(Date.UTC(+base.slice(0, 4), +base.slice(5, 7) - 1, +base.slice(8, 10)));
  const start = addDaysIso(iso(d), -d.getUTCDay()); // back up to Sunday
  const end = addDaysIso(start, 6);

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDaysIso(start, i);
    days.push({ date, day: +date.slice(8, 10), index: i, isToday: date === today });
  }

  const sMonth = SHORT_MONTHS[+start.slice(5, 7) - 1];
  const eMonth = SHORT_MONTHS[+end.slice(5, 7) - 1];
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const label = sameMonth
    ? `${sMonth} ${+start.slice(8, 10)} – ${+end.slice(8, 10)}, ${start.slice(0, 4)}`
    : `${sMonth} ${+start.slice(8, 10)} – ${eMonth} ${+end.slice(8, 10)}, ${end.slice(0, 4)}`;

  return { start, end, label, prev: addDaysIso(start, -7), next: addDaysIso(start, 7), days };
}

/** A task's placement within a week strip: which column it starts/ends on. */
export interface WeekSpan<T> {
  item: T;
  /** 0–6 column the bar starts in (clamped to the visible week). */
  startCol: number;
  /** 0–6 column the bar ends in (inclusive, clamped to the visible week). */
  endCol: number;
  /** True when the real start is before this week (bar is clipped on the left). */
  clippedStart: boolean;
  /** True when the real due is after this week (bar is clipped on the right). */
  clippedEnd: boolean;
}

/**
 * Place items that overlap the given week onto column spans (#628). An item is
 * laid from its effective start (start_at, or its due when there is no start) to
 * its due, clamped to the [start, end] of the week. Items with no due date, or
 * that don't overlap the week at all, are excluded (the caller surfaces undated
 * tasks separately — dates are never fabricated). A start after its due is
 * treated as a point on the due date (bad data, never a backwards bar).
 */
export function weekSpans<T>(
  items: readonly T[],
  week: CalendarWeek,
  startOf: (item: T) => string | null,
  dueOf: (item: T) => string | null,
): WeekSpan<T>[] {
  const out: WeekSpan<T>[] = [];
  for (const item of items) {
    const due = dueOf(item)?.slice(0, 10) ?? null;
    if (!due) continue; // no end → not placeable
    const rawStart = startOf(item)?.slice(0, 10) ?? null;
    const start = rawStart && rawStart <= due ? rawStart : due; // clamp bad/empty start to due
    if (due < week.start || start > week.end) continue; // no overlap with this week
    const clampedStart = start < week.start ? week.start : start;
    const clampedEnd = due > week.end ? week.end : due;
    out.push({
      item,
      startCol: week.days.findIndex((d) => d.date === clampedStart),
      endCol: week.days.findIndex((d) => d.date === clampedEnd),
      clippedStart: start < week.start,
      clippedEnd: due > week.end,
    });
  }
  return out;
}
