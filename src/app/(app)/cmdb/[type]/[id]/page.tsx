import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeCmdb } from "@/lib/auth/roles";
import { can } from "@/lib/auth/policy";
import { CI_TYPE_LABEL, CI_TYPE_ICON, asCiType } from "@/lib/cmdb/ci";
import { CiRelationships } from "@/components/cmdb/ci-relationships";
import { CiCriticality } from "@/components/cmdb/ci-criticality";
import { CriticalityBadge } from "@/components/cmdb/criticality-badge";
import { LifecycleBadge } from "@/components/cmdb/lifecycle-badge";
import { ImpactPanel } from "@/components/cmdb/impact-panel";
import { analyzeImpact } from "@/lib/cmdb/impact";

export const dynamic = "force-dynamic";

/**
 * CI detail (#645) — the drill-down for one Configuration Item. The CI is resolved
 * from the same union read-model the register lists (the union is the single source
 * of truth; there is no per-id accessor to keep the data layer append-only and the
 * staff-exclusion rule in one place). Admin-only, same gate as the register.
 *
 * `ciId` is unique only within a `ciType`, so BOTH route params are matched.
 */
export default async function CiDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canSeeCmdb(roles)) redirect("/");

  const { type, id } = await params;
  const ciType = asCiType(type);
  if (!ciType) notFound();

  const { crm } = getRepositories();
  const items = await crm.listConfigurationItems();
  const ci = items.find((c) => c.ciType === ciType && c.ciId === id);
  if (!ci) notFound();

  // The relationship layer (#647): every edge touching this CI (both directions) +
  // whether the viewer may author manual edges (`cmdb:write`, admin-only).
  const [edges, canWrite] = [
    await crm.listCiRelationships(ciType, id),
    can(roles, "cmdb:write"),
  ];

  // Impact analysis (#650): the n-hop blast radius needs the WHOLE edge graph (not just
  // this CI's incident edges), traversed cycle-safe + depth-bounded against the CI set.
  const allEdges = await crm.listAllCiRelationships();
  const impact = analyzeImpact({ ciType, ciId: id }, items, allEdges);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-dim">
        <Link href="/cmdb" className="hover:text-text">
          CMDB
        </Link>
        <Icon name="ChevronRight" size={12} />
        <span>{CI_TYPE_LABEL[ci.ciType]}</span>
      </div>

      <PageHeader
        title={ci.displayName}
        description={`${CI_TYPE_LABEL[ci.ciType]} configuration item · ${ci.accountName ?? "—"}`}
      >
        <Link
          href="/cmdb"
          className="rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          ← Register
        </Link>
      </PageHeader>

      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-panel-2 text-dim">
            <Icon name={CI_TYPE_ICON[ci.ciType]} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">{ci.displayName}</p>
            <p className="text-xs text-dim">
              {CI_TYPE_LABEL[ci.ciType]} · CI id {ci.ciId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LifecycleBadge lifecycle={ci.lifecycle} />
            <CriticalityBadge derivedDefault={ci.derivedDefault} override={ci.override} />
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm">
            <dt className="text-dim">Owning account</dt>
            <dd className="text-right text-text">
              {ci.accountName ? (
                <Link href={`/accounts/${ci.accountId}`} className="hover:text-accent">
                  {ci.accountName}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          {ci.attributes.map((a) => (
            <div
              key={a.label}
              className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm"
            >
              <dt className="text-dim">{a.label}</dt>
              <dd className="text-right text-text">{a.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[11px] text-dim">
          Read-only projection over silver inventory (ADR-0078). Manage this item in
          its source system — the CMDB never writes.
        </p>
      </div>

      <CiCriticality ci={ci} canWrite={canWrite} />

      <ImpactPanel impact={impact} />

      <CiRelationships
        ci={ci}
        edges={edges}
        allItems={items}
        canWrite={canWrite}
      />
    </div>
  );
}
