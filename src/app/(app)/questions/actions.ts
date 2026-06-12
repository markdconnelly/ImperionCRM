"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { checkbox, intOr, str, strOr, strOrNull } from "@/lib/form-data";
import type { QuestionInput } from "@/lib/data/repositories";

function parse(formData: FormData): QuestionInput {
  const options = str(formData, "options")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return {
    key: str(formData, "key"),
    prompt: str(formData, "prompt"),
    helpText: strOrNull(formData, "helpText"),
    responseType: strOr(formData, "responseType", "text"),
    options: options.length > 0 ? options : null,
    dimension: strOrNull(formData, "dimension"),
    ordinal: intOr(formData, "ordinal", 0),
    required: checkbox(formData, "required"),
    active: checkbox(formData, "active"),
  };
}

export async function createQuestionAction(formData: FormData) {
  await requireCapability("catalog:write");
  const kind = str(formData, "kind") || "discovery";
  const { engagements } = getRepositories();
  await engagements.createQuestion(kind, parse(formData));
  revalidatePath("/questions");
  redirect("/questions");
}

export async function updateQuestionAction(formData: FormData) {
  await requireCapability("catalog:write");
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.updateQuestion(id, parse(formData));
  // Update the many-to-many template membership (migration 0040). Only the edit form posts
  // a `templates` marker, so we never clear memberships from forms that don't manage them.
  if (formData.get("templates") === "1") {
    const templateIds = formData.getAll("templateIds").map((v) => String(v));
    await engagements.setQuestionTemplates(id, templateIds);
  }
  revalidatePath("/questions");
  redirect("/questions");
}

export async function createTemplateAction(formData: FormData) {
  await requireCapability("catalog:write");
  const kind = str(formData, "kind") || "assessment";
  const title = str(formData, "title");
  if (title === "") redirect("/questions");
  const { engagements } = getRepositories();
  await engagements.createTemplate(kind, title);
  revalidatePath("/questions");
  redirect("/questions");
}
