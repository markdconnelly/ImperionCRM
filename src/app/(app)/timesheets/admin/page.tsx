import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalReview } from "@/components/timesheets/approval-review";
import { PaymentMatch } from "@/components/timesheets/payment-match";
import { getRepositories } from "@/lib/data";
import { getTimeDeviations } from "@/lib/timesheets/deviations";
import { getPayrollMatch } from "@/lib/timesheets/payroll-match";
import { getSessionRoles } from "@/lib/auth/session";
import {
  canAdministerTimesheets,
  canApprovePayroll,
  canApproveTimesheets,
} from "@/lib/auth/roles";
import { weekLabel } from "@/lib/week";
import {
  adminStateCounts,
  filterSortAdminTimesheets,
  fmtMinutes,
  STATE_LABEL,
  STATE_ORDER,
  type AdminFilters,
  type AdminSortKey,
  type AdminStateFilter,
  type SortDir,
} from "@/lib/timesheets/admin-overview";
import type { TimesheetState } from "@/types";
import {
  approveTimesheetAction,
  reopenTimesheetAction,
  addCorrectionAction,
  updateCorrectionAction,
  deleteCorrectionAction,
} from "../approvals/actions";
import {
  payrollApproveAction,
  unapprovePayrollAction,
  markPaidAction,
} from "../payroll/actions";

function fmtHours(min: number): string {
  return `${(min / 60).toFixed(2)}h`;
}

const STATE_TONE: Record<TimesheetState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-amber",
  payroll_approved: "text-accent-2",
  paid: "text-green",
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

const SORT_KEYS: AdminSortKey[] = ["week", "employee", "state", "attended"];

/**
 * Time administration (ADR-0082, #539) — the unified all-users lifecycle table that
 * absorbs the split correctness (#465) and payroll (#466) queues. Every timesheet,
 * every employee, every state, with filters (employee / state / week range) + sortable
 * columns. Inline actions are role-gated: admins approve/reopen + correct (`time:approve`);
 * finance payroll-approve / confirm-paid / unapprove (`time:payroll-approve`). Visible to
 * either gate; comp-free throughout. Detail panels open in-context via `?review=` (admin
 * correction) and `?match=` (payment confirmation).
 */
export default async function TimesheetAdminPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const roles = await getSessionRoles();
  if (!canAdministerTimesheets(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Time administration" description="Timesheet lifecycle" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to timesheet administration — this surface is admin /
          finance only (ADR-0082).
        </div>
      </div>
    );
  }
  const isAdmin = canApproveTimesheets(roles);
  const isFinance = canApprovePayroll(roles);

  const sp = await searchParams;
  const filters: AdminFilters = {
    q: sp.q,
    state: (sp.state as AdminStateFilter) || "all",
    from: sp.from,
    to: sp.to,
    sort: (SORT_KEYS.includes(sp.sort as AdminSortKey) ? sp.sort : "week") as AdminSortKey,
    dir: (sp.dir === "asc" ? "asc" : "desc") as SortDir,
  };

  const { crm } = getRepositories();
  const all = await crm.listAllTimesheets();
  const counts = adminStateCounts(all);
  const rows = filterSortAdminTimesheets(all, filters);

  // Detail panels — admin correction (?review=) and payment confirmation (?match=).
  const reviewing = sp.review && isAdmin ? await crm.getTimesheetById(sp.review) : null;
  const reviewingName = all.find((r) => r.id === sp.review)?.employeeName ?? "Employee";
  const reviewDeviations = reviewing ? await getTimeDeviations(reviewing.id) : [];
  const matchRow =
    sp.match && isFinance
      ? all.find((r) => r.id === sp.match && r.state === "payroll_approved") ?? null
      : null;
  const matchSuggestion = matchRow ? await getPayrollMatch(matchRow.id) : null;

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
    return qs ? `/timesheets/admin?${qs}` : "/timesheets/admin";
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
        title="Time administration"
        description={`${rows.length} of ${counts.all} timesheet${counts.all === 1 ? "" : "s"} · ${counts.submitted} to review · ${counts.approved} to pay`}
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <form
        method="get"
        action="/timesheets/admin"
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
          Week from
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Week to
          <input
            type="date"
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
          href="/timesheets/admin"
          className="px-2 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          Clear
        </Link>
      </form>

      {/* ── Lifecycle table ─────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No timesheets match these filters.
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
                  <Link href={sortHref("week")} className="hover:text-text">
                    Week{arrow("week")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">
                  <Link href={sortHref("attended")} className="hover:text-text">
                    Attended{arrow("attended")}
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">Approved</th>
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
                    <td className="px-4 py-2 text-dim">{weekLabel(r.weekStart)}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">{fmtMinutes(r.attendedMinutes)}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">
                      {r.state === "open" || r.state === "submitted" ? "—" : fmtHours(r.approvedMinutes)}
                    </td>
                    <td className={cn("px-4 py-2 text-xs font-medium", STATE_TONE[r.state])}>
                      {STATE_LABEL[r.state]}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {/* submitted → admin review (correct / approve / reopen) */}
                      {r.state === "submitted" && isAdmin && (
                        <Link
                          href={query({ review: r.id, match: undefined })}
                          className="text-accent transition-colors hover:underline"
                        >
                          {r.id === sp.review ? "Reviewing" : "Review"}
                        </Link>
                      )}
                      {/* approved → finance payroll-approve (inline) */}
                      {r.state === "approved" && isFinance && (
                        <form action={payrollApproveAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                          >
                            Payroll-approve
                          </button>
                        </form>
                      )}
                      {/* payroll_approved → finance confirm payment */}
                      {r.state === "payroll_approved" && isFinance && (
                        <Link
                          href={query({ match: r.id, review: undefined })}
                          className="text-accent transition-colors hover:underline"
                        >
                          {r.id === sp.match ? "Confirming" : "Confirm payment"}
                        </Link>
                      )}
                      {r.state === "paid" && (
                        <span className="text-xs text-dim" title={r.paidAt?.slice(0, 10) ?? undefined}>
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

      {/* ── In-context detail panels ────────────────────────────────────── */}
      {reviewing && (
        <ApprovalReview
          employeeName={reviewingName}
          detail={reviewing}
          deviations={reviewDeviations}
          approveAction={approveTimesheetAction}
          reopenAction={reopenTimesheetAction}
          addCorrectionAction={addCorrectionAction}
          updateCorrectionAction={updateCorrectionAction}
          deleteCorrectionAction={deleteCorrectionAction}
        />
      )}
      {matchRow && (
        <PaymentMatch
          selected={matchRow}
          suggestion={matchSuggestion}
          markPaidAction={markPaidAction}
          unapproveAction={unapprovePayrollAction}
        />
      )}
    </div>
  );
}
