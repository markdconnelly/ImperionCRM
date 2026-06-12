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
