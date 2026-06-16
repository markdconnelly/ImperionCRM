import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { ProjectWeekCalendar } from "@/components/projects/project-week-calendar";
import { TextInput } from "@/components/ui/form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { fmtMinutes } from "@/lib/timesheets/overview";
import { ActivityFeed } from "@/components/work/activity-feed";
import { Attachments } from "@/components/work/attachments";
import {
  captureProjectBaselineAction,
  createProjectMeetingAction,
  createProjectTaskAction,
} from "../actions";
import { deleteTaskAction } from "../../tasks/actions";

const statusTone: Record<string, string> = {
  not_started: "text-dim",
  in_progress: "text-accent",
  blocked: "text-red",
  complete: "text-green",
};

/** Whole days from one yyyy-mm-dd to another (to − from); positive = to is later. */
function daysBetween(fromYmd: string | null, toYmd: string | null): number | null {
  if (!fromYmd || !toYmd) return null;
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** "+14d late" / "12d early" / "on time" label for a signed day delta. */
function slipLabel(days: number): string {
  if (days === 0) return "on time";
  return days > 0 ? `+${days}d late` : `${-days}d early`;
}

/**
 * One project, tracked separately (ADR-0052): its facts, status, and its own
 * tasks via task.project_id — the one task model, filtered, never a second
 * table. Meetings join this page with interaction.project_id (#97).
 */
export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feed?: string }>;
}) {
  const { id } = await params;
  const { feed } = await searchParams;
  const { crm, comms } = getRepositories();
  const [
    roles,
    project,
    rows,
    projectTasks,
    blockedTasks,
    taskDeps,
    meetings,
    timeRollup,
    baselines,
    slippage,
  ] = await Promise.all([
    getSessionRoles(),
    crm.getProject(id),
    crm.listProjects(),
    crm.listProjectTasks(id),
    crm.listBlockedProjectTasks(id),
    crm.listProjectTaskDependencies(id),
    comms.listInteractions({ kind: "meeting", projectId: id, limit: 50 }),
    crm.getProjectTimeRollup(id),
    crm.listProjectBaselines(id),
    crm.getProjectSlippage(id),
  ]);
  if (!project) notFound();
  const row = rows.find((r) => r.id === id);
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

      {/* Unmet-blocker warning (ADR-0065 B2, #336): open tasks here whose
          predecessors aren't done. Soft signal — surfaced before close, not a hard
          block. */}
      {blockedTasks.length > 0 && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-amber">
          <p className="font-medium">
            {blockedTasks.length} task{blockedTasks.length === 1 ? "" : "s"} blocked by an unmet
            dependency
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {blockedTasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tasks/${t.id}/edit`}
                  className="rounded-md border border-amber/40 px-2 py-0.5 text-xs hover:underline"
                >
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-amber/80">
            Closing the project before these clear is allowed but discouraged (ADR-0065 B2).
          </p>
        </div>
      )}

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
          {/* Time rollup (ADR-0069 D1 acceptance, #346): summed logged minutes
              across the project's tasks vs the summed hours-based estimate. */}
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-dim">Logged </span>
              <span className="text-text">{fmtMinutes(timeRollup.loggedMinutes)}</span>
            </div>
            {timeRollup.estimateMinutes != null && (
              <>
                <div>
                  <span className="text-dim">Estimate </span>
                  <span className="text-text">{fmtMinutes(timeRollup.estimateMinutes)}</span>
                </div>
                <div>
                  <span className="text-dim">Remaining </span>
                  {(() => {
                    const rem = timeRollup.estimateMinutes - timeRollup.loggedMinutes;
                    return (
                      <span className={rem < 0 ? "text-red" : "text-green"}>
                        {rem < 0 ? `-${fmtMinutes(-rem)}` : fmtMinutes(rem)}
                      </span>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
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
            <TextInput type="date" name="startAt" title="Start date" />
            <TextInput type="date" name="dueAt" title="Due date" />
            <TextInput
              type="number"
              name="estimate"
              min="0"
              step="0.25"
              placeholder="Est. hrs"
              className="w-24"
              title="Estimate (hours)"
            />
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

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Timeline</h3>
          <p className="mt-0.5 text-sm text-dim">
            Tasks on a time axis as start→due span bars, with blocked-by dependencies drawn as
            connectors (ADR-0066 C3, #628). A task with a{" "}
            <code className="text-dim">start_at</code> draws a true span; a task with only a due date
            shows a point marker; tasks with no due date are listed below as unscheduled — dates are
            never invented.
          </p>
        </div>
        <ProjectTimeline
          tasks={projectTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due: t.due,
            startAt: t.startAt,
          }))}
          edges={taskDeps}
        />

        {/* Calendar week view (#628): the same project tasks laid as horizontal span
            bars across one week, so a near-term plan reads at a glance. Read-only;
            rescheduling lives on the Tasks calendar (#342). */}
        <ProjectWeekCalendar
          tasks={projectTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due: t.due,
            startAt: t.startAt,
          }))}
          today={new Date().toISOString().slice(0, 10)}
        />
      </section>

      {/* Baselines / planned-vs-actual (ADR-0069 D6, #351): capture the plan at a
          point in time, then measure slippage against it on completion. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold tracking-tight">
              Baseline — planned vs actual
            </h3>
            <p className="mt-0.5 text-sm text-dim">
              Freeze the target go-live and task due dates as a baseline (ADR-0069 D6); a project
              that finishes late shows the slippage against the plan it committed to.
            </p>
          </div>
          {canWrite && (
            <form action={captureProjectBaselineAction}>
              <input type="hidden" name="projectId" value={id} />
              <button
                type="submit"
                className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
              >
                {baselines.length > 0 ? "Re-baseline" : "Capture baseline"}
              </button>
            </form>
          )}
        </div>

        {!slippage ? (
          <p className="rounded-lg border border-border bg-panel px-4 py-3 text-sm text-dim">
            No baseline captured yet — capture one to track planned-vs-actual slippage.
          </p>
        ) : (
          <>
            {/* Project-level slippage summary vs the latest baseline. */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-panel p-5 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-dim">Planned go-live</p>
                <p className="mt-1 font-medium">{slippage.plannedTargetLive ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-dim">{slippage.isComplete ? "Completed" : "Status"}</p>
                <p className="mt-1 font-medium">
                  {slippage.isComplete ? (slippage.actual ?? "—") : "in flight"}
                </p>
              </div>
              <div>
                <p className="text-xs text-dim">Slippage</p>
                {slippage.slippageDays != null ? (
                  <p
                    className={cn(
                      "mt-1 font-medium",
                      slippage.slippageDays > 0
                        ? "text-red"
                        : slippage.slippageDays < 0
                          ? "text-green"
                          : "text-text",
                    )}
                  >
                    {slipLabel(slippage.slippageDays)}
                  </p>
                ) : (
                  (() => {
                    // In flight: no finalized slippage. Soft "running late" hint when
                    // today is already past the planned go-live.
                    const today = new Date().toISOString().slice(0, 10);
                    const over = daysBetween(slippage.plannedTargetLive, today);
                    return over != null && over > 0 ? (
                      <p className="mt-1 font-medium text-amber">{over}d past plan</p>
                    ) : (
                      <p className="mt-1 font-medium text-dim">—</p>
                    );
                  })()
                )}
              </div>
              <div>
                <p className="text-xs text-dim">Baseline taken</p>
                <p className="mt-1 font-medium">{slippage.capturedAt}</p>
              </div>
            </div>

            {/* Per-task planned-vs-current due comparison (only dated tasks). */}
            {(() => {
              const dated = slippage.tasks.filter((t) => t.plannedDue || t.currentDue);
              if (dated.length === 0) return null;
              return (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-panel-2 text-left text-xs text-dim">
                        <th className="px-4 py-2 font-medium">Task</th>
                        <th className="px-4 py-2 font-medium">Planned due</th>
                        <th className="px-4 py-2 font-medium">Current due</th>
                        <th className="px-4 py-2 font-medium">Slippage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dated.map((t) => (
                        <tr key={t.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            {t.exists ? (
                              <Link
                                href={`/tasks/${t.id}/edit`}
                                className="text-text hover:text-accent"
                              >
                                {t.title}
                              </Link>
                            ) : (
                              <span className="text-dim line-through">{t.title}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-dim">{t.plannedDue ?? "—"}</td>
                          <td className="px-4 py-2 text-dim">
                            {t.exists ? (t.currentDue ?? "—") : "deleted"}
                          </td>
                          <td className="px-4 py-2">
                            {t.slippageDays != null ? (
                              <span
                                className={cn(
                                  t.slippageDays > 0
                                    ? "text-red"
                                    : t.slippageDays < 0
                                      ? "text-green"
                                      : "text-dim",
                                )}
                              >
                                {slipLabel(t.slippageDays)}
                              </span>
                            ) : (
                              <span className="text-dim">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Baseline history (latest is the one slippage uses). */}
            {baselines.length > 1 && (
              <details className="rounded-lg border border-border bg-panel px-4 py-2.5 text-sm">
                <summary className="cursor-pointer text-dim">
                  {baselines.length} baselines captured
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {baselines.map((b, i) => (
                    <li key={b.id} className="flex flex-wrap gap-x-3 text-xs text-dim">
                      <span className="text-text">{b.capturedAt}</span>
                      {i === 0 && <span className="text-accent">latest</span>}
                      <span>go-live {b.plannedTargetLive ?? "—"}</span>
                      <span>
                        {b.taskCount} task{b.taskCount === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Meetings</h3>
          <p className="mt-0.5 text-sm text-dim">
            Meetings attached to this project via their interaction (ADR-0052 §5) — they
            stay communication objects on the timeline.
          </p>
        </div>
        {canWrite && (
          <form
            action={createProjectMeetingAction}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel px-4 py-3"
          >
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="accountId" value={project.accountId} />
            <div className="min-w-48 flex-1">
              <TextInput name="title" placeholder="Log a meeting…" required />
            </div>
            <TextInput type="date" name="occurredAt" />
            <div className="min-w-48 flex-1">
              <TextInput name="notes" placeholder="Notes / summary (optional)" />
            </div>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
            >
              + Log meeting
            </button>
          </form>
        )}
        {meetings.length === 0 ? (
          <p className="rounded-lg border border-border bg-panel px-4 py-3 text-sm text-dim">
            No meetings logged for this project yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-panel px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/communications/${m.id}`}
                    className="block truncate text-sm text-text hover:text-accent"
                  >
                    {m.subject ?? "Meeting"}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-dim">
                    {m.contact && <span>{m.contact}</span>}
                    {m.occurredAt && <span>{m.occurredAt}</span>}
                    {m.summary && <span className="truncate">{m.summary}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Attachments parentType="project" parentId={id} canManage={canWrite} />

      <ActivityFeed
        parentType="project"
        parentId={id}
        canComment={canWrite}
        commentsOnly={feed === "comments"}
        basePath={`/projects/${id}`}
      />
    </div>
  );
}
