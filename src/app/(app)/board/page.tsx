import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ConveneBoardCard } from "@/components/board/convene-board-card";
import { listBoardPersonas, listBoardSessions } from "@/lib/board/data";
import { sessionStatusMeta, timeAgo, truncate } from "@/lib/board/session";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { conveneBoardAction } from "./actions";

export const dynamic = "force-dynamic"; // live sessions + deliberation results, never prerendered

/**
 * AI Board of Directors (ADR-0049, backend ADR-0039): convene a deliberation,
 * browse recent sessions, drill into the transcript + recommendation. Reads come
 * straight from the 0056 tables (ADR-0042 — web has SELECT); convening is a
 * PROCESS and goes through the backend POST /board/sessions.
 */
export default async function BoardPage() {
  const roles = await getSessionRoles();
  const canConvene = can(roles, "sales:write"); // business-development surface (see actions.ts)

  const [{ personas }, sessions] = await Promise.all([
    listBoardPersonas(),
    listBoardSessions(20),
  ]);
  const dbConfigured = isDbConfigured();
  const backendConfigured = Boolean(process.env.AGENT_SERVICE_URL?.trim());

  const sourceNote = backendConfigured
    ? ""
    : "The board backend isn't reachable in this environment (AGENT_SERVICE_URL unset) — convening is disabled; sessions below still render from the database.";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Board of Directors"
        description="AI persona advisors — convene a session, let the directors deliberate, get one synthesized recommendation."
      />

      {/* 1 ── Convene: topic + context + persona picker → backend deliberation */}
      <ConveneBoardCard
        personas={personas}
        canConvene={canConvene}
        canSubmit={backendConfigured}
        sourceNote={sourceNote}
        conveneAction={conveneBoardAction}
      />

      {/* 2 ── Recent sessions (direct DB read of board_session, ADR-0042) */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">Recent sessions</h3>
          <span className="text-[11px] text-dim">
            last {sessions.length || 20} sessions · board_session
            {!dbConfigured && " · sample data"}
          </span>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-dim">
            No board sessions yet — convene the first one above and the deliberation will
            appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-dim">
                  <th className="py-2 pr-3 font-medium">Topic</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="hidden py-2 pr-3 font-medium md:table-cell">Convened by</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 text-right font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const meta = sessionStatusMeta(s.status);
                  return (
                    <tr key={s.id} className="border-b border-border/50 last:border-0">
                      <td className="max-w-[32rem] py-2 pr-3">
                        <Link
                          href={`/board/${s.id}`}
                          className="block truncate text-text hover:text-accent"
                          title={s.topic}
                        >
                          {truncate(s.topic, 110)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap py-2 pr-3 text-dim md:table-cell">
                        {s.openedBy ?? "—"}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-dim" title={s.createdAt}>
                        {timeAgo(s.createdAt)}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right text-xs text-dim">
                        {s.hasRecommendation ? (
                          <span className="text-green">recommendation</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-dim">
          Every deliberation is audited and metered (agent_run per persona + synthesis,
          board.convene/board.conclude audit rows) and spends against the same monthly AI
          budget as the orchestrator — manage it on the AI Agents page.
        </p>
      </section>
    </div>
  );
}
