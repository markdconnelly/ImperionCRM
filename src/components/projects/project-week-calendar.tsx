"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { buildWeek, weekSpans, WEEKDAY_LABELS } from "@/lib/calendar";
import type { TimelineTask } from "@/lib/timeline";

/**
 * Calendar WEEK view of a project's tasks as start→due span bars (#628, ADR-0066
 * C2). A read surface — it lays each task that overlaps the visible week onto a
 * 7-column Sunday-start strip, drawing a bar from its start_at (or its due, when
 * there is no start) to its due_at. Bars that run past either edge of the week
 * are clipped with an arrow rather than fabricated onto a date; tasks with no due
 * date can't be placed and are listed honestly below.
 *
 * Week navigation is local (prev/next/today offset) so the page stays a server
 * component with no extra search params. Rescheduling lives on the Tasks calendar
 * (#342); this view never mutates.
 */

const STATUS_TONE: Record<string, string> = {
  open: "bg-dim",
  not_started: "bg-dim",
  in_progress: "bg-accent",
  blocked: "bg-red",
  done: "bg-green",
  complete: "bg-green",
};

/** Greedy lane packing: each bar drops into the first lane whose last bar ends
 * before it starts, so overlapping spans stack instead of colliding. */
function packLanes<T extends { startCol: number; endCol: number }>(spans: T[]): T[][] {
  const lanes: T[][] = [];
  for (const s of [...spans].sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol)) {
    const lane = lanes.find((l) => l[l.length - 1].endCol < s.startCol);
    if (lane) lane.push(s);
    else lanes.push([s]);
  }
  return lanes;
}

export function ProjectWeekCalendar({
  tasks,
  today,
}: {
  tasks: TimelineTask[];
  /** ISO `yyyy-mm-dd` for "today", resolved server-side for SSR stability. */
  today: string;
}) {
  const [offsetWeeks, setOffsetWeeks] = useState(0);

  const week = useMemo(() => {
    // Anchor = today shifted by whole weeks; buildWeek snaps it to that week's Sunday.
    const anchor = new Date(`${today}T00:00:00Z`);
    anchor.setUTCDate(anchor.getUTCDate() + offsetWeeks * 7);
    return buildWeek(anchor.toISOString().slice(0, 10), today);
  }, [today, offsetWeeks]);

  const spans = useMemo(
    () =>
      weekSpans(
        tasks,
        week,
        (t) => t.startAt ?? null,
        (t) => t.due,
      ),
    [tasks, week],
  );
  const lanes = useMemo(() => packLanes(spans), [spans]);
  const offWeek = tasks.filter((t) => t.due).length - spans.length;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="font-display text-sm font-semibold tracking-tight">Calendar · week</h4>
        <p className="mt-0.5 text-xs text-dim">
          Task spans across one week (#628). Bars clipped at the week edge show ‹ / › ; undated tasks
          aren&apos;t placed.
        </p>
      </div>

      {/* Week nav: ‹ prev · label · next › · today */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffsetWeeks((w) => w - 1)}
            aria-label="Previous week"
            className="rounded-md border border-border bg-panel px-2.5 py-1 text-sm text-dim transition-colors hover:text-text"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setOffsetWeeks((w) => w + 1)}
            aria-label="Next week"
            className="rounded-md border border-border bg-panel px-2.5 py-1 text-sm text-dim transition-colors hover:text-text"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setOffsetWeeks(0)}
            className="ml-1 rounded-md border border-border bg-panel px-2.5 py-1 text-xs text-dim transition-colors hover:text-text"
          >
            This week
          </button>
        </div>
        <span className="text-sm font-medium text-text">{week.label}</span>
        <span className="text-xs text-dim">
          {spans.length} span{spans.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        {/* Day header */}
        <div className="grid grid-cols-7 border-b border-border bg-panel-2">
          {week.days.map((d) => (
            <div
              key={d.date}
              className="flex items-center justify-center gap-1.5 px-1 py-1.5 text-xs"
            >
              <span className="text-dim">{WEEKDAY_LABELS[d.index]}</span>
              <span
                className={cn(
                  d.isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white"
                    : "text-text",
                )}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>

        {/* Span lanes over a 7-column grid; day backgrounds behind them. */}
        <div className="relative">
          <div className="absolute inset-0 grid grid-cols-7">
            {week.days.map((d) => (
              <div
                key={d.date}
                className={cn("border-r border-border last:border-r-0", d.isToday && "bg-accent/5")}
              />
            ))}
          </div>

          {lanes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-dim">
              No task spans overlap this week.
            </p>
          ) : (
            <div className="relative flex flex-col gap-1 p-1.5">
              {lanes.map((lane, li) => (
                <div key={li} className="grid h-7 grid-cols-7 gap-0">
                  {lane.map((s) => {
                    const tone = STATUS_TONE[s.item.status] ?? "bg-dim";
                    return (
                      <Link
                        key={s.item.id}
                        href={`/tasks/${s.item.id}/edit`}
                        title={`${s.item.title}${s.item.startAt ? ` · ${s.item.startAt}` : ""} → ${s.item.due}`}
                        style={{ gridColumn: `${s.startCol + 1} / ${s.endCol + 2}` }}
                        className={cn(
                          "flex items-center gap-1 truncate rounded-md px-2 text-[11px] font-medium text-white/95 ring-1 ring-inset ring-white/10 transition-opacity hover:opacity-90",
                          tone,
                          s.item.status === "done" && "opacity-60",
                        )}
                      >
                        {s.clippedStart && <span aria-hidden>‹</span>}
                        <span className="truncate">{s.item.title}</span>
                        {s.clippedEnd && (
                          <span aria-hidden className="ml-auto">
                            ›
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {offWeek > 0 && (
        <p className="text-xs text-dim">
          {offWeek} dated task{offWeek === 1 ? "" : "s"} fall outside this week.
        </p>
      )}
    </div>
  );
}
