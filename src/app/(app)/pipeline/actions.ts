"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import type { ContactCrmStage } from "@/types";

const CONTACT_STAGES: ContactCrmStage[] = ["audience", "lead", "prospect", "client"];

/** Move a contact along the lifecycle (Audience → … → Managed Services Client). */
export async function moveContactStageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !CONTACT_STAGES.includes(stage as ContactCrmStage)) return;
  const { crm } = getRepositories();
  await crm.setContactStage(id, stage as ContactCrmStage);
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/contacts");
}

/** Move an opportunity to an adjacent sales stage from the pipeline board. */
export async function moveOpportunityAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stage) return;
  const { crm } = getRepositories();
  await crm.setOpportunityStage(id, stage);
  revalidatePath("/pipeline");
}
