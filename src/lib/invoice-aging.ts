/**
 * Invoice aging read-model helpers (#668; ADR-0085 QBO read-only / ADR-0044 external-SoR mirror).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, a future AR /
 * collections worklist or BI-hub surface, and the vitest suite alike. The aging itself is a
 * DATABASE PROJECTION (`invoice_mirror` view, migration 0121): QuickBooks is the
 * invoice system of record and read-only on our side, so the view recomputes `days_overdue` /
 * `aging_bucket` / `is_open` on every read against the latest pulled bronze `qbo_invoices`.
 * This module only READS those projected rows and rolls them up for display / sort — it never
 * derives the buckets (that is the view's job) and is never random or time-dependent: identical
 * input → identical output. Money is summed in integer cents to avoid float drift, then
 * formatted back to a 2dp string.
 */

import type { InvoiceAgingBucket, InvoiceAgingSummary, InvoiceMirrorRow } from "@/types";

/** The overdue (past-due) buckets, in escalating order — distinct from `current` / `paid`. */
const OVERDUE_BUCKETS: InvoiceAgingBucket[] = ["1-30", "31-60", "61-90", "90+"];

/** Worklist bucket order (oldest debt first is the most urgent for collections). */
const BUCKET_ORDER: InvoiceAgingBucket[] = ["90+", "61-90", "31-60", "1-30", "current"];

/** True when a mirrored invoice is open AND past its due date (any overdue bucket). */
export function isOverdue(row: InvoiceMirrorRow): boolean {
  return row.isOpen && OVERDUE_BUCKETS.includes(row.agingBucket);
}

/**
 * Collections-worklist sort priority: oldest debt first (90+ → … → 1-30 → current), then
 * `paid` last. Lower number = higher urgency. Stable for `Array.prototype.sort`.
 */
export function agingUrgencyRank(bucket: InvoiceAgingBucket): number {
  const i = BUCKET_ORDER.indexOf(bucket);
  return i === -1 ? BUCKET_ORDER.length : i; // `paid` (not in the list) sinks to the bottom
}

/**
 * Order rows for the collections worklist: most-overdue first, ties broken by the larger
 * open balance (chase the bigger debt first). Returns a NEW array; input is not mutated.
 */
export function sortByAging(rows: InvoiceMirrorRow[]): InvoiceMirrorRow[] {
  return [...rows].sort((a, b) => {
    const byBucket = agingUrgencyRank(a.agingBucket) - agingUrgencyRank(b.agingBucket);
    if (byBucket !== 0) return byBucket;
    return toCents(b.balance) - toCents(a.balance); // larger open balance first
  });
}

/** Parse a numeric-as-string money value to integer cents (0 when null/blank/unparseable). */
function toCents(amount: string | null): number {
  if (amount == null || amount === "") return 0;
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Format integer cents back to a 2dp money string ("1200.00"). */
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Roll a set of mirrored invoice rows up into the AR aging summary (#668 collections
 * headline, BI hub ADR-0062). Open = `isOpen`; overdue = open AND in a past-due bucket.
 * Per-bucket totals are reported for the open buckets only (`paid` is excluded from the
 * breakdown — settled debt is not on the worklist). Pure: same input → same output.
 */
export function summarizeAging(rows: InvoiceMirrorRow[]): InvoiceAgingSummary {
  const open = rows.filter((r) => r.isOpen);
  const overdue = open.filter(isOverdue);

  const openBalance = open.reduce((acc, r) => acc + toCents(r.balance), 0);
  const overdueBalance = overdue.reduce((acc, r) => acc + toCents(r.balance), 0);

  // Per-bucket open count + balance, in worklist order (current → 90+).
  const openBuckets: InvoiceAgingBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];
  const buckets = openBuckets.map((bucket) => {
    const inBucket = open.filter((r) => r.agingBucket === bucket);
    const balance = inBucket.reduce((acc, r) => acc + toCents(r.balance), 0);
    return { bucket, count: inBucket.length, balance: fromCents(balance) };
  });

  return {
    openCount: open.length,
    overdueCount: overdue.length,
    openBalance: fromCents(openBalance),
    overdueBalance: fromCents(overdueBalance),
    buckets,
  };
}
