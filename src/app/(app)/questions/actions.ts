"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import type { QuestionInput } from "@/lib/data/repositories";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parse(formData: FormData): QuestionInput {
  const help = str(formData, "helpText");
  const dimension = str(formData, "dimension");
  const options = str(formData, "options")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const ordinal = Number(str(formData, "ordinal"));
  return {
    key: str(formData, "key"),
    prompt: str(formData, "prompt"),
    helpText: help === "" ? null : help,
    responseType: str(formData, "responseType") || "text",
    options: options.length > 0 ? options : null,
    dimension: dimension === "" ? null : dimension,
    ordinal: Number.isFinite(ordinal) ? ordinal : 0,
    required: formData.get("required") === "on",
    active: formData.get("active") === "on",
  };
}

export async function createQuestionAction(formData: FormData) {
  const kind = str(formData, "kind") || "discovery";
  const { engagements } = getRepositories();
  await engagements.createQuestion(kind, parse(formData));
  revalidatePath("/questions");
  redirect("/questions");
}

export async function updateQuestionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.updateQuestion(id, parse(formData));
  revalidatePath("/questions");
  redirect("/questions");
}
