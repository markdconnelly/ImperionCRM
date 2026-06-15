import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { moveTaskAction, moveTaskCategoryAction } from "../../../tasks/actions";
import {
  addTasksToSprintAction,
  removeTaskFromSprintAction,
  closeSprintAction,
  setSprintStatusAction,
} from "../actions";

export const metadata = { title: "Sprint · Projects" };

const STATUS_TONE: Record<string, string> = {
  planned: "border-border text-dim",
  active: "border-accent/40 text-accent",
  completed: "border-green/40 text-green",
};

/**
 * Sprint detail (ADR-0069 D4, #349). Shows the sprint's board (its committed
 * tasks, grouped by status — drag persists through the SAME `delivery:write`
 * audited task-move path as /tasks), an "add from backlog" picker (the
 * sprint_id-IS-NULL pool), and the lifecycle controls:
 *   - planned → "Start sprint" (status → active)
 *   - active  → "Close sprint" (carry-over: open tasks move to the next planned
 *               sprint in scope, or to the backlog — the #349 acceptance).
 *
 * Delivery-management only (`canManageProjects`, ADR-0069). Reads directly for
 * rendering (ADR-0042); every mutation routes through a guarded server action.
 */
export default async function SprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Sprint" description="Time-boxed iteration" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to sprints (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const sprint = await crm.getSprint(id);
  if (!sprint) notFound();

  const [tasks, backlog] = await Promise.all([
    crm.listSprintTasks(id),
    sprint.status === "completed" ? Promise.resolve([]) : crm.listBacklogTasks(),
  ]);

  const window =
    sprint.startsAt && sprint.endsAt
      ? `${sprint.startsAt} → ${sprint.endsAt}`
      : sprint.startsAt
        ? `from ${sprint.startsAt}`
        : sprint.endsAt
          ? `until ${sprint.endsAt}`
          : "no dates set";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={sprint.name}
        description={`${sprint.project ?? "Cross-project"} · ${window} · ${sprint.doneCount}/${sprint.taskCount} done`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/projects/sprints"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            ← All sprints
          </Link>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] capitalize",
              STATUS_TONE[sprint.status] ?? "border-border text-dim",
            )}
          >
            {sprint.status}
          </span>
          <Link
            href={`/projects/sprints/${id}/edit`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Edit
          </Link>
          {sprint.status === "planned" && (
            <form action={setSprintStatusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="active" />
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Start sprint
              </button>
            </form>
          )}
          {sprint.status === "active" && (
            <form action={closeSprintAction}>
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                className="rounded-md border border-green/40 px-3 py-1.5 text-sm font-medium text-green transition-colors hover:bg-green/10"
              >
                Close sprint
              </button>
            </form>
          )}
        </div>
      </PageHeader>

      {sprint.status === "completed" && (
        <p className="rounded-lg border border-green/30 bg-green/5 px-4 py-2.5 text-xs text-dim">
          This sprint is <span className="text-green">closed</span>. Its still-open
          tasks were carried forward to the next planned sprint in scope, or returned
          to the backlog (ADR-0069 D4).
        </p>
      )}

      {/* The sprint board — its committed tasks grouped by status. A drag moves
          the task's status through the shared audited path; the task stays on
          this sprint (a status move never changes sprint_id). */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text">Board</h2>
        <TasksBoard
          tasks={tasks}
          groupBy="status"
          moveStatusAction={moveTaskAction}
          moveCategoryAction={moveTaskCategoryAction}
        />
      </section>

      {/* Committed tasks with a remove-to-backlog control. Kept compact and
          separate from the board (the board primitive renders fixed cards). */}
      {tasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text">Committed tasks</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="truncate">
                  {t.title}
                  <span className="ml-2 text-xs text-dim">{t.account ?? "—"}</span>
                </span>
                <form action={removeTaskFromSprintAction}>
                  <input type="hidden" name="sprintId" value={id} />
                  <input type="hidden" name="taskId" value={t.id} />
                  <button type="submit" className="text-xs text-dim hover:text-red">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Add from backlog (sprint_id IS NULL, open tasks). Hidden on a closed
          sprint. Multi-select: check tasks and add them in one submit. */}
      {sprint.status !== "completed" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text">
            Add from backlog
            <span className="ml-2 text-xs font-normal text-dim">
              {backlog.length === 0 ? "backlog is empty" : `${backlog.length} available`}
            </span>
          </h2>
          {backlog.length > 0 && (
            <form
              action={addTasksToSprintAction}
              className="flex flex-col gap-2 rounded-lg border border-border bg-panel p-4"
            >
              <input type="hidden" name="sprintId" value={id} />
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {backlog.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-panel-2"
                  >
                    <input type="checkbox" name="taskId" value={t.id} className="accent-accent" />
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-dim">{t.account ?? "—"}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Add selected
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
