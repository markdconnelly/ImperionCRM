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
 * Owner grouping waits on the owner id reaching the read row; tags/rich cards
 * wait on ADR-0064/0065; swimlanes + WIP stay on #439.
 */
const STATUS_LANES: KanbanLane[] = [
  { key: "not_started", label: "Not started", tone: "text-dim" },
  { key: "in_progress", label: "In progress", tone: "text-accent" },
  { key: "blocked", label: "Blocked", tone: "text-red" },
  { key: "complete", label: "Complete", tone: "text-green" },
];

export type ProjectGroupBy = "status" | "type";

export function ProjectsBoard({
  projects,
  types,
  groupBy,
  moveStatusAction,
  moveTypeAction,
}: {
  projects: ProjectRow[];
  types: ProjectTypeRow[];
  groupBy: ProjectGroupBy;
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

  return (
    <KanbanBoard
      items={projects}
      groupBy={groupBy}
      idOf={(p) => p.id}
      lanes={config.lanes}
      laneOf={config.laneOf}
      onMove={config.onMove}
      emptyLabel="No projects"
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
