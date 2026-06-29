import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { OrgTreeViz } from "@/components/org-tree/org-tree-viz";
import { loadOrgGraph, readOrgLiveState } from "@/lib/org/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeAgentPages } from "@/lib/auth/roles";
import { formatUsd } from "@/lib/agent/settings";

export const dynamic = "force-dynamic"; // live dial/queue overlay, never prerendered

/**
 * /org — the agent-org visualization (#1539, epic #1534, ADR #1535). Renders the org
 * tree (Nova → C-suite → domain agents → playbooks) from the single SoT
 * (icm/org.yaml + icm/**, generated into src/data/org-graph.json by
 * scripts/gen-org-graph.mjs — no duplicate org_node schema) and overlays live agent
 * state (autonomy rung, actuation dial, mark-gated, pending queue) read defensively
 * from Postgres. Admin-gated, same predicate as the agent surfaces it visualizes.
 */
export default async function OrgPage() {
  const roles = await getSessionRoles();
  if (!canSeeAgentPages(roles)) redirect("/");

  const graph = loadOrgGraph();
  const live = await readOrgLiveState();

  const counts = {
    executives: graph.nodes.filter((n) => n.kind === "executive").length,
    domains: graph.nodes.filter((n) => n.kind === "domain").length,
    built: graph.nodes.filter((n) => n.kind === "domain" && n.built).length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Org"
        description={`Imperion OS agent org — 1 orchestrator · ${counts.executives} C-suite · ${counts.domains} domain agents (${counts.built} built). Derived from icm/org.yaml; live dial + queue overlay.`}
      />

      <div className="flex flex-wrap gap-2 text-xs text-muted">
        {live.live ? (
          <>
            <span className="rounded border border-border px-2 py-1">
              {live.summary.runs7d} runs (7d)
            </span>
            <span className="rounded border border-border px-2 py-1">
              {formatUsd(live.summary.costUsd7d)} spend (7d)
            </span>
            <span className="rounded border border-border px-2 py-1">
              {live.summary.pendingTotal} pending approvals
            </span>
          </>
        ) : (
          <span className="rounded border border-border px-2 py-1">
            Live overlay dormant — showing the org skeleton (agents are propose-only until
            the substrate hydrates).
          </span>
        )}
      </div>

      <OrgTreeViz graph={graph} live={live} />
    </div>
  );
}
