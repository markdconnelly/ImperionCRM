"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import type { ChecklistTemplateInput } from "@/lib/data/repositories";

/**
 * Task checklist-template authoring + apply actions (ADR-0070 E1-F3, #633).
 *
 * A checklist template is a reusable named set of subtasks, stored on the existing
 * project_template / template_item tables (no migration — #633). Authoring is gated
 * `delivery:write`, the same cap as project-template authoring and task mutation.
 *
 * The item list posts as one newline-separated textarea (`items`); we split, trim,
 * and drop blanks server-side so the data layer always sees a clean list.
 */

function parse(formData: FormData): ChecklistTemplateInput {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Checklist template name is required.");
  const items = String(formData.get("items") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) throw new Error("A checklist template needs at least one item.");
  return {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    items,
  };
}

export async function createChecklistTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const input = parse(formData);
  const { crm } = getRepositories();
  await crm.createChecklistTemplate(input);
  revalidatePath("/checklist-templates");
  redirect("/checklist-templates");
}

export async function deleteChecklistTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteChecklistTemplate(id);
  revalidatePath("/checklist-templates");
}

/**
 * Apply a checklist template to a task (ADR-0070 E1-F3, #633): instantiate its items
 * as subtasks under the task. Snapshot — later edits to the template never touch the
 * already-applied subtasks. Same `delivery:write` audited path as adding a subtask.
 */
export async function applyChecklistTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const checklistTemplateId = String(formData.get("checklistTemplateId") ?? "").trim();
  if (!taskId || !checklistTemplateId) return;
  const { crm } = getRepositories();
  await crm.applyChecklistTemplateToTask({ taskId, checklistTemplateId });
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}
