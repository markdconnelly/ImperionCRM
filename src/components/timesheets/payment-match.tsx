import { weekLabel } from "@/lib/week";
import type { PayrollMatchSuggestion } from "@/types";

function fmtHours(min: number): string {
  return `${(min / 60).toFixed(2)}h`;
}

/**
 * The QuickBooks payment-match confirmation panel (ADR-0082, #466) — the CFO sets a
 * payroll-approved week to Paid by confirming the matched QuickBooks payment. The match
 * is suggested by the backend (BE #105); when it isn't wired, the CFO enters the payment
 * id manually (UAT-acceptable). Unapprove reverts before payment. No compensation data
 * crosses this surface. Rendered on the unified admin lifecycle page (#539) when a
 * payroll-approved row is selected (`?match=<id>`).
 */
export function PaymentMatch({
  selected,
  suggestion,
  markPaidAction,
  unapproveAction,
}: {
  selected: { id: string; employeeName: string; weekStart: string; approvedMinutes: number };
  suggestion: PayrollMatchSuggestion | null;
  markPaidAction: (formData: FormData) => void | Promise<void>;
  unapproveAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
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
        <form action={unapproveAction} className="ml-auto inline">
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
  );
}
