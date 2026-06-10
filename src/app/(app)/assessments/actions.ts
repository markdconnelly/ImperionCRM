"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import type { AnswerInput, AssessmentInput } from "@/lib/data/repositories";
import type { QuestionRow } from "@/types";

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
// land via the engagement_answer provenance flow (ADR-0027).

/** Map a question's posted `q_<id>` field to a typed answer. */
function answerFor(q: QuestionRow, formData: FormData): AnswerInput {
  const name = `q_${q.id}`;
  const a: AnswerInput = {
    questionId: q.id,
    valueText: null,
    valueNumber: null,
    valueBool: null,
    valueJson: null,
    valueDate: null,
    answeredByContactId: null,
  };
  switch (q.responseType) {
    case "number":
    case "currency":
      a.valueNumber = orNull(str(formData, name));
      break;
    case "boolean": {
      const s = str(formData, name);
      a.valueBool = s === "" ? null : s === "true";
      break;
    }
    case "date":
      a.valueDate = orNull(str(formData, name));
      break;
    case "multi_select": {
      const all = formData.getAll(name).map(String).filter((s) => s !== "");
      a.valueJson = all.length > 0 ? all : null;
      break;
    }
    default:
      a.valueText = orNull(str(formData, name));
  }
  return a;
}

function hasValue(a: AnswerInput): boolean {
  return (
    a.valueText != null ||
    a.valueNumber != null ||
    a.valueBool != null ||
    a.valueJson != null ||
    a.valueDate != null
  );
}

export async function saveAssessmentAnswersAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { engagements } = getRepositories();
  const questions = await engagements.getQuestions("assessment");
  const answers = questions.map((q) => answerFor(q, formData)).filter(hasValue);
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
