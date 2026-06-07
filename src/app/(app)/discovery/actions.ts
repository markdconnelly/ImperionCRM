"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import type { AnswerInput, DiscoveryCallInput } from "@/lib/data/repositories";
import type { QuestionRow } from "@/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v === "" ? null : v;
}

function parseDiscovery(formData: FormData): DiscoveryCallInput {
  return {
    accountId: str(formData, "accountId"),
    opportunityId: orNull(str(formData, "opportunityId")),
    contactId: orNull(str(formData, "contactId")),
    templateId: null,
    status: str(formData, "status") || "scheduled",
    heldAt: orNull(str(formData, "heldAt")),
    verdict: orNull(str(formData, "verdict")),
    verdictReason: orNull(str(formData, "verdictReason")),
    nextStep: orNull(str(formData, "nextStep")),
    sbrCadence: orNull(str(formData, "sbrCadence")),
  };
}

/** Map each question's posted field to a typed answer; drop empty answers. */
function answerFor(q: QuestionRow, formData: FormData, contactId: string | null): AnswerInput {
  const name = `q_${q.id}`;
  const a: AnswerInput = {
    questionId: q.id,
    valueText: null,
    valueNumber: null,
    valueBool: null,
    valueJson: null,
    valueDate: null,
    answeredByContactId: contactId,
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

async function buildAnswers(formData: FormData): Promise<AnswerInput[]> {
  const { engagements } = getRepositories();
  const questions = await engagements.getQuestions("discovery");
  const contactId = orNull(str(formData, "contactId"));
  return questions.map((q) => answerFor(q, formData, contactId)).filter(hasValue);
}

export async function createDiscoveryAction(formData: FormData) {
  const { engagements } = getRepositories();
  const id = await engagements.createDiscoveryCall(parseDiscovery(formData));
  const answers = await buildAnswers(formData);
  if (answers.length > 0) await engagements.saveAnswers("discovery", id, answers);
  revalidatePath("/discovery");
  redirect("/discovery");
}

export async function updateDiscoveryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.updateDiscoveryCall(id, parseDiscovery(formData));
  const answers = await buildAnswers(formData);
  if (answers.length > 0) await engagements.saveAnswers("discovery", id, answers);
  revalidatePath("/discovery");
  redirect("/discovery");
}

export async function deleteDiscoveryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.deleteDiscoveryCall(id);
  revalidatePath("/discovery");
}

// ── Provenance: spawn an opportunity from a qualified discovery call ─────────

export async function spawnOpportunityFromDiscovery(formData: FormData) {
  const discoveryId = String(formData.get("discoveryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const { engagements } = getRepositories();
  await engagements.spawnOpportunity({
    accountId,
    name: "New opportunity",
    salesStage: "qualified",
    amountMrr: null,
    sourceDiscoveryId: discoveryId,
    sourceAssessmentId: null,
    sourceSbrId: null,
  });
  redirect("/pipeline");
}

// ── Pre-discovery automation: human approval + fit/nurture routing (ADR-0027) ──

/** Stamp an agent/automation-drafted answer as confirmed (human approval). */
export async function confirmAnswerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const discoveryId = String(formData.get("discoveryId") ?? "");
  const { engagements } = getRepositories();
  await engagements.confirmAnswer(id, null); // app_user resolution lands with real auth
  revalidatePath(`/discovery/${discoveryId}/edit`);
}

/** Reject an agent/automation-drafted answer. */
export async function rejectAnswerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const discoveryId = String(formData.get("discoveryId") ?? "");
  const { engagements } = getRepositories();
  await engagements.rejectAnswer(id, null);
  revalidatePath(`/discovery/${discoveryId}/edit`);
}

/** Fit verdict → create an AI Security Readiness Assessment for the account. */
export async function advanceToAssessmentAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;
  const { crm } = getRepositories();
  await crm.createAssessment({
    accountId,
    opportunityId: null,
    name: "AI Security Readiness Assessment",
    status: "proposed",
    feeAmount: null,
    creditToOnboarding: true,
    ratings: {},
    topPriorities: null,
    recommendation: null,
    reportUrl: null,
    notes: "Created from a fit discovery verdict (ADR-0027).",
    kickoffAt: null,
  });
  redirect("/assessments");
}

/** Not-fit verdict → enroll the contact in the default nurture workflow. */
export async function dropToNurtureAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  const accountId = String(formData.get("accountId") ?? "") || null;
  if (!contactId) redirect("/discovery"); // no contact to enroll in the scaffold

  const { workflows } = getRepositories();
  const list = await workflows.listWorkflows();
  const nurture =
    list.find((w) => w.kind === "nurture" && w.status === "active") ??
    list.find((w) => w.kind === "nurture");
  if (nurture) await workflows.enroll(nurture.id, contactId, accountId);
  redirect("/workflows");
}
