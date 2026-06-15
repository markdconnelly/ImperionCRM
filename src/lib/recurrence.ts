/**
 * Recurring-task schedule helper (ADR-0070 E2, #353).
 *
 * We persist an RFC-5545 RRULE *subset* string on `task_recurrence.rule` and parse
 * it here — there is no RRULE engine in the DB and we deliberately avoid pulling a
 * full RRULE dependency for v1. The GUI only authors the subset the MSP actually
 * needs: a frequency (daily / weekly / monthly) and an interval. Anything richer
 * (BYDAY, BYMONTHDAY, COUNT-in-rule) is a documented follow-up.
 *
 * Dates are bare ISO calendar days (`yyyy-mm-dd`) and all arithmetic is done on UTC
 * midnight so it is DST-safe (mirrors `daysBetween` in the postgres layer).
 */

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY";

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number; // ≥ 1
}

const FREQS: readonly RecurrenceFreq[] = ["DAILY", "WEEKLY", "MONTHLY"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Serialise a rule to the stored RRULE-subset string, e.g. `FREQ=WEEKLY;INTERVAL=2`. */
export function formatRRule(rule: RecurrenceRule): string {
  const interval = Math.max(1, Math.floor(rule.interval));
  return `FREQ=${rule.freq};INTERVAL=${interval}`;
}

/**
 * Parse a stored RRULE-subset string back to a rule. Tolerant of key order and
 * extra whitespace; returns null when FREQ is missing/unsupported so callers can
 * treat a malformed row as "no recurrence" rather than throw. INTERVAL defaults to
 * 1 (RFC-5545 default) and is floored to ≥ 1.
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
  return { freq: freq as RecurrenceFreq, interval };
}

/**
 * The next occurrence date after `fromYmd`, advancing by one rule period. DAILY
 * adds interval days, WEEKLY interval×7 days, MONTHLY interval months with
 * end-of-month clamping (e.g. Jan 31 + 1 month → Feb 28/29). Returns `yyyy-mm-dd`.
 * Throws on a malformed `fromYmd` — the caller holds a real stored date.
 */
export function nextOccurrence(rule: RecurrenceRule, fromYmd: string): string {
  if (!ISO_DATE.test(fromYmd)) throw new Error(`recurrence: bad date ${fromYmd}`);
  const [y, m, d] = fromYmd.split("-").map(Number);
  const interval = Math.max(1, Math.floor(rule.interval));

  if (rule.freq === "MONTHLY") {
    // Advance month(s), clamping the day to the target month's last day.
    const targetMonthIndex = m - 1 + interval; // 0-based, may exceed 11
    const targetYear = y + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-based
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return ymd(Date.UTC(targetYear, targetMonth, day));
  }

  const days = rule.freq === "WEEKLY" ? interval * 7 : interval;
  return ymd(Date.UTC(y, m - 1, d) + days * 86_400_000);
}

/** A short human description for the UI, e.g. "Every 2 weeks" / "Daily". */
export function describeRRule(rule: RecurrenceRule): string {
  const n = Math.max(1, Math.floor(rule.interval));
  const unit = rule.freq === "DAILY" ? "day" : rule.freq === "WEEKLY" ? "week" : "month";
  if (n === 1) {
    return rule.freq === "DAILY" ? "Daily" : rule.freq === "WEEKLY" ? "Weekly" : "Monthly";
  }
  return `Every ${n} ${unit}s`;
}

/** Format a UTC-ms timestamp back to a `yyyy-mm-dd` calendar day. */
function ymd(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}
