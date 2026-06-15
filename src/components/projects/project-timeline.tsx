import Link from "next/link";
import { cn } from "@/lib/cn";
import { layoutTimeline, type TimelineDependencyEdge, type TimelineTask } from "@/lib/timeline";

/**
 * Timeline / Gantt of a project's tasks (ADR-0066 C3, #343).
 *
 * Lays each task on a horizontal time axis keyed on its due date and draws the
 * project's `blocks` dependency edges as connectors between bars (B2/#336). The
 * layout arithmetic lives in the pure, tested `layoutTimeline`; this component is
 * the SVG/grid rendering only — a server component, no client JS.
 *
 * POINT BARS, NOT SPANS — `task.start_at` gap (FE #580). A true Gantt bar spans
 * start→end, but the schema has only `task.due_at` (migration 0007); the
 * `start_at` column does not exist yet (tracked in FE #580, no migration in this
 * lane per the one-migration-per-wave rule). Each task therefore renders as a
 * point marker anchored on its due date. When #580 lands, give `layoutTimeline` a
 * `startAt` and widen the marker into a bar from start→due — the axis math is
 * already span-ready.
 *
 * Drag-to-reschedule / resize-suggests (the C3 "could" items) are intentionally
 * out of scope here; rescheduling already lives on the Tasks calendar (C2, #342).
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
      <div className="rounded-xl border border-border bg-panel px-4 py-6 text-sm text-dim">
        No dated tasks to plot on the timeline.
        {tl.undatedCount > 0 && (
          <>
            {" "}
            {tl.undatedCount} task{tl.undatedCount === 1 ? "" : "s"} have no due date — set a due date
            to place {tl.undatedCount === 1 ? "it" : "them"} on the axis.
          </>
        )}
      </div>
    );
  }

  const height = tl.bars.length * ROW_H;
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

          {/* Rows: label gutter + the point marker, positioned by fraction. */}
          {tl.bars.map((b) => (
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
              <span
                className={cn(
                  "absolute h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-panel",
                  STATUS_TONE[b.status] ?? "bg-dim",
                )}
                style={{ left: `${(xOf(b.fraction) / 1000) * 100}%`, top: ROW_H / 2 - 6 }}
                title={`${b.title} · due ${b.due}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Axis footer: range + month labels + the undated count. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-dim">
        <span>
          {tl.start} → {tl.end}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 border-t border-accent-2" /> depends on
          </span>
          {tl.undatedCount > 0 && (
            <span>
              {tl.undatedCount} undated task{tl.undatedCount === 1 ? "" : "s"} not shown
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
