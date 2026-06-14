import { fmtUsd, periodLabel, STATE_LABEL } from "@/lib/expenses/overview";
import type { AdminExpenseReview } from "@/types";

/**
 * The admin review panel for a Submitted expense report (ADR-0083, mirrors the timesheet
 * ApprovalReview #539). Read-only items view + the correctness actions: approve (→ fires
 * the idempotent Autotask ExpenseReport row), reject with a note (bounces to the
 * employee), or reopen. In-place item correction is the deeper admin GUI (#488), deferred —
 * an admin who needs a change rejects with a note for now. Comp-free. Rendered when a
 * submitted row is selected (`?review=<id>`).
 */
export function ExpenseReview({
  employeeName,
  detail,
  approveAction,
  rejectAction,
  reopenAction,
}: {
  employeeName: string;
  detail: AdminExpenseReview;
  approveAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
  reopenAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm text-text">
          Review — {employeeName}, {periodLabel({ year: detail.periodYear, month: detail.periodMonth })}
        </div>
        <div className="text-xs text-dim">
          {STATE_LABEL[detail.state]} · {fmtUsd(detail.totalAmount)} total ·{" "}
          {fmtUsd(detail.reimbursableAmount)} reimbursable
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-left text-xs text-dim">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Detail</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Reimb.</th>
              <th className="px-3 py-2 font-medium">Bill.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {detail.items.length === 0 ? (
              <tr className="bg-panel">
                <td colSpan={6} className="px-3 py-4 text-center text-dim">
                  No items on this report.
                </td>
              </tr>
            ) : (
              detail.items.map((it) => (
                <tr key={it.id} className="bg-panel">
                  <td className="px-3 py-2">{it.itemDate}</td>
                  <td className="px-3 py-2 text-dim">
                    {it.kind === "mileage" ? "Mileage" : (it.categoryName ?? "—")}
                  </td>
                  <td className="px-3 py-2 text-dim">
                    {it.kind === "mileage" ? `${it.miles ?? 0} mi` : (it.merchant ?? "—")}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{fmtUsd(it.amount)}</td>
                  <td className="px-3 py-2 text-dim">{it.reimbursable ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-dim">{it.billable ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={approveAction} className="inline">
          <input type="hidden" name="id" value={detail.id} />
          <button
            type="submit"
            className="rounded-md border border-green bg-green/10 px-3 py-1 text-xs text-green transition-colors hover:bg-green/20"
          >
            Approve
          </button>
        </form>
        <form action={rejectAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={detail.id} />
          <input
            type="text"
            name="note"
            placeholder="Reason (sent to employee)"
            className="w-60 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-md border border-red bg-red/10 px-3 py-1 text-xs text-red transition-colors hover:bg-red/20"
          >
            Reject
          </button>
        </form>
        <form action={reopenAction} className="ml-auto inline">
          <input type="hidden" name="id" value={detail.id} />
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1 text-xs text-dim transition-colors hover:text-text"
          >
            Reopen
          </button>
        </form>
      </div>
    </div>
  );
}
