import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalQueue } from "@/components/workflows/approval-queue";
import { AutonomyDial } from "@/components/workflows/autonomy-dial";
import {
  listIcmRuns,
  listApprovalQueue,
  getAutonomyPolicy,
} from "@/lib/agent/icm-runs";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { reviewApprovalAction, setAutonomyAction } from "../actions";

export const dynamic = "force-dynamic"; // live run ledger + queue, never prerendered

const STATUS_TONE: Record<string, string> = {
  running: "text-accent",
  succeeded: "text-green",
  failed: "text-red",
  cancelled: "text-dim",
};

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/**
 * ICM glass-box run viewer + approval queue + autonomy dial (#278, ADR-0061/0087).
 *
 * Read-first surface over the ICM run ledger (`agent_run`/`agent_message`, mig 0056)
 * and the data-driven autonomy dial (`agent_autopilot_policy`, mig 0123). The web
 * role reads for rendering (ADR-0042); approve/edit/reject and the autonomy flip go
 * through the backend (`agents:operate`-gated server actions) and degrade honestly
 * where the executor endpoints aren't wired yet.
 */
export default async function WorkflowRunsPage() {
  const roles = await getSessionRoles();
  const canReview = can(roles, "agents:operate"); // admin-only (ADR-0050)

  // The lead-response workflow is the first ICM workspace (ADR-0061 rollout order).
  const [runs, queue, policy] = await Promise.all([
    listIcmRuns(25),
    listApprovalQueue(),
    getAutonomyPolicy("lead-response"),
  ]);
  const dbNote = isDbConfigured() ? "" : " · sample data";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workflow runs"
        description="The glass-box view of ICM workflow runs — every stage artifact is readable, drafts queue for approval, and the autonomy dial governs how much each workflow does on its own."
      >
        <Link href="/workflows" className="text-sm text-dim hover:text-text">
          ← Workflows
        </Link>
      </PageHeader>

      <ApprovalQueue items={queue} canReview={canReview} reviewAction={reviewApprovalAction} />

      <AutonomyDial policy={policy} canEdit={canReview} setAction={setAutonomyAction} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold tracking-tight">Recent runs</h3>
          <span className="text-[11px] text-dim">
            last {runs.length} runs · agent_run ledger (ADR-0087){dbNote}
          </span>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-dim">
            No ICM runs yet — runs appear here as the executor processes the first trigger.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-panel">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-dim">
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Workflow</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Who</th>
                  <th className="px-4 py-2 text-right font-medium">Stages</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-panel-2/50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/workflows/runs/${r.id}`}
                        className="text-dim hover:text-text"
                        title={r.startedAt}
                      >
                        {timeAgo(r.startedAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-text">{r.agentName}</td>
                    <td className="px-4 py-2">
                      <span className={STATUS_TONE[r.status] ?? "text-dim"}>{r.status}</span>
                      {r.awaitingApproval && (
                        <span className="ml-1.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-amber">
                          awaiting approval
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-dim">{r.actor ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-dim">{r.stageCount}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-text">
                      ${r.costUsd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
