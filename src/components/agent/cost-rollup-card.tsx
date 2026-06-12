import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatUsd } from "@/lib/agent/settings";
import {
  entityHref,
  formatTokens,
  monthLabel,
  previousMonth,
  processEntityNoun,
  processLabel,
} from "@/lib/agent/cost-rollup";
import type { CostRollupState } from "@/lib/agent/cost-rollup-data";

/**
 * Per-process cost telemetry rollups (#184, v1 gate 9 — ADR-0057).
 *
 * Spend per board session / conversation (and per enriched contact / drafted
 * send as those executors land — they appear automatically, backend #65),
 * rendered on the AI Agents page humans already visit. Server component; the
 * per-entity breakdown uses <details>, no client JS.
 */
export function CostRollupCard({ state, month }: { state: CostRollupState; month: string }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Cost telemetry — {monthLabel(month)}
        </h3>
        <span className="flex items-center gap-2 text-[11px] text-dim">
          <Link
            href={`/agents?month=${previousMonth(month)}`}
            className="rounded border border-border px-1.5 py-0.5 hover:text-text"
          >
            ← {monthLabel(previousMonth(month))}
          </Link>
          <Link href="/agents" className="rounded border border-border px-1.5 py-0.5 hover:text-text">
            current month
          </Link>
        </span>
      </div>
      <p className="mb-3 text-sm text-dim">
        Where the model budget actually goes: every metered process (audit rows carrying
        the ADR-0032 usage rollup), grouped per process and per entity.
      </p>

      {!state.ok ? (
        <p className="rounded-lg border border-border bg-panel-2 p-4 text-sm text-dim">
          {state.note}
        </p>
      ) : state.rollup.processes.length === 0 ? (
        <p className="rounded-lg border border-border bg-panel-2 p-4 text-sm text-dim">
          No metered agent work in {monthLabel(month)} — rollups appear with the first
          orchestrator turn or board session of the month.
        </p>
      ) : (
        <>
          {/* Month totals strip */}
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total spend", value: formatUsd(state.rollup.totals.costUsd) },
              { label: "Runs", value: String(state.rollup.totals.runs) },
              { label: "Model calls", value: String(state.rollup.totals.modelCalls) },
              {
                label: "Tokens in / out",
                value: `${formatTokens(state.rollup.totals.inputTokens)} / ${formatTokens(state.rollup.totals.outputTokens)}`,
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border bg-panel-2 p-3">
                <p className="text-[11px] uppercase tracking-wide text-dim">{kpi.label}</p>
                <p className="mt-1 font-mono text-sm text-text">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Per-process rollups, costliest first (backend ordering) */}
          <div className="flex flex-col gap-2">
            {state.rollup.processes.map((p) => (
              <details
                key={`${p.action}:${p.entityType ?? ""}`}
                className="group rounded-lg border border-border bg-panel-2"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-3 [&::-webkit-details-marker]:hidden">
                  <Icon
                    name="ChevronRight"
                    size={14}
                    className="shrink-0 text-dim transition-transform group-open:rotate-90"
                  />
                  <span className="text-sm font-medium text-text">{processLabel(p.action)}</span>
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-dim">
                    {p.action}
                  </span>
                  <span className="ml-auto flex items-center gap-3 text-xs text-dim">
                    <span>
                      {p.runs} {p.runs === 1 ? "run" : "runs"} · {p.modelCalls} calls ·{" "}
                      {formatTokens(p.inputTokens)} / {formatTokens(p.outputTokens)} tok
                    </span>
                    <span className="font-mono text-sm text-text">{formatUsd(p.costUsd)}</span>
                  </span>
                </summary>
                {p.entities.length === 0 ? (
                  <p className="border-t border-border/50 px-3 py-2 text-xs text-dim">
                    No per-entity attribution recorded for this process.
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t border-border/50 px-3 py-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-dim">
                          <th className="py-1 pr-3 font-medium">
                            Top {processEntityNoun(p.action, p.entityType)}s by spend
                          </th>
                          <th className="py-1 pr-3 text-right font-medium">Runs</th>
                          <th className="py-1 pr-3 text-right font-medium">Last activity</th>
                          <th className="py-1 text-right font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.entities.map((e) => {
                          const href = entityHref(p.entityType, e.entityId);
                          return (
                            <tr key={e.entityId} className="border-t border-border/30">
                              <td className="max-w-[20rem] truncate py-1.5 pr-3 font-mono text-dim">
                                {href ? (
                                  <Link href={href} className="text-accent hover:underline">
                                    {e.entityId}
                                  </Link>
                                ) : (
                                  e.entityId
                                )}
                              </td>
                              <td className="py-1.5 pr-3 text-right text-dim">{e.runs}</td>
                              <td
                                className="whitespace-nowrap py-1.5 pr-3 text-right text-dim"
                                title={e.lastAt}
                              >
                                {new Date(e.lastAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  timeZone: "UTC",
                                })}
                              </td>
                              <td className="py-1.5 text-right font-mono text-text">
                                {formatUsd(e.costUsd)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-dim">
            Source: backend GET /agent/cost-rollup over audit rows carrying usage metering
            (agent.turn, board.conclude — enrichment and send executors appear here
            automatically as they land). Top 20 entities per process by spend.
          </p>
        </>
      )}
    </section>
  );
}
