"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import type { ProposalInput } from "@/lib/data/repositories";

function parse(formData: FormData): ProposalInput {
  const amountMrr = String(formData.get("amountMrr") ?? "").trim();
  const documentUrl = String(formData.get("documentUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  return {
    opportunityId: String(formData.get("opportunityId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    status: String(formData.get("status") ?? "draft"),
    amountMrr: amountMrr === "" ? null : amountMrr,
    documentUrl: documentUrl === "" ? null : documentUrl,
    notes: notes === "" ? null : notes,
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
