import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PendingActionCockpit } from "@/components/agents/pending-action-cockpit";
import { L4OversightView } from "@/components/agents/l4-oversight-view";
import { listPendingActions, listExecutedActions } from "@/lib/agent/pending-action-cockpit";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { decidePendingActionAction } from "../actions";

export const dynamic = "force-dynamic"; // live cockpit queue, never prerendered

/**
 * Native approval cockpit (#1014, parent #996 / 2E, ADR-0107 D5).
 *
 * The cross-agent supervision surface: ONE place listing every sub-agent's pending
 * actions — actions whose ADR-0055 tier exceeds the resolved 1–5 actuation ceiling (the
 * dial, ADR-0109) and are therefore parked on `agent_pending_action` (mig 0158) awaiting
 * a human. Each item shows the proposing agent, the action + tier, the dial decision that
 * routed it, the rationale, the target, and the editable draft, with approve / edit /
 * reject. Decisions go through the backend (`agents:operate`-gated, `POST
 * /orchestration/cockpit/decide`, backend #267) which re-asserts consent at execute
 * (ADR-0058) and stamps the approver as the audited actor. Read-first over
 * `agent_pending_action`; degrades honestly where the DB / endpoint isn't wired.
 *
 * Distinct from the Technician-only cockpit (`/operator/technician`, #1056): that one is
 * scoped to the wedge agent + carries its autonomy dial; this is the agent-agnostic
 * queue. Below the approval queue sits the L4 oversight view (#1202): actions an agent
 * executed inline at autonomy level 4 (Autonomous-with-oversight), surfaced for
 * after-the-fact review with an undo window while it's open.
 */
export default async function ApprovalCockpitPage() {
  const roles = await getSessionRoles();
  const canOperate = can(roles, "agents:operate"); // admin-only (ADR-0050)

  const [queue, executed] = await Promise.all([listPendingActions(), listExecutedActions()]);
  const dbNote = isDbConfigured() ? "" : " · sample data";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approval cockpit — pending agent actions"
        description="Supervise every AI agent in one place: review the actions they propose that sit above their autonomy ceiling, approve / edit / reject before anything executes, and watch the run trace. Nothing sends without a human decision."
      >
        <Link href="/agents" className="text-sm text-dim hover:text-text">
          ← AI agents
        </Link>
      </PageHeader>

      <PendingActionCockpit items={queue} canReview={canOperate} reviewAction={decidePendingActionAction} />

      <L4OversightView items={executed} canReview={canOperate} />

      <p className="text-[11px] text-dim">
        Showing {queue.length} parked action{queue.length === 1 ? "" : "s"} awaiting approval and{" "}
        {executed.length} executed autonomously (L4 oversight) across all agents ·
        agent_pending_action cockpit (ADR-0109){dbNote}.
      </p>
    </div>
  );
}
