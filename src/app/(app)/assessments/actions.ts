"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import { checkbox, hasAnswerValue, parseAnswer, str, strOr, strOrNull } from "@/lib/form-data";
import type { AssessmentInput } from "@/lib/data/repositories";

function parse(formData: FormData): AssessmentInput {
  const ratings: Record<string, string | null> = {};
  for (const d of ASSESSMENT_DIMENSIONS) {
    ratings[d.key] = strOrNull(formData, `rating_${d.key}`);
  }
  return {
    accountId: str(formData, "accountId"),
    opportunityId: strOrNull(formData, "opportunityId"),
    name: str(formData, "name"),
    status: strOr(formData, "status", "proposed"),
    feeAmount: strOrNull(formData, "feeAmount"),
    creditToOnboarding: checkbox(formData, "creditToOnboarding"),
    ratings,
    topPriorities: strOrNull(formData, "topPriorities"),
    recommendation: strOrNull(formData, "recommendation"),
    reportUrl: strOrNull(formData, "reportUrl"),
    notes: strOrNull(formData, "notes"),
    kickoffAt: strOrNull(formData, "kickoffAt"),
  };
}

export async function createAssessmentAction(formData: FormData) {
  await requireCapability("sales:write");
  const { crm } = getRepositories();
  await crm.createAssessment(parse(formData));
  revalidatePath("/assessments");
  redirect("/assessments");
}

export async function updateAssessmentAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateAssessment(id, parse(formData));
  revalidatePath("/assessments");
  redirect("/assessments");
}

export async function deleteAssessmentAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteAssessment(id);
  revalidatePath("/assessments");
}

// ── Non-Televy data entry: save the assessment questionnaire answers ─────────
// The user fills in what Televy doesn't cover; agent/automation drafts already
// land via the engagement_answer provenance flow (ADR-0027). Field coercion
// lives in the shared form-data grammar (#189).

export async function saveAssessmentAnswersAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { engagements } = getRepositories();
  const questions = await engagements.getQuestions("assessment");
  const answers = questions.map((q) => parseAnswer(q, formData)).filter(hasAnswerValue);
  if (answers.length > 0) await engagements.saveAnswers("assessment", id, answers);
  revalidatePath(`/assessments/${id}`);
  redirect(`/assessments/${id}?saved=1`);
}

// ── Provenance: spawn downstream work from an assessment (ADR-0023) ──────────

export async function spawnProjectFromAssessment(formData: FormData) {
  await requireCapability("sales:write");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const { engagements } = getRepositories();
  await engagements.spawnProject({
    accountId,
    name: "Remediation roadmap",
    type: "implementation",
    sourceAssessmentId: assessmentId,
    sourceSbrId: null,
  });
  redirect("/onboarding");
}

export async function spawnOpportunityFromAssessment(formData: FormData) {
  await requireCapability("sales:write");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const { engagements } = getRepositories();
  await engagements.spawnOpportunity({
    accountId,
    name: "Managed services agreement",
    salesStage: "proposal",
    amountMrr: null,
    sourceDiscoveryId: null,
    sourceAssessmentId: assessmentId,
    sourceSbrId: null,
  });
  redirect("/pipeline");
}

export async function spawnTicketFromAssessment(formData: FormData) {
  await requireCapability("sales:write");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const { engagements } = getRepositories();
  await engagements.spawnTicket({
    accountId,
    title: "Assessment remediation item",
    sourceAssessmentId: assessmentId,
    sourceSbrId: null,
  });
  redirect("/tickets");
}
