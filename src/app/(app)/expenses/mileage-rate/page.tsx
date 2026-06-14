import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageMileageRate } from "@/lib/auth/roles";
import { setMileageRateAction } from "./actions";

/**
 * Mileage Rate (ADR-0083, #490) — the payroll-gated comp admin for the effective-dated,
 * SYSTEM-wide mileage reimbursement rate (`mileage_rate`).
 *
 * COMP DATA, gated EXACTLY like Pay Rate: finance∨admin only (`canManageMileageRate` /
 * `expense:mileage-rate`), NEVER visible to employee/agent/client roles. The employee
 * entry GUI never reads the rate — it shows only miles + MileIQ's own suggested $; the
 * per-employee mileage amount is DERIVED BY THE BACKEND (the sole comp reader) by
 * multiplying a drive's miles by the rate in force on its date. A new override is
 * effective-dated so amounts recompute against the rate that applied on the drive date;
 * history is preserved for back-period reconciliation.
 *
 * MileIQ's own suggested rate is shown read-only when known (a `mileiq_suggested` row,
 * written by the pipeline once MileIQ creds land, #495). Until then the suggested-rate
 * card degrades gracefully to "not yet available".
 */
export default async function MileageRatePage() {
  const roles = await getSessionRoles();
  if (!canManageMileageRate(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mileage rate" description="Payroll setup" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to the mileage rate — this is comp-sensitive payroll
          data, restricted to finance and admin (ADR-0083).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const rates = await crm.listMileageRates();

  const current = rates.find((r) => r.isCurrent) ?? null;
  // MileIQ's own suggestion — the most recent mileiq_suggested row, if the pipeline has
  // written one. Empty until MileIQ creds land (#495) — degrade gracefully.
  const mileiqSuggested = rates.find((r) => r.source === "mileiq_suggested") ?? null;
  const fmt = (rate: number) => `$${rate.toFixed(4)}/mi`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mileage rate"
        description="Effective-dated system reimbursement rate · comp-gated (finance / admin)"
      />

      <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 text-xs text-amber">
        Comp-sensitive. The mileage rate sets every employee&apos;s reimbursement — it is
        visible only to finance and admin, never to employees. The app never computes the
        per-employee amount here; the backend reconciliation multiplies a drive&apos;s miles
        by the rate in force on its date.
      </div>

      {/* ── Current state: in-force rate + MileIQ's suggestion ─────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-xs text-dim">Rate in force today ({today})</div>
          {current ? (
            <>
              <div className="mt-1 text-2xl font-medium text-text">{fmt(current.rate)}</div>
              <div className="mt-1 text-xs text-dim">
                Effective {current.effectiveFrom} ·{" "}
                {current.source === "mileiq_suggested" ? "MileIQ suggested" : "system override"}
                {current.createdByName ? ` · set by ${current.createdByName}` : ""}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-dim">
              No rate set yet. Set an effective-dated override below — until one exists, the
              backend has no rate to reconcile mileage against.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-xs text-dim">MileIQ suggested rate</div>
          {mileiqSuggested ? (
            <>
              <div className="mt-1 text-2xl font-medium text-text">{fmt(mileiqSuggested.rate)}</div>
              <div className="mt-1 text-xs text-dim">
                Effective {mileiqSuggested.effectiveFrom} · synced from MileIQ
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-dim">
              Not yet available. MileIQ&apos;s suggested rate appears once the MileIQ
              integration is connected (#495). Until then, set the rate manually below.
            </div>
          )}
        </div>
      </div>

      {/* ── Set a new effective-dated override ─────────────────────────────────── */}
      <form
        action={setMileageRateAction}
        className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4"
      >
        <div className="text-sm font-medium text-text">Set a system override</div>
        <div className="text-xs text-dim">
          The new rate applies to drives on or after its effective date; earlier drives keep
          the rate that applied then. Setting the same effective date again overwrites it.
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-dim">
            Effective from
            <input
              type="date"
              name="effectiveFrom"
              defaultValue={today}
              required
              className="w-44 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-dim">
            Rate ($/mile)
            <input
              type="number"
              name="rate"
              min="0"
              step="0.0001"
              required
              placeholder="0.7000"
              className="w-32 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
            Note (optional)
            <input
              type="text"
              name="note"
              placeholder="e.g. matches IRS standard mileage rate"
              className="min-w-48 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20"
          >
            Set rate
          </button>
        </div>
      </form>

      {/* ── History ─────────────────────────────────────────────────────────────── */}
      {rates.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No rate history yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Effective from</th>
                <th className="px-4 py-2 font-medium">Rate</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Set by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map((r) => (
                <tr key={r.id} className="bg-panel align-middle">
                  <td className="px-4 py-2 text-text">
                    {r.effectiveFrom}
                    {r.isCurrent && (
                      <span className="ml-2 rounded-md border border-green/40 bg-green/10 px-1.5 py-0.5 text-xs text-green">
                        In force
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-text">{fmt(r.rate)}</td>
                  <td className="px-4 py-2 text-dim">
                    {r.source === "mileiq_suggested" ? "MileIQ suggested" : "System override"}
                  </td>
                  <td className="px-4 py-2 text-dim">{r.note ?? "—"}</td>
                  <td className="px-4 py-2 text-dim">{r.createdByName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
