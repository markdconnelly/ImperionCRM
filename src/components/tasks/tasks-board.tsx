"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { TaskRow } from "@/types";

/**
 * Kanban board for tasks (#341, ADR-0066 C1). Columns = the task status enum
 * (`open`/`in_progress`/`done` — `status_def` is not built yet). Cards are
 * dragged between columns; a drop persists the status through `moveAction` (the
 * same `delivery:write`-guarded mutation path as the edit form) and the router
 * refreshes to re-read the server state.
 *
 * Local `columns` state is optimistic so the card jumps immediately; an effect
 * re-syncs it whenever the server sends fresh `tasks` (the controlled pattern
 * from PollFrequency — React 19 would otherwise keep stale optimistic state).
 *
 * SHOULD/COULD deferred per ADR-0066: group-by alternatives, swimlanes, WIP
 * limits, projects board. Card richness (assignee avatars, tags, subtask
 * progress, comment/attachment counts) waits on the ADR-0064/0065 data.
 */
const COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "open", label: "Open", tone: "text-amber" },
  { key: "in_progress", label: "In progress", tone: "text-accent" },
  { key: "done", label: "Done", tone: "text-green" },
];

function group(tasks: TaskRow[]): Record<string, TaskRow[]> {
  const by: Record<string, TaskRow[]> = { open: [], in_progress: [], done: [] };
  for (const t of tasks) (by[t.status] ?? (by[t.status] = [])).push(t);
  return by;
}

const CATEGORY_LABEL: Record<string, string> = {
  sales: "Sales",
  project: "Project",
  onboarding: "Onboarding",
  general: "General",
};

export function TasksBoard({
  tasks,
  moveAction,
}: {
  tasks: TaskRow[];
  moveAction: (id: string, status: string) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [columns, setColumns] = useState<Record<string, TaskRow[]>>(() => group(tasks));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Re-sync optimistic state when the server round-trip lands new data.
  useEffect(() => setColumns(group(tasks)), [tasks]);

  function move(id: string, to: string) {
    setColumns((prev) => {
      let card: TaskRow | undefined;
      const next: Record<string, TaskRow[]> = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].filter((t) => {
          if (t.id === id) {
            card = t;
            return false;
          }
          return true;
        });
      }
      if (!card || card.status === to) return prev;
      next[to] = [{ ...card, status: to }, ...(next[to] ?? [])];
      return next;
    });
    startTransition(async () => {
      await moveAction(id, to);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = columns[col.key] ?? [];
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col.key);
            }}
            onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/plain") || dragId;
              if (id) move(id, col.key);
              setDragId(null);
            }}
            className={cn(
              "flex flex-col rounded-xl border bg-panel transition-colors",
              over === col.key ? "border-accent" : "border-border",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className={cn("text-sm font-medium", col.tone)}>{col.label}</span>
              <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs text-dim">
                {items.length}
              </span>
            </div>
            <div className="flex min-h-24 flex-col gap-2 p-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", t.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(t.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab rounded-lg border border-border bg-panel-2 px-3 py-2 active:cursor-grabbing",
                    dragId === t.id && "opacity-50",
                  )}
                >
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-dim">
                    <span className="rounded-full bg-panel px-2 py-0.5 text-[11px]">
                      {CATEGORY_LABEL[t.category] ?? t.category}
                    </span>
                    <span className="truncate">{t.account ?? "—"}</span>
                  </div>
                  {t.due && <div className="mt-1 text-[11px] text-dim">Due {t.due}</div>}
                </div>
              ))}
              {items.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-dim">No tasks</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
