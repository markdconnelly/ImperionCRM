"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { requestMergeRefresh } from "@/lib/integrations/merge-refresh";
import type { AccountInput } from "@/lib/data/repositories";

function parse(formData: FormData): AccountInput {
  const relationship = String(formData.get("relationship") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    relationship: relationship === "" ? null : relationship,
    lifecycleStage: String(formData.get("lifecycleStage") ?? "prospect"),
    isActive: String(formData.get("isActive") ?? "true") === "true",
  };
}

export async function createAccountAction(formData: FormData) {
  await requireCapability("crm:write");
  const { crm } = getRepositories();
  await crm.createAccount(parse(formData));
  await requestMergeRefresh(); // never throws — surface the merged record now, not on the 5-min sweep (#89)
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccountAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateAccount(id, parse(formData));
  await requestMergeRefresh(); // never throws (#89)
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function deleteAccountAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteAccount(id);
  revalidatePath("/accounts");
}
