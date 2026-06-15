"use client";

import { cn } from "@/lib/cn";
import { KanbanBoard, type KanbanLane } from "@/components/ui/kanban-board";
import { TagChip } from "@/components/tags/tag-chip";
import type { AppliedTag, TaskRow } from "@/types";

/**
 * Kanban board for tasks (#341, ADR-0066 C1) over the shared `KanbanBoard`
 * primitive. Group-by (#443, C1-F2) switches the lane set between the task
 * status enum (default) and the task category; a drop reassigns whichever
 * dimension is active, through the matching `delivery:write`-guarded action.
 *
 * Swimlanes (#447, C1-F3) split the board into collapsible bands by account or
 * category, orthogonal to the column group-by.
 *
 * Rich cards (#439, C1-F4) render the data already on the list read — the
 * subtask rollup (`childCount`/`childDoneCount`, ADR-0065 B1) and the tag chips
 * (`tagsByTask`, the same `listTagsForMany` map the table and tag filter use,
 * ADR-0065 B6). Assignee avatars and comment/attachment counts stay deferred:
 * they need bulk reads that do not exist on the list path yet (no migration in
 * this lane — tracked in the F4 follow-up).
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

/**
 * Pure derivation of a task card's rich content (#439 C1-F4) — kept separate
 * from the JSX so it is unit-testable in the node test env (no DOM). The
 * subtask rollup shows only when the task has children; `subtaskComplete` drives
 * the green "all done" tone. Tags come from the page's `listTagsForMany` map.
 */
export function taskCardMeta(t: TaskRow, tags: Record<string, AppliedTag[]>) {
  return {
    categoryLabel: CATEGORY_LABEL[t.category] ?? t.category,
    showSubtasks: t.childCount > 0,
    subtaskLabel: `${t.childDoneCount}/${t.childCount}`,
    subtaskComplete: t.childCount > 0 && t.childDoneCount === t.childCount,
    tags: tags[t.id] ?? [],
  };
}

export function TasksBoard({
  tasks,
  groupBy,
  swimBy = "none",
  tagsByTask = {},
  moveStatusAction,
  moveCategoryAction,
}: {
  tasks: TaskRow[];
  groupBy: TaskGroupBy;
  swimBy?: TaskSwimBy;
  /** parentId → applied tag chips (ADR-0065 B6, #340) for rich cards (#439 C1-F4). */
  tagsByTask?: Record<string, AppliedTag[]>;
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
      renderCard={(t) => {
        const meta = taskCardMeta(t, tagsByTask);
        return (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-sm font-medium">{t.title}</div>
              {/* Subtask rollup (ADR-0065 B1, #335): n/m children done — same chip
                  idiom as the list view. */}
              {meta.showSubtasks && (
                <span
                  title={`${t.childDoneCount} of ${t.childCount} subtasks done`}
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px]",
                    meta.subtaskComplete ? "border-green/40 text-green" : "border-border text-dim",
                  )}
                >
                  {meta.subtaskLabel}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-dim">
              <span className="rounded-full bg-panel px-2 py-0.5 text-[11px]">
                {meta.categoryLabel}
              </span>
              <span className="truncate">{t.account ?? "—"}</span>
            </div>
            {meta.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {meta.tags.map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            )}
            {t.due && <div className="mt-1 text-[11px] text-dim">Due {t.due}</div>}
          </>
        );
      }}
    />
  );
}
