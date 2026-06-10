"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import type { TaskInput } from "@/lib/data/repositories";

function parse(formData: FormData): TaskInput {
  const accountId = String(formData.get("accountId") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();
  return {
    accountId: accountId === "" ? null : accountId,
    title: String(formData.get("title") ?? "").trim(),
    detail: detail === "" ? null : detail,
    status: String(formData.get("status") ?? "open"),
    category: String(formData.get("category") ?? "general"),
    dueAt: dueAt === "" ? null : dueAt,
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
  redirect("/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteTask(id);
  revalidatePath("/tasks");
}
