/**
 * Pure delivery-board read-model shaping + fire-intent transitions (ADR-0080
 * §4/§7, ADR-0042). The board is the GUI over the intent plane #566 wrote: it
 * reads `project_provisioning ⋈ project ⋈ task ⋈ task_ticket_fire` and lets a
 * human STEER firing — but it only ever writes the *intent* (set a row to
 * 'scheduled' with a date); the backend executor is the one that creates the
 * Autotask Ticket and stamps the typed id (ADR-0042 boundary). Everything here
 * is PURE (no `pg`, no env, no clock passed in) so it is unit-testable.
 */
import type { DeliveryBoardProject, DeliveryBoardTask, TaskFireState } from "@/types";

/**
 * Provisioning lifecycle order for grouping the board into columns. Mirrors the
 * `provision_state` CHECK in migration 0082 (pending|creating|created|failed).
 */
export const PROVISION_STATES = ["pending", "creating", "created", "failed"] as const;
export type ProvisionState = (typeof PROVISION_STATES)[number];

/** Human labels for each provisioning state (board column headers). */
export const PROVISION_LABEL: Record<string, string> = {
  pending: "Pending",
  creating: "Provisioning",
  created: "Provisioned",
  failed: "Failed",
};

/** Human labels for the contract gate (project_provisioning.contract_state). */
export const CONTRACT_LABEL: Record<string, string> = {
  none: "No contract",
  sent: "Contract sent",
  signed: "Contract signed",
};

/** Human labels for a task's ticket fire-state. */
export const FIRE_LABEL: Record<TaskFireState, string> = {
  none: "Not scheduled",
  scheduled: "Scheduled",
  fired: "Fired",
  failed: "Failed",
};

/** A board column: one provisioning state + the projects in it. */
export interface DeliveryBoardColumn {
  state: ProvisionState;
  label: string;
  projects: DeliveryBoardProject[];
}

/**
 * Group provisioned projects into the four provision-state columns, preserving
 * the lifecycle order. An unknown/empty state lands in `pending` (safe default —
 * a row always starts there). Columns are always all four, even when empty, so
 * the board layout is stable.
 */
export function groupByProvisionState(projects: DeliveryBoardProject[]): DeliveryBoardColumn[] {
  return PROVISION_STATES.map((state) => ({
    state,
    label: PROVISION_LABEL[state],
    projects: projects.filter((p) => normalizeProvisionState(p.provisionState) === state),
  }));
}

/** Coerce a raw provision_state to a known column key (defaults to 'pending'). */
export function normalizeProvisionState(raw: string): ProvisionState {
  return (PROVISION_STATES as readonly string[]).includes(raw)
    ? (raw as ProvisionState)
    : "pending";
}

/**
 * Whether the contract gate is open. The executor REFUSES to provision/fire
 * until the contract is 'signed' (migration 0084 hard gate, DocuSign #391-395),
 * so the board surfaces this: scheduling is allowed (intent is harmless), but we
 * warn the human their intent stays inert until the gate flips.
 */
export function isContractGateOpen(contractState: string): boolean {
  return contractState === "signed";
}

/**
 * Whether a task can have a fire scheduled / fired-now from the board. Only a
 * task that actually dispatches a ticket (has a `task_ticket_fire` row) and is
 * not already fired is steerable; a 'failed' row can be re-scheduled (retry).
 */
export function canScheduleFire(task: DeliveryBoardTask): boolean {
  return task.fire != null && task.fire.fireState !== "fired";
}

/**
 * The fire-intent the board writes for a task — the ONLY mutation the web makes
 * to a `task_ticket_fire` row (ADR-0042: the executor does the Autotask write).
 * Both "schedule" and "fire now" resolve to the same intent: fire_state moves to
 * 'scheduled' with a `scheduled_for` date; the executor fires rows whose window
 * has arrived, so "fire now" is just scheduled_for = now.
 */
export interface FireIntent {
  fireState: "scheduled";
  scheduledFor: string; // ISO-ish 'yyyy-mm-dd' or full timestamp
}

/**
 * Resolve a board fire request into the intent row-patch. `scheduledFor` is the
 * board-picked/edited JIT date for "schedule"; for "fire now" the caller passes
 * `now` (an ISO timestamp) so the executor picks it up on its next pass. Throws
 * if the task isn't steerable (already fired / not a dispatching task) — a
 * fail-closed guard mirrored by the server action's capability check.
 */
export function planFireIntent(task: DeliveryBoardTask, scheduledFor: string): FireIntent {
  if (!canScheduleFire(task)) {
    throw new Error("Task does not dispatch a ticket or is already fired.");
  }
  const when = scheduledFor.trim();
  if (!when) throw new Error("A schedule date is required.");
  return { fireState: "scheduled", scheduledFor: when };
}

/**
 * Build the Autotask drill-in URL for a fired ticket. Real Autotask deep-links
 * need the zone base + entity convention (#568 out-of-scope: needs the Autotask
 * base + id convention), so this is a stubbed builder behind a `baseUrl` config:
 * with no base configured it returns null (the board shows the bare id, no link);
 * once `NEXT_PUBLIC_AUTOTASK_BASE_URL` is set it produces the ticket deep-link.
 */
export function autotaskTicketUrl(
  ticketId: number | null,
  baseUrl: string | null | undefined,
): string | null {
  if (ticketId == null || !baseUrl) return null;
  const base = baseUrl.replace(/\/+$/, "");
  // Autotask ticket detail convention (stub): /Mvc/ServiceDesk/TicketDetail.mvc?ticketId=N.
  return `${base}/Mvc/ServiceDesk/TicketDetail.mvc?ticketId=${ticketId}`;
}

/** Count tasks by fire-state across a project — drives the per-project summary chip. */
export function fireStateCounts(tasks: DeliveryBoardTask[]): Record<TaskFireState, number> {
  const counts: Record<TaskFireState, number> = { none: 0, scheduled: 0, fired: 0, failed: 0 };
  for (const t of tasks) {
    if (t.fire) counts[t.fire.fireState] += 1;
  }
  return counts;
}
