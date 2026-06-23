/**
 * Recurring invoice GENERATION (#1095, epic #1045 AR/AP & cash-flow; ADR-0085 QBO read-only).
 *
 * Pure, dependency-free, NOT server-only — safe to import from a server generation route, a
 * future recurring-billing admin surface, and the vitest suite alike. This module turns a
 * recurring-billing template (`recurring_invoice_schedule`, migration 0901) into the per-period
 * DRAFTS (`generated_invoice`) that a future Mark-gated backend job will POST to QuickBooks.
 *
 * THE QBO GATE. QuickBooks is the invoice system of record and is read-only on our side TODAY
 * (ADR-0085) — there is no QBO write path and the write scopes are Mark-gated. So this module
 * builds the DRAFT payload only; it NEVER calls QuickBooks. The drafts wait in
 * `generated_invoice` (status `pending`) until the gated push runs.
 *
 * DETERMINISTIC + IDEMPOTENT. Generation is a pure function of (schedule, as-of date): identical
 * input → identical drafts, no randomness, no hidden clock. Each draft carries a `periodKey`
 * (the occurrence's calendar day) that is the DB idempotency anchor
 * (`UNIQUE (schedule_id, period_key)`), so re-running over an already-generated period is a
 * no-op and a retry never double-bills.
 *
 * CADENCE comes from `recurrence.ts` (the RRULE-subset engine already used by task recurrence,
 * ADR-0070 E2) — one cadence vocabulary across the app, no second parser. Money is summed in
 * integer cents to avoid float drift, then formatted back to a 2dp string (mirrors invoice-aging).
 */

import { nextOccurrence, parseRRule } from "@/lib/recurrence";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One billable line on a recurring schedule / generated draft. QBO computes tax/totals at push. */
export interface RecurringInvoiceLineItem {
  description: string;
  /** Units billed; defaults to 1 when absent/invalid. */
  quantity: number;
  /** Per-unit amount as a money string ("125.00") — numeric-as-text, like the rest of the AR surface. */
  unitAmount: string;
}

/** The recurring-billing template the generator reads (`recurring_invoice_schedule`, mig 0901). */
export interface RecurringInvoiceSchedule {
  id: string;
  tenantId: string;
  accountId: string;
  /** RFC-5545 RRULE subset, e.g. "FREQ=MONTHLY;INTERVAL=1". */
  rrule: string;
  lineItems: RecurringInvoiceLineItem[];
  currency: string;
  /** Net days from txn date → due date (the aging-clock terms carried to QBO). */
  netTermsDays: number;
  status: "active" | "paused" | "ended";
  /** First occurrence seed (yyyy-mm-dd). */
  startOn: string;
  /** Schedule close (yyyy-mm-dd), or null = open-ended. */
  endOn: string | null;
  /** Next due occurrence the generator targets (yyyy-mm-dd). */
  nextRunOn: string;
  /** periodKey of the most recently generated draft, or null = none yet (idempotency anchor). */
  lastGeneratedPeriod: string | null;
}

/** A draft the generator produced for one due period — the to-be-pushed `generated_invoice` row. */
export interface GeneratedInvoiceDraft {
  scheduleId: string;
  tenantId: string;
  /** The billed occurrence as a calendar day — DB idempotency key with scheduleId. */
  periodKey: string;
  txnDate: string;
  dueDate: string;
  lineItems: RecurringInvoiceLineItem[];
  currency: string;
  /** App-side subtotal (Σ qty×unitAmount), 2dp money string. QBO recomputes tax/totals at push. */
  totalAmount: string;
}

/** Result of advancing a schedule: the drafts to insert + the schedule fields to persist. */
export interface GenerationResult {
  drafts: GeneratedInvoiceDraft[];
  /** The new `next_run_on` to store (first not-yet-due occurrence, or the close day). */
  nextRunOn: string;
  /** The new `last_generated_period` to store (periodKey of the last draft, else unchanged). */
  lastGeneratedPeriod: string | null;
  /** True when the schedule has run past its `endOn` and should move to `ended`. */
  ended: boolean;
}

/** Parse a money string to integer cents (0 when null/blank/unparseable). */
function toCents(amount: string | null | undefined): number {
  if (!amount) return 0;
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Format integer cents back to a 2dp money string ("1200.00"). */
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** A non-negative integer quantity, defaulting to 1 for an absent/invalid value. */
function safeQuantity(q: number): number {
  if (!Number.isFinite(q) || q <= 0) return 1;
  return q;
}

/**
 * App-side subtotal of a draft's line items, as a 2dp money string. Summed in integer cents so
 * repeated lines never drift. QBO is the SoR for the real total once pushed — this is for
 * display/approval only.
 */
export function draftSubtotal(lineItems: RecurringInvoiceLineItem[]): string {
  const cents = lineItems.reduce(
    (acc, li) => acc + Math.round(toCents(li.unitAmount) * safeQuantity(li.quantity)),
    0,
  );
  return fromCents(cents);
}

/** Add `days` calendar days to a yyyy-mm-dd day on a UTC clock (DST-safe). */
function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Generate every DRAFT a schedule owes up to and including `asOf` (yyyy-mm-dd), catching up any
 * missed periods deterministically. Returns the drafts plus the schedule fields to persist.
 *
 * Rules:
 *  - Only `active` schedules generate; `paused`/`ended` return no drafts (next_run_on unchanged).
 *  - An occurrence on or before `asOf` and on or before `endOn` (when set) produces one draft.
 *  - A `periodKey` ≤ `lastGeneratedPeriod` is skipped (already generated — idempotent catch-up).
 *  - `txnDate` = the occurrence day; `dueDate` = txnDate + netTermsDays.
 *  - A safety cap (`maxPeriods`, default 120) bounds catch-up so a stale schedule cannot emit an
 *    unbounded run; the caller persists `nextRunOn` and resumes next invocation.
 *
 * Pure: no DB, no clock, no QBO. The caller inserts the drafts with ON CONFLICT DO NOTHING
 * (the (schedule_id, period_key) unique index is the real idempotency guarantee).
 */
export function generateDueDrafts(
  schedule: RecurringInvoiceSchedule,
  asOf: string,
  maxPeriods = 120,
): GenerationResult {
  if (!ISO_DATE.test(asOf)) throw new Error(`recurring-invoice: bad asOf ${asOf}`);

  const unchanged: GenerationResult = {
    drafts: [],
    nextRunOn: schedule.nextRunOn,
    lastGeneratedPeriod: schedule.lastGeneratedPeriod,
    ended: false,
  };

  if (schedule.status !== "active") return unchanged;

  const rule = parseRRule(schedule.rrule);
  if (!rule) return unchanged; // malformed cadence → no recurrence (treated as inert, not a throw)

  const drafts: GeneratedInvoiceDraft[] = [];
  let cursor = schedule.nextRunOn;
  let lastGeneratedPeriod = schedule.lastGeneratedPeriod;
  let ended = false;

  for (let i = 0; i < maxPeriods; i++) {
    // Past the schedule's close → done, mark ended.
    if (schedule.endOn && cursor > schedule.endOn) {
      ended = true;
      break;
    }
    // Not yet due → stop; cursor is the next run to persist.
    if (cursor > asOf) break;

    // Skip a period already generated (idempotent catch-up; the DB unique index is the backstop).
    if (!lastGeneratedPeriod || cursor > lastGeneratedPeriod) {
      drafts.push({
        scheduleId: schedule.id,
        tenantId: schedule.tenantId,
        periodKey: cursor,
        txnDate: cursor,
        dueDate: addDays(cursor, Math.max(0, Math.floor(schedule.netTermsDays))),
        lineItems: schedule.lineItems,
        currency: schedule.currency,
        totalAmount: draftSubtotal(schedule.lineItems),
      });
      lastGeneratedPeriod = cursor;
    }

    cursor = nextOccurrence(rule, cursor);
  }

  return { drafts, nextRunOn: cursor, lastGeneratedPeriod, ended };
}

/**
 * Whether a schedule is due to generate as of `asOf` — the generator worklist predicate (mirrors
 * the `idx_recurring_invoice_schedule_due` partial index). Active, started, and not past close.
 */
export function isScheduleDue(schedule: RecurringInvoiceSchedule, asOf: string): boolean {
  if (schedule.status !== "active") return false;
  if (schedule.nextRunOn > asOf) return false;
  if (schedule.endOn && schedule.nextRunOn > schedule.endOn) return false;
  return true;
}
