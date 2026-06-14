import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getPayrollMatch } from "@/lib/timesheets/payroll-match";
import { getSessionRoles } from "@/lib/auth/session";
import { canApprovePayroll } from "@/lib/auth/roles";
import { weekLabel } from "@/lib/week";
import { payrollApproveAction, unapprovePayrollAction, markPaidAction } from "./actions";

function fmtHours(min: number): string {
  return `${(min / 60).toFixed(2)}h`;
}

const STATE_LABEL: Record<string, string> = {
  approved: "Approved",
  payroll_approved: "Payroll-approved",
  paid: "Paid",
};

const STATE_TONE: Record<string, string> = {
  approved: "text-amber",
  payroll_approved: "text-accent",
  paid: "text-green",
};

/**
 * Payroll Approval (ADR-0082, #466) — the CFO gate + Paid surface. Lists every
 * Approved timesheet plus the later payroll states across employees (from the
 * comp-free `timesheet_payroll_status` view). The CFO payroll-approves an Approved
 * sheet (authorizes payment; the app never pays), then confirms the backend-suggested
 * QuickBooks match to set it Paid. finance∨admin (`time:payroll-approve`). The
 * QuickBooks match math lives in the backend (BE #105) — this surface only records
 * the confirmation, and degrades to manual entry when the backend isn't wired. No
 * compensation data appears here (ADR-0082 §Security).
 */
export default async function PayrollApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canApprovePayroll(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Payroll approval" description="CFO payroll gate" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to payroll approval — this surface is finance / admin
          only (ADR-0082).
        </div>
      </div>
    );
  }

  const { match } = await searchParams;
  const { crm } = getRepositories();
  const rows = await crm.listPayrollTimesheets();

  // The backend-suggested QuickBooks match for the selected payroll-approved sheet —
  // null when the backend / QuickBooks isn't wired (graceful → manual entry, ADR-0018).
  const selected =
    match ? rows.find((r) => r.id === match && r.state === "payroll_approved") ?? null : null;
  const suggestion = selected ? await getPayrollMatch(selected.id) : null;

  const awaitingApproval = rows.filter((r) => r.state === "approved").length;
  const awaitingPayment = rows.filter((r) => r.state === "payroll_approved").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll approval"
        description={`${awaitingApproval} to approve · ${awaitingPayment} awaiting payment`}
      />

      <div className="rounded-lg border border-border bg-panel p-4 text-xs text-dim">
        Approved sheets land here for payroll sign-off. <span className="text-text">Payroll-approve</span>{" "}
        authorizes payment (the app never pays). Then confirm the{" "}
        <span className="text-text">QuickBooks payment</span> match to mark the week Paid — the
        match is suggested by the backend; until it&apos;s wired, enter the payment id manually.
        No pay-rate or amount data appears here.
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No approved timesheets yet. Weeks an admin has approved appear here for payroll.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Week</th>
                <th className="px-4 py-2 font-medium">Approved hrs</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={cn("bg-panel align-middle", r.id === match && "bg-panel-2")}
                >
                  <td className="px-4 py-2 text-text">{r.employeeName}</td>
                  <td className="px-4 py-2 text-dim">{weekLabel(r.weekStart)}</td>
                  <td className="px-4 py-2 tabular-nums text-dim">{fmtHours(r.approvedMinutes)}</td>
                  <td className={cn("px-4 py-2 text-xs", STATE_TONE[r.state])}>
                    {STATE_LABEL[r.state] ?? r.state}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.state === "approved" && (
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
                    {r.state === "payroll_approved" && (
                      <Link
                        href={`/timesheets/payroll?match=${r.id}`}
                        className="text-accent transition-colors hover:underline"
                      >
                        {r.id === match ? "Confirming" : "Confirm payment"}
                      </Link>
                    )}
                    {r.state === "paid" && (
                      <span className="text-xs text-dim" title={r.paidAt?.slice(0, 10) ?? undefined}>
                        Paid · QB {r.qbPaymentRef ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4">
          <div className="text-sm text-text">
            Confirm payment — {selected.employeeName}, {weekLabel(selected.weekStart)} (
            {fmtHours(selected.approvedMinutes)})
          </div>
          <div className="text-xs text-dim">
            {suggestion?.matched
              ? `Backend matched a QuickBooks payment: ${suggestion.detail}`
              : suggestion
                ? `No automatic match: ${suggestion.detail}`
                : "QuickBooks reconciliation isn't wired in this environment — enter the payment id manually (acceptable for UAT)."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={markPaidAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={selected.id} />
              <input
                type="text"
                name="qbPaymentRef"
                defaultValue={suggestion?.qbPaymentRef ?? ""}
                placeholder="QuickBooks payment id"
                className="w-56 rounded-md border border-border bg-panel-2 px-2 py-1 text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-md border border-green bg-green/10 px-3 py-1 text-xs text-green transition-colors hover:bg-green/20"
              >
                Confirm paid
              </button>
            </form>
            <form action={unapprovePayrollAction} className="ml-auto inline">
              <input type="hidden" name="id" value={selected.id} />
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1 text-xs text-dim transition-colors hover:text-text"
              >
                Unapprove
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
