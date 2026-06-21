import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TechnicianQueue } from "@/components/agents/technician-queue";
import { AutonomyDial } from "@/components/workflows/autonomy-dial";
import { listTechnicianQueue, TECHNICIAN_AGENT_KEY } from "@/lib/agent/technician-cockpit";
import { getAutonomyPolicy } from "@/lib/agent/icm-runs";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { reviewPendingActionAction } from "../actions";
// The cockpit reuses the existing, already-wired L0–L3 autonomy dial bound to the
// `technician` workflow; the native 1–5 actuation slider is its own surface (#1013).
import { setAutonomyAction } from "@/app/(app)/workflows/actions";

export const dynamic = "force-dynamic"; // live cockpit queue, never prerendered

/**
 * AI-Technician operator cockpit (#1056, epic #1038, ADR-0109).
 *
 * The supervised-first surface for the AI Technician wedge: the queue of ticket actions
 * the Technician has proposed but that sit above its autonomy ceiling, each with its
 * proposed action + tier + run-trace link, plus approve / edit-and-approve / reject and
 * the per-workflow autonomy dial. Ship supervised, log every action, earn the tier
 * (Gary Vee's + Jocko's riders, #1038). Read-first over `agent_pending_action`
 * (mig 0158); decisions + the autonomy flip go through the backend (`agents:operate`-
 * gated) and degrade honestly until the Technician run-ledger lands (backend #258/#263).
 */
export default async function TechnicianCockpitPage() {
  const roles = await getSessionRoles();
  const canOperate = can(roles, "agents:operate"); // admin-only (ADR-0050)

  const [queue, policy] = await Promise.all([
    listTechnicianQueue(),
    getAutonomyPolicy(TECHNICIAN_AGENT_KEY, "technician"),
  ]);
  const dbNote = isDbConfigured() ? "" : " · sample data";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Technician — operator cockpit"
        description="Supervise the AI Technician as a co-pilot: review the ticket actions it proposes, approve / edit / reject before anything sends, watch the run trace, and raise its autonomy only once its draft-quality is trusted."
      >
        <Link href="/agents" className="text-sm text-dim hover:text-text">
          ← AI agents
        </Link>
      </PageHeader>

      <TechnicianQueue items={queue} canReview={canOperate} reviewAction={reviewPendingActionAction} />

      <AutonomyDial policy={policy} canEdit={canOperate} setAction={setAutonomyAction} />

      <p className="text-[11px] text-dim">
        Showing {queue.length} parked action{queue.length === 1 ? "" : "s"} · agent_pending_action
        cockpit (ADR-0109){dbNote}. The native 1–5 actuation slider is tracked separately (#1013).
      </p>
    </div>
  );
}
