"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";

/**
 * Server actions for the assessment-template manager (#835).
 *
 * Mirrors the questions route's `createTemplateAction` (its template-creation seam) but
 * is pinned to the `assessment` kind and redirects back to this settings sub-page. Kept
 * route-local so the questions route + shared barrels stay untouched; the only shared
 * surface used is the existing `engagements.createTemplate(kind, title)` repo call. The
 * per-question editor stays on /questions — this page only manages the templates.
 *
 * Gated by `catalog:write` (the configuration capability the questions editor uses),
 * enforced fail-closed at the top.
 */
export async function createAssessmentTemplateAction(formData: FormData) {
  await requireCapability("catalog:write");
  const title = str(formData, "title");
  if (title === "") redirect("/settings/assessment-types");
  const { engagements } = getRepositories();
  await engagements.createTemplate("assessment", title);
  revalidatePath("/settings/assessment-types");
  redirect("/settings/assessment-types");
}
