import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import { ProjectsBoard } from "@/components/projects/projects-board";
import { ProjectTypeManager } from "@/components/projects/project-type-manager";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import {
  deleteProjectAction,
  moveProjectAction,
  createProjectTypeAction,
  deleteProjectTypeAction,
} from "./actions";

const VIEWS = [
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
] as const;

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
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const activeView = view === "board" ? "board" : "list";
  const { crm } = getRepositories();
  const [roles, projects, types] = await Promise.all([
    getSessionRoles(),
    crm.listProjects(),
    crm.listProjectTypes(),
  ]);
  const canWrite = canManageProjects(roles);
  const open = projects.filter((p) => p.status !== "complete").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Project board"
        description={`${projects.length} projects across ${types.length} types · ${open} open`}
      >
        {canWrite && (
          <Link
            href="/projects/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New project
          </Link>
        )}
      </PageHeader>

      <div className="inline-flex w-fit rounded-lg border border-border bg-panel p-1">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "list" ? "/projects" : "/projects?view=board"}
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
        <ProjectsBoard projects={projects} moveAction={moveProjectAction} />
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
