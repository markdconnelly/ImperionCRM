"use client";

import { cn } from "@/lib/cn";
import { KanbanBoard, type KanbanLane } from "@/components/ui/kanban-board";
import { TagChip } from "@/components/tags/tag-chip";
import { CardEngagement } from "@/components/work/card-engagement";
import { statusLanes, statusLaneOf } from "@/lib/status-lanes";
import type { StatusDefRow } from "@/lib/data/repositories";
import type { AppliedTag, EngagementCounts, TaskRow, WorkAssignmentRow } from "@/types";

/**
 * Kanban board for tasks (#341, ADR-0066 C1) over the shared `KanbanBoard`
 * primitive. Group-by (#443, C1-F2) switches the lane set between the task
 * status enum (default) and the task category; a drop reassigns whichever
 * dimension is active, through the matching `delivery:write`-guarded action.
 *
 * Swimlanes (#447, C1-F3) split the board into collapsible bands by account or
 * category, orthogonal to the column group-by.
 *
 * Rich cards (#439, C1-F4) render the subtask rollup (`childCount`/
 * `childDoneCount`, ADR-0065 B1) and the tag chips (`tagsByTask`, the same
 * `listTagsForMany` map the table and tag filter use, ADR-0065 B6). The C1-F4
 * remainder (#608) adds assignee avatars (`assigneesByTask`) and a comment /
 * attachment count footer (`countsByTask`), each from a board-only bulk read
 * (`listAssigneesForMany` / `listEngagementCountsForMany`) so the board never
 * N+1s. No migration — every table already exists (ADR-0064 / ADR-0065 B3).
 *
 * Status columns (#613, ADR-0065 B5) come from the resolved `status_def` set the page
 * passes in (`statusDefs`, ordered by ordinal), never a hard-coded enum. A card
 * buckets by its `statusDefKey` when set, else the legacy `status` (default-set keys
 * reproduce the legacy enum, so unmigrated tasks still place). A status drop persists
 * the dropped lane key through `moveStatusAction`, which resolves it to the status_def
 * id and dual-stamps the FK + legacy text status. Category lanes stay the fixed enum.
 */

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
  statusDefs,
  groupBy,
  swimBy = "none",
  tagsByTask = {},
  assigneesByTask = {},
  countsByTask = {},
  moveStatusAction,
  moveCategoryAction,
}: {
  tasks: TaskRow[];
  /** Resolved task status_def set (ADR-0065 B5, #613), ordered by ordinal — the status
   *  columns. Tasks are never project-type-scoped, so this is the global task set. */
  statusDefs: StatusDefRow[];
  groupBy: TaskGroupBy;
  swimBy?: TaskSwimBy;
  /** parentId → applied tag chips (ADR-0065 B6, #340) for rich cards (#439 C1-F4). */
  tagsByTask?: Record<string, AppliedTag[]>;
  /** parentId → people on the task (ADR-0065 B3, #337) for the avatar stack (#608 C1-F4). */
  assigneesByTask?: Record<string, WorkAssignmentRow[]>;
  /** parentId → live comment/attachment counts (ADR-0064, #608 C1-F4) for the card footer. */
  countsByTask?: Record<string, EngagementCounts>;
  /** Persist a status drop: receives the dropped status_def KEY (ADR-0065 B5, #613). */
  moveStatusAction: (id: string, statusKey: string) => Promise<void>;
  moveCategoryAction: (id: string, category: string) => Promise<void>;
}) {
  const config =
    groupBy === "category"
      ? { lanes: CATEGORY_LANES, laneOf: (t: TaskRow) => t.category, onMove: moveCategoryAction }
      : { lanes: statusLanes(statusDefs), laneOf: statusLaneOf, onMove: moveStatusAction };

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
            {/* Assignee avatars + comment/attachment counts (#608 C1-F4). */}
            <CardEngagement assignees={assigneesByTask[t.id]} counts={countsByTask[t.id]} />
            {t.due && <div className="mt-1 text-[11px] text-dim">Due {t.due}</div>}
          </>
        );
      }}
    />
  );
}
