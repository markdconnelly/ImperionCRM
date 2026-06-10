"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";

export async function exitEnrollmentAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { workflows } = getRepositories();
  await workflows.exitEnrollment(id);
  revalidatePath("/workflows");
}

export async function createWorkflowAction(formData: FormData) {
  await requireCapability("sales:write");
  const trigger = String(formData.get("trigger") ?? "").trim();
  const { workflows } = getRepositories();
  const id = await workflows.createWorkflow({
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "nurture"),
    status: String(formData.get("status") ?? "active"),
    trigger: trigger === "" ? null : trigger,
  });
  revalidatePath("/workflows");
  redirect(`/workflows/${id}`);
}

export async function addStepAction(formData: FormData) {
  await requireCapability("sales:write");
  const workflowId = String(formData.get("workflowId") ?? "");
  const config = String(formData.get("config") ?? "").trim();
  if (!workflowId) return;
  const { workflows } = getRepositories();
  await workflows.addStep(workflowId, {
    kind: String(formData.get("kind") ?? "send_email"),
    config: config === "" ? null : config,
  });
  revalidatePath(`/workflows/${workflowId}`);
}

export async function deleteStepAction(formData: FormData) {
  await requireCapability("sales:write");
  const stepId = String(formData.get("stepId") ?? "");
  const workflowId = String(formData.get("workflowId") ?? "");
  const { workflows } = getRepositories();
  await workflows.deleteStep(stepId);
  revalidatePath(`/workflows/${workflowId}`);
}
