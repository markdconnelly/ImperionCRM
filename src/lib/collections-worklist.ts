/**
 * Pure helpers for the collections aging WORKLIST surface (#678, parent #668).
 *
 * Joins the read-only invoice MIRROR (`invoice_mirror` view, migration 0121, ADR-0085
 * QBO read-only) to the app-native dunning OVERLAY (`collections_activity`, migration
 * 0122, #677) into one display row, then filters it by account / aging bucket / dunning
 * status. PURE — no pg, no node:*, no env — so the join, the filter, and the account-
 * option derivation are unit-testable directly and shared between the server page and the
 * (future) Collections agent. Aging is NEVER recomputed here — it is the view's job
 * (`agingBucket` / `daysOverdue` come straight off `InvoiceMirrorRow`); this module only
 * READS those projected values and the overlay state. App-native: nothing here writes
 * QuickBooks or moves money (ADR-0087).
 */
import type {
  CollectionsActivity,
  DunningStatus,
  InvoiceAgingBucket,
  InvoiceMirrorRow,
} from "@/types";
import { isOverdue } from "@/lib/invoice-aging";
import { emptyCollectionsActivity } from "@/lib/collections";

/**
 * One row of the collections worklist: a mirrored invoice paired with its current dunning
 * overlay state. `activity` is the real overlay row when the invoice has been worked, else
 * the implicit not-yet-worked overlay (`status: none`) — so the UI renders every overdue
 * invoice uniformly. Local to this module by design (concurrency: the shared barrel
 * `src/types/index.ts` is owned by another lane this session).
 */
export interface CollectionsWorklistRow {
  invoice: InvoiceMirrorRow;
  activity: CollectionsActivity;
}

/** The overdue (past-due) buckets exposed as worklist filter options, escalating order. */
export const WORKLIST_BUCKETS: readonly InvoiceAgingBucket[] = ["1-30", "31-60", "61-90", "90+"];

/**
 * Join mirrored invoices to their overlay rows. Only OPEN & OVERDUE invoices belong on the
 * worklist (settled / current debt is not chased), so paid & not-yet-due rows are dropped.
 * `overlays` is keyed by QBO invoice id (the batched `getCollectionsActivityForMany` read);
 * a missing key means the invoice has never been worked → the implicit empty overlay. Input
 * order is preserved (the mirror read already sorts oldest-overdue first).
 */
export function buildWorklist(
  invoices: readonly InvoiceMirrorRow[],
  overlays: Readonly<Record<string, CollectionsActivity>>,
): CollectionsWorklistRow[] {
  return invoices
    .filter(isOverdue)
    .map((invoice) => ({
      invoice,
      activity: overlays[invoice.qboInvoiceId] ?? emptyCollectionsActivity(invoice.qboInvoiceId),
    }));
}

/** Active filter state for the worklist (all optional — absent ⟺ no filter on that axis). */
export interface WorklistFilters {
  /** Silver account id; matches `InvoiceMirrorRow.accountId`. */
  accountId?: string | null;
  bucket?: InvoiceAgingBucket | null;
  status?: DunningStatus | null;
}

/**
 * Apply the account / bucket / dunning-status filters to a built worklist. Returns a NEW
 * array; input is not mutated. An absent (null/undefined) filter axis matches everything.
 */
export function filterWorklist(
  rows: readonly CollectionsWorklistRow[],
  filters: WorklistFilters,
): CollectionsWorklistRow[] {
  return rows.filter((r) => {
    if (filters.accountId && r.invoice.accountId !== filters.accountId) return false;
    if (filters.bucket && r.invoice.agingBucket !== filters.bucket) return false;
    if (filters.status && r.activity.status !== filters.status) return false;
    return true;
  });
}

/** A pickable account for the worklist account filter (id + display name). */
export interface WorklistAccountOption {
  id: string;
  name: string;
}

/**
 * Distinct accounts present on the worklist, for the account filter dropdown. Keyed by the
 * silver `accountId` (best-effort resolved on the mirror); invoices with no resolved account
 * are excluded from the options (they still show under "no filter"). Sorted by name.
 */
export function worklistAccountOptions(
  rows: readonly CollectionsWorklistRow[],
): WorklistAccountOption[] {
  const byId = new Map<string, string>();
  for (const r of rows) {
    const id = r.invoice.accountId;
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, r.invoice.accountName ?? "—");
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
