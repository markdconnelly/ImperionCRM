import { fmtUsd, periodLabel, STATE_LABEL } from "@/lib/expenses/overview";
import { diffAgainstSnapshot } from "@/lib/expenses/corrections";
import type { AdminExpenseReview, ExpenseCategoryRow, ExpenseItemRow } from "@/types";

/**
 * The admin review panel for a Submitted expense report (ADR-0083 #488, mirrors the
 * timesheet ApprovalReview #477). The report's items with a correction status badge per row
 * (added / edited vs the employee's immutable attested original) + removed-since-attest
 * lines, then the lifecycle actions: approve (→ fires the idempotent Autotask ExpenseReport
 * row), reject with a note, or reopen. Admins may also CORRECT out-of-pocket items in place —
 * edit / delete each, or add a line — every op audited vs the attest (`expense.corrected`);
 * the report stays Submitted. Mileage is read-only (its $ is backend-derived). Comp-free.
 */

const TONE: Record<"added" | "edited", string> = {
  added: "text-green",
  edited: "text-amber",
};

/** A compact category <select> shared by the add + edit correction forms. */
function CategorySelect({
  categories,
  defaultValue,
}: {
  categories: ExpenseCategoryRow[];
  defaultValue?: string | null;
}) {
  return (
    <select
      name="categoryId"
      defaultValue={defaultValue ?? ""}
      className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
    >
      <option value="">Uncategorized</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.displayName}
        </option>
      ))}
    </select>
  );
}

/** The editable correction fields (date / category / amount / merchant / legs), reused by
 *  the per-row edit form and the add-line form. Pre-filled from `item` when editing. */
function CorrectionFields({
  categories,
  item,
}: {
  categories: ExpenseCategoryRow[];
  item?: ExpenseItemRow;
}) {
  return (
    <>
      <input
        type="date"
        name="itemDate"
        defaultValue={item?.itemDate ?? ""}
        className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
      />
      <CategorySelect categories={categories} defaultValue={null} />
      <input
        type="number"
        name="amount"
        step="0.01"
        min="0.01"
        defaultValue={item ? item.amount : ""}
        placeholder="0.00"
        className="w-24 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs tabular-nums text-text outline-none focus:border-accent"
      />
      <input
        type="text"
        name="merchant"
        defaultValue={item?.merchant ?? ""}
        placeholder="Merchant"
        className="w-32 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
      />
      <label className="flex items-center gap-1 text-xs text-dim">
        <input type="checkbox" name="reimbursable" defaultChecked={item?.reimbursable ?? true} />
        Reimb.
      </label>
      <label className="flex items-center gap-1 text-xs text-dim">
        <input type="checkbox" name="billable" defaultChecked={item?.billable ?? false} />
        Bill.
      </label>
      <input
        type="number"
        name="autotaskCompanyId"
        min="1"
        placeholder="companyID"
        className="w-24 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs tabular-nums text-text outline-none focus:border-accent"
      />
    </>
  );
}

export function ExpenseReview({
  employeeName,
  detail,
  categories,
  approveAction,
  rejectAction,
  reopenAction,
  addCorrectionAction,
  updateCorrectionAction,
  deleteCorrectionAction,
}: {
  employeeName: string;
  detail: AdminExpenseReview;
  categories: ExpenseCategoryRow[];
  approveAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
  reopenAction: (formData: FormData) => void | Promise<void>;
  addCorrectionAction: (formData: FormData) => void | Promise<void>;
  updateCorrectionAction: (formData: FormData) => void | Promise<void>;
  deleteCorrectionAction: (formData: FormData) => void | Promise<void>;
}) {
  // Diff the live items against the employee's attested original so each row carries an
  // added/edited badge and we can list anything removed since the attest.
  const diff = diffAgainstSnapshot(detail.items, detail.attestedSnapshot);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm text-text">
          Review — {employeeName}, {periodLabel({ year: detail.periodYear, month: detail.periodMonth })}
        </div>
        <div className="text-xs text-dim">
          {STATE_LABEL[detail.state]} · {fmtUsd(detail.totalAmount)} total ·{" "}
          {fmtUsd(detail.reimbursableAmount)} reimbursable
          {diff.changed && <span className="ml-2 text-amber">· corrected vs attest</span>}
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
              <th className="px-3 py-2 font-medium">vs attest</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {detail.items.length === 0 ? (
              <tr className="bg-panel">
                <td colSpan={8} className="px-3 py-4 text-center text-dim">
                  No items on this report.
                </td>
              </tr>
            ) : (
              detail.items.map((it) => {
                const status = diff.status.get(it.id);
                const correctable = it.kind === "out_of_pocket";
                return (
                  <tr key={it.id} className="bg-panel align-top">
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
                    <td className="px-3 py-2 text-xs">
                      {status === "added" || status === "edited" ? (
                        <span className={TONE[status]}>{status}</span>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {correctable ? (
                        <details>
                          <summary className="cursor-pointer text-accent hover:underline">
                            Correct
                          </summary>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <form
                              action={updateCorrectionAction}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input type="hidden" name="id" value={detail.id} />
                              <input type="hidden" name="itemId" value={it.id} />
                              <CorrectionFields categories={categories} item={it} />
                              <button
                                type="submit"
                                className="rounded-md border border-accent bg-accent/10 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                              >
                                Save
                              </button>
                            </form>
                            <form action={deleteCorrectionAction} className="inline">
                              <input type="hidden" name="id" value={detail.id} />
                              <input type="hidden" name="itemId" value={it.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-red bg-red/10 px-2 py-1 text-xs text-red transition-colors hover:bg-red/20"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </details>
                      ) : (
                        <span className="text-xs text-dim" title="Mileage is backend-derived">
                          read-only
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Items present in the attest but removed during correction. */}
      {diff.removed.length > 0 && (
        <div className="rounded-lg border border-border bg-panel-2 p-3 text-xs text-dim">
          <span className="text-red">Removed since attest:</span>{" "}
          {diff.removed
            .map((r) => `${r.itemDate} ${r.merchant ?? r.categoryName ?? ""} ${fmtUsd(r.amount)}`)
            .join(" · ")}
        </div>
      )}

      {/* Add a missing out-of-pocket line (audited as an `add` correction). */}
      <details className="rounded-lg border border-border bg-panel-2 p-3">
        <summary className="cursor-pointer text-xs text-accent hover:underline">
          Add an out-of-pocket line
        </summary>
        <form action={addCorrectionAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={detail.id} />
          <CorrectionFields categories={categories} />
          <button
            type="submit"
            className="rounded-md border border-green bg-green/10 px-2 py-1 text-xs text-green transition-colors hover:bg-green/20"
          >
            Add line
          </button>
        </form>
      </details>

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
