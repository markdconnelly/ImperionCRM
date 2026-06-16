"use client";

import Link from "next/link";
import { KanbanBoard, type KanbanLane } from "@/components/ui/kanban-board";
import { TagChip } from "@/components/tags/tag-chip";
import { CardEngagement } from "@/components/work/card-engagement";
import type {
  AppliedTag,
  EngagementCounts,
  ProjectRow,
  ProjectTypeRow,
  WorkAssignmentRow,
} from "@/types";

/**
 * Kanban board for projects (#441, ADR-0066 C1) over the shared `KanbanBoard`
 * primitive. Group-by (#443, C1-F2) switches the lane set between the
 * `project_status` enum (default) and the project type; a drop reassigns
 * whichever dimension is active. Type lanes come from the live project_type
 * table, so dropping a card into a type lane re-types the project.
 *
 * Swimlanes (#447, C1-F3) split the board into collapsible bands by account,
 * owner, or type, orthogonal to the column group-by.
 *
 * Rich cards (#439, C1-F4) render the owner and the tag chips (`tagsByProject`,
 * the same `listTagsForMany` map the task board uses, ADR-0065 B6). The C1-F4
 * remainder (#608) adds assignee avatars (`assigneesByProject`) and a comment /
 * attachment count footer (`countsByProject`), each from a board-only bulk read
 * (`listAssigneesForMany` / `listEngagementCountsForMany`) so the board never
 * N+1s. Projects carry no subtask rollup. No migration — tables already exist.
 */
const STATUS_LANES: KanbanLane[] = [
  { key: "not_started", label: "Not started", tone: "text-dim" },
  { key: "in_progress", label: "In progress", tone: "text-accent" },
  { key: "blocked", label: "Blocked", tone: "text-red" },
  { key: "complete", label: "Complete", tone: "text-green" },
];

export type ProjectGroupBy = "status" | "type";
export type ProjectSwimBy = "none" | "account" | "owner" | "type";

/**
 * Pure derivation of a project card's rich content (#439 C1-F4) — separate from
 * the JSX so it is unit-testable in the node test env (no DOM). Projects carry
 * no subtask rollup; rich content is the owner line + the tag chips from the
 * page's `listTagsForMany` map.
 */
export function projectCardMeta(p: ProjectRow, tags: Record<string, AppliedTag[]>) {
  return {
    showOwner: Boolean(p.owner),
    tags: tags[p.id] ?? [],
  };
}

export function ProjectsBoard({
  projects,
  types,
  groupBy,
  swimBy = "none",
  tagsByProject = {},
  assigneesByProject = {},
  countsByProject = {},
  moveStatusAction,
  moveTypeAction,
}: {
  projects: ProjectRow[];
  types: ProjectTypeRow[];
  groupBy: ProjectGroupBy;
  swimBy?: ProjectSwimBy;
  /** parentId → applied tag chips (ADR-0065 B6, #340) for rich cards (#439 C1-F4). */
  tagsByProject?: Record<string, AppliedTag[]>;
  /** parentId → people on the project (ADR-0065 B3, #337) for the avatar stack (#608 C1-F4). */
  assigneesByProject?: Record<string, WorkAssignmentRow[]>;
  /** parentId → live comment/attachment counts (ADR-0064, #608 C1-F4) for the card footer. */
  countsByProject?: Record<string, EngagementCounts>;
  moveStatusAction: (id: string, status: string) => Promise<void>;
  moveTypeAction: (id: string, projectTypeId: string) => Promise<void>;
}) {
  // Type lanes are keyed by project_type id (what moveTypeAction persists); a
  // project carries only its type key, so map key → id to find its lane.
  const keyToId = new Map(types.map((t) => [t.key, t.id]));
  const config =
    groupBy === "type"
      ? {
          lanes: types.map((t) => ({ key: t.id, label: t.name })),
          laneOf: (p: ProjectRow) => keyToId.get(p.typeKey) ?? "",
          onMove: moveTypeAction,
        }
      : { lanes: STATUS_LANES, laneOf: (p: ProjectRow) => p.status, onMove: moveStatusAction };

  // Swimlane bands (#447): type uses the live project_type set; account/owner are
  // derived from the names present (sorted, blanks → Unassigned band).
  const distinct = (sel: (p: ProjectRow) => string | null) =>
    Array.from(new Set(projects.map(sel).filter(Boolean) as string[]))
      .sort()
      .map((v) => ({ key: v, label: v }));
  const swim =
    swimBy === "type"
      ? { lanes: types.map((t) => ({ key: t.key, label: t.name })), of: (p: ProjectRow) => p.typeKey }
      : swimBy === "account"
        ? { lanes: distinct((p) => p.account), of: (p: ProjectRow) => p.account }
        : swimBy === "owner"
          ? { lanes: distinct((p) => p.owner), of: (p: ProjectRow) => p.owner ?? "" }
          : null;

  return (
    <KanbanBoard
      items={projects}
      groupBy={groupBy}
      idOf={(p) => p.id}
      lanes={config.lanes}
      laneOf={config.laneOf}
      onMove={config.onMove}
      swimlanes={swim?.lanes}
      swimlaneOf={swim?.of}
      emptyLabel="No projects"
      wipStorageKey="kanban-wip:projects"
      renderCard={(p) => {
        const meta = projectCardMeta(p, tagsByProject);
        return (
          <>
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
            {meta.showOwner && (
              <div className="mt-1 truncate text-[11px] text-dim">Owner {p.owner}</div>
            )}
            {meta.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {meta.tags.map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            )}
            {/* Assignee avatars + comment/attachment counts (#608 C1-F4). */}
            <CardEngagement assignees={assigneesByProject[p.id]} counts={countsByProject[p.id]} />
            {p.targetLive && <div className="mt-1 text-[11px] text-dim">Live {p.targetLive}</div>}
          </>
        );
      }}
    />
  );
}
