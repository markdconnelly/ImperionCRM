/**
 * Recurring-task schedule helper (ADR-0070 E2, #353; richer subset #636).
 *
 * We persist an RFC-5545 RRULE *subset* string on `task_recurrence.rule` and parse
 * it here — there is no RRULE engine in the DB and we deliberately avoid pulling a
 * full RRULE dependency. The GUI authors the subset the MSP actually needs:
 *   • a frequency (daily / weekly / monthly) and an interval (#353), plus
 *   • WEEKLY on specific weekdays      — BYDAY=MO,WE,FR        (#636)
 *   • MONTHLY on a fixed day-of-month  — BYMONTHDAY=15         (#636)
 *   • MONTHLY on an nth weekday        — BYDAY=2TU / BYDAY=-1FR (#636)
 * Anything richer (BYSETPOS combos, BYYEARDAY, COUNT-in-rule) stays a follow-up.
 *
 * Dates are bare ISO calendar days (`yyyy-mm-dd`) and all arithmetic is done on UTC
 * midnight so it is DST-safe (mirrors `daysBetween` in the postgres layer).
 */

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY";

/** RFC-5545 weekday tokens. */
export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number; // ≥ 1
  /**
   * WEEKLY only: restrict occurrences to these weekdays (e.g. `["MO","WE","FR"]`).
   * Absent/empty = repeat on the seed date's own weekday (the #353 behaviour).
   */
  byDay?: Weekday[];
  /**
   * MONTHLY only: a fixed day-of-month 1..31 (clamped to the month's last day).
   * Mutually exclusive with `nthWeekday`.
   */
  byMonthDay?: number;
  /**
   * MONTHLY only: the nth weekday of the month — `{ nth: 2, weekday: "TU" }` is the
   * 2nd Tuesday; `nth: -1` is the last. Mutually exclusive with `byMonthDay`.
   */
  nthWeekday?: { nth: number; weekday: Weekday };
}

const FREQS: readonly RecurrenceFreq[] = ["DAILY", "WEEKLY", "MONTHLY"];
const WEEKDAYS: readonly Weekday[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// RFC-5545 weekday → JS getUTCDay() (0=Sun..6=Sat).
const DOW: Record<Weekday, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
// Human labels for describeRRule.
const DOW_LABEL: Record<Weekday, string> = {
  MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun",
};

/** Serialise a rule to the stored RRULE-subset string, e.g. `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE`. */
export function formatRRule(rule: RecurrenceRule): string {
  const interval = Math.max(1, Math.floor(rule.interval));
  let out = `FREQ=${rule.freq};INTERVAL=${interval}`;
  if (rule.freq === "WEEKLY" && rule.byDay && rule.byDay.length > 0) {
    out += `;BYDAY=${sortWeekdays(rule.byDay).join(",")}`;
  }
  if (rule.freq === "MONTHLY") {
    if (rule.nthWeekday) {
      out += `;BYDAY=${rule.nthWeekday.nth}${rule.nthWeekday.weekday}`;
    } else if (rule.byMonthDay != null) {
      out += `;BYMONTHDAY=${clampMonthDay(rule.byMonthDay)}`;
    }
  }
  return out;
}

/**
 * Parse a stored RRULE-subset string back to a rule. Tolerant of key order and
 * extra whitespace; returns null when FREQ is missing/unsupported so callers can
 * treat a malformed row as "no recurrence" rather than throw. INTERVAL defaults to
 * 1 (RFC-5545 default) and is floored to ≥ 1. Unsupported/malformed BYDAY/BYMONTHDAY
 * parts are dropped (the rule degrades to its plain frequency) rather than rejected.
 */
export function parseRRule(rule: string | null | undefined): RecurrenceRule | null {
  if (!rule) return null;
  const parts = new Map<string, string>();
  for (const seg of rule.split(";")) {
    const [k, v] = seg.split("=");
    if (k && v != null) parts.set(k.trim().toUpperCase(), v.trim().toUpperCase());
  }
  const freq = parts.get("FREQ");
  if (!freq || !FREQS.includes(freq as RecurrenceFreq)) return null;
  const rawInterval = Number(parts.get("INTERVAL") ?? "1");
  const interval = Number.isFinite(rawInterval) ? Math.max(1, Math.floor(rawInterval)) : 1;
  const out: RecurrenceRule = { freq: freq as RecurrenceFreq, interval };

  const byDayRaw = parts.get("BYDAY");
  if (freq === "WEEKLY" && byDayRaw) {
    const days = byDayRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Weekday => (WEEKDAYS as readonly string[]).includes(t));
    if (days.length > 0) out.byDay = sortWeekdays(dedupeWeekdays(days));
  } else if (freq === "MONTHLY") {
    // MONTHLY: an ordinal-prefixed BYDAY (e.g. 2TU / -1FR) wins; else BYMONTHDAY.
    const nth = byDayRaw ? parseOrdinalWeekday(byDayRaw.split(",")[0]?.trim()) : null;
    if (nth) {
      out.nthWeekday = nth;
    } else {
      const mdRaw = parts.get("BYMONTHDAY");
      const md = mdRaw != null ? Number(mdRaw) : NaN;
      if (Number.isFinite(md) && md >= 1 && md <= 31) out.byMonthDay = Math.floor(md);
    }
  }
  return out;
}

/**
 * The next occurrence date strictly after `fromYmd`. Honours the subset:
 *   • DAILY            — + interval days
 *   • WEEKLY           — + interval×7 days (no BYDAY), OR the next listed BYDAY weekday
 *                        within the current week, else the first listed weekday of the
 *                        week interval weeks ahead (WKST = Monday, the RFC default)
 *   • MONTHLY          — + interval months with end-of-month day clamping (no BY rule),
 *                        OR the next BYMONTHDAY / nth-weekday occurrence
 * Returns `yyyy-mm-dd`. Throws on a malformed `fromYmd` — the caller holds a real
 * stored date.
 */
export function nextOccurrence(rule: RecurrenceRule, fromYmd: string): string {
  if (!ISO_DATE.test(fromYmd)) throw new Error(`recurrence: bad date ${fromYmd}`);
  const [y, m, d] = fromYmd.split("-").map(Number);
  const interval = Math.max(1, Math.floor(rule.interval));
  const fromMs = Date.UTC(y, m - 1, d);

  if (rule.freq === "WEEKLY" && rule.byDay && rule.byDay.length > 0) {
    return nextWeeklyByDay(rule.byDay, interval, fromMs);
  }

  if (rule.freq === "MONTHLY" && (rule.byMonthDay != null || rule.nthWeekday)) {
    return nextMonthlyBy(rule, interval, y, m - 1, fromMs);
  }

  if (rule.freq === "MONTHLY") {
    // Advance month(s), clamping the day to the target month's last day.
    const targetMonthIndex = m - 1 + interval; // 0-based, may exceed 11
    const targetYear = y + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-based
    const day = Math.min(d, lastDayOfMonth(targetYear, targetMonth));
    return ymd(Date.UTC(targetYear, targetMonth, day));
  }

  const days = rule.freq === "WEEKLY" ? interval * 7 : interval;
  return ymd(fromMs + days * 86_400_000);
}

/** A short human description for the UI, e.g. "Every 2 weeks on Mon, Wed". */
export function describeRRule(rule: RecurrenceRule): string {
  const n = Math.max(1, Math.floor(rule.interval));

  if (rule.freq === "WEEKLY" && rule.byDay && rule.byDay.length > 0) {
    const days = sortWeekdays(rule.byDay).map((w) => DOW_LABEL[w]).join(", ");
    return n === 1 ? `Weekly on ${days}` : `Every ${n} weeks on ${days}`;
  }

  if (rule.freq === "MONTHLY" && rule.nthWeekday) {
    const pos = ordinalLabel(rule.nthWeekday.nth);
    const day = DOW_LABEL[rule.nthWeekday.weekday];
    const lead = n === 1 ? "Monthly" : `Every ${n} months`;
    return `${lead} on the ${pos} ${day}`;
  }

  if (rule.freq === "MONTHLY" && rule.byMonthDay != null) {
    const lead = n === 1 ? "Monthly" : `Every ${n} months`;
    return `${lead} on day ${clampMonthDay(rule.byMonthDay)}`;
  }

  const unit = rule.freq === "DAILY" ? "day" : rule.freq === "WEEKLY" ? "week" : "month";
  if (n === 1) {
    return rule.freq === "DAILY" ? "Daily" : rule.freq === "WEEKLY" ? "Weekly" : "Monthly";
  }
  return `Every ${n} ${unit}s`;
}

// ── internals ──────────────────────────────────────────────────────────────────

/** Next WEEKLY-BYDAY occurrence after `fromMs` (WKST = Monday). */
function nextWeeklyByDay(byDay: Weekday[], interval: number, fromMs: number): string {
  const targets = sortWeekdays(byDay).map((w) => DOW[w]); // JS dow values
  // Try later weekdays within the current (Monday-based) week.
  const weekStart = mondayOf(fromMs);
  for (let off = 1; off <= 6; off++) {
    const cand = fromMs + off * 86_400_000;
    if (cand - weekStart >= 7 * 86_400_000) break; // left the current week
    if (targets.includes(new Date(cand).getUTCDay())) return ymd(cand);
  }
  // Otherwise jump `interval` weeks and take the first listed weekday of that week.
  const nextWeekStart = weekStart + interval * 7 * 86_400_000;
  const firstTarget = targets.slice().sort((a, b) => mondayIndex(a) - mondayIndex(b))[0];
  return ymd(nextWeekStart + mondayIndex(firstTarget) * 86_400_000);
}

/** Next MONTHLY BYMONTHDAY / nth-weekday occurrence after `fromMs`. */
function nextMonthlyBy(
  rule: RecurrenceRule,
  interval: number,
  fromYear: number,
  fromMonth0: number,
  fromMs: number,
): string {
  // Start in the seed month, then step by `interval` months until we clear `fromMs`.
  // Bounded to keep a missing nth-weekday (e.g. a 5th Friday) from looping forever.
  for (let step = 0; step <= 1200; step++) {
    const mi = fromMonth0 + step * interval;
    const year = fromYear + Math.floor(mi / 12);
    const month0 = ((mi % 12) + 12) % 12;
    let day: number | null;
    if (rule.nthWeekday) {
      day = nthWeekdayOfMonth(year, month0, rule.nthWeekday.nth, rule.nthWeekday.weekday);
    } else {
      day = Math.min(clampMonthDay(rule.byMonthDay ?? 1), lastDayOfMonth(year, month0));
    }
    if (day == null) continue; // nth weekday absent this month (e.g. no 5th Mon)
    const candMs = Date.UTC(year, month0, day);
    if (candMs > fromMs) return ymd(candMs);
  }
  throw new Error("recurrence: no monthly occurrence found within bound");
}

/** The day-of-month (1..31) of the nth weekday, or null if it doesn't exist. nth=-1 = last. */
function nthWeekdayOfMonth(year: number, month0: number, nth: number, weekday: Weekday): number | null {
  const target = DOW[weekday];
  const last = lastDayOfMonth(year, month0);
  if (nth === -1) {
    const lastDow = new Date(Date.UTC(year, month0, last)).getUTCDay();
    return last - ((lastDow - target + 7) % 7);
  }
  if (nth < 1) return null;
  const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const day = 1 + ((target - firstDow + 7) % 7) + (nth - 1) * 7;
  return day <= last ? day : null;
}

/** Parse an ordinal-prefixed weekday token like `2TU` / `-1FR`, or null. */
function parseOrdinalWeekday(token: string | undefined): { nth: number; weekday: Weekday } | null {
  if (!token) return null;
  const m = /^([+-]?\d+)(MO|TU|WE|TH|FR|SA|SU)$/.exec(token);
  if (!m) return null;
  const nth = Number(m[1]);
  // Supported subset: 1..5 and -1 (last). Anything else degrades to no rule.
  if (nth !== -1 && (nth < 1 || nth > 5)) return null;
  return { nth, weekday: m[2] as Weekday };
}

function dedupeWeekdays(days: Weekday[]): Weekday[] {
  return Array.from(new Set(days));
}

/** Sort weekdays Monday-first (matches WKST = MO and reads naturally). */
function sortWeekdays(days: Weekday[]): Weekday[] {
  return days.slice().sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

/** Monday-first index 0..6 for a JS getUTCDay() value (Mon=0..Sun=6). */
function mondayIndex(jsDow: number): number {
  return (jsDow + 6) % 7;
}

/** UTC-midnight ms of the Monday of `ms`'s week. */
function mondayOf(ms: number): number {
  return ms - mondayIndex(new Date(ms).getUTCDay()) * 86_400_000;
}

function lastDayOfMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function clampMonthDay(n: number): number {
  return Math.min(31, Math.max(1, Math.floor(n)));
}

function ordinalLabel(nth: number): string {
  if (nth === -1) return "last";
  return nth === 1 ? "1st" : nth === 2 ? "2nd" : nth === 3 ? "3rd" : `${nth}th`;
}

/** Format a UTC-ms timestamp back to a `yyyy-mm-dd` calendar day. */
function ymd(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}
