"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { ticketsService } from "@/lib/services";
import { str, strOr, strOrNull } from "@/lib/form-data";
import type { TaskInput } from "@/lib/data/repositories";

function parse(formData: FormData): TaskInput {
  return {
    accountId: strOrNull(formData, "accountId"),
    title: str(formData, "title"),
    detail: strOrNull(formData, "detail"),
    status: strOr(formData, "status", "open"),
    category: strOr(formData, "category", "general"),
    dueAt: strOrNull(formData, "dueAt"),
    projectId: strOrNull(formData, "projectId"),
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
  const { crm } = getRepositories();
  await crm.updateTask(id, parse(formData));
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
 * TODO(#438): emit an activity-feed event once the ADR-0064 A1 feed lands.
 */
export async function moveTaskAction(id: string, status: string) {
  await requireCapability("delivery:write");
  const taskId = id.trim();
  if (!taskId) return;
  if (!(BOARD_STATUSES as readonly string[]).includes(status)) return;
  const { crm } = getRepositories();
  await crm.setTaskStatus(taskId, status);
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
