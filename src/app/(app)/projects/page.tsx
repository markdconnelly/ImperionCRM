import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import {
  ProjectsBoard,
  type ProjectGroupBy,
  type ProjectSwimBy,
} from "@/components/projects/projects-board";
import { ProjectTypeManager } from "@/components/projects/project-type-manager";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import type { Repositories, StatusDefRow } from "@/lib/data/repositories";
import { unionStatusDefs } from "@/lib/status-lanes";
import {
  deleteProjectAction,
  moveProjectStatusDefAction,
  moveProjectTypeAction,
  createProjectTypeAction,
  deleteProjectTypeAction,
} from "./actions";

const VIEWS = [
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
] as const;

const GROUPS = [
  { key: "status", label: "Status" },
  { key: "type", label: "Type" },
] as const;

const SWIMS = [
  { key: "none", label: "None" },
  { key: "account", label: "Account" },
  { key: "owner", label: "Owner" },
  { key: "type", label: "Type" },
] as const;

/** Build a board URL preserving view + group + swimlane. */
function boardHref(view: string, group: string, swim: string) {
  const qs = new URLSearchParams();
  if (view !== "list") qs.set("view", view);
  if (group !== "status") qs.set("group", group);
  if (swim !== "none") qs.set("swim", swim);
  const s = qs.toString();
  return s ? `/projects?${s}` : "/projects";
}

/**
 * Resolve the board's status columns (#613, ADR-0065 B5): the global project status
 * set plus each present type's resolved set (typed-over-global), unioned + de-duped by
 * key, ordered by ordinal. `listStatusDefs("project", typeId)` already returns the
 * typed set when a type defines its own, else the global defaults — so unioning the
 * global call with one call per present type surfaces every custom column exactly once.
 */
async function resolveProjectStatusColumns(
  crm: Repositories["crm"],
  presentTypeIds: string[],
): Promise<StatusDefRow[]> {
  const sets = await Promise.all([
    crm.listStatusDefs("project", null),
    ...presentTypeIds.map((id) => crm.listStatusDefs("project", id)),
  ]);
  return unionStatusDefs(sets);
}

/**
 * The project board (ADR-0052, #95): the general surface where projects of
 * every type are created and tracked. Onboarding projects appear here like any
 * other type — their dedicated Onboarding page is the easy-mode surface, not
 * their home. Not to be confused with the AI Board of Directors (/board).
 *
 * List view groups projects under their type with the type manager; Board view
 * (#441, ADR-0066 C1) is a single kanban across all types by status.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; group?: string; swim?: string }>;
}) {
  const { view, group, swim } = await searchParams;
  const activeView = view === "board" ? "board" : "list";
  const activeGroup: ProjectGroupBy = group === "type" ? "type" : "status";
  // A swimlane that duplicates the active column group-by is meaningless — drop it.
  const activeSwim: ProjectSwimBy =
    (swim === "account" || swim === "owner" || swim === "type") && swim !== activeGroup
      ? swim
      : "none";
  const { crm, tags } = getRepositories();
  const [roles, projects, types] = await Promise.all([
    getSessionRoles(),
    crm.listProjects(),
    crm.listProjectTypes(),
  ]);
  // Tag chips for the board's rich cards (#439 C1-F4) — one bulk read over the
  // visible projects, mirroring the tasks page (ADR-0065 B6, #340). Only needed
  // for the board view; the list view renders its own table.
  // Rich-card data for the board view only (#439 / #608 C1-F4): tag chips, plus
  // the C1-F4 remainder — assignee avatars + comment/attachment counts — each a
  // single bulk read over the visible projects so the board never N+1s. The list
  // view renders its own table and needs none of these.
  const [tagsByProject, assigneesByProject, countsByProject] =
    activeView === "board"
      ? await Promise.all([
          tags.listTagsForMany(
            "project",
            projects.map((p) => p.id),
          ),
          crm.listAssigneesForMany(
            "project",
            projects.map((p) => p.id),
          ),
          crm.listEngagementCountsForMany(
            "project",
            projects.map((p) => p.id),
          ),
        ])
      : [{}, {}, {}];

  // Status columns for the board (#613, ADR-0065 B5): the board shows every project
  // type on one surface, so the column set is the UNION of each present type's
  // resolved status_def set (typed-over-global per type) plus the global defaults,
  // de-duped by key and ordered by ordinal. A per-type custom status (e.g.
  // Onboarding's "Waiting on client") therefore appears as its own column; projects
  // of other types simply have no card in it. Only the board view pays this cost.
  const statusDefs: StatusDefRow[] =
    activeView === "board"
      ? await resolveProjectStatusColumns(
          crm,
          types.filter((t) => projects.some((p) => p.typeKey === t.key)).map((t) => t.id),
        )
      : [];
  const canWrite = canManageProjects(roles);
  const open = projects.filter((p) => p.status !== "complete").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Project board"
        description={`${projects.length} projects across ${types.length} types · ${open} open`}
      >
        <Link
          href="/projects/delivery"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Delivery board →
        </Link>
        <Link
          href="/projects/templates"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Delivery templates →
        </Link>
        <Link
          href="/project-templates"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Project templates →
        </Link>
        {canWrite && (
          <Link
            href="/projects/workload"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            Workload →
          </Link>
        )}
        {canWrite && (
          <Link
            href="/projects/goals"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            Goals →
          </Link>
        )}
        {canWrite && (
          <Link
            href="/projects/sprints"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            Sprints →
          </Link>
        )}
        {canWrite && (
          <Link
            href="/projects/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New project
          </Link>
        )}
      </PageHeader>

      <div className="flex items-center gap-2">
        <div className="inline-flex w-fit rounded-lg border border-border bg-panel p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={boardHref(v.key, activeGroup, activeSwim)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                activeView === v.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>

        {activeView === "board" && (
          <div className="inline-flex w-fit items-center rounded-lg border border-border bg-panel p-1">
            <span className="px-2 text-xs text-dim">Group</span>
            {GROUPS.map((g) => (
              <Link
                key={g.key}
                href={boardHref(activeView, g.key, activeSwim)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeGroup === g.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
                )}
              >
                {g.label}
              </Link>
            ))}
          </div>
        )}

        {activeView === "board" && (
          <div className="inline-flex w-fit items-center rounded-lg border border-border bg-panel p-1">
            <span className="px-2 text-xs text-dim">Swimlane</span>
            {SWIMS.filter((s) => s.key !== activeGroup).map((s) => (
              <Link
                key={s.key}
                href={boardHref(activeView, activeGroup, s.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeSwim === s.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {activeView === "board" && (
        <ProjectsBoard
          projects={projects}
          types={types}
          statusDefs={statusDefs}
          groupBy={activeGroup}
          swimBy={activeSwim}
          tagsByProject={tagsByProject}
          assigneesByProject={assigneesByProject}
          countsByProject={countsByProject}
          moveStatusAction={moveProjectStatusDefAction}
          moveTypeAction={moveProjectTypeAction}
        />
      )}

      {activeView === "list" &&
        types.map((t) => {
        const ofType = projects.filter((p) => p.typeKey === t.key);
        const counts = ["in_progress", "blocked", "complete"]
          .map((s) => {
            const n = ofType.filter((p) => p.status === s).length;
            return n > 0 ? `${n} ${s.replace(/_/g, " ")}` : null;
          })
          .filter(Boolean)
          .join(" · ");
        return (
          <section key={t.id} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="font-display text-base font-semibold tracking-tight">
                  {t.name}
                </h3>
                <p className="mt-0.5 text-sm text-dim">
                  {ofType.length} {ofType.length === 1 ? "project" : "projects"}
                  {counts && ` · ${counts}`}
                  {t.key === "onboarding" && (
                    <>
                      {" · "}
                      <Link href="/onboarding" className="text-accent hover:underline">
                        easy-mode surface →
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {canWrite && (
                <Link
                  href={`/projects/new?type=${t.key}`}
                  className="text-sm text-dim transition-colors hover:text-text"
                >
                  + New {t.name.toLowerCase()}
                </Link>
              )}
            </div>
            <ProjectsTable
              projects={ofType}
              deleteAction={deleteProjectAction}
              base="/projects"
              showType={false}
              canWrite={canWrite}
            />
          </section>
          );
        })}

      {activeView === "list" && canWrite && (
        <ProjectTypeManager
          types={types}
          createAction={createProjectTypeAction}
          deleteAction={deleteProjectTypeAction}
        />
      )}
    </div>
  );
}
