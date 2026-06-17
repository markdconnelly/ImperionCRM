import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeLaborCost } from "@/lib/auth/roles";
import { StatusBarChart } from "@/components/reporting/report-charts";

export const metadata = { title: "Expense · Reporting" };
export const dynamic = "force-dynamic"; // role-gated comp-adjacent surface, never prerendered

const fmtCount = new Intl.NumberFormat("en-US");
const fmtDollars = (n: number) => `$${fmtCount.format(n)}`;

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-dim">{hint}</div>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Anchored domain heading (ADR-0062), mirroring the BI hub's section headers. */
function SectionHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div id={id} className="mt-2 flex scroll-mt-16 items-baseline gap-2">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      {hint && <span className="text-xs text-dim">{hint}</span>}
    </div>
  );
}

/**
 * Expense-analytics report (#492, epic #482) — the Reports group's Expense leaf,
 * a dedicated per-domain page mirroring the Wave-8 split (sales/finance/…). Gated
 * by `canSeeLaborCost` (admin | finance): a role outside that set is redirected to
 * the home hub, so none of these figures reach the client.
 *
 * Every figure is a COMP-FREE AGGREGATE over the silver expense surface (ADR-0083):
 * spend by category / employee / month, the reimbursable-vs-internal split, the
 * billable rollup, the report-lifecycle distribution, policy-violation counts, and
 * the reimbursement-reconciliation verdict. The mileage dollar amount arrives
 * pre-derived in `expense_item.amount` (the backend is the sole reader of
 * `mileage_rate`); this surface NEVER reads `mileage_rate` or any pay/comp store,
 * and shows NO row-level PII — only summed dollars + counts. The whole section
 * rides the same gate as Time Efficiency, by design. This front end only renders
 * (ADR-0042); the reads are gold/read-model only.
 *
 * Build-ahead: empty/zero until `expense_item` / `expense_report` carry rows
 * (deploy-ahead of the pipeline merge + backend writes).
 */
export default async function ExpenseReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeLaborCost(roles)) redirect("/");

  const { reports } = getRepositories();
  const expense = await reports.expenseAnalytics();
  const openFlags = expense.violationsBySeverity.reduce((n, d) => n + d.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Expense analytics"
        description="Comp-free aggregates over the silver expense surface — spend, reimbursement & policy. Finance/admin only."
      >
        <Link href="/reporting" className="text-sm text-dim transition-colors hover:text-text">
          ← Reporting
        </Link>
      </PageHeader>

      {expense.totalSpend > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Total spend"
              value={fmtDollars(expense.totalSpend)}
              hint="all expense items — aggregate"
            />
            <StatTile
              label="Reimbursable"
              value={fmtDollars(expense.totalReimbursable)}
              hint="owed back to employees"
            />
            <StatTile
              label="Billable"
              value={fmtDollars(expense.totalBillable)}
              hint="passed through to clients (independent leg)"
            />
            <StatTile
              label="Open policy flags"
              value={fmtCount.format(openFlags)}
              hint="hard + soft, pre-attest memory-jogger"
            />
          </div>

          <SectionHeading id="spend" title="Spend" hint="by category, employee & month — aggregate" />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="Spend by category" subtitle="Σ amount per expense category">
              {expense.byCategory.length > 0 ? (
                <StatusBarChart data={expense.byCategory} color="#5B8DEF" />
              ) : (
                <p className="py-10 text-center text-sm text-dim">No categorized spend yet.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Spend by employee"
              subtitle="Σ amount per employee — aggregate, no line items"
            >
              {expense.byEmployee.length > 0 ? (
                <StatusBarChart data={expense.byEmployee} color="#7C6BF0" />
              ) : (
                <p className="py-10 text-center text-sm text-dim">No employee spend yet.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Spend by month"
              subtitle="Σ amount per month (item date), last 12 months"
            >
              {expense.byMonth.length > 0 ? (
                <StatusBarChart data={expense.byMonth} color="#3FBF8F" />
              ) : (
                <p className="py-10 text-center text-sm text-dim">No monthly spend yet.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Reimbursable vs non-reimbursable"
              subtitle="Split of total spend by reimbursement leg"
            >
              <StatusBarChart data={expense.reimbursableSplit} color="#E0A33E" />
            </ChartCard>
          </div>

          <SectionHeading
            id="lifecycle"
            title="Reimbursement & policy"
            hint="report lifecycle, QuickBooks reconciliation, policy flags"
          />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard
              title="Reports by status"
              subtitle="Monthly expense reports per lifecycle state"
            >
              {expense.reportsByState.length > 0 ? (
                <StatusBarChart data={expense.reportsByState} color="#5B8DEF" />
              ) : (
                <p className="py-10 text-center text-sm text-dim">No expense reports yet.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Reimbursement status"
              subtitle="QuickBooks reconciliation verdict (read-only)"
            >
              {expense.reconciliationByVerdict.length > 0 ? (
                <StatusBarChart data={expense.reconciliationByVerdict} color="#3FBF8F" />
              ) : (
                <p className="py-10 text-center text-sm text-dim">No reconciliations yet.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Policy violations"
              subtitle="Open flags by severity (hard blocks attest)"
            >
              {expense.violationsBySeverity.length > 0 ? (
                <StatusBarChart data={expense.violationsBySeverity} color="#E2615A" />
              ) : (
                <p className="py-10 text-center text-sm text-dim">No policy violations.</p>
              )}
            </ChartCard>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="py-6 text-center text-sm text-dim">
            No expense items recorded yet — analytics populate once expense reports flow
            (deploy-ahead, #492).
          </p>
        </div>
      )}
    </div>
  );
}
