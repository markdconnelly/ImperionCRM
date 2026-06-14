import Link from "next/link";

import { cn } from "@/lib/cn";
import {
  fmtUsd,
  LIFECYCLE_STAGES,
  STATE_LABEL,
  type LedgerRow,
  type OverviewMonth,
} from "@/lib/expenses/overview";
import type { ExpenseReportRow, ExpenseReportState } from "@/types";

const STATE_TONE: Record<ExpenseReportState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-green",
  finance_approved: "text-green",
  reimbursed: "text-green",
  rejected: "text-red",
};

const STAGE_LABEL = ["Submitted", "Admin", "Finance", "Reimbursed"] as const;

/**
 * The list-first employee expenses landing (ADR-0083, mirrors timesheet #538). Three
 * stacked sections: the "needs attention & current" strip (open/start a month), the full
 * table of the employee's reports, and the bottom lifecycle ledger showing each attested
 * report move Submitted → Admin approved → Finance approved → Reimbursed. Self-scoped:
 * the page only ever passes the signed-in employee's own rows.
 */
export function ExpensesOverview({
  months,
  rows,
  ledger,
  createAction,
}: {
  months: OverviewMonth[];
  rows: ExpenseReportRow[];
  ledger: LedgerRow[];
  createAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Needs attention & current ───────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-dim">Needs attention &amp; current</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((m) => (
            <MonthTile key={m.key} month={m} createAction={createAction} />
          ))}
        </div>
      </section>

      {/* ── All of the employee's reports ───────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-dim">Your expense reports</h2>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
            No expense reports yet — start one for the current month above. You only need a
            report for a month in which you have an expense.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-panel-2 text-left text-xs text-dim">
                <tr>
                  <th className="px-4 py-2 font-medium">Month</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Reimbursable</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const period = `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`;
                  const editable = r.state === "open" || r.state === "rejected";
                  return (
                    <tr key={r.id} className="bg-panel">
                      <td className="px-4 py-2">{period}</td>
                      <td className="px-4 py-2 text-dim">{fmtUsd(r.totalAmount)}</td>
                      <td className="px-4 py-2 text-dim">{fmtUsd(r.reimbursableAmount)}</td>
                      <td className="px-4 py-2 text-dim">{r.itemCount}</td>
                      <td className={cn("px-4 py-2 font-medium", STATE_TONE[r.state])}>
                        {STATE_LABEL[r.state]}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/expenses?period=${period}`}
                          className="text-accent transition-colors hover:text-text"
                        >
                          {editable ? "Edit" : "View"} →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Lifecycle ledger ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-dim">Status &amp; reimbursements</h2>
        {ledger.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
            Once you submit a month, you&apos;ll see it move through admin approval, finance
            approval, and reimbursement here.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ledger.map((r) => {
              const period = `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`;
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col">
                    <Link
                      href={`/expenses?period=${period}`}
                      className="text-sm font-medium transition-colors hover:text-accent"
                    >
                      {period}
                    </Link>
                    <span className="text-xs text-dim">
                      {fmtUsd(r.reimbursableAmount)} reimbursable
                    </span>
                  </div>
                  <LifecycleTrack stageIndex={r.stageIndex} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** A single attention/current month — open it if started, otherwise offer to start it. */
function MonthTile({
  month,
  createAction,
}: {
  month: OverviewMonth;
  createAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-panel p-4",
        month.isCurrent ? "border-accent/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{month.label}</span>
          <span className="text-xs text-dim">{month.isCurrent ? "This month" : "Needs attention"}</span>
        </div>
        {month.report ? (
          <span className={cn("text-xs font-medium", STATE_TONE[month.report.state])}>
            {STATE_LABEL[month.report.state]}
          </span>
        ) : (
          <span className="text-xs text-dim">Not started</span>
        )}
      </div>

      {month.report ? (
        <Link
          href={`/expenses?period=${month.key}`}
          className="inline-flex w-fit items-center rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:border-accent hover:text-accent"
        >
          Open report →
        </Link>
      ) : (
        <form action={createAction}>
          <input type="hidden" name="period" value={month.key} />
          <button
            type="submit"
            className="inline-flex w-fit items-center rounded-md bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Start expense report
          </button>
        </form>
      )}
    </div>
  );
}

/** The four-step progress track for a report in the lifecycle ledger. */
function LifecycleTrack({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {LIFECYCLE_STAGES.map((stage, i) => {
        const reached = i <= stageIndex;
        const isReimbursed = stage === "reimbursed" && reached;
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                reached
                  ? isReimbursed
                    ? "bg-green/15 text-green"
                    : "bg-accent/15 text-accent"
                  : "bg-panel-2 text-dim",
              )}
            >
              {STAGE_LABEL[i]}
            </span>
            {i < LIFECYCLE_STAGES.length - 1 && (
              <span className={cn("h-px w-3", reached ? "bg-accent/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
