/**
 * ISO-week date helpers for time tracking (ADR-0082). Timesheets are weekly,
 * Monday–Sunday. Pure functions over `YYYY-MM-DD` strings, computed in UTC so a
 * server timezone never shifts a date across a day boundary. Unit-tested in
 * `week.test.ts`.
 */

/** Parse a `YYYY-MM-DD` as a UTC midnight Date (no local-tz drift). */
function utc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** `YYYY-MM-DD` of `n` days after the given date. */
export function addDays(isoDate: string, n: number): string {
  const d = utc(isoDate);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Monday (week start) of the week containing `isoDate`, as `YYYY-MM-DD`. */
export function mondayOf(isoDate: string): string {
  const d = utc(isoDate);
  const dow = d.getUTCDay(); // 0=Sun … 6=Sat
  const shift = dow === 0 ? -6 : 1 - dow; // back to Monday
  return addDays(isoDate, shift);
}

/** The seven `YYYY-MM-DD` days Mon→Sun for a Monday-start week. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Human label for a Mon-start week, e.g. "Jun 8 – Jun 14, 2026". */
export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const fmt = (iso: string, withYear: boolean) =>
    utc(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `${fmt(weekStart, false)} – ${fmt(end, true)}`;
}

/** Weekday name for a date, e.g. "Monday". */
export function weekdayName(isoDate: string): string {
  return utc(isoDate).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
