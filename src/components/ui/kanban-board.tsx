"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/** A board column: a distinct value of the active group-by dimension. */
export interface KanbanLane {
  key: string;
  label: string;
  tone?: string;
  /**
   * Optional explicit header color (a CSS color, e.g. a `status_def.color` hex,
   * ADR-0065 B5, #613). When set it wins over `tone` for the lane label via an inline
   * style — configurable statuses carry admin-chosen colors the Tailwind `tone`
   * classes can't name. The over-limit red still overrides both.
   */
  color?: string;
  /**
   * Optional admin-configured WIP limit (a `status_def.wip_limit`, ADR-0066 C1,
   * #616 part 2). This is the BASELINE over-limit threshold the column highlights
   * against. A personal, per-browser limit (`wipStorageKey`) still overrides it
   * where the user sets one; absent a personal value this configured limit applies.
   * Like the personal limit it highlights but never blocks a drop (an aid, not a gate).
   */
  wipLimit?: number;
}

/**
 * Resolve a column's effective WIP limit (ADR-0066 C1, #616): the personal
 * per-browser value when the user set one (> 0), else the admin-configured baseline
 * (`status_def.wip_limit`). 0/undefined from either layer means "no limit".
 * Pure — unit-testable without a DOM.
 */
export function effectiveWipLimit(personal: number | undefined, configured: number | undefined): number {
  return personal && personal > 0 ? personal : (configured ?? 0);
}

/**
 * Whether a column is over its WIP limit (ADR-0066 C1, #616): a limit is set (> 0)
 * and the card count strictly exceeds it. Drives the amber/red header + count badge.
 * Pure — unit-testable without a DOM.
 */
export function isOverWipLimit(count: number, effectiveLimit: number): boolean {
  return effectiveLimit > 0 && count > effectiveLimit;
}

/** Separator for the (swimlane, lane) drop-target highlight key — never in a key. */
const CELL_SEP = "␟";

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
 * Swimlanes (#447, C1-F3) are an OPTIONAL second dimension orthogonal to the
 * columns: when `swimlanes`/`swimlaneOf` are set, the board splits into
 * collapsible horizontal bands, each band showing that swimlane's cards
 * bucketed across the same columns. A drop only ever reassigns the active
 * column dimension — swimlane membership follows the card's own field, so a
 * card re-homed to another band's column snaps back to its own band on refresh.
 *
 * WIP limits (C1-F5) come from two layers, the effective limit being the personal
 * one when set, else the configured one:
 *   1. An admin-configured baseline per status — `lane.wipLimit` (a
 *      `status_def.wip_limit`, ADR-0066 C1, #616 part 2), set on the Statuses admin
 *      surface and the same for everyone.
 *   2. A personal, per-browser override stored in localStorage (no server write,
 *      enabled by `wipStorageKey`) under `${wipStorageKey}:${groupBy}` so status and
 *      category/type lanes keep independent limits (#445).
 * The effective limit is per-column (totalled across swimlanes); exceeding it
 * highlights the column header (amber/red count badge + header tint) — it does NOT
 * block the drop (an aid, not a gate). The editable personal input shows only when
 * `wipStorageKey` is set; its placeholder is the configured baseline.
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
  swimlanes,
  swimlaneOf,
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
  /** Optional swimlane bands (#447). Render order = array order; an extra
   *  "Unassigned" band catches cards whose `swimlaneOf` matches no band. */
  swimlanes?: KanbanLane[];
  swimlaneOf?: (item: T) => string;
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

  /** The limit a column highlights against (see `effectiveWipLimit`). */
  function effectiveLimit(lane: KanbanLane): number {
    return effectiveWipLimit(limits[lane.key], lane.wipLimit);
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
  // Collapsed swimlane bands (#447), in-memory and keyed by swimlane key.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  // ── Shared cell renderers ──────────────────────────────────────────────────
  function dropZoneProps(cellKey: string, laneKey: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(cellKey);
      },
      onDragLeave: () => setOver((o) => (o === cellKey ? null : o)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(null);
        const id = e.dataTransfer.getData("text/plain") || dragId;
        if (id) move(id, laneKey);
        setDragId(null);
      },
    };
  }

  function card(item: T) {
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
  }

  // ── Flat board (no swimlanes) — original layout ─────────────────────────────
  if (!swimlanes || !swimlaneOf) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {lanes.map((lane) => {
          const cards = columns[lane.key] ?? [];
          const personal = limits[lane.key] ?? 0;
          const limit = effectiveLimit(lane);
          const overLimit = isOverWipLimit(cards.length, limit);
          const cellKey = lane.key;
          return (
            <div
              key={lane.key}
              style={{ flex: "1 0 14rem", minWidth: "14rem" }}
              {...dropZoneProps(cellKey, lane.key)}
              className={cn(
                "flex flex-col rounded-xl border bg-panel transition-colors",
                over === cellKey ? "border-accent" : overLimit ? "border-red" : "border-border",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    overLimit ? "text-red" : !lane.color ? (lane.tone ?? "text-text") : undefined,
                  )}
                  style={!overLimit && lane.color ? { color: lane.color } : undefined}
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
                      value={personal || ""}
                      placeholder={lane.wipLimit ? String(lane.wipLimit) : "—"}
                      onChange={(e) => setLimit(lane.key, Number(e.target.value) || 0)}
                      aria-label={`WIP limit for ${lane.label}`}
                      title="Personal WIP limit (blank = use the configured limit; 0 = none)"
                      className="w-10 rounded-md border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-dim [appearance:textfield] focus:border-accent focus:text-text focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <div className="flex min-h-24 flex-col gap-2 p-2">
                {cards.map(card)}
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

  // ── Swimlane board (#447) ────────────────────────────────────────────────
  // Bands in declared order, plus a trailing "Unassigned" band for cards whose
  // swimlane value matches no declared band (so nothing is ever hidden).
  const knownSwim = new Set(swimlanes.map((s) => s.key));
  const hasUnassigned = items.some((it) => !knownSwim.has(swimlaneOf(it)));
  const bands: KanbanLane[] = hasUnassigned
    ? [...swimlanes, { key: "", label: "Unassigned", tone: "text-dim" }]
    : swimlanes;
  // Column-grid template shared by the header row and every band.
  const gridCols = `repeat(${lanes.length}, minmax(14rem, 1fr))`;

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-fit">
        {/* Column header row — lane labels + per-column WIP, totalled across bands. */}
        <div className="grid gap-3 pl-7" style={{ gridTemplateColumns: gridCols }}>
          {lanes.map((lane) => {
            const total = (columns[lane.key] ?? []).length;
            const personal = limits[lane.key] ?? 0;
            const limit = effectiveLimit(lane);
            const overLimit = isOverWipLimit(total, limit);
            return (
              <div
                key={lane.key}
                className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2"
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    overLimit ? "text-red" : !lane.color ? (lane.tone ?? "text-text") : undefined,
                  )}
                  style={!overLimit && lane.color ? { color: lane.color } : undefined}
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
                    {limit > 0 ? `${total}/${limit}` : total}
                  </span>
                  {storeKey && (
                    <input
                      type="number"
                      min={0}
                      value={personal || ""}
                      placeholder={lane.wipLimit ? String(lane.wipLimit) : "—"}
                      onChange={(e) => setLimit(lane.key, Number(e.target.value) || 0)}
                      aria-label={`WIP limit for ${lane.label}`}
                      title="Personal WIP limit (blank = use the configured limit; 0 = none)"
                      className="w-10 rounded-md border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-dim [appearance:textfield] focus:border-accent focus:text-text focus:outline-none"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {bands.map((band) => {
          const inBand = (item: T) => swimlaneOf(item) === band.key;
          const bandCount = items.filter(inBand).length;
          const isCollapsed = collapsed[band.key] ?? false;
          return (
            <div key={band.key || "__unassigned"} className="mt-3">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [band.key]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center gap-2 py-1 text-left"
              >
                <span className="text-dim">{isCollapsed ? "▸" : "▾"}</span>
                <span className={cn("text-sm font-medium", band.tone ?? "text-text")}>
                  {band.label}
                </span>
                <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs text-dim">
                  {bandCount}
                </span>
              </button>
              {!isCollapsed && (
                <div className="grid gap-3 pl-7" style={{ gridTemplateColumns: gridCols }}>
                  {lanes.map((lane) => {
                    const cards = (columns[lane.key] ?? []).filter(inBand);
                    const cellKey = `${band.key}${CELL_SEP}${lane.key}`;
                    return (
                      <div
                        key={lane.key}
                        {...dropZoneProps(cellKey, lane.key)}
                        className={cn(
                          "flex min-h-16 flex-col gap-2 rounded-xl border bg-panel p-2 transition-colors",
                          over === cellKey ? "border-accent" : "border-border",
                        )}
                      >
                        {cards.map(card)}
                        {cards.length === 0 && (
                          <div className="px-1 py-4 text-center text-xs text-dim">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
