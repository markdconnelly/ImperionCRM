import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskSubtasks } from "@/components/tasks/task-subtasks";
import { TaskDependencies } from "@/components/tasks/task-dependencies";
import { TaskAssignees } from "@/components/tasks/task-assignees";
import { TaskTimeLog } from "@/components/tasks/task-time-log";
import { TaskRecurrence } from "@/components/tasks/task-recurrence";
import { Attachments } from "@/components/work/attachments";
import { CustomFields } from "@/components/work/custom-fields";
import {
  updateTaskAction,
  createTaskTicketAction,
  addSubtaskAction,
  reparentTaskAction,
  addTaskDependencyAction,
  removeTaskDependencyAction,
  setTaskAssigneesAction,
  setTaskPrimaryAction,
  setTaskWatchAction,
} from "../../actions";
import { applyChecklistTemplateAction } from "@/app/(app)/checklist-templates/actions";
import { getRepositories } from "@/lib/data";
import { auth } from "@/auth";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";

const TICKET_NOTICES: Record<string, string> = {
  filed: "Autotask ticket created — the ref is stored on the task and the next sync links it.",
  exists: "This task already has its Autotask ticket — a task can never file twice.",
  refused: "Sales tasks never push to Autotask (ADR-0052 §6).",
  noaccount: "Link the task to an account first — the ticket needs an Autotask company.",
  failed:
    "The Autotask push failed (backend unavailable, queue unmapped, or the account isn't linked to an Autotask company). Retrying is safe — it can never duplicate.",
};

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { id } = await params;
  const { ticket } = await searchParams;
  const { crm, engagements } = getRepositories();
  const session = await auth();
  const viewerEmail = session?.user?.email ?? null;
  const roles = await getSessionRoles();
  const canManage = canManageProjects(roles);
  const [task, accounts, hierarchy, deps, taskOptions, assignments, users, checklistTemplates] =
    await Promise.all([
      crm.getTask(id),
      crm.accountOptions(),
      crm.getTaskChildren(id),
      crm.getTaskDependencies(id),
      crm.taskOptions(id),
      crm.getWorkAssignments("task", id, viewerEmail),
      crm.userOptions(),
      crm.listChecklistTemplates(),
    ]);
  if (!task) notFound();

  // Ticket history (#98): the synced silver ticket row carries the live
  // Autotask data points (status/priority/number) once the sync-back lands.
  const linkedTicket = task.autotaskTicketRef
    ? await engagements.getTicketByRef(task.autotaskTicketRef)
    : null;
  const notice = ticket ? TICKET_NOTICES[ticket] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit task" description={task.title} />

      {notice && (
        <p
          className={
            ticket === "filed" || ticket === "exists"
              ? "max-w-lg rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green"
              : "max-w-lg rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber"
          }
        >
          {notice}
        </p>
      )}

      <TaskForm action={updateTaskAction} task={task} accounts={accounts} />

      {/* Custom fields (ADR-0065 B4, #614): admin-defined values on the task. A task
          field is never project-type-scoped (projectTypeId null); editable on `delivery:write`. */}
      <CustomFields parentType="task" parentId={task.id} projectTypeId={null} canManage={canManage} />

      <TaskAssignees
        taskId={task.id}
        assignments={assignments}
        users={users}
        setAssigneesAction={setTaskAssigneesAction}
        setPrimaryAction={setTaskPrimaryAction}
        setWatchAction={setTaskWatchAction}
      />

      {/* Time tracking (ADR-0069 D1, #346): log time + logged-vs-estimate rollup. */}
      <TaskTimeLog task={task} />

      {/* Recurrence (ADR-0070 E2, #353): define the schedule; next instance spawns on completion. */}
      <TaskRecurrence task={task} />

      <TaskSubtasks
        taskId={task.id}
        parentTaskId={task.parentTaskId}
        hierarchy={hierarchy}
        addSubtaskAction={addSubtaskAction}
        reparentTaskAction={reparentTaskAction}
        checklistTemplates={checklistTemplates}
        applyChecklistTemplateAction={applyChecklistTemplateAction}
      />

      <TaskDependencies
        taskId={task.id}
        deps={deps}
        options={taskOptions}
        addAction={addTaskDependencyAction}
        removeAction={removeTaskDependencyAction}
      />

      <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
        <h3 className="font-display text-sm font-semibold tracking-tight">Autotask ticket</h3>
        {task.autotaskTicketRef ? (
          <div className="mt-2 text-sm">
            <p className="text-dim">
              Ticket ref <span className="text-text">{task.autotaskTicketRef}</span>
              {linkedTicket?.number ? ` · #${linkedTicket.number}` : ""}
            </p>
            {linkedTicket ? (
              <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-dim">Status</p>
                  <p className="mt-0.5">{linkedTicket.status ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-dim">Priority</p>
                  <p className="mt-0.5">{linkedTicket.priority ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-dim">Opened</p>
                  <p className="mt-0.5">{linkedTicket.opened ?? "—"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-dim">
                Waiting for the Autotask sync to land the ticket details.
              </p>
            )}
          </div>
        ) : task.category === "sales" ? (
          <p className="mt-2 text-sm text-dim">
            Sales tasks stay CRM-only — they never push to Autotask (ADR-0052 §6).
          </p>
        ) : (
          <form action={createTaskTicketAction} className="mt-2">
            <input type="hidden" name="id" value={task.id} />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
            >
              Create Autotask ticket
            </button>
            <p className="mt-2 text-[11px] text-dim">
              Files a ticket in the {task.category} queue via the backend&apos;s idempotent
              push (ADR-0052 §7) — retries never duplicate; the sync-back links instead of
              re-importing.
            </p>
          </form>
        )}
      </section>

      <div className="max-w-lg">
        <Attachments parentType="task" parentId={task.id} canManage={canManage} />
      </div>
    </div>
  );
}
