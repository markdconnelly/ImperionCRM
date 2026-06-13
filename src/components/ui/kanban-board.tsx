"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/** A board column: a distinct value of the active group-by dimension. */
export interface KanbanLane {
  key: string;
  label: string;
  tone?: string;
}

/**
 * Generic drag-drop kanban (ADR-0066 C1). The tasks board (#341) and projects
 * board (#441) are thin wrappers that supply the lane set, how to read a card's
 * current lane (`laneOf`), what a drop persists (`onMove`), and how to render a
 * card. Grouping (#443, C1-F2) is just a different lane set + laneOf + onMove —
 * the board itself is dimension-agnostic.
 *
 * Local `lanes` state is optimistic so a card jumps immediately; an effect
 * re-syncs whenever the server sends fresh `items` (controlled pattern from
 * PollFrequency — React 19 would otherwise keep stale optimistic state). The
 * grouping key (`groupBy`) is part of the effect dependency so switching the
 * dimension re-buckets from the authoritative data, never from stale optimism.
 *
 * When `wipStorageKey` is set, each column carries an optional WIP limit
 * (#445, C1-F5): a personal, per-browser cap stored in localStorage (no server
 * write) under `${wipStorageKey}:${groupBy}` so status and category/type lanes
 * keep independent limits. Exceeding the limit highlights the column — it does
 * NOT block the drop (a limit is an aid, not a gate).
 */
export function KanbanBoard<T>({
  items,
  groupBy,
  idOf,
  lanes,
  laneOf,
  onMove,
  renderCard,
  emptyLabel = "Nothing here",
  wipStorageKey,
}: {
  items: T[];
  /** Active dimension key — re-buckets when it changes. */
  groupBy: string;
  idOf: (item: T) => string;
  lanes: KanbanLane[];
  laneOf: (item: T) => string;
  onMove: (id: string, laneKey: string) => Promise<void>;
  renderCard: (item: T) => ReactNode;
  emptyLabel?: string;
  /** Enables per-column WIP limits, persisted under this localStorage prefix. */
  wipStorageKey?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Per-lane WIP limits (#445). Loaded from localStorage on mount / group change;
  // 0 or absent = no limit. SSR-safe: state starts empty, the effect hydrates it.
  const storeKey = wipStorageKey ? `${wipStorageKey}:${groupBy}` : null;
  const [limits, setLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!storeKey) return;
    try {
      const raw = window.localStorage.getItem(storeKey);
      setLimits(raw ? (JSON.parse(raw) as Record<string, number>) : {});
    } catch {
      setLimits({});
    }
  }, [storeKey]);

  function setLimit(laneKey: string, value: number) {
    setLimits((prev) => {
      const next = { ...prev };
      if (value > 0) next[laneKey] = value;
      else delete next[laneKey];
      if (storeKey) {
        try {
          window.localStorage.setItem(storeKey, JSON.stringify(next));
        } catch {
          // Private mode / quota — the limit just won't persist; no UI failure.
        }
      }
      return next;
    });
  }

  const bucket = (list: T[]): Record<string, T[]> => {
    const by: Record<string, T[]> = {};
    for (const lane of lanes) by[lane.key] = [];
    for (const item of list) (by[laneOf(item)] ?? (by[laneOf(item)] = [])).push(item);
    return by;
  };

  const [columns, setColumns] = useState<Record<string, T[]>>(() => bucket(items));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Re-sync optimistic state on a server round-trip OR a group-by change.
  useEffect(() => setColumns(bucket(items)), [items, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

  function move(id: string, to: string) {
    setColumns((prev) => {
      let card: T | undefined;
      const next: Record<string, T[]> = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].filter((item) => {
          if (idOf(item) === id) {
            card = item;
            return false;
          }
          return true;
        });
      }
      if (!card || laneOf(card) === to) return prev;
      next[to] = [card, ...(next[to] ?? [])];
      return next;
    });
    startTransition(async () => {
      await onMove(id, to);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {lanes.map((lane) => {
        const cards = columns[lane.key] ?? [];
        const limit = limits[lane.key] ?? 0;
        const overLimit = limit > 0 && cards.length > limit;
        return (
          <div
            key={lane.key}
            style={{ flex: "1 0 14rem", minWidth: "14rem" }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(lane.key);
            }}
            onDragLeave={() => setOver((o) => (o === lane.key ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/plain") || dragId;
              if (id) move(id, lane.key);
              setDragId(null);
            }}
            className={cn(
              "flex flex-col rounded-xl border bg-panel transition-colors",
              over === lane.key
                ? "border-accent"
                : overLimit
                  ? "border-red"
                  : "border-border",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  overLimit ? "text-red" : (lane.tone ?? "text-text"),
                )}
              >
                {lane.label}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    overLimit ? "bg-red/15 text-red" : "bg-panel-2 text-dim",
                  )}
                >
                  {limit > 0 ? `${cards.length}/${limit}` : cards.length}
                </span>
                {storeKey && (
                  <input
                    type="number"
                    min={0}
                    value={limit || ""}
                    onChange={(e) => setLimit(lane.key, Number(e.target.value) || 0)}
                    aria-label={`WIP limit for ${lane.label}`}
                    title="WIP limit (0 = none)"
                    className="w-10 rounded-md border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-dim [appearance:textfield] focus:border-accent focus:text-text focus:outline-none"
                  />
                )}
              </div>
            </div>
            <div className="flex min-h-24 flex-col gap-2 p-2">
              {cards.map((item) => {
                const id = idOf(item);
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "cursor-grab rounded-lg border border-border bg-panel-2 px-3 py-2 active:cursor-grabbing",
                      dragId === id && "opacity-50",
                    )}
                  >
                    {renderCard(item)}
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-dim">{emptyLabel}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
