import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { labelContractStatus, labelContractType } from "@/lib/tickets/autotask-labels";
import {
  EXPIRY_WINDOWS,
  parseExpiryWindow,
  listExpiringContracts,
} from "@/lib/renewals/expiry-radar";

export const metadata = { title: "Renewals · Expiry radar" };
// Role-gated revenue surface — never prerendered (mirrors /reporting/forecast).
export const dynamic = "force-dynamic";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Lead-time band → chip tone. Tighter lead time burns hotter. */
function leadTone(days: number | null): string {
  if (days === null) return "border-border text-dim";
  if (days <= 30) return "border-red/40 bg-red/10 text-red";
  if (days <= 60) return "border-amber/40 bg-amber/10 text-amber";
  return "border-border text-dim";
}

/**
 * Expiry radar (#1323, renewals epic #1304). A read-only worklist of active
 * contracts approaching end-of-term, over the existing `contract` silver (Autotask
 * SoR, ADR-0044) — no schema, no writes, no agent (v1 build doctrine, ADR-0123).
 * Revenue is RBAC-gated (`canSeeRevenue`, ADR-0030) server-side before render.
 */
export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const params = await searchParams;
  const windowDays = parseExpiryWindow(params.window);

  const [roles, rows] = await Promise.all([
    getSessionRoles(),
    listExpiringContracts(windowDays),
  ]);
  const showRevenue = canSeeRevenue(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Renewals — expiry radar"
        description="Active contracts approaching end-of-term, soonest first. The renewal worklist, read-only over the Autotask contract mirror."
      />

      {/* Look-ahead window switcher — preserves no other state, so plain links. */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-dim">Expiring within</span>
        <div className="flex overflow-hidden rounded-md border border-border">
          {EXPIRY_WINDOWS.map((w) => {
            const active = w === windowDays;
            return (
              <Link
                key={w}
                href={`/renewals?window=${w}`}
                aria-current={active ? "page" : undefined}
                className={[
                  "px-3 py-1 text-xs font-medium",
                  active ? "bg-accent text-bg" : "text-dim hover:bg-panel-2",
                ].join(" ")}
              >
                {w} days
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">Contract</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Service line</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Ends</th>
                <th className="px-4 py-2 font-medium">Lead time</th>
                <th className="px-4 py-2 text-right font-medium">Est. revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3 font-medium">
                    {c.name ?? "—"}
                    {c.number && <span className="ml-2 text-[11px] text-dim">#{c.number}</span>}
                  </td>
                  <td className="px-4 py-3 text-dim">{c.account ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{labelContractType(c.category)}</td>
                  <td className="px-4 py-3 text-dim">{labelContractStatus(c.status)}</td>
                  <td className="px-4 py-3 text-dim">{c.endDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[11px] ${leadTone(c.leadDays)}`}
                    >
                      {c.leadDays === null
                        ? "—"
                        : c.leadDays === 0
                          ? "today"
                          : `${c.leadDays}d`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-dim">
                    {!showRevenue
                      ? REDACTED_MONEY
                      : c.estimatedRevenue === null
                        ? "—"
                        : usd.format(c.estimatedRevenue)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-dim">
                    No contracts expire within {windowDays} days. Widen the window or
                    check that the Autotask contract sync has run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
