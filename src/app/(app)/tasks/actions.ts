"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { ticketsService } from "@/lib/services";
import { str, strOr, strOrNull, intOr, checkbox } from "@/lib/form-data";
import { auth } from "@/auth";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import type { TaskInput } from "@/lib/data/repositories";
import { formatRRule, nextOccurrence, type RecurrenceFreq } from "@/lib/recurrence";

function parse(formData: FormData): TaskInput {
  return {
    accountId: strOrNull(formData, "accountId"),
    title: str(formData, "title"),
    detail: strOrNull(formData, "detail"),
    status: strOr(formData, "status", "open"),
    category: strOr(formData, "category", "general"),
    dueAt: strOrNull(formData, "dueAt"),
    projectId: strOrNull(formData, "projectId"),
    // Subtask parent (ADR-0065 B1, #335) — null/absent = top-level task.
    parentTaskId: strOrNull(formData, "parentTaskId"),
    // Start date (#580) + estimate (ADR-0069 D1, #346). estimateUnit only carries
    // when an estimate is given (a bare unit on an empty estimate is meaningless).
    startAt: strOrNull(formData, "startAt"),
    estimate: strOrNull(formData, "estimate"),
    estimateUnit: strOrNull(formData, "estimate") ? strOrNull(formData, "estimateUnit") : null,
  };
}

export async function createTaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const { crm } = getRepositories();
  await crm.createTask(parse(formData));
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { crm, work } = getRepositories();
  const input = parse(formData);
  // Snapshot the prior status so an edit-form status change also lands on the
  // activity feed (#438), mirroring the kanban drag path.
  const before = await crm.getTask(id);
  await crm.updateTask(id, input);
  if (before && before.status !== input.status) {
    await emitTaskStatusEvent(work, id, before.status, input.status);
  }
  // Completing a recurring task from the edit form spawns the next occurrence,
  // same as the kanban drag (#353). Best-effort — never fail the edit.
  if (before && before.status !== "done" && input.status === "done") {
    await spawnRecurrenceOnComplete(id);
  }
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
  redirect("/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteTask(id);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/** Board columns = the task status enum (ADR-0066 C1). */
const BOARD_STATUSES = ["open", "in_progress", "done"] as const;

/**
 * Move a task to a new status from the kanban board (#341, ADR-0066 C1). Drag
 * persists through the same `delivery:write`-guarded mutation path as the edit
 * form (ADR-0066: "drag actions go through the same audited mutation path"); a
 * status-only write avoids reparsing the whole TaskInput. No redirect — the
 * board stays put and the client refreshes in place.
 *
 * Emits a `task.status_changed` activity event (ADR-0064 A1, #438) onto the
 * task's feed on a real X→Y move — `setTaskStatus` returns the previous status,
 * so a no-op same-status drag records nothing. The event is best-effort and
 * never fails the move (the data layer swallows feed-write errors).
 */
export async function moveTaskAction(id: string, status: string) {
  await requireCapability("delivery:write");
  const taskId = id.trim();
  if (!taskId) return;
  if (!(BOARD_STATUSES as readonly string[]).includes(status)) return;
  const { crm, work } = getRepositories();
  const prevStatus = await crm.setTaskStatus(taskId, status);
  if (prevStatus !== null && prevStatus !== status) {
    await emitTaskStatusEvent(work, taskId, prevStatus, status);
  }
  // On a real X→done move, spawn the next occurrence of a recurring task (#353
  // acceptance). The data layer is idempotent + best-effort here so a board drag
  // never fails on a recurrence hiccup.
  if (prevStatus !== null && prevStatus !== "done" && status === "done") {
    await spawnRecurrenceOnComplete(taskId);
  }
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Move a task to a CONFIGURABLE status from the kanban board (#613, ADR-0065 B5).
 * The board hands us the dropped status_def KEY; we resolve it against the global
 * task set (tasks are never project-type-scoped — the 0104 migration forces task
 * status_def rows to scope=global) and dual-stamp the FK + legacy text status via
 * `setTaskStatusDef`. A forged/stale key resolves nothing and is a no-op.
 *
 * Keeps full parity with `moveTaskAction`: emits the `task.status_changed` activity
 * event on a real X→Y move (the writer returns the previous legacy status), and on a
 * real X→done move spawns the next occurrence of a recurring task (#353). Both are
 * keyed off the target status_def's CATEGORY so a custom "done"-category status still
 * closes recurrence correctly. Same `delivery:write` audited path; no redirect.
 */
export async function moveTaskStatusDefAction(id: string, statusKey: string) {
  await requireCapability("delivery:write");
  const taskId = id.trim();
  const key = statusKey.trim();
  if (!taskId || !key) return;
  const { crm, work } = getRepositories();
  const defs = await crm.listStatusDefs("task", null);
  const target = defs.find((d) => d.key === key);
  if (!target) return;
  const prevStatus = await crm.setTaskStatusDef(taskId, target.id);
  if (prevStatus !== null && prevStatus !== target.key) {
    await emitTaskStatusEvent(work, taskId, prevStatus, target.key);
  }
  // Spawn the next recurrence when the move lands in a 'done'-category status and the
  // task wasn't already there (matches moveTaskAction's done semantics, by category).
  if (prevStatus !== null && prevStatus !== "done" && target.category === "done") {
    await spawnRecurrenceOnComplete(taskId);
  }
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Spawn the next instance of a recurring task on completion (ADR-0070 E2, #353).
 * The data layer holds the idempotency + stop logic; this wrapper just keeps the
 * spawn off the critical path — a failure logs and is swallowed so completing the
 * task always succeeds.
 */
async function spawnRecurrenceOnComplete(taskId: string) {
  try {
    const { crm } = getRepositories();
    await crm.advanceTaskRecurrence(taskId);
  } catch (err) {
    console.error(`[tasks] recurrence spawn failed for ${taskId}:`, err);
  }
}

/** Recurrence frequencies the GUI offers (the RRULE-subset, ADR-0070 E2). */
const RECUR_FREQS: readonly RecurrenceFreq[] = ["DAILY", "WEEKLY", "MONTHLY"];

/**
 * Define / edit / clear a task's recurrence series from the edit page (#353). The
 * GUI authors the schedule; the backend materialises occurrences on completion.
 *
 *  - `repeat` = "none" (or absent) clears the series.
 *  - Otherwise it is a frequency (daily|weekly|monthly) + interval, serialised to
 *    the stored RRULE subset. `next_run_at` is derived = one period after the
 *    task's current due date (or today if it has none) — the due date the next
 *    spawned instance will carry.
 *  - End condition: `endMode` = "date" sets `ends_at`; "count" sets
 *    `count_remaining` (how many MORE occurrences to spawn); "never" leaves both
 *    null (unbounded).
 *
 * Same `delivery:write` audited path as the rest of task mutation.
 */
export async function setTaskRecurrenceAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) return;
  const { crm } = getRepositories();

  const repeat = String(formData.get("repeat") ?? "none").trim().toUpperCase();
  if (repeat === "NONE" || !RECUR_FREQS.includes(repeat as RecurrenceFreq)) {
    await crm.clearTaskRecurrence(taskId);
    revalidatePath(`/tasks/${taskId}/edit`);
    revalidatePath("/tasks");
    return;
  }

  const interval = Math.max(1, intOr(formData, "interval", 1));
  const rule = formatRRule({ freq: repeat as RecurrenceFreq, interval });

  // Base the first spawn on the task's due date, else today (server clock).
  const task = await crm.getTask(taskId);
  const base = task?.dueAt ?? new Date().toISOString().slice(0, 10);
  const nextRunAt = nextOccurrence({ freq: repeat as RecurrenceFreq, interval }, base);

  const endMode = String(formData.get("endMode") ?? "never").trim();
  let endsAt: string | null = null;
  let countRemaining: number | null = null;
  if (endMode === "date") {
    endsAt = strOrNull(formData, "endDate");
  } else if (endMode === "count") {
    const n = intOr(formData, "endCount", 0);
    countRemaining = n > 0 ? n : null;
  }

  await crm.upsertTaskRecurrence({ taskId, rule, nextRunAt, endsAt, countRemaining });
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
}

/**
 * Record a `task.status_changed` event on the task's activity feed (#438). The
 * actor is resolved from the session email → app_user; an unresolved user still
 * records a system-authored event (the move is the audit-worthy fact).
 */
async function emitTaskStatusEvent(
  work: ReturnType<typeof getRepositories>["work"],
  taskId: string,
  from: string,
  to: string,
) {
  const session = await auth();
  const actorUserId = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  await work.emitWorkEvent({
    parentType: "task",
    parentId: taskId,
    actorUserId,
    action: "task.status_changed",
    detail: { from, to },
  });
}

/**
 * Log time against a task (ADR-0069 D1, #346). The UI collects hours + minutes;
 * we fold them into a single positive `minutes` int (the schema's unit of record).
 * The logger is the signed-in employee, resolved email → app_user server-side
 * (never the form) — an unresolved user is a silent no-op (the data layer also
 * guards). A zero/empty duration is rejected before the write. Same
 * `delivery:write` audited path as the rest of task mutation.
 */
export async function logTimeAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = str(formData, "taskId");
  if (!taskId) return;
  const hours = intOr(formData, "hours", 0);
  const minutesPart = intOr(formData, "minutes", 0);
  const total = Math.max(0, hours) * 60 + Math.max(0, minutesPart);
  if (total <= 0) return; // nothing to log
  const session = await auth();
  const userId = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!userId) return;
  const { crm } = getRepositories();
  await crm.logTime({
    taskId,
    userId,
    minutes: total,
    startedAt: strOrNull(formData, "startedAt"),
    note: strOrNull(formData, "note"),
    billable: checkbox(formData, "billable"),
  });
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/** Group-by=category lanes = the task category enum (ADR-0034, ADR-0066 C1-F2). */
const BOARD_CATEGORIES = ["sales", "project", "onboarding", "general"] as const;

/**
 * Reassign a task's category from the kanban board when grouped by category
 * (#443, ADR-0066 C1-F2). Same audited path / allowlist as `moveTaskAction`.
 */
export async function moveTaskCategoryAction(id: string, category: string) {
  await requireCapability("delivery:write");
  const taskId = id.trim();
  if (!taskId) return;
  if (!(BOARD_CATEGORIES as readonly string[]).includes(category)) return;
  const { crm } = getRepositories();
  await crm.setTaskCategory(taskId, category);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/** A bare ISO calendar date, `yyyy-mm-dd`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reschedule a task to a new due date by dragging it onto a calendar day
 * (#342, ADR-0066 C2). Drag persists through the same `delivery:write`-guarded,
 * audited mutation path as the edit form (ADR-0066: "drag to reschedule
 * (audited)"); a due-only write avoids reparsing the whole TaskInput. The new
 * date must be a bare ISO `yyyy-mm-dd` (the calendar day cell) — a malformed or
 * absent value is a silent no-op so a hand-crafted call can't corrupt the column.
 * No redirect — the calendar stays put and the client refreshes in place.
 * TODO(#438): emit an activity-feed event once the ADR-0064 A1 feed lands.
 */
export async function moveTaskDueAction(id: string, dueAt: string) {
  await requireCapability("delivery:write");
  const taskId = id.trim();
  if (!taskId) return;
  const due = dueAt.trim();
  if (!ISO_DATE.test(due)) return;
  const { crm } = getRepositories();
  await crm.setTaskDue(taskId, due);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Add a child task under a parent (ADR-0065 B1, #335). A subtask inherits the
 * parent's account/project so it lives in the same context; only a title (and
 * optional due date) are collected inline. category defaults to the parent's so
 * board grouping stays coherent. Same `delivery:write` audited path as create.
 */
export async function addSubtaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const parentId = String(formData.get("parentTaskId") ?? "").trim();
  const title = str(formData, "title");
  if (!parentId || !title) return;
  const { crm } = getRepositories();
  const parent = await crm.getTask(parentId);
  if (!parent) return;
  await crm.createTask({
    accountId: parent.accountId,
    title,
    detail: null,
    status: "open",
    category: parent.category,
    dueAt: strOrNull(formData, "dueAt"),
    projectId: parent.projectId,
    parentTaskId: parentId,
    // A quick-add subtask carries no start/estimate; the edit form can add them.
    startAt: null,
    estimate: null,
    estimateUnit: null,
  });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${parentId}/edit`);
  revalidatePath("/projects/[id]", "page");
}

/**
 * Re-parent a task — promote to top-level (parentTaskId empty) or demote under a
 * new parent (ADR-0065 B1-F3, #335). The data layer rejects self/descendant
 * cycles; a refused reparent is a silent no-op (the UI re-renders unchanged).
 */
export async function reparentTaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const newParentId = strOrNull(formData, "parentTaskId");
  const { crm } = getRepositories();
  await crm.reparentTask(id, newParentId);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}/edit`);
  revalidatePath("/projects/[id]", "page");
}

/**
 * Add a dependency edge to a task (ADR-0065 B2, #336). `direction` says which side
 * the edited task sits on: `blocked-by` → the picked task BLOCKS this one (picked =
 * predecessor, this = successor); `blocks` → this task BLOCKS the picked one. The
 * data layer rejects self-links and cycles, so a refused add is a silent no-op (the
 * page re-renders unchanged). Same `delivery:write` audited path as the edit form.
 */
export async function addTaskDependencyAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const otherId = strOrNull(formData, "otherTaskId");
  const direction = String(formData.get("direction") ?? "").trim();
  if (!taskId || !otherId) return;
  const { crm } = getRepositories();
  // Map the edited task + picked task onto the directed (predecessor, successor) edge.
  const [predecessorId, successorId] =
    direction === "blocks" ? [taskId, otherId] : [otherId, taskId];
  await crm.addTaskDependency(predecessorId, successorId);
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Remove a dependency edge from a task (ADR-0065 B2, #336). `direction` resolves
 * the same predecessor/successor mapping as the add action. Idempotent — removing a
 * gone edge is a harmless no-op.
 */
export async function removeTaskDependencyAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const otherId = strOrNull(formData, "otherTaskId");
  const direction = String(formData.get("direction") ?? "").trim();
  if (!taskId || !otherId) return;
  const { crm } = getRepositories();
  const [predecessorId, successorId] =
    direction === "blocks" ? [taskId, otherId] : [otherId, taskId];
  await crm.removeTaskDependency(predecessorId, successorId);
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Save a task's additional assignees (ADR-0065 B3, #337). The multi-select posts
 * every checked user id under `assignee`; the data layer replaces the assignee set
 * wholesale, never touching the primary owner or the watcher rows. A user that is
 * the primary owner is skipped server-side (they already own the object). Same
 * `delivery:write` audited path as the edit form.
 */
export async function setTaskAssigneesAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) return;
  const userIds = formData.getAll("assignee").map((v) => String(v).trim()).filter(Boolean);
  // Resolve the acting employee so the `assigned` notification is actor-attributed
  // (#601) instead of a system event. Best-effort: an unresolved actor falls back
  // to null (system), exactly as before — the assignee save never fails on it.
  const session = await auth();
  const actingUserId = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  const { crm } = getRepositories();
  await crm.setTaskAssignees(taskId, userIds, actingUserId);
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Promote a user to the single primary owner of a task (ADR-0065 B3, #337). The
 * data layer demotes the previous primary to assignee (kept on the object) and
 * mirrors the change onto task.owner_user_id so the Sales Queue / rollups / RBAC
 * stay in lockstep (acceptance: "primary still drives reporting"). Same audited path.
 */
export async function setTaskPrimaryAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!taskId || !userId) return;
  const { crm } = getRepositories();
  await crm.setTaskPrimary(taskId, userId, "primary");
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/**
 * Watch / unwatch a task as the signed-in user (ADR-0065 B3, #337). `watch` is the
 * desired end-state ("true"/"false") so the same action handles both toggle
 * directions idempotently. The viewer is resolved by email → app_user; an
 * unresolved user is a silent no-op. Watching only adds a watcher row when the user
 * holds no other role (a primary/assignee already sees the item).
 */
export async function setTaskWatchAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const watch = String(formData.get("watch") ?? "") === "true";
  if (!taskId) return;
  const session = await auth();
  const userId = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!userId) return;
  const { crm } = getRepositories();
  await crm.setTaskWatch(taskId, userId, watch);
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
}

/**
 * On-demand Autotask push (#98, ADR-0052 §7): create this task's Autotask
 * ticket via the backend's idempotent ticket API (backend #19). The queue is
 * the task category (resolved through the backend's AUTOTASK_QUEUE_IDS map);
 * the backend persists the idempotency ledger AND writes back
 * task.autotask_ticket_ref server-side, so a retry returns the existing ticket
 * and the pipeline sync-back links instead of re-importing. Sales tasks never
 * push (ADR-0052 §6); nothing fires automatically.
 */
export async function createTaskTicketAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { crm } = getRepositories();
  const task = await crm.getTask(id);
  if (!task) return;
  // Already pushed (idempotent UI guard; the backend ledger is authoritative).
  if (task.autotaskTicketRef) redirect(`/tasks/${id}/edit?ticket=exists`);
  // Sales tasks stay CRM-only; a ticket needs an Autotask-linked account.
  if (task.category === "sales") redirect(`/tasks/${id}/edit?ticket=refused`);
  if (!task.accountId) redirect(`/tasks/${id}/edit?ticket=noaccount`);

  try {
    await ticketsService.createTicket({
      queue: task.category, // queue per task category (#98); ops maps the names
      title: task.title,
      description: task.detail ?? "",
      accountId: task.accountId,
      origin: { type: "task", id },
    });
  } catch (err) {
    console.error(`[tasks] autotask push failed for ${id}:`, err);
    revalidatePath(`/tasks/${id}/edit`);
    redirect(`/tasks/${id}/edit?ticket=failed`);
  }
  revalidatePath(`/tasks/${id}/edit`);
  revalidatePath("/tasks");
  redirect(`/tasks/${id}/edit?ticket=filed`);
}
