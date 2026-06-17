import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { canSeeService } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import {
  CHANGE_STATUS_LABEL,
  CHANGE_TYPE_LABEL,
  effectiveRisk,
  riskBand,
  RISK_BAND_LABEL,
} from "@/lib/change";

export const dynamic = "force-dynamic";

/**
 * Change Enablement — list-first surface (ADR-0079, #656). An ITIL change is an app-native
 * working object Imperion creates (typed standard|normal|emergency), with status, affected
 * CMDB CIs (#645), and risk/approval/schedule columns the downstream slices populate. Gated
 * by the Service group guard (admin∨support); raising/editing is gated by `change:write`.
 * Reads degrade to [] when migration 0135 isn't applied yet (schema-lag-safe) — the page
 * shows an empty state, never a 500.
 */
export default async function ChangesPage() {
  const roles = await getSessionRoles();
  if (!canSeeService(roles)) redirect("/");
  const canWrite = can(roles, "change:write");

  const { changes } = getRepositories();
  const rows = await changes.listChangeRequests();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Changes"
        description="ITIL Change Enablement — app-native change requests over the managed estate, typed standard / normal / emergency, with affected configuration items. Autotask is the eventual change record system of record (routed in a later slice)."
      >
        {canWrite && (
          <Link
            href="/changes/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New change
          </Link>
        )}
      </PageHeader>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-panel p-8 text-sm text-dim">
          <Icon name="GitPullRequestArrow" size={16} />
          No change requests yet.{canWrite ? " Raise one to track a change over the estate." : ""}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/changes/${c.id}`} className="font-medium hover:text-accent">
                  {c.title}
                </Link>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
                  {c.changeType}
                </span>
              </div>
              {c.description && (
                <div className="mt-1 line-clamp-2 text-xs text-dim">{c.description}</div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-dim">
                <span className="rounded bg-panel-2 px-1.5 py-0.5">
                  {CHANGE_STATUS_LABEL[c.status]}
                </span>
                <span title={CHANGE_TYPE_LABEL[c.changeType]}>
                  {c.affectedCiCount} affected CI{c.affectedCiCount === 1 ? "" : "s"}
                </span>
                {(() => {
                  const risk = effectiveRisk(c.riskDerived, c.riskOverride);
                  return risk === null ? null : (
                    <span title={c.riskOverride !== null ? "admin override" : "CMDB-derived"}>
                      · risk {risk}/100 · {RISK_BAND_LABEL[riskBand(risk)]}
                      {c.riskOverride !== null ? " (override)" : ""}
                    </span>
                  );
                })()}
                {c.accountName && <span>· {c.accountName}</span>}
                <Link
                  href={`/changes/${c.id}`}
                  className="ml-auto text-accent transition-colors hover:underline"
                >
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
