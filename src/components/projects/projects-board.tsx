"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ProjectRow } from "@/types";

/**
 * Kanban board for projects (#441, ADR-0066 C1). Columns = the `project_status`
 * enum. A card dragged between columns persists through `moveAction` (the same
 * `delivery:write`-guarded mutation path as the edit form, which also stamps
 * started_at/completed_at on transition) and the router refreshes.
 *
 * This is the sibling of `tasks/tasks-board.tsx` — same native HTML5 DnD,
 * optimistic local state, and re-sync effect (the controlled pattern from
 * PollFrequency). Group-by, swimlanes, rich cards, and WIP limits stay on #439.
 */
const COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "not_started", label: "Not started", tone: "text-dim" },
  { key: "in_progress", label: "In progress", tone: "text-accent" },
  { key: "blocked", label: "Blocked", tone: "text-red" },
  { key: "complete", label: "Complete", tone: "text-green" },
];

function group(projects: ProjectRow[]): Record<string, ProjectRow[]> {
  const by: Record<string, ProjectRow[]> = {
    not_started: [],
    in_progress: [],
    blocked: [],
    complete: [],
  };
  for (const p of projects) (by[p.status] ?? (by[p.status] = [])).push(p);
  return by;
}

export function ProjectsBoard({
  projects,
  moveAction,
}: {
  projects: ProjectRow[];
  moveAction: (id: string, status: string) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [columns, setColumns] = useState<Record<string, ProjectRow[]>>(() => group(projects));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Re-sync optimistic state when the server round-trip lands new data.
  useEffect(() => setColumns(group(projects)), [projects]);

  function move(id: string, to: string) {
    setColumns((prev) => {
      let card: ProjectRow | undefined;
      const next: Record<string, ProjectRow[]> = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].filter((p) => {
          if (p.id === id) {
            card = p;
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              {items.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", p.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(p.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab rounded-lg border border-border bg-panel-2 px-3 py-2 active:cursor-grabbing",
                    dragId === p.id && "opacity-50",
                  )}
                >
                  <Link
                    href={`/projects/${p.id}`}
                    draggable={false}
                    className="block truncate text-sm font-medium hover:text-accent"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-dim">
                    <span className="rounded-full bg-panel px-2 py-0.5 text-[11px]">{p.type}</span>
                    <span className="truncate">{p.account}</span>
                  </div>
                  {p.targetLive && (
                    <div className="mt-1 text-[11px] text-dim">Live {p.targetLive}</div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-dim">No projects</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
