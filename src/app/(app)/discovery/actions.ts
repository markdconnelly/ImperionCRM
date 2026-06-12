"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { hasAnswerValue, parseAnswer, str, strOr, strOrNull } from "@/lib/form-data";
import type { AnswerInput, DiscoveryCallInput } from "@/lib/data/repositories";

function parseDiscovery(formData: FormData): DiscoveryCallInput {
  return {
    accountId: str(formData, "accountId"),
    opportunityId: strOrNull(formData, "opportunityId"),
    contactId: strOrNull(formData, "contactId"),
    templateId: null,
    status: strOr(formData, "status", "scheduled"),
    heldAt: strOrNull(formData, "heldAt"),
    verdict: strOrNull(formData, "verdict"),
    verdictReason: strOrNull(formData, "verdictReason"),
    nextStep: strOrNull(formData, "nextStep"),
    sbrCadence: strOrNull(formData, "sbrCadence"),
  };
}

/** Map each question's posted field to a typed answer (shared grammar, #189); drop empties. */
async function buildAnswers(formData: FormData): Promise<AnswerInput[]> {
  const { engagements } = getRepositories();
  const questions = await engagements.getQuestions("discovery");
  const contactId = strOrNull(formData, "contactId");
  return questions.map((q) => parseAnswer(q, formData, contactId)).filter(hasAnswerValue);
}

export async function createDiscoveryAction(formData: FormData) {
  await requireCapability("sales:write");
  const { engagements } = getRepositories();
  const id = await engagements.createDiscoveryCall(parseDiscovery(formData));
  const answers = await buildAnswers(formData);
  if (answers.length > 0) await engagements.saveAnswers("discovery", id, answers);
  revalidatePath("/discovery");
  redirect("/discovery");
}

export async function updateDiscoveryAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.updateDiscoveryCall(id, parseDiscovery(formData));
  const answers = await buildAnswers(formData);
  if (answers.length > 0) await engagements.saveAnswers("discovery", id, answers);
  revalidatePath("/discovery");
  redirect("/discovery");
}

export async function deleteDiscoveryAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.deleteDiscoveryCall(id);
  revalidatePath("/discovery");
}

// ── Provenance: spawn an opportunity from a qualified discovery call ─────────

export async function spawnOpportunityFromDiscovery(formData: FormData) {
  await requireCapability("sales:write");
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
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const discoveryId = String(formData.get("discoveryId") ?? "");
  const { engagements } = getRepositories();
  await engagements.confirmAnswer(id, null); // app_user resolution lands with real auth
  revalidatePath(`/discovery/${discoveryId}/edit`);
}

/** Reject an agent/automation-drafted answer. */
export async function rejectAnswerAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const discoveryId = String(formData.get("discoveryId") ?? "");
  const { engagements } = getRepositories();
  await engagements.rejectAnswer(id, null);
  revalidatePath(`/discovery/${discoveryId}/edit`);
}

/** Fit verdict → create an AI Security Readiness Assessment for the account. */
export async function advanceToAssessmentAction(formData: FormData) {
  await requireCapability("sales:write");
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
  await requireCapability("sales:write");
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
