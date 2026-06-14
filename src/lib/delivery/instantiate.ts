/**
 * Pure delivery-template instantiation planner (ADR-0080 §4/§7, ADR-0081 §3).
 *
 * Given a delivery template tree + a project start date, this computes the
 * native-plane rows that instantiation produces: a milestone per phase, a task
 * per template task, and a JIT ticket-fire spec for each dispatching task. It is
 * PURE (no `pg`, no env, no clock) so the date math + row derivation are
 * unit-testable in isolation; `instantiateDeliveryTemplate` in the postgres repo
 * consumes this plan inside one transaction and supplies the real row ids for the
 * idempotency keys.
 *
 * Date math mirrors `applyOnboardingTemplate` exactly: every offset/duration is a
 * day count from the project `startDate`, computed in UTC over `YYYY-MM-DD`
 * strings so a server timezone never drifts a date across a day boundary.
 */
import type { DeliveryTemplateDetail } from "@/types";
import { addDays } from "@/lib/week";

/** The planned native milestone for a template phase. */
export interface PlannedMilestone {
  name: string;
  ordinal: number;
  /** Phase window start (project start + phase.offsetDays). */
  startAt: string; // yyyy-mm-dd
  /** Phase window end (start + phase.durationDays). */
  dueAt: string; // yyyy-mm-dd
  tasks: PlannedTask[];
}

/** The planned native task for a template task, with its optional fire spec. */
export interface PlannedTask {
  title: string;
  ordinal: number;
  /** Task window start (project start + task.offsetDays) — the JIT fire anchor. */
  startAt: string; // yyyy-mm-dd
  /** Task window end (task start + task.durationDays) — used as the task due date. */
  dueAt: string; // yyyy-mm-dd
  /** The fire spec when this task dispatches an Autotask ticket, else null. */
  fire: PlannedTicketFire | null;
}

/** The planned task_ticket_fire row for a dispatching task. */
export interface PlannedTicketFire {
  /** Autotask queue the ticket lands on (env config, carried from the template). */
  ticketQueueId: number | null;
  /** Ticket subject; defaults to the task title when the template leaves it null. */
  ticketTitle: string;
  /**
   * JIT firing date = task start − ticketLeadDays. The row is inserted with
   * fire_state='none' (the board schedules it later, flipping to 'scheduled'),
   * but the schedule date is precomputed so the board has nothing to recompute.
   */
  scheduledFor: string; // yyyy-mm-dd
}

/** The full instantiation plan for a template applied at `startDate`. */
export interface InstantiationPlan {
  milestones: PlannedMilestone[];
}

/** `'imperioncrm-project-{projectId}'` — the executor's provisioning idempotency key. */
export function projectIdempotencyKey(projectId: string): string {
  return `imperioncrm-project-${projectId}`;
}

/** `'imperioncrm-taskticket-{taskId}'` — the executor's per-task fire idempotency key. */
export function taskTicketIdempotencyKey(taskId: string): string {
  return `imperioncrm-taskticket-${taskId}`;
}

/**
 * Derive the native-plane row specs from a template + a project start date.
 * `startDate` must be `YYYY-MM-DD` (the caller normalizes/validates before this).
 * Phases and tasks keep their template ordinals; a task without a dispatch-ticket
 * spec yields no fire row (`fire: null`).
 */
export function planInstantiation(
  template: DeliveryTemplateDetail,
  startDate: string,
): InstantiationPlan {
  const milestones = template.phases.map((phase) => {
    const startAt = addDays(startDate, phase.offsetDays);
    const dueAt = addDays(startAt, phase.durationDays);
    const tasks = phase.tasks.map((task): PlannedTask => {
      const taskStart = addDays(startDate, task.offsetDays);
      const taskDue = addDays(taskStart, task.durationDays);
      const fire: PlannedTicketFire | null = task.dispatchesTicket
        ? {
            ticketQueueId: task.ticketQueueId,
            ticketTitle: task.ticketTitle?.trim() || task.title,
            // task start − lead days (lead 0 ⇒ the task's own start date).
            scheduledFor: addDays(taskStart, -task.ticketLeadDays),
          }
        : null;
      return {
        title: task.title,
        ordinal: task.ordinal,
        startAt: taskStart,
        dueAt: taskDue,
        fire,
      };
    });
    return { name: phase.name, ordinal: phase.ordinal, startAt, dueAt, tasks };
  });
  return { milestones };
}
