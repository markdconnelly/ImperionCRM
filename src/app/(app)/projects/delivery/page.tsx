import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import {
  groupByProvisionState,
  isContractGateOpen,
  canScheduleFire,
  autotaskTicketUrl,
  fireStateCounts,
  CONTRACT_LABEL,
  FIRE_LABEL,
} from "@/lib/delivery/board";
import type { DeliveryBoardProject, DeliveryBoardTask, TaskFireState } from "@/types";
import { scheduleFireAction, fireNowAction } from "./actions";

/** Provision-state column accent (mirrors the project status tones). */
const PROVISION_TONE: Record<string, string> = {
  pending: "text-dim",
  creating: "text-accent",
  created: "text-green",
  failed: "text-red",
};

/** Fire-state badge tone. */
const FIRE_TONE: Record<TaskFireState, string> = {
  none: "text-dim",
  scheduled: "text-accent",
  fired: "text-green",
  failed: "text-red",
};

/**
 * The delivery board (ADR-0080 §4/§7, #568) — the GUI over the intent plane #566
 * wrote. It lists provisioned projects grouped by provisioning state, shows each
 * project's contract gate + its dispatching tasks with a fire-state badge and (once
 * fired) an Autotask ticket drill-link, and lets a human STEER firing by writing
 * intent only (schedule / fire-now → fire_state='scheduled'); the backend executor
 * does the actual Autotask write (ADR-0042). Reads are open; the controls are
 * `delivery:write`-gated, the same gate as the project board.
 */
export default async function DeliveryBoardPage() {
  const { crm } = getRepositories();
  const [roles, projects] = await Promise.all([
    getSessionRoles(),
    crm.listProvisionedProjects(),
  ]);
  const canWrite = canManageProjects(roles);
  const columns = groupByProvisionState(projects);
  // Autotask deep-links need the zone base (#568 out-of-scope) — stubbed behind config.
  const autotaskBase = process.env.NEXT_PUBLIC_AUTOTASK_BASE_URL ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Delivery board"
        description={`${projects.length} provisioned ${projects.length === 1 ? "project" : "projects"} · ticket-fire state & controls`}
      >
        <Link href="/projects" className="text-sm text-dim transition-colors hover:text-text">
          ← Project board
        </Link>
        <Link
          href="/projects/templates"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Delivery templates →
        </Link>
      </PageHeader>

      <p className="rounded-lg border border-border bg-panel p-3 text-xs text-dim">
        Provisioning is driven by the backend executor (ADR-0042): this board writes only the
        fire <em>intent</em> (schedule / fire-now). The executor creates the Autotask Project +
        Tickets and refuses until the contract gate reads <span className="text-text">signed</span>{" "}
        (DocuSign). Until then a scheduled fire stays inert.
      </p>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No provisioned delivery projects yet. Instantiate a{" "}
          <Link href="/projects/templates" className="text-accent hover:underline">
            delivery template
          </Link>{" "}
          to create one.
        </div>
      ) : (
        columns.map((col) => {
          if (col.projects.length === 0) return null;
          return (
            <section key={col.state} className="flex flex-col gap-3">
              <h3 className={cn("font-display text-base font-semibold tracking-tight", PROVISION_TONE[col.state])}>
                {col.label}
                <span className="ml-2 text-sm font-normal text-dim">{col.projects.length}</span>
              </h3>
              <div className="flex flex-col gap-3">
                {col.projects.map((p) => (
                  <ProjectCard
                    key={p.projectId}
                    project={p}
                    canWrite={canWrite}
                    autotaskBase={autotaskBase}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

/** One provisioned project: contract gate + provisioning error + its dispatching tasks. */
function ProjectCard({
  project,
  canWrite,
  autotaskBase,
}: {
  project: DeliveryBoardProject;
  canWrite: boolean;
  autotaskBase: string | null;
}) {
  const gateOpen = isContractGateOpen(project.contractState);
  const counts = fireStateCounts(project.tasks);
  const dispatching = project.tasks.filter((t) => t.fire != null);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <Link href={`/projects/${project.projectId}`} className="font-medium text-text hover:underline">
            {project.name}
          </Link>
          <p className="mt-0.5 text-xs text-dim">
            {project.account}
            {project.deliveryTemplateName && ` · ${project.deliveryTemplateName}`}
            {project.autotaskProjectId != null && ` · AT project ${project.autotaskProjectId}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5",
              gateOpen ? "border-green/40 text-green" : "border-border text-dim",
            )}
            title={gateOpen ? "Executor may provision/fire" : "Executor refuses until signed"}
          >
            {CONTRACT_LABEL[project.contractState] ?? project.contractState}
          </span>
          <span className="text-dim">
            {counts.fired} fired · {counts.scheduled} scheduled · {counts.none} idle
            {counts.failed > 0 && <span className="text-red"> · {counts.failed} failed</span>}
          </span>
        </div>
      </div>

      {project.lastError && (
        <p className="border-b border-border bg-red/5 px-4 py-2 text-xs text-red">
          Provisioning error: {project.lastError}
        </p>
      )}

      {dispatching.length === 0 ? (
        <p className="px-4 py-3 text-xs text-dim">No ticket-dispatching tasks in this project.</p>
      ) : (
        <ul className="divide-y divide-border">
          {dispatching.map((t) => (
            <TaskRow
              key={t.taskId}
              task={t}
              canWrite={canWrite}
              gateOpen={gateOpen}
              autotaskBase={autotaskBase}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One dispatching task: fire-state badge, schedule control, drill-in, last_error. */
function TaskRow({
  task,
  canWrite,
  gateOpen,
  autotaskBase,
}: {
  task: DeliveryBoardTask;
  canWrite: boolean;
  gateOpen: boolean;
  autotaskBase: string | null;
}) {
  const fire = task.fire!; // dispatching tasks only (filtered by the caller)
  const ticketUrl = autotaskTicketUrl(fire.autotaskTicketId, autotaskBase);
  const steerable = canWrite && canScheduleFire(task);
  // Pre-fill the schedule input with the precomputed JIT date (date part only).
  const defaultDate = (fire.scheduledFor ?? "").slice(0, 10);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <div className="min-w-0">
        <span className="text-text">{task.title}</span>
        {task.dueAt && <span className="ml-2 text-xs text-dim">due {task.dueAt}</span>}
        {fire.lastError && (
          <span className="ml-2 text-xs text-red" title={fire.lastError}>
            · {fire.lastError}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={cn("text-xs font-medium", FIRE_TONE[fire.fireState])}>
          {FIRE_LABEL[fire.fireState]}
          {fire.fireState === "scheduled" && fire.scheduledFor && (
            <span className="ml-1 font-normal text-dim">{fire.scheduledFor.slice(0, 10)}</span>
          )}
        </span>

        {/* Fired → drill into the Autotask ticket (link only once we have the id + a base). */}
        {fire.fireState === "fired" && fire.autotaskTicketId != null && (
          ticketUrl ? (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline"
            >
              Ticket {fire.autotaskTicketId} ↗
            </a>
          ) : (
            <span className="text-xs text-dim">Ticket {fire.autotaskTicketId}</span>
          )
        )}

        {/* Steer firing (intent only) — schedule a date, or fire now. */}
        {steerable && (
          <div className="flex items-center gap-2">
            <form action={scheduleFireAction} className="flex items-center gap-1">
              <input type="hidden" name="taskId" value={task.taskId} />
              <input
                type="date"
                name="scheduledFor"
                defaultValue={defaultDate}
                required
                className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-md border border-border px-2 py-1 text-xs text-dim transition-colors hover:text-text"
                title={gateOpen ? "Schedule the JIT fire" : "Intent only — inert until contract signed"}
              >
                Schedule
              </button>
            </form>
            <form action={fireNowAction} className="inline">
              <input type="hidden" name="taskId" value={task.taskId} />
              <button
                type="submit"
                className="rounded-md border border-accent bg-accent/10 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                title={gateOpen ? "Schedule for immediate pickup" : "Intent only — inert until contract signed"}
              >
                Fire now
              </button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
