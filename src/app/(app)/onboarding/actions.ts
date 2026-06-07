"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import type { ProjectInput } from "@/lib/data/repositories";

function parse(formData: FormData): ProjectInput {
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const targetLiveDate = String(formData.get("targetLiveDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  return {
    accountId: String(formData.get("accountId") ?? "").trim(),
    opportunityId: opportunityId === "" ? null : opportunityId,
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "onboarding"),
    status: String(formData.get("status") ?? "not_started"),
    targetLiveDate: targetLiveDate === "" ? null : targetLiveDate,
    notes: notes === "" ? null : notes,
  };
}

export async function createProjectAction(formData: FormData) {
  const { crm } = getRepositories();
  await crm.createProject(parse(formData));
  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function updateProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateProject(id, parse(formData));
  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteProject(id);
  revalidatePath("/onboarding");
}
