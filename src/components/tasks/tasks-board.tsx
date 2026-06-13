"use client";

import { KanbanBoard, type KanbanLane } from "@/components/ui/kanban-board";
import type { TaskRow } from "@/types";

/**
 * Kanban board for tasks (#341, ADR-0066 C1) over the shared `KanbanBoard`
 * primitive. Group-by (#443, C1-F2) switches the lane set between the task
 * status enum (default) and the task category; a drop reassigns whichever
 * dimension is active, through the matching `delivery:write`-guarded action.
 *
 * Swimlanes (#447, C1-F3) split the board into collapsible bands by account or
 * category, orthogonal to the column group-by. Assignee swimlanes/grouping and
 * richer cards wait on the ADR-0064/0065 data (`TaskRow` carries none today).
 */
const STATUS_LANES: KanbanLane[] = [
  { key: "open", label: "Open", tone: "text-amber" },
  { key: "in_progress", label: "In progress", tone: "text-accent" },
  { key: "done", label: "Done", tone: "text-green" },
];

const CATEGORY_LANES: KanbanLane[] = [
  { key: "sales", label: "Sales" },
  { key: "project", label: "Project" },
  { key: "onboarding", label: "Onboarding" },
  { key: "general", label: "General" },
];

const CATEGORY_LABEL: Record<string, string> = {
  sales: "Sales",
  project: "Project",
  onboarding: "Onboarding",
  general: "General",
};

export type TaskGroupBy = "status" | "category";
export type TaskSwimBy = "none" | "account" | "category";

export function TasksBoard({
  tasks,
  groupBy,
  swimBy = "none",
  moveStatusAction,
  moveCategoryAction,
}: {
  tasks: TaskRow[];
  groupBy: TaskGroupBy;
  swimBy?: TaskSwimBy;
  moveStatusAction: (id: string, status: string) => Promise<void>;
  moveCategoryAction: (id: string, category: string) => Promise<void>;
}) {
  const config =
    groupBy === "category"
      ? { lanes: CATEGORY_LANES, laneOf: (t: TaskRow) => t.category, onMove: moveCategoryAction }
      : { lanes: STATUS_LANES, laneOf: (t: TaskRow) => t.status, onMove: moveStatusAction };

  // Swimlane bands (#447): category uses the fixed enum lanes; account is derived
  // from the live set of account names present (sorted, blanks → Unassigned band).
  const swim =
    swimBy === "category"
      ? { lanes: CATEGORY_LANES, of: (t: TaskRow) => t.category }
      : swimBy === "account"
        ? {
            lanes: Array.from(new Set(tasks.map((t) => t.account).filter(Boolean) as string[]))
              .sort()
              .map((a) => ({ key: a, label: a })),
            of: (t: TaskRow) => t.account ?? "",
          }
        : null;

  return (
    <KanbanBoard
      items={tasks}
      groupBy={groupBy}
      idOf={(t) => t.id}
      lanes={config.lanes}
      laneOf={config.laneOf}
      onMove={config.onMove}
      swimlanes={swim?.lanes}
      swimlaneOf={swim?.of}
      emptyLabel="No tasks"
      wipStorageKey="kanban-wip:tasks"
      renderCard={(t) => (
        <>
          <div className="truncate text-sm font-medium">{t.title}</div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-dim">
            <span className="rounded-full bg-panel px-2 py-0.5 text-[11px]">
              {CATEGORY_LABEL[t.category] ?? t.category}
            </span>
            <span className="truncate">{t.account ?? "—"}</span>
          </div>
          {t.due && <div className="mt-1 text-[11px] text-dim">Due {t.due}</div>}
        </>
      )}
    />
  );
}
