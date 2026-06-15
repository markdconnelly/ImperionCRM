"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { buildMonth, bucketByDay, WEEKDAY_LABELS, type CalendarMonth } from "@/lib/calendar";
import type { TaskRow } from "@/types";

/**
 * Month calendar of tasks by due date (ADR-0066 C2, #342). Lays tasks onto a
 * stable 6-week grid via the pure `buildMonth`/`bucketByDay` helpers, and lets a
 * task be dragged onto another day to reschedule it — the drop persists through
 * the `delivery:write`-guarded, audited `moveDueAction` (the same mutation path
 * as the edit form, per the ADR). Tasks with no due date never appear on a cell;
 * a footer count flags how many are hidden so they aren't silently lost.
 *
 * Optimistic, controlled pattern mirrors KanbanBoard: a local `dueOverrides` map
 * jumps the dragged card immediately, then an effect re-syncs from the
 * authoritative `tasks` on every server round-trip (and clears overrides).
 * Filtering (assignee/project/type/tag) is applied upstream in the page from the
 * shared view state — the calendar renders whatever rows it is handed.
 */
const CATEGORY_TONE: Record<string, string> = {
  sales: "border-l-accent-2",
  project: "border-l-accent",
  onboarding: "border-l-green",
  general: "border-l-dim",
};

export function TasksCalendar({
  tasks,
  month,
  monthHref,
  today,
  moveDueAction,
}: {
  tasks: TaskRow[];
  /** `yyyy-mm` of the displayed month (from the URL / shared view state). */
  month: { year: number; monthNum: number };
  /** Build a `/tasks?...` href for a given `yyyy-mm`, preserving other filters. */
  monthHref: (ym: string) => string;
  /** ISO `yyyy-mm-dd` for "today", resolved server-side for SSR stability. */
  today: string;
  moveDueAction: (id: string, dueAt: string) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const grid: CalendarMonth = buildMonth(month.year, month.monthNum, today);

  // Optimistic due-date overrides, cleared whenever the server sends fresh data.
  const [dueOverrides, setDueOverrides] = useState<Record<string, string>>({});
  useEffect(() => setDueOverrides({}), [tasks]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const dueOf = (t: TaskRow) => dueOverrides[t.id] ?? t.due;
  const byDay = bucketByDay(tasks, dueOf);
  const noDueCount = tasks.filter((t) => !dueOf(t)).length;

  function reschedule(id: string, date: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || dueOf(task) === date) {
      setDragId(null);
      return;
    }
    setDueOverrides((prev) => ({ ...prev, [id]: date }));
    startTransition(async () => {
      await moveDueAction(id, date);
      router.refresh();
    });
    setDragId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Month nav: ‹ prev · label · next › · today */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link
            href={monthHref(grid.prev)}
            aria-label="Previous month"
            className="rounded-md border border-border bg-panel px-2.5 py-1 text-sm text-dim transition-colors hover:text-text"
          >
            ‹
          </Link>
          <Link
            href={monthHref(grid.next)}
            aria-label="Next month"
            className="rounded-md border border-border bg-panel px-2.5 py-1 text-sm text-dim transition-colors hover:text-text"
          >
            ›
          </Link>
          <Link
            href={monthHref(today.slice(0, 7))}
            className="ml-1 rounded-md border border-border bg-panel px-2.5 py-1 text-xs text-dim transition-colors hover:text-text"
          >
            Today
          </Link>
        </div>
        <span className="text-sm font-medium text-text">{grid.label}</span>
        <span className="text-xs text-dim">{tasks.length} tasks</span>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-1 text-center text-xs font-medium text-dim">
            {d}
          </div>
        ))}
      </div>

      {/* The grid: 6 weeks × 7 days */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {grid.weeks.flat().map((cell) => {
          const cards = byDay.get(cell.date) ?? [];
          const isOver = over === cell.date;
          return (
            <div
              key={cell.date}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(cell.date);
              }}
              onDragLeave={() => setOver((o) => (o === cell.date ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain") || dragId;
                if (id) reschedule(id, cell.date);
              }}
              className={cn(
                "flex min-h-28 flex-col gap-1 p-1.5 transition-colors",
                cell.inMonth ? "bg-panel" : "bg-panel-2/40",
                isOver && "bg-accent/10 ring-1 ring-inset ring-accent",
              )}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "text-xs",
                    cell.isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white"
                      : cell.inMonth
                        ? "text-dim"
                        : "text-dim/50",
                  )}
                >
                  {cell.day}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {cards.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}/edit`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(t.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "block cursor-grab truncate rounded border-l-2 bg-panel-2 px-1.5 py-1 text-[11px] text-text transition-opacity hover:bg-panel-2/80 active:cursor-grabbing",
                      CATEGORY_TONE[t.category] ?? "border-l-dim",
                      t.status === "done" && "text-dim line-through",
                      dragId === t.id && "opacity-50",
                    )}
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {noDueCount > 0 && (
        <p className="text-xs text-dim">
          {noDueCount} task{noDueCount === 1 ? "" : "s"} without a due date are not shown — set a due
          date to place them on the calendar.
        </p>
      )}
    </div>
  );
}
