"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import type { SbrInput, SbrScoreInput } from "@/lib/data/repositories";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v === "" ? null : v;
}

function parseSbr(formData: FormData): SbrInput {
  return {
    accountId: str(formData, "accountId"),
    contactId: orNull(str(formData, "contactId")),
    benchmarkAssessmentId: orNull(str(formData, "benchmarkAssessmentId")),
    reviewDate: str(formData, "reviewDate"),
    periodLabel: orNull(str(formData, "periodLabel")),
    status: str(formData, "status") || "scheduled",
    concerns: orNull(str(formData, "concerns")),
    summary: orNull(str(formData, "summary")),
    nextActions: orNull(str(formData, "nextActions")),
  };
}

function parseScores(formData: FormData): SbrScoreInput[] {
  return ASSESSMENT_DIMENSIONS.map((d) => ({
    dimension: d.key,
    rating: orNull(str(formData, `score_${d.key}`)),
    note: null,
  }));
}

function parseTicketIds(formData: FormData): string[] {
  return formData.getAll("ticketIds").map(String).filter((s) => s !== "");
}

export async function createSbrAction(formData: FormData) {
  const { engagements } = getRepositories();
  const id = await engagements.createSbr(parseSbr(formData));
  await engagements.saveSbrScores(id, parseScores(formData));
  await engagements.setSbrTickets(id, parseTicketIds(formData));
  revalidatePath("/sbr");
  redirect("/sbr");
}

export async function updateSbrAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.updateSbr(id, parseSbr(formData));
  await engagements.saveSbrScores(id, parseScores(formData));
  await engagements.setSbrTickets(id, parseTicketIds(formData));
  revalidatePath("/sbr");
  redirect("/sbr");
}

export async function deleteSbrAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.deleteSbr(id);
  revalidatePath("/sbr");
}
