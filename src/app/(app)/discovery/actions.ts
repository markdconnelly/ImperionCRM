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
