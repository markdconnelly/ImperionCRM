"use client";

import { useState } from "react";
import Link from "next/link";
import { TicketPicker } from "@/components/tickets/ticket-picker";
import { createExpenseItemAction } from "@/app/(app)/expenses/out-of-pocket/actions";
import type { ExpenseCategoryRow } from "@/types";

// Out-of-pocket expense entry form (#487, ADR-0083) — the one item kind the employee
// hand-enters (mileage is pulled from MileIQ). Category comes from the visible mapped
// list (#489); the billable leg defaults from the category and, when on, requires an
// Autotask company. A receipt is attached separately and gates attest (not entry), so
// this form saves the line and the policy jogger nudges to add the receipt before submit.

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

const ERRORS: Record<string, string> = {
  date: "Pick a date for the expense.",
  amount: "Enter an amount greater than 0.",
  "category-required": "Pick a category.",
  "company-required": "A billable item needs an Autotask company id.",
  locked: "That month’s report is already submitted — reopen it to add items.",
};

type Props = {
  period: string;
  defaultDate: string;
  categories: ExpenseCategoryRow[];
  error?: string;
};

export function OutOfPocketForm({ period, defaultDate, categories, error }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const selected = categories.find((c) => c.id === categoryId);
  const [billable, setBillable] = useState(selected?.billableDefault ?? false);

  // When the category changes, follow its billable default (the employee can still override).
  function onCategoryChange(id: string) {
    setCategoryId(id);
    setBillable(categories.find((c) => c.id === id)?.billableDefault ?? false);
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
        No expense categories are available yet — an admin maps categories on the{" "}
        <Link href="/expenses/categories" className="text-accent hover:underline">
          categories
        </Link>{" "}
        page before out-of-pocket items can be entered.
      </div>
    );
  }

  return (
    <form action={createExpenseItemAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="period" value={period} />

      {error && ERRORS[error] && (
        <div className="rounded-lg border border-red/40 bg-red/5 p-3 text-sm text-red">
          {ERRORS[error]}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-xs text-dim">Date</span>
          <input type="date" name="itemDate" defaultValue={defaultDate} required className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-dim">Amount ($)</span>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            placeholder="24.50"
            required
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-dim">Category</span>
        <select
          name="categoryId"
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          required
          className={inputClass}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-dim">Merchant (optional)</span>
        <input name="merchant" placeholder="Office Depot" className={inputClass} />
      </label>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="reimbursable" defaultChecked className="h-4 w-4 rounded border-border bg-panel-2 accent-accent" />
          Reimbursable
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            name="billable"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
          />
          Billable to a client
        </label>
      </div>

      {billable && (
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-xs text-dim">Autotask company id</span>
            <input
              type="number"
              name="autotaskCompanyId"
              placeholder="0"
              required={billable}
              className={inputClass}
            />
          </label>
          <TicketPicker name="ticketRef" label="Ticket (optional)" required={false} />
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-xs text-dim">Description (optional)</span>
        <textarea name="description" rows={2} placeholder="What was this for…" className={inputClass} />
      </label>

      <p className="text-xs text-dim">
        Save the item, then drop or upload its receipt from the expense list (#899) — out-of-pocket
        items need a receipt before you can attest.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Add expense
        </button>
        <Link href={`/expenses?period=${period}`} className="text-sm text-dim hover:text-text">
          Cancel
        </Link>
      </div>
    </form>
  );
}
