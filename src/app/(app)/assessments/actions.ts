"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import type { AssessmentInput } from "@/lib/data/repositories";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v === "" ? null : v;
}

function parse(formData: FormData): AssessmentInput {
  const ratings: Record<string, string | null> = {};
  for (const d of ASSESSMENT_DIMENSIONS) {
    ratings[d.key] = orNull(str(formData, `rating_${d.key}`));
  }
  return {
    accountId: str(formData, "accountId"),
    opportunityId: orNull(str(formData, "opportunityId")),
    name: str(formData, "name"),
    status: str(formData, "status") || "proposed",
    feeAmount: orNull(str(formData, "feeAmount")),
    creditToOnboarding: formData.get("creditToOnboarding") === "on",
    ratings,
    topPriorities: orNull(str(formData, "topPriorities")),
    recommendation: orNull(str(formData, "recommendation")),
    reportUrl: orNull(str(formData, "reportUrl")),
    notes: orNull(str(formData, "notes")),
    kickoffAt: orNull(str(formData, "kickoffAt")),
  };
}

export async function createAssessmentAction(formData: FormData) {
  const { crm } = getRepositories();
  await crm.createAssessment(parse(formData));
  revalidatePath("/assessments");
  redirect("/assessments");
}

export async function updateAssessmentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateAssessment(id, parse(formData));
  revalidatePath("/assessments");
  redirect("/assessments");
}

export async function deleteAssessmentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteAssessment(id);
  revalidatePath("/assessments");
}
