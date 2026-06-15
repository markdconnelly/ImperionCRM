"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull, strOr } from "@/lib/form-data";
import type { SprintInput } from "@/lib/data/repositories";

/** Sprint statuses the form may set (matches the 0107 CHECK constraint). */
const SPRINT_STATUSES = ["planned", "active", "completed"] as const;

function parse(formData: FormData): SprintInput {
  const status = strOr(formData, "status", "planned");
  return {
    name: str(formData, "name"),
    projectId: strOrNull(formData, "projectId"),
    startsAt: strOrNull(formData, "startsAt"),
    endsAt: strOrNull(formData, "endsAt"),
    status: (SPRINT_STATUSES as readonly string[]).includes(status) ? status : "planned",
  };
}

/**
 * Create a sprint (ADR-0069 D4, #349). A sprint scopes a board to a window of
 * work; `projectId` empty = a cross-project (team) sprint. Same delivery-write
 * audited path as task mutation. Returns to the sprints list.
 */
export async function createSprintAction(formData: FormData) {
  await requireCapability("delivery:write");
  const input = parse(formData);
  if (!input.name) return;
  const { crm } = getRepositories();
  await crm.createSprint(input);
  revalidatePath("/projects/sprints");
  redirect("/projects/sprints");
}

/** Update a sprint's fields — name / scope / window / status (#349). */
export async function updateSprintAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  if (!id) return;
  const input = parse(formData);
  if (!input.name) return;
  const { crm } = getRepositories();
  await crm.updateSprint(id, input);
  revalidatePath("/projects/sprints");
  revalidatePath(`/projects/sprints/${id}`);
  redirect(`/projects/sprints/${id}`);
}

/**
 * Flip a sprint's lifecycle status without touching its other fields (#349) —
 * e.g. "Start sprint" (planned → active). Re-uses updateSprint over the current
 * row so there is no partial-update path. NOT for closing: closing carries work
 * forward (use closeSprintAction).
 */
export async function setSprintStatusAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  const status = strOr(formData, "status", "");
  if (!id || !(SPRINT_STATUSES as readonly string[]).includes(status) || status === "completed") {
    return;
  }
  const { crm } = getRepositories();
  const s = await crm.getSprint(id);
  if (!s) return;
  await crm.updateSprint(id, {
    name: s.name,
    projectId: s.projectId,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    status,
  });
  revalidatePath("/projects/sprints");
  revalidatePath(`/projects/sprints/${id}`);
}

/**
 * Close a sprint (#349 acceptance: "closing it moves open items forward"). The
 * data layer sets it completed and carries its still-open tasks to the next
 * planned sprint in scope, or to the backlog. No redirect — the detail page
 * re-renders showing the now-empty/closed sprint.
 */
export async function closeSprintAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.closeSprint(id);
  revalidatePath("/projects/sprints");
  revalidatePath(`/projects/sprints/${id}`);
  revalidatePath("/tasks");
}

/**
 * Add the picked backlog tasks to a sprint (#349). The multi-select posts every
 * checked task id under `taskId`; each is committed to the sprint. Same audited
 * delivery-write path.
 */
export async function addTasksToSprintAction(formData: FormData) {
  await requireCapability("delivery:write");
  const sprintId = str(formData, "sprintId");
  if (!sprintId) return;
  const taskIds = formData.getAll("taskId").map((v) => String(v).trim()).filter(Boolean);
  const { crm } = getRepositories();
  for (const taskId of taskIds) {
    await crm.setTaskSprint(taskId, sprintId);
  }
  revalidatePath(`/projects/sprints/${sprintId}`);
  revalidatePath("/tasks");
}

/** Remove a task from a sprint, returning it to the backlog (sprint_id = NULL, #349). */
export async function removeTaskFromSprintAction(formData: FormData) {
  await requireCapability("delivery:write");
  const sprintId = str(formData, "sprintId");
  const taskId = str(formData, "taskId");
  if (!sprintId || !taskId) return;
  const { crm } = getRepositories();
  await crm.setTaskSprint(taskId, null);
  revalidatePath(`/projects/sprints/${sprintId}`);
  revalidatePath("/tasks");
}
