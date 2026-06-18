import Link from "next/link";
import { auth } from "@/auth";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ExpensesOverview } from "@/components/expenses/expenses-overview";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import {
  buildAttentionMonths,
  buildLifecycleLedger,
  fmtUsd,
  parsePeriod,
  periodLabel,
  STATE_LABEL,
} from "@/lib/expenses/overview";
import {
  capsFromCategories,
  itemHardViolationReason,
  HARD_VIOLATION_LABEL,
  type HardViolationReason,
} from "@/lib/expenses/policy";
import type { ExpenseItemRow, ExpenseReportState } from "@/types";
import {
  attestExpenseReportAction,
  createExpenseReportAction,
  reopenExpenseReportAction,
} from "./actions";

const STATE_TONE: Record<ExpenseReportState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-green",
  finance_approved: "text-green",
  reimbursed: "text-green",
  rejected: "text-red",
};

/** Honest empty state when the signed-in user isn't mapped to an employee record. */
function UnmappedEmployee() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My expenses" description="Monthly expense reports + reimbursement" />
      <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
        Your employee record isn&apos;t resolved yet — sign in with your Entra account on the live
        app to track expenses.
      </div>
    </div>
  );
}

/**
 * My Expenses (ADR-0083; list-first surface mirroring timesheet #538).
 *
 * Default view is a LIST: a "needs attention & current" strip (open or start a month —
 * lazy), the full table of the employee's monthly reports, and a bottom lifecycle ledger
 * tracking each submitted month through admin approval → finance approval → reimbursed.
 * Drilling into a month (`?period=YYYY-MM`) shows a read-only items view with the attest /
 * reopen lifecycle controls. Adding/editing items is the entry GUI (#487). Self-scoped:
 * the employee id is the signed-in user's.
 */
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const session = await auth();
  const employeeId = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!employeeId) return <UnmappedEmployee />;

  const { crm } = getRepositories();
  const parsed = period ? parsePeriod(period) : null;

  // ── Single-month detail ────────────────────────────────────────────────
  if (parsed) {
    const report = await crm.getExpenseReportForPeriod(employeeId, parsed.year, parsed.month);
    const state: ExpenseReportState = report?.state ?? "open";
    const items: ExpenseItemRow[] = report?.items ?? [];

    // Hard-policy gate (ADR-0083, #895): while the report is Open, flag the items that block
    // attestation (missing receipt / over cap / out-of-month) so the employee sees exactly
    // which rows to fix; the server action enforces the same gate authoritatively.
    const violations = new Map<string, HardViolationReason>();
    if (state === "open" && items.length > 0) {
      const caps = capsFromCategories(await crm.listExpenseCategories());
      for (const it of items) {
        const reason = itemHardViolationReason(it, parsed, caps);
        if (reason) violations.set(it.id, reason);
      }
    }
    const hasViolations = violations.size > 0;

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My expenses"
          description={`${periodLabel(parsed)}${
            report ? ` · ${fmtUsd(report.totalAmount)} total` : ""
          }`}
        >
          <span className={cn("text-sm font-medium", STATE_TONE[state])}>{STATE_LABEL[state]}</span>
        </PageHeader>

        <Link
          href="/expenses"
          className="-mt-2 w-fit text-sm text-dim transition-colors hover:text-text"
        >
          ← All expense reports
        </Link>

        {!report ? (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-panel p-6 text-sm text-dim">
            No report for {periodLabel(parsed)} yet.
            <form action={createExpenseReportAction}>
              <input type="hidden" name="period" value={period} />
              <button
                type="submit"
                className="inline-flex w-fit items-center rounded-md bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              >
                Start expense report
              </button>
            </form>
          </div>
        ) : (
          <>
            {report.state === "rejected" && (
              <div className="rounded-lg border border-red/40 bg-red/5 p-4 text-sm text-red">
                This report was rejected — reopen it to correct and re-attest.
              </div>
            )}

            {report.state === "open" && (
              <div className="flex justify-end">
                <Link
                  href={`/expenses/mileage/new?period=${period}`}
                  className="inline-flex items-center rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-text transition-colors hover:border-accent"
                >
                  + Add mileage
                </Link>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-panel-2 text-left text-xs text-dim">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Merchant / detail</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Reimbursable</th>
                    <th className="px-4 py-2 font-medium">Billable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr className="bg-panel">
                      <td colSpan={6} className="px-4 py-6 text-center text-dim">
                        No items yet. Use “Add mileage” above to log a drive; out-of-pocket entry is the entry GUI (#487).
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => {
                      const reason = violations.get(it.id);
                      return (
                      <tr key={it.id} className={cn("bg-panel", reason && "bg-red/5")}>
                        <td className="px-4 py-2">
                          {it.itemDate}
                          {reason && (
                            <span className="ml-2 inline-flex items-center rounded border border-red/40 bg-red/10 px-1.5 py-0.5 text-[11px] font-medium text-red">
                              {HARD_VIOLATION_LABEL[reason]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-dim">
                          {it.kind === "mileage" ? "Mileage" : (it.categoryName ?? "—")}
                        </td>
                        <td className="px-4 py-2 text-dim">
                          {it.kind === "mileage" ? `${it.miles ?? 0} mi` : (it.merchant ?? "—")}
                        </td>
                        <td className="px-4 py-2">{fmtUsd(it.amount)}</td>
                        <td className="px-4 py-2 text-dim">{it.reimbursable ? "Yes" : "No"}</td>
                        <td className="px-4 py-2 text-dim">{it.billable ? "Yes" : "No"}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Lifecycle controls — only the employee's own pre-submit / rejected states act here. */}
            {report.state === "open" && (
              <div className="flex flex-col gap-2">
                {hasViolations && (
                  <p className="w-fit rounded-md border border-red/40 bg-red/10 px-2.5 py-2 text-xs text-red">
                    Some items break a hard policy rule (missing receipt, over the category cap, or
                    dated outside {periodLabel(parsed)}). Fix the flagged rows before you can attest.
                  </p>
                )}
                <form action={attestExpenseReportAction} className="w-fit">
                  <input type="hidden" name="period" value={period} />
                  <button
                    type="submit"
                    disabled={hasViolations}
                    className={cn(
                      "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-opacity",
                      hasViolations
                        ? "cursor-not-allowed bg-panel-2 text-dim"
                        : "bg-accent text-bg hover:opacity-90",
                    )}
                  >
                    Attest &amp; submit
                  </button>
                </form>
              </div>
            )}
            {report.state === "rejected" && (
              <form action={reopenExpenseReportAction} className="w-fit">
                <input type="hidden" name="period" value={period} />
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
                >
                  Reopen to correct
                </button>
              </form>
            )}
          </>
        )}
      </div>
    );
  }

  // ── List landing ───────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const rows = await crm.listExpenseReports({ employeeId });
  const months = buildAttentionMonths(today, rows);
  const ledger = buildLifecycleLedger(rows);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My expenses"
        description="Your monthly expense reports — start a month to log mileage + out-of-pocket, then track it through approval and reimbursement."
      />
      <ExpensesOverview
        months={months}
        rows={rows}
        ledger={ledger}
        createAction={createExpenseReportAction}
      />
    </div>
  );
}
