import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseReview } from "@/components/expenses/expense-review";
import { ReimbursementMatch } from "@/components/expenses/reimbursement-match";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import {
  canAdministerExpenses,
  canApproveExpenses,
  canFinanceApproveExpenses,
} from "@/lib/auth/roles";
import { fmtUsd, periodLabel } from "@/lib/expenses/overview";
import {
  adminStateCounts,
  filterSortAdminExpenses,
  STATE_LABEL,
  STATE_ORDER,
  type AdminFilters,
  type AdminSortKey,
  type AdminStateFilter,
  type SortDir,
} from "@/lib/expenses/admin-overview";
import type { ExpenseReportState } from "@/types";
import {
  approveExpenseReportAction,
  financeApproveExpenseReportAction,
  markReimbursedAction,
  rejectExpenseReportAction,
  reopenExpenseReportAction,
} from "./actions";

const STATE_TONE: Record<ExpenseReportState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-amber",
  finance_approved: "text-accent-2",
  reimbursed: "text-green",
  rejected: "text-red",
};

type SP = {
  q?: string;
  state?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  review?: string;
  match?: string;
};

const SORT_KEYS: AdminSortKey[] = ["period", "employee", "state", "total"];

function periodOf(r: { periodYear: number; periodMonth: number }): string {
  return `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`;
}

/**
 * Expense administration (ADR-0083, #548) — the unified all-users lifecycle table that
 * mirrors the timesheet #539 surface. Every report, every employee, every state, with
 * filters (employee / state / period range) + sortable columns. Inline actions are
 * role-gated: admins approve / reject / reopen (`expense:approve`); finance finance-approve
 * / confirm-reimbursed (`expense:finance-approve`). Visible to either gate; comp-free
 * throughout. Detail panels open in-context via `?review=` (admin review) and `?match=`
 * (reimbursement confirmation).
 */
export default async function ExpenseAdminPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const roles = await getSessionRoles();
  if (!canAdministerExpenses(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Expense administration" description="Expense report lifecycle" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to expense administration — this surface is admin /
          finance only (ADR-0083).
        </div>
      </div>
    );
  }
  const isAdmin = canApproveExpenses(roles);
  const isFinance = canFinanceApproveExpenses(roles);

  const sp = await searchParams;
  const filters: AdminFilters = {
    q: sp.q,
    state: (sp.state as AdminStateFilter) || "all",
    from: sp.from,
    to: sp.to,
    sort: (SORT_KEYS.includes(sp.sort as AdminSortKey) ? sp.sort : "period") as AdminSortKey,
    dir: (sp.dir === "asc" ? "asc" : "desc") as SortDir,
  };

  const { crm } = getRepositories();
  const all = await crm.listAllExpenseReports();
  const counts = adminStateCounts(all);
  const rows = filterSortAdminExpenses(all, filters);

  // Detail panels — admin review (?review=) and reimbursement confirmation (?match=).
  const reviewing = sp.review && isAdmin ? await crm.getExpenseReportById(sp.review) : null;
  const reviewingName = all.find((r) => r.id === sp.review)?.employeeName ?? "Employee";
  const matchRow =
    sp.match && isFinance
      ? all.find((r) => r.id === sp.match && r.state === "finance_approved") ?? null
      : null;
  const matchSuggestion = matchRow ? await crm.getExpenseReimbursementMatch(matchRow.id) : null;

  // Build a query string from the active filters plus overrides (drops empties).
  const base: Record<string, string | undefined> = {
    q: filters.q,
    state: filters.state === "all" ? undefined : filters.state,
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
    return qs ? `/expenses/admin?${qs}` : "/expenses/admin";
  };
  // A column header link: select the key; toggle direction when it's already active.
  const sortHref = (key: AdminSortKey): string => {
    const dir = filters.sort === key && filters.dir === "asc" ? "desc" : "asc";
    return query({ sort: key, dir, review: undefined, match: undefined });
  };
  const arrow = (key: AdminSortKey) =>
    filters.sort === key ? (filters.dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expense administration"
        description={`${rows.length} of ${counts.all} report${counts.all === 1 ? "" : "s"} · ${counts.submitted} to review · ${counts.approved} to finance-approve`}
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <form
        method="get"
        action="/expenses/admin"
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
          State
          <select
            name="state"
            defaultValue={filters.state}
            className="w-44 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          >
            <option value="all">All states ({counts.all})</option>
            {STATE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATE_LABEL[s]} ({counts[s]})
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
        {/* preserve the active sort across a filter submit */}
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="dir" value={filters.dir} />
        <button
          type="submit"
          className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20"
        >
          Apply
        </button>
        <Link
          href="/expenses/admin"
          className="px-2 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          Clear
        </Link>
      </form>

      {/* ── Lifecycle table ─────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No expense reports match these filters.
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
                  <Link href={sortHref("total")} className="hover:text-text">
                    Total{arrow("total")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">Reimbursable</th>
                <th className="px-4 py-2 font-medium">
                  <Link href={sortHref("state")} className="hover:text-text">
                    State{arrow("state")}
                  </Link>
                </th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const selected = r.id === sp.review || r.id === sp.match;
                return (
                  <tr key={r.id} className={cn("bg-panel", selected && "bg-panel-2")}>
                    <td className="px-4 py-2 text-text">{r.employeeName}</td>
                    <td className="px-4 py-2 text-dim">{periodOf(r)}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">{fmtUsd(r.totalAmount)}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">{fmtUsd(r.reimbursableAmount)}</td>
                    <td className={cn("px-4 py-2 text-xs font-medium", STATE_TONE[r.state])}>
                      {STATE_LABEL[r.state]}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {/* submitted → admin review (approve / reject / reopen) */}
                      {r.state === "submitted" && isAdmin && (
                        <Link
                          href={query({ review: r.id, match: undefined })}
                          className="text-accent transition-colors hover:underline"
                        >
                          {r.id === sp.review ? "Reviewing" : "Review"}
                        </Link>
                      )}
                      {/* approved → finance finance-approve (inline) */}
                      {r.state === "approved" && isFinance && (
                        <form action={financeApproveExpenseReportAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                          >
                            Finance-approve
                          </button>
                        </form>
                      )}
                      {/* finance_approved → finance confirm reimbursement */}
                      {r.state === "finance_approved" && isFinance && (
                        <Link
                          href={query({ match: r.id, review: undefined })}
                          className="text-accent transition-colors hover:underline"
                        >
                          {r.id === sp.match ? "Confirming" : "Confirm reimbursement"}
                        </Link>
                      )}
                      {r.state === "reimbursed" && (
                        <span
                          className="text-xs text-dim"
                          title={r.reimbursedAt?.slice(0, 10) ?? undefined}
                        >
                          QB {r.qbPaymentRef ?? "—"}
                        </span>
                      )}
                      {r.state === "rejected" && <span className="text-xs text-dim">Rejected</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── In-context detail panels ────────────────────────────────────── */}
      {reviewing && (
        <ExpenseReview
          employeeName={reviewingName}
          detail={reviewing}
          approveAction={approveExpenseReportAction}
          rejectAction={rejectExpenseReportAction}
          reopenAction={reopenExpenseReportAction}
        />
      )}
      {matchRow && (
        <ReimbursementMatch
          selected={{
            id: matchRow.id,
            employeeName: matchRow.employeeName,
            period: periodLabel({ year: matchRow.periodYear, month: matchRow.periodMonth }),
            reimbursableAmount: matchRow.reimbursableAmount,
          }}
          suggestion={matchSuggestion}
          markReimbursedAction={markReimbursedAction}
        />
      )}
    </div>
  );
}
