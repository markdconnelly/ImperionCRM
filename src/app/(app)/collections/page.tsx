import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeCollections } from "@/lib/auth/roles";
import { can } from "@/lib/auth/policy";
import { fmtUsd } from "@/lib/expenses/overview";
import { DUNNING_STATUSES, type DunningStatus, type InvoiceAgingBucket } from "@/types";
import {
  buildWorklist,
  filterWorklist,
  worklistAccountOptions,
  WORKLIST_BUCKETS,
  type WorklistFilters,
} from "@/lib/collections-worklist";
import { DunningPanel } from "@/components/collections/dunning-panel";

type SP = {
  account?: string;
  bucket?: string;
  status?: string;
  invoice?: string;
};

const STATUS_LABEL: Record<DunningStatus, string> = {
  none: "Not worked",
  reminded: "Reminded",
  escalated: "Escalated",
  promised: "Promised",
  paused: "Paused",
  disputed: "Disputed",
};

const STATUS_TONE: Record<DunningStatus, string> = {
  none: "text-dim",
  reminded: "text-accent",
  escalated: "text-amber",
  promised: "text-green",
  paused: "text-dim",
  disputed: "text-red",
};

const BUCKET_TONE: Partial<Record<InvoiceAgingBucket, string>> = {
  "1-30": "text-amber",
  "31-60": "text-amber",
  "61-90": "text-red",
  "90+": "text-red",
};

/** Money formatter tolerant of the mirror's numeric-as-string balance (null → "—"). */
function money(balance: string | null): string {
  if (balance == null || balance === "") return "—";
  const n = Number(balance);
  return Number.isFinite(n) ? fmtUsd(n) : "—";
}

/**
 * Collections aging worklist (#678, parent #668; ADR-0085 QBO read-only / ADR-0087
 * orchestration). The human collections surface: every OPEN & OVERDUE invoice from the
 * read-only `invoice_mirror` (aging buckets come straight off the view — never recomputed
 * here), paired with its app-native dunning overlay (`collections_activity`). Filter by
 * account + aging bucket + dunning status. Drilling into an invoice (`?invoice=<qboId>`)
 * opens the dunning panel: reminder history + escalation/status, with write actions
 * (escalate / record activity / change status) gated `collections:write`. The drafted-
 * reminder SEND is the send slice (#679) — surfaced here only as a disabled placeholder.
 * Finance∨admin only (`canSeeCollections`). App-native — nothing here writes QuickBooks.
 */
export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const roles = await getSessionRoles();
  if (!canSeeCollections(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Collections" description="AR aging worklist + dunning" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to Collections — this surface is finance / admin only
          (ADR-0085).
        </div>
      </div>
    );
  }
  const canWrite = can(roles, "collections:write");

  const sp = await searchParams;
  const { crm } = getRepositories();

  // Read the read-only mirror, then batch-read the overlays for the overdue invoices only.
  const invoices = await crm.listInvoices();
  const overdueIds = buildWorklist(invoices, {}).map((r) => r.invoice.qboInvoiceId);
  const overlays =
    overdueIds.length > 0 ? await crm.getCollectionsActivityForMany(overdueIds) : {};
  const worklist = buildWorklist(invoices, overlays);

  // Filters (validated against the known vocabularies; unknown → no filter on that axis).
  const accountOptions = worklistAccountOptions(worklist);
  const bucket = (WORKLIST_BUCKETS as readonly string[]).includes(sp.bucket ?? "")
    ? (sp.bucket as InvoiceAgingBucket)
    : null;
  const status = (DUNNING_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as DunningStatus)
    : null;
  const accountId = accountOptions.some((a) => a.id === sp.account) ? sp.account! : null;
  const filters: WorklistFilters = { accountId, bucket, status };
  const rows = filterWorklist(worklist, filters);

  // The drilled-into invoice (must still be on the worklist), for the dunning panel.
  const selected = sp.invoice ? worklist.find((r) => r.invoice.qboInvoiceId === sp.invoice) : null;

  // Query-string builder preserving active filters.
  const base: Record<string, string | undefined> = {
    account: accountId ?? undefined,
    bucket: bucket ?? undefined,
    status: status ?? undefined,
  };
  const query = (over: Record<string, string | undefined>): string => {
    const merged = { ...base, ...over };
    const qs = Object.entries(merged)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&");
    return qs ? `/collections?${qs}` : "/collections";
  };

  const overdueTotal = rows.reduce((acc, r) => {
    const n = Number(r.invoice.balance);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Collections"
        description={`${rows.length} of ${worklist.length} overdue invoice${
          worklist.length === 1 ? "" : "s"
        } · ${fmtUsd(overdueTotal)} open in view`}
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <form
        method="get"
        action="/collections"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel p-3"
      >
        <label className="flex flex-col gap-1 text-xs text-dim">
          Account
          <select
            name="account"
            defaultValue={accountId ?? ""}
            className="w-48 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">All accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Aging bucket
          <select
            name="bucket"
            defaultValue={bucket ?? ""}
            className="w-36 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">All overdue</option>
            {WORKLIST_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b} days
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Dunning status
          <select
            name="status"
            defaultValue={status ?? ""}
            className="w-40 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">All statuses</option>
            {DUNNING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20"
        >
          Apply
        </button>
        <Link
          href="/collections"
          className="px-2 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          Clear
        </Link>
      </form>

      {/* ── Worklist table ──────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          {worklist.length === 0
            ? "No overdue invoices. The invoice mirror is read-only over QuickBooks (ADR-0085); rows appear once overdue invoices land from the pipeline."
            : "No overdue invoices match these filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Days overdue</th>
                <th className="px-4 py-2 font-medium">Bucket</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Dunning</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const inv = r.invoice;
                const isSelected = inv.qboInvoiceId === sp.invoice;
                return (
                  <tr key={inv.qboInvoiceId} className={cn("bg-panel", isSelected && "bg-panel-2")}>
                    <td className="px-4 py-2 font-medium text-text">
                      {inv.docNumber ? `#${inv.docNumber}` : inv.qboInvoiceId}
                    </td>
                    <td className="px-4 py-2 text-dim">
                      {inv.accountName ?? inv.qboCustomerName ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-dim">{inv.dueDate ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">{inv.daysOverdue ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={cn("font-medium", BUCKET_TONE[inv.agingBucket] ?? "text-dim")}>
                        {inv.agingBucket}
                      </span>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{money(inv.balance)}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className={cn("font-medium", STATUS_TONE[r.activity.status])}>
                        {STATUS_LABEL[r.activity.status]}
                      </span>
                      {r.activity.escalationLevel > 0 && (
                        <span className="ml-1 text-dim">L{r.activity.escalationLevel}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={query({ invoice: isSelected ? undefined : inv.qboInvoiceId })}
                        className="text-accent transition-colors hover:underline"
                      >
                        {isSelected ? "Close" : "Work"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── In-context dunning panel ─────────────────────────────────────── */}
      {selected && (
        <DunningPanel
          invoice={selected.invoice}
          activity={selected.activity}
          canWrite={canWrite}
          balanceLabel={money(selected.invoice.balance)}
          statusLabel={STATUS_LABEL}
        />
      )}
    </div>
  );
}
