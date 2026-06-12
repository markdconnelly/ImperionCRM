"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strOrNull } from "@/lib/form-data";
import type { ProposalInput } from "@/lib/data/repositories";

function parse(formData: FormData): ProposalInput {
  return {
    opportunityId: str(formData, "opportunityId"),
    title: str(formData, "title"),
    status: strOr(formData, "status", "draft"),
    amountMrr: strOrNull(formData, "amountMrr"),
    documentUrl: strOrNull(formData, "documentUrl"),
    notes: strOrNull(formData, "notes"),
  };
}

export async function createProposalAction(formData: FormData) {
  await requireCapability("sales:write");
  const { crm } = getRepositories();
  await crm.createProposal(parse(formData));
  revalidatePath("/proposals");
  redirect("/proposals");
}

export async function updateProposalAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateProposal(id, parse(formData));
  revalidatePath("/proposals");
  redirect("/proposals");
}

export async function deleteProposalAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteProposal(id);
  revalidatePath("/proposals");
}
