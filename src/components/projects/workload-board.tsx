import { cn } from "@/lib/cn";
import {
  buildWorkloadView,
  DEFAULT_CAPACITY_RATIOS,
  type CapacityRatios,
} from "@/lib/workload";
import type { WorkloadRow } from "@/types";

/**
 * Workload / capacity board (ADR-0069 D1/D2, #591).
 *
 * Renders each assignee's ESTIMATED-HOURS LOAD as a horizontal bar, busiest first,
 * with an over-allocation tone (red = over, amber = near, default = ok) and
 * due-soon / overdue counts. A server component — the classification is the pure,
 * tested `buildWorkloadView`; this is rendering only, no client JS.
 *
 * HOURS vs CAPACITY (#591) — load is Σ `task.estimate` (hours-unit) over the user's
 * open, in-range tasks, classified against that user's own
 * `user_capacity.weekly_hours` (the D1 inputs the #346/#580 heavy lane authored this
 * wave). A user with no capacity set shows "—" capacity and classifies `ok` (unknown
 * capacity is not a flag). This replaces the earlier count-with-a-flat-threshold
 * stand-in (#347).
 */

const LEVEL_BAR: Record<string, string> = {
  ok: "bg-accent",
  near: "bg-amber",
  over: "bg-red",
};

const LEVEL_BADGE: Record<string, string> = {
  ok: "border-border text-dim",
  near: "border-amber/40 bg-amber/10 text-amber",
  over: "border-red/40 bg-red/10 text-red",
};

const LEVEL_LABEL: Record<string, string> = {
  ok: "OK",
  near: "Near capacity",
  over: "Over capacity",
};

/** Compact hours, e.g. 6, 12.5, 40 — at most one decimal, no trailing zero. */
function fmtHours(h: number): string {
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

export function WorkloadBoard({
  rows,
  ratios = DEFAULT_CAPACITY_RATIOS,
}: {
  rows: WorkloadRow[];
  ratios?: CapacityRatios;
}) {
  const view = buildWorkloadView(rows, ratios);

  if (view.rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-dim">
        No open tasks are assigned to anyone yet. Once tasks have owners or
        assignees, each person&rsquo;s estimated load shows up here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Estimated hours" value={fmtHours(view.totalHours)} />
        <Stat label="Due in 7 days" value={String(view.totalDueSoon)} />
        <Stat
          label="Overdue"
          value={String(view.totalOverdue)}
          tone={view.totalOverdue > 0 ? "red" : undefined}
        />
        <Stat
          label="Over capacity"
          value={String(view.overAllocated)}
          tone={view.overAllocated > 0 ? "red" : undefined}
        />
      </div>

      {/* Per-user load bars */}
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-dim">
          <span className="w-44 shrink-0">Person</span>
          <span className="flex-1">Estimated-hours load</span>
          <span className="w-44 shrink-0 text-right">Due soon · Overdue</span>
        </div>
        {view.rows.map((r) => (
          <div
            key={r.userId}
            className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <span className="w-44 shrink-0 truncate text-sm text-text" title={r.name}>
              {r.name}
            </span>
            <div className="flex flex-1 items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                <div
                  className={cn("h-full rounded-full transition-all", LEVEL_BAR[r.level])}
                  style={{ width: `${Math.max(r.loadPct, r.estimatedHours > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums text-text">
                {fmtHours(r.estimatedHours)}
                <span className="text-dim">
                  {" / "}
                  {r.weeklyHours == null ? "—" : fmtHours(r.weeklyHours)}
                </span>
              </span>
              <span
                className={cn(
                  "w-28 shrink-0 rounded-md border px-2 py-0.5 text-center text-xs",
                  LEVEL_BADGE[r.level],
                )}
              >
                {LEVEL_LABEL[r.level]}
              </span>
            </div>
            <span className="w-44 shrink-0 text-right text-sm tabular-nums text-dim">
              {r.dueSoon} · <span className={cn(r.overdue > 0 && "text-red")}>{r.overdue}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red";
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-3">
      <div className="text-xs text-dim">{label}</div>
      <div className={cn("mt-1 font-display text-2xl font-semibold", tone === "red" ? "text-red" : "text-text")}>
        {value}
      </div>
    </div>
  );
}
