import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { GrantsAdmin } from "@/components/agent/grants-admin";
import { listAgentGrants } from "@/lib/agent/grants-data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeAgentPages } from "@/lib/auth/roles";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { upsertToolGrantAction, revokeToolGrantAction } from "../actions";

export const dynamic = "force-dynamic"; // live grants, never prerendered

/**
 * Tool-grant admin (#1005 / 2D, ADR-0107 D3). View/grant/revoke each CRM sub-agent's
 * tools + edit scope predicates — the management surface over the deny-by-default plane
 * (#244/#995). Admin-gated like the rest of the agent pages (#90); writes go through the
 * backend (ADR-0042). Degrades to sample rows when the DB is unset (ADR-0007).
 */
export default async function AgentGrantsPage() {
  const roles = await getSessionRoles();
  if (!canSeeAgentPages(roles)) redirect("/");

  const agents = await listAgentGrants();
  const dbConfigured = isDbConfigured();
  const canEdit = can(roles, "settings:write"); // admin-only (ADR-0045)
  const backendReachable = Boolean(process.env.AGENT_SERVICE_URL);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tool grants"
        description="Deny-by-default tool grants per sub-agent + per-grant scope predicates — the governed action plane (ADR-0107)."
      />

      <Link
        href="/agents"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-dim hover:text-text"
      >
        <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
        Back to AI Agents
      </Link>

      {!canEdit && (
        <p className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-dim">
          You have read-only access. Editing grants requires the admin
          <code className="mx-1">settings:write</code>capability (ADR-0045).
        </p>
      )}
      {canEdit && !backendReachable && (
        <p className="rounded-lg border border-amber/40 bg-panel px-3 py-2 text-xs text-amber">
          The agent backend isn&apos;t wired up here (<code>AGENT_SERVICE_URL</code> unset) — grants
          are read-only until it&apos;s configured.
        </p>
      )}
      {!dbConfigured && (
        <p className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-dim">
          Showing sample data — the database isn&apos;t configured in this environment.
        </p>
      )}

      <GrantsAdmin
        agents={agents}
        canEdit={canEdit && backendReachable}
        upsertAction={upsertToolGrantAction}
        revokeAction={revokeToolGrantAction}
      />
    </div>
  );
}
