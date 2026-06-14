import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ReimbursementMatch } from "@/components/expenses/reimbursement-match";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canApprovePayroll } from "@/lib/auth/roles";
import {
  bucketCounts,
  EXPENSE_STATE_LABEL,
  expenseLegStatus,
  filterSortClose,
  fmtHours,
  fmtUsd,
  hasException,
  periodLabel,
  timeLegStatus,
  type CloseFilter,
  type Filters,
  type LegStatus,
  type SortDir,
  type SortKey,
} from "@/lib/monthly-close/overview";
import { financeApproveExpenseAction, confirmReimbursedAction } from "./actions";

type SP = {
  q?: string;
  bucket?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  match?: string;
};

const SORT_KEYS: SortKey[] = ["period", "employee", "time", "expense"];
const BUCKETS: { key: CloseFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open obligations" },
  { key: "exceptions", label: "Exceptions" },
  { key: "settled", label: "Settled" },
];

const LEG_TONE: Record<LegStatus, string> = {
  none: "text-dim",
  pending: "text-dim",
  open: "text-amber",
  mismatch: "text-red",
  settled: "text-green",
};
const LEG_LABEL: Record<LegStatus, string> = {
  none: "—",
  pending: "Pending",
  open: "Owed",
  mismatch: "Exception",
  settled: "Settled",
};

/**
 * Unified Monthly Close (ADR-0083 #491, amends ADR-0082) — the SINGLE monthly finance
 * task rolling up BOTH legs per employee per month: approved time minutes + reimbursable
 * expense total, each with its QuickBooks read-back status, plus the open obligations
 * (approved/finance-approved but not yet confirmed paid). Finance∨admin only
 * (`canApprovePayroll`). The expense leg is 1:1 with the row, so finance-approve and
 * confirm-reimbursed act inline here; the time leg pays per weekly timesheet, so the row
 * deep-links into `/timesheets/admin` filtered to that employee. Read-back validation:
 * when the backend reconciliation matches the QuickBooks payment(s) a leg flips
 * Paid/Reimbursed; a mismatch surfaces as an exception that blocks the auto-flip. The app
 * never pays — finance only authorizes and records the match. Comp-free throughout (the
 * `monthly_close` view carries minutes + dollar amounts only, never a rate).
 */
export default async function MonthlyClosePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const roles = await getSessionRoles();
  if (!canApprovePayroll(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Monthly Close" description="Unified time + expense finance close" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to the Monthly Close — this surface is finance / admin
          only (ADR-0083, amends ADR-0082).
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const filters: Filters = {
    q: sp.q,
    bucket: (BUCKETS.some((b) => b.key === sp.bucket) ? sp.bucket : "all") as CloseFilter,
    from: sp.from,
    to: sp.to,
    sort: (SORT_KEYS.includes(sp.sort as SortKey) ? sp.sort : "period") as SortKey,
    dir: (sp.dir === "asc" ? "asc" : "desc") as SortDir,
  };

  const { crm } = getRepositories();
  const all = await crm.listAllMonthlyClose();
  const counts = bucketCounts(all);
  const rows = filterSortClose(all, filters);

  // Reimbursement-confirm panel (?match=<expenseReportId>) — only for a finance-approved
  // expense leg whose obligation is still open in the feed.
  const matchRow =
    sp.match && all.find((r) => r.expenseReportId === sp.match && r.expenseObligationOpen);
  const matchSuggestion = matchRow
    ? await crm.getExpenseReimbursementMatch(sp.match as string)
    : null;

  // Query-string builder from the active filters + overrides (drops empties).
  const base: Record<string, string | undefined> = {
    q: filters.q,
    bucket: filters.bucket === "all" ? undefined : filters.bucket,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
    dir: filters.dir,
  };
  const query = (over: Record<string, string | undefined>): string => {
    const merged = { ...base, ...over };
    const qs = Object.entries(merged)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&");
    return qs ? `/monthly-close?${qs}` : "/monthly-close";
  };
  const sortHref = (key: SortKey): string => {
    const dir = filters.sort === key && filters.dir === "asc" ? "desc" : "asc";
    return query({ sort: key, dir, match: undefined });
  };
  const arrow = (key: SortKey) =>
    filters.sort === key ? (filters.dir === "asc" ? " ↑" : " ↓") : "";

  // The time-leg deep link → the per-week timesheet admin surface, filtered to the employee.
  const timeAdminHref = (employeeName: string) =>
    `/timesheets/admin?q=${encodeURIComponent(employeeName)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monthly Close"
        description={`${rows.length} of ${counts.all} employee-month${counts.all === 1 ? "" : "s"} · ${counts.open} with open obligations · ${counts.exceptions} exception${counts.exceptions === 1 ? "" : "s"}`}
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <form
        method="get"
        action="/monthly-close"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel p-3"
      >
        <label className="flex flex-col gap-1 text-xs text-dim">
          Employee
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="name…"
            className="w-44 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Status
          <select
            name="bucket"
            defaultValue={filters.bucket}
            className="w-44 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          >
            {BUCKETS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label} ({counts[b.key]})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Month from
          <input
            type="month"
            name="from"
            defaultValue={filters.from ?? ""}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Month to
          <input
            type="month"
            name="to"
            defaultValue={filters.to ?? ""}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="dir" value={filters.dir} />
        <button
          type="submit"
          className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20"
        >
          Apply
        </button>
        <Link
          href="/monthly-close"
          className="px-2 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          Clear
        </Link>
      </form>

      {/* ── Close table ─────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          {counts.all === 0
            ? "No monthly close rows yet — they appear once timesheets or expense reports land for a month. (Backend QuickBooks reconciliation is dormant until credentials are configured.)"
            : "No employee-months match these filters."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">
                  <Link href={sortHref("employee")} className="hover:text-text">
                    Employee{arrow("employee")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">
                  <Link href={sortHref("period")} className="hover:text-text">
                    Month{arrow("period")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">
                  <Link href={sortHref("time")} className="hover:text-text">
                    Time{arrow("time")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">Time status</th>
                <th className="px-4 py-2 font-medium">
                  <Link href={sortHref("expense")} className="hover:text-text">
                    Reimbursable{arrow("expense")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">Expense status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const t = timeLegStatus(r);
                const e = expenseLegStatus(r);
                const rowKey = `${r.appUserId}-${r.periodYear}-${r.periodMonth}`;
                const selected = r.expenseReportId != null && r.expenseReportId === sp.match;
                return (
                  <tr key={rowKey} className={cn("bg-panel", selected && "bg-panel-2")}>
                    <td className="px-4 py-2 text-text">{r.employeeName}</td>
                    <td className="px-4 py-2 text-dim">{periodLabel(r.periodYear, r.periodMonth)}</td>
                    {/* time leg — minutes only, never pay (comp stays in the backend) */}
                    <td className="px-4 py-2 tabular-nums text-dim">
                      {r.timesheetCount === 0 ? "—" : fmtHours(r.approvedTimeMinutes)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <Link
                        href={timeAdminHref(r.employeeName)}
                        className={cn("font-medium hover:underline", LEG_TONE[t])}
                        title={
                          t === "none"
                            ? "No timesheet this month"
                            : `${r.paidCount}/${r.timesheetCount} weekly timesheets paid — open in Time Admin`
                        }
                      >
                        {LEG_LABEL[t]}
                        {t !== "none" && (
                          <span className="ml-1 text-dim">
                            ({r.paidCount}/{r.timesheetCount})
                          </span>
                        )}
                      </Link>
                    </td>
                    {/* expense leg — reimbursable total + state badge */}
                    <td className="px-4 py-2 tabular-nums text-dim">
                      {r.expenseReportId === null ? "—" : fmtUsd(r.reimbursableTotal)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <span className={cn("font-medium", LEG_TONE[e])}>{LEG_LABEL[e]}</span>
                      {r.expenseState && (
                        <span className="ml-1 text-dim">
                          ({EXPENSE_STATE_LABEL[r.expenseState]})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {/* approved expense report → finance-approve (inline) */}
                      {r.expenseState === "approved" && (
                        <form action={financeApproveExpenseAction} className="inline">
                          <input type="hidden" name="id" value={r.expenseReportId ?? ""} />
                          <button
                            type="submit"
                            className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                          >
                            Finance-approve expense
                          </button>
                        </form>
                      )}
                      {/* finance-approved expense → confirm the QuickBooks reimbursement */}
                      {e === "open" && r.expenseState === "finance_approved" && (
                        <Link
                          href={query({ match: r.expenseReportId ?? undefined })}
                          className="text-accent transition-colors hover:underline"
                        >
                          {r.expenseReportId === sp.match ? "Confirming" : "Confirm reimbursement"}
                        </Link>
                      )}
                      {hasException(r) && (
                        <span
                          className="text-xs text-red"
                          title="The backend QuickBooks reconciliation found a discrepancy — auto-flip to Reimbursed is blocked until it's resolved."
                        >
                          QB mismatch — review
                        </span>
                      )}
                      {e === "settled" && (
                        <span className="text-xs text-dim" title="Reimbursed (QuickBooks Purchase)">
                          QB {r.qbPaymentRef ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-dim">
        Two independent legs: the time leg pays the wage (per weekly timesheet, rolled up by
        month — act on it in{" "}
        <Link href="/timesheets/admin" className="text-accent hover:underline">
          Time Admin
        </Link>
        ); the expense leg reimburses out-of-pocket (a separate AP bill, acted on here). The app
        never pays — finance authorizes the manual payment, and a leg flips Paid / Reimbursed only
        when the backend matches the QuickBooks payment.
      </p>

      {/* ── In-context reimbursement-confirm panel ──────────────────────── */}
      {matchRow && (
        <ReimbursementMatch
          selected={{
            id: matchRow.expenseReportId as string,
            employeeName: matchRow.employeeName,
            period: periodLabel(matchRow.periodYear, matchRow.periodMonth),
            reimbursableAmount: matchRow.reimbursableTotal,
          }}
          suggestion={matchSuggestion}
          markReimbursedAction={confirmReimbursedAction}
        />
      )}
    </div>
  );
}
