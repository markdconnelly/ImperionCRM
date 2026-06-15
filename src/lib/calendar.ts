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
