"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";

/** Move an opportunity to an adjacent sales stage from the pipeline board. */
export async function moveOpportunityAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stage) return;
  const { crm } = getRepositories();
  await crm.setOpportunityStage(id, stage);
  revalidatePath("/pipeline");
}
