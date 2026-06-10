import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TextInput } from "@/components/ui/form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { createProjectTaskAction } from "../actions";
import { deleteTaskAction } from "../../tasks/actions";

const statusTone: Record<string, string> = {
  not_started: "text-dim",
  in_progress: "text-accent",
  blocked: "text-red",
  complete: "text-green",
};

/**
 * One project, tracked separately (ADR-0052): its facts, status, and its own
 * tasks via task.project_id — the one task model, filtered, never a second
 * table. Meetings join this page with interaction.project_id (#97).
 */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [roles, project, rows, tasks] = await Promise.all([
    getSessionRoles(),
    crm.getProject(id),
    crm.listProjects(),
    crm.listTasks(),
  ]);
  if (!project) notFound();
  const row = rows.find((r) => r.id === id);
  const projectTasks = tasks.filter((t) => t.projectId === id);
  const openTasks = projectTasks.filter((t) => t.status !== "done").length;
  const canWrite = canManageProjects(roles);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.name}
        description={`${row?.type ?? "Project"} · ${row?.account ?? ""}`}
      >
        <Link
          href="/projects"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          ← Project board
        </Link>
        {canWrite && (
          <Link
            href={`/projects/${id}/edit`}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Edit project
          </Link>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-panel p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-dim">Status</p>
          <p className={cn("mt-1 font-medium", statusTone[project.status] ?? "text-text")}>
            {project.status.replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p className="text-xs text-dim">Owner</p>
          <p className="mt-1 font-medium">{row?.owner ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="text-xs text-dim">Target go-live</p>
          <p className="mt-1 font-medium">{project.targetLiveDate ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-dim">Open tasks</p>
          <p className="mt-1 font-medium">
            {openTasks} of {projectTasks.length}
          </p>
        </div>
        {project.notes && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-dim">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-dim">{project.notes}</p>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Project tasks</h3>
          <p className="mt-0.5 text-sm text-dim">
            This project&apos;s slice of the shared task object (one task model, ADR-0052).
          </p>
        </div>
        {canWrite && (
          <form
            action={createProjectTaskAction}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel px-4 py-3"
          >
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="accountId" value={project.accountId} />
            <div className="min-w-48 flex-1">
              <TextInput name="title" placeholder="New project task…" required />
            </div>
            <TextInput type="date" name="dueAt" />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
            >
              + Add task
            </button>
          </form>
        )}
        <TasksTable tasks={projectTasks} deleteAction={deleteTaskAction} />
      </section>
    </div>
  );
}
