/**
 * Defensive DB timestamp formatters (#1299).
 *
 * Repository query rows annotate timestamp columns as `Date`, but a column declared `text`
 * (the local-pipeline bronze envelope stores `collected_at text NOT NULL`, migration 0038)
 * comes back from node-postgres as a STRING. Calling `.toISOString()` on a string throws
 * (`… is not a function`); inside a repository `.map(...)` that bubbles out as a
 * `DataUnavailableError` and blanks the whole page ("Live data is unavailable"). So every
 * formatter coerces the value first and treats an unparseable input as `null` rather than
 * crashing the read. Real `Date` inputs are unchanged.
 *
 * Extracted from `postgres-repositories.ts` (which is `server-only`) so it is unit-testable.
 */

/** Coerce a DB timestamp value (Date or text) to a valid `Date`, or null. */
export function toDate(d: Date | string | null | undefined): Date | null {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "yyyy-mm-dd" or null. */
export function fmtDate(d: Date | string | null): string | null {
  const date = toDate(d);
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Full ISO-8601 timestamp (UTC) or null — for read-models that carry an instant. */
export function fmtIso(d: Date | string | null): string | null {
  const date = toDate(d);
  return date ? date.toISOString() : null;
}

/** "yyyy-mm-dd hh:mm" for timeline entries. */
export function fmtDateTime(d: Date | string | null): string | null {
  const date = toDate(d);
  return date ? date.toISOString().slice(0, 16).replace("T", " ") : null;
}
