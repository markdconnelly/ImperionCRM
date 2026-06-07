"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
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
  const { crm } = getRepositories();
  await crm.createProposal(parse(formData));
  revalidatePath("/proposals");
  redirect("/proposals");
}

export async function updateProposalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateProposal(id, parse(formData));
  revalidatePath("/proposals");
  redirect("/proposals");
}

export async function deleteProposalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteProposal(id);
  revalidatePath("/proposals");
}
