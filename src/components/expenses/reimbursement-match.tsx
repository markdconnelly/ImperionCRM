import { fmtUsd } from "@/lib/expenses/overview";
import type { ExpenseReimbursementMatch } from "@/types";

/**
 * The QuickBooks reimbursement-match confirmation panel (ADR-0083, mirrors the timesheet
 * PaymentMatch #466) — finance sets a finance-approved report to Reimbursed by confirming
 * the matched QuickBooks Purchase. The match is suggested by the backend recon (BE #111);
 * when it isn't wired, finance enters the payment id manually (UAT-acceptable). No
 * compensation data crosses this surface. Rendered on the unified admin lifecycle page
 * (#548) when a finance-approved row is selected (`?match=<id>`).
 */
export function ReimbursementMatch({
  selected,
  suggestion,
  markReimbursedAction,
}: {
  selected: { id: string; employeeName: string; period: string; reimbursableAmount: number };
  suggestion: ExpenseReimbursementMatch | null;
  markReimbursedAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4">
      <div className="text-sm text-text">
        Confirm reimbursement — {selected.employeeName}, {selected.period} (
        {fmtUsd(selected.reimbursableAmount)} reimbursable)
      </div>
      <div className="text-xs text-dim">
        {suggestion?.matched
          ? `Backend matched a QuickBooks Purchase: ${suggestion.detail}`
          : suggestion
            ? `No automatic match: ${suggestion.detail}`
            : "QuickBooks reconciliation isn't wired in this environment — enter the payment id manually (acceptable for UAT)."}
      </div>
      <form action={markReimbursedAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={selected.id} />
        <input
          type="text"
          name="qbPaymentRef"
          defaultValue={suggestion?.qbPaymentRef ?? ""}
          placeholder="QuickBooks Purchase id"
          className="w-56 rounded-md border border-border bg-panel-2 px-2 py-1 text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md border border-green bg-green/10 px-3 py-1 text-xs text-green transition-colors hover:bg-green/20"
        >
          Confirm reimbursed
        </button>
      </form>
    </div>
  );
}
