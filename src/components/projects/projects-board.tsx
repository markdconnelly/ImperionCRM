"use client";

import Link from "next/link";
import { KanbanBoard, type KanbanLane } from "@/components/ui/kanban-board";
import type { ProjectRow, ProjectTypeRow } from "@/types";

/**
 * Kanban board for projects (#441, ADR-0066 C1) over the shared `KanbanBoard`
 * primitive. Group-by (#443, C1-F2) switches the lane set between the
 * `project_status` enum (default) and the project type; a drop reassigns
 * whichever dimension is active. Type lanes come from the live project_type
 * table, so dropping a card into a type lane re-types the project.
 *
 * Swimlanes (#447, C1-F3) split the board into collapsible bands by account,
 * owner, or type, orthogonal to the column group-by. Tags/rich cards wait on
 * ADR-0064/0065.
 */
const STATUS_LANES: KanbanLane[] = [
  { key: "not_started", label: "Not started", tone: "text-dim" },
  { key: "in_progress", label: "In progress", tone: "text-accent" },
  { key: "blocked", label: "Blocked", tone: "text-red" },
  { key: "complete", label: "Complete", tone: "text-green" },
];

export type ProjectGroupBy = "status" | "type";
export type ProjectSwimBy = "none" | "account" | "owner" | "type";

export function ProjectsBoard({
  projects,
  types,
  groupBy,
  swimBy = "none",
  moveStatusAction,
  moveTypeAction,
}: {
  projects: ProjectRow[];
  types: ProjectTypeRow[];
  groupBy: ProjectGroupBy;
  swimBy?: ProjectSwimBy;
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
      renderCard={(p) => (
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
          {p.targetLive && <div className="mt-1 text-[11px] text-dim">Live {p.targetLive}</div>}
        </>
      )}
    />
  );
}
