import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  layoutTimeline,
  type TimelineDependencyEdge,
  type TimelineTask,
  type UnscheduledTask,
} from "@/lib/timeline";

/**
 * Timeline / Gantt of a project's tasks (ADR-0066 C3, #343).
 *
 * Lays each task on a horizontal time axis keyed on its due date and draws the
 * project's `blocks` dependency edges as connectors between bars (B2/#336). The
 * layout arithmetic lives in the pure, tested `layoutTimeline`; this component is
 * the SVG/grid rendering only — a server component, no client JS.
 *
 * SPAN BARS (#628). `task.start_at` landed (migration 0105), so a task with a
 * start AND a due renders as a true Gantt bar from start→due; a task with only a
 * due collapses to the legacy point marker on its due date. Tasks with no due
 * date can't be placed on the axis — they're listed honestly in an "unscheduled"
 * area below the chart rather than fabricated onto a date.
 *
 * Drag-to-reschedule / resize-suggests (the C3 "could" items) are intentionally
 * out of scope here (read surface); rescheduling lives on the Tasks calendar (#342).
 */

const STATUS_TONE: Record<string, string> = {
  open: "bg-dim",
  not_started: "bg-dim",
  in_progress: "bg-accent",
  blocked: "bg-red",
  done: "bg-green",
  complete: "bg-green",
};

// Geometry (px). Rows are fixed-height so the SVG connector overlay aligns 1:1
// with the HTML rows it sits beneath.
const ROW_H = 32;
const LABEL_W = 200; // left gutter for task names
const TRACK_PAD = 16; // inner left/right padding of the plotting track

export function ProjectTimeline({
  tasks,
  edges,
  basePath = "/tasks",
}: {
  tasks: TimelineTask[];
  edges: TimelineDependencyEdge[];
  /** Link base for a bar — defaults to the task editor. */
  basePath?: string;
}) {
  const tl = layoutTimeline(tasks, edges);

  if (tl.bars.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-panel px-4 py-6 text-sm text-dim">
          No dated tasks to plot on the timeline.
          {tl.undatedCount > 0 && (
            <>
              {" "}
              {tl.undatedCount} task{tl.undatedCount === 1 ? "" : "s"} have no due date — set a due
              date to place {tl.undatedCount === 1 ? "it" : "them"} on the axis.
            </>
          )}
        </div>
        <UnscheduledArea unscheduled={tl.unscheduled} basePath={basePath} />
      </div>
    );
  }

  const height = tl.bars.length * ROW_H;
  // Minimum drawn span width (in axis fraction terms) so a same-day or near-zero
  // span is still a visible nub, not an invisible hairline.
  const MIN_BAR_FRAC = 0.012;
  // Map a 0..1 axis fraction to an x in the plotting track (right of the gutter).
  const xOf = (fraction: number) =>
    LABEL_W + TRACK_PAD + fraction * (1000 - LABEL_W - 2 * TRACK_PAD);
  const yOf = (row: number) => row * ROW_H + ROW_H / 2;

  const barById = new Map(tl.bars.map((b) => [b.id, b]));

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <div className="relative min-w-[760px]" style={{ height }}>
          {/* SVG overlay: month gridlines + dependency connectors, behind the rows. */}
          <svg
            viewBox={`0 0 1000 ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* Month gridlines */}
            {tl.ticks.map((k) => (
              <line
                key={k.date}
                x1={xOf(k.fraction)}
                x2={xOf(k.fraction)}
                y1={0}
                y2={height}
                className="stroke-border"
                strokeWidth={1}
              />
            ))}
            {/* Dependency connectors: predecessor bar → successor bar. */}
            {tl.connectors.map((c) => {
              const p = barById.get(c.predecessorId);
              const s = barById.get(c.successorId);
              if (!p || !s) return null;
              return (
                <line
                  key={`${c.predecessorId}-${c.successorId}`}
                  x1={xOf(p.fraction)}
                  y1={yOf(p.row)}
                  x2={xOf(s.fraction)}
                  y2={yOf(s.row)}
                  className={cn(c.outOfOrder ? "stroke-red" : "stroke-accent-2")}
                  strokeWidth={1.5}
                  strokeDasharray={c.outOfOrder ? "4 3" : undefined}
                  markerEnd="url(#tl-arrow)"
                />
              );
            })}
            <defs>
              <marker
                id="tl-arrow"
                viewBox="0 0 8 8"
                refX={6}
                refY={4}
                markerWidth={6}
                markerHeight={6}
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 Z" className="fill-accent-2" />
              </marker>
            </defs>
          </svg>

          {/* Rows: label gutter + either a start→due span bar or a due-point marker. */}
          {tl.bars.map((b) => {
            const tone = STATUS_TONE[b.status] ?? "bg-dim";
            const leftPct = (xOf(b.startFraction) / 1000) * 100;
            const widthPct = Math.max(
              MIN_BAR_FRAC,
              b.fraction - b.startFraction,
            ) * ((1000 - LABEL_W - 2 * TRACK_PAD) / 1000) * 100;
            return (
              <div
                key={b.id}
                className="absolute left-0 right-0 flex items-center"
                style={{ top: b.row * ROW_H, height: ROW_H }}
              >
                <Link
                  href={`${basePath}/${b.id}/edit`}
                  className="truncate px-3 text-xs text-text hover:text-accent"
                  style={{ width: LABEL_W }}
                  title={b.title}
                >
                  {b.title}
                </Link>
                {b.hasSpan ? (
                  // True span: a bar from start_at → due_at.
                  <span
                    className={cn("absolute h-2.5 rounded-full ring-1 ring-panel", tone)}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: ROW_H / 2 - 5,
                    }}
                    title={`${b.title} · ${b.startAt} → ${b.due}`}
                  />
                ) : (
                  // No start_at (or inverted): legacy point marker on the due date.
                  <span
                    className={cn(
                      "absolute h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-panel",
                      tone,
                      b.inverted && "ring-amber",
                    )}
                    style={{ left: `${(xOf(b.fraction) / 1000) * 100}%`, top: ROW_H / 2 - 6 }}
                    title={
                      b.inverted
                        ? `${b.title} · due ${b.due} (start ${tasks.find((t) => t.id === b.id)?.startAt} is after due — shown as a point)`
                        : `${b.title} · due ${b.due}`
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Axis footer: range + month labels + the undated count. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-dim">
        <span>
          {tl.start} → {tl.end}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full bg-accent" /> start → due
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-dim ring-1 ring-panel" /> due
            only
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 border-t border-accent-2" /> depends on
          </span>
          {tl.undatedCount > 0 && (
            <span>
              {tl.undatedCount} unscheduled task{tl.undatedCount === 1 ? "" : "s"} below
            </span>
          )}
        </span>
      </div>

      <UnscheduledArea unscheduled={tl.unscheduled} basePath={basePath} />
    </div>
  );
}

/**
 * Honest "not yet scheduled" area (#628): tasks that can't be placed on the axis
 * because they have no due date. We never fabricate a date to draw them — they're
 * listed here so they aren't silently dropped, distinguishing "has a start but no
 * due" from "no dates at all".
 */
function UnscheduledArea({
  unscheduled,
  basePath,
}: {
  unscheduled: UnscheduledTask[];
  basePath: string;
}) {
  if (unscheduled.length === 0) return null;
  return (
    <div className="rounded-xl border border-dashed border-border bg-panel-2/40 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-dim">
        Unscheduled · {unscheduled.length} task{unscheduled.length === 1 ? "" : "s"} (no due date)
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {unscheduled.map((t) => (
          <li key={t.id}>
            <Link
              href={`${basePath}/${t.id}/edit`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-2 py-1 text-[11px] text-text hover:border-accent",
                t.status === "done" && "text-dim line-through",
              )}
              title={t.hasStart ? "Has a start date but no due date" : "No start or due date"}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_TONE[t.status] ?? "bg-dim")} />
              {t.title}
              {!t.hasStart && <span className="text-dim/70">· no dates</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
