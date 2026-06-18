"use client";

import { useState } from "react";
import Link from "next/link";
import { TicketPicker } from "@/components/tickets/ticket-picker";
import { createMileageItemAction } from "@/app/(app)/expenses/mileage/actions";

// Manual mileage entry form (#853, ADR-0083) — v1 interim while MileIQ is paywalled
// (full MileIQ → v2). Miles only; the reimbursement $ is backend-derived on approval
// (the mileage rate is comp data the employee may not read), so NO dollar figure is
// shown here. Ticket link is required only when the leg is billable.

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

const ERRORS: Record<string, string> = {
  date: "Pick a date for the drive.",
  miles: "Enter miles greater than 0.",
  "ticket-required": "Billable mileage must link an Autotask ticket.",
  "company-required": "Billable mileage needs an Autotask company id.",
  locked: "That month’s report is already submitted — reopen it to add mileage.",
};

type Props = { period: string; defaultDate: string; error?: string };

export function MileageForm({ period, defaultDate, error }: Props) {
  const [billable, setBillable] = useState(false);

  return (
    <form action={createMileageItemAction} className="flex max-w-xl flex-col gap-4">
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
          <span className="mb-1 block text-xs text-dim">Miles</span>
          <input
            type="number"
            name="miles"
            min="0.1"
            step="0.1"
            placeholder="12.4"
            required
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-xs text-dim">From (optional)</span>
          <input name="origin" placeholder="Office" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-dim">To (optional)</span>
          <input name="destination" placeholder="Client site" className={inputClass} />
        </label>
      </div>

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
      )}

      <TicketPicker
        name="ticketRef"
        label={billable ? "Ticket (required for billable)" : "Ticket (optional)"}
        required={billable}
      />

      <label className="block">
        <span className="mb-1 block text-xs text-dim">Notes (optional)</span>
        <textarea name="notes" rows={2} placeholder="Purpose of the trip…" className={inputClass} />
      </label>

      <p className="text-xs text-dim">
        Reimbursement is calculated on approval at the current mileage rate — enter miles only.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Add mileage
        </button>
        <Link href={`/expenses?period=${period}`} className="text-sm text-dim hover:text-text">
          Cancel
        </Link>
      </div>
    </form>
  );
}
