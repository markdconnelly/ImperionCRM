import { cn } from "@/lib/cn";
import type { GoalRow } from "@/types";

/**
 * Goals / OKRs list (ADR-0069 D3, #348) — read-only. Each goal is a card showing
 * its rolled-up (or manual) progress bar plus the contributing projects that feed
 * the rollup. A server component: no client JS, no writes; the percents are derived
 * upstream by `lib/goals.ts` and carried on `GoalRow`.
 *
 * A rollup goal shows the weighted average of its linked projects' completion (the
 * AC); a manual goal shows its current-vs-target figure with a "manual" tag. The
 * bar tone follows progress: red < 34, amber < 67, green otherwise.
 */

function barTone(pct: number): string {
  if (pct < 34) return "bg-red";
  if (pct < 67) return "bg-amber";
  return "bg-green";
}

const statusTone: Record<string, string> = {
  not_started: "text-dim",
  in_progress: "text-accent",
  blocked: "text-red",
  complete: "text-green",
};

export function GoalsList({ goals }: { goals: GoalRow[] }) {
  if (goals.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-dim">
        No goals yet. Goals are objectives above projects (ADR-0069 D3); once a goal
        is created and projects are linked to it, its rolled-up progress shows here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {goals.map((g) => (
        <section key={g.id} className="rounded-lg border border-border bg-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-semibold tracking-tight text-text">
                {g.name}
              </h3>
              <p className="mt-0.5 text-sm text-dim">
                {g.owner ?? "Unassigned"}
                {g.period && <> · {g.period}</>}
                {" · "}
                <span className="tabular-nums">
                  {g.current}/{g.target}
                </span>
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md border px-2 py-0.5 text-xs",
                g.progressMode === "rollup" && g.links.length > 0
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border text-dim",
              )}
            >
              {g.progressMode === "rollup" && g.links.length > 0 ? "Rolled up" : "Manual"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
              <div
                className={cn("h-full rounded-full transition-all", barTone(g.displayPercent))}
                style={{ width: `${Math.max(g.displayPercent, g.displayPercent > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-text">
              {g.displayPercent}%
            </span>
          </div>

          {/* Linked contributing projects */}
          {g.links.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-md border border-border/60">
              <div className="flex items-center gap-3 border-b border-border/60 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-dim">
                <span className="flex-1">Contributing project</span>
                <span className="w-40">Account</span>
                <span className="w-24 text-right">Status</span>
                <span className="w-16 text-right">Weight</span>
                <span className="w-14 text-right">Done</span>
              </div>
              {g.links.map((l) => (
                <div
                  key={l.projectId}
                  className="flex items-center gap-3 border-b border-border/40 px-3 py-1.5 text-sm last:border-b-0"
                >
                  <span className="flex-1 truncate text-text" title={l.name}>
                    {l.name}
                  </span>
                  <span className="w-40 truncate text-dim" title={l.account}>
                    {l.account}
                  </span>
                  <span className={cn("w-24 text-right", statusTone[l.status] ?? "text-dim")}>
                    {l.status.replace(/_/g, " ")}
                  </span>
                  <span className="w-16 text-right tabular-nums text-dim">{l.weight}</span>
                  <span className="w-14 text-right tabular-nums text-text">
                    {l.percentComplete}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-dim">
              No projects linked yet — showing the manual figure. Link contributing
              projects to roll up progress automatically.
            </p>
          )}

          {g.notes && <p className="mt-3 text-xs text-dim">{g.notes}</p>}
        </section>
      ))}
    </div>
  );
}
