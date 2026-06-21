import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { listRecentEvalRuns } from "@/lib/agent/eval-runs-data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeAgentPages } from "@/lib/auth/roles";
import { isDbConfigured } from "@/lib/db/client";

export const dynamic = "force-dynamic"; // live eval runs, never prerendered

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusTone(status: string): string {
  if (status === "passed") return "text-green";
  if (status === "failed" || status === "error") return "text-amber";
  return "text-dim"; // running
}

/**
 * The eval & quality plane's read surface (ADR-0106, epic #983). Read-only list of recent
 * scored eval runs — the scoring twin of the agent-activity feed. Admin-gated like the rest
 * of the agent pages (#90). Degrades to sample rows when the DB is unset (ADR-0007).
 */
export default async function AgentEvalsPage() {
  const roles = await getSessionRoles();
  if (!canSeeAgentPages(roles)) redirect("/");

  const runs = await listRecentEvalRuns(25);
  const dbConfigured = isDbConfigured();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agent evals"
        description="The quality plane: scored eval runs over the golden set — the regression net behind raising agent autonomy (ADR-0106)."
      />

      <Link
        href="/agents"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-dim hover:text-text"
      >
        <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
        Back to AI Agents
      </Link>

      <section className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">Recent eval runs</h3>
          <span className="text-[11px] text-dim">
            last {runs.length || 25} runs · agent_eval_run
            {!dbConfigured && " · sample data"}
          </span>
        </div>

        {runs.length === 0 ? (
          <p className="text-sm text-dim">
            No eval runs yet — runs appear here once the backend runner scores a suite
            against the golden set (backend ADR-0077).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-dim">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Suite</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Cases</th>
                  <th className="py-2 pr-3 text-right font-medium">Score</th>
                  <th className="hidden py-2 font-medium md:table-cell">Trigger</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-dim" title={r.startedAt}>
                      {timeAgo(r.startedAt)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
                        {r.suite}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap py-2 pr-3 text-xs font-medium ${statusTone(r.status)}`}>
                      {r.status}
                    </td>
                    <td className="py-2 pr-3 text-right text-dim">{r.caseCount}</td>
                    <td className="py-2 pr-3 text-right text-text">
                      {r.aggregateScore === null ? "—" : `${Math.round(r.aggregateScore * 100)}%`}
                    </td>
                    <td className="hidden py-2 text-xs text-dim md:table-cell">{r.triggeredBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-dim">
          Scored by deterministic assertions + an LLM-judge on the golden set. Dormant until
          migration 0154/0155 is applied and the runner is live.
        </p>
      </section>
    </div>
  );
}
