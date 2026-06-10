"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";

// Project CRUD moved to the project board's actions (ADR-0052, #95) — the
// Onboarding page shares them: src/app/(app)/projects/actions.ts.

/**
 * Cycle a milestone's R/Y/G health from the onboarding dashboard
 * (green → amber → red → green). Manual for phases without a checklist; phases
 * instantiated from the playbook derive their health from step completion
 * (ADR-0034/0037). Tolerant of mock mode so the demo board doesn't error.
 */
export async function setMilestoneHealthAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const health = String(formData.get("health") ?? "");
  if (!id || !["green", "amber", "red"].includes(health)) return;
  const { crm } = getRepositories();
  try {
    await crm.setMilestoneHealth(id, health);
  } catch {
    // No database configured (mock mode) — no-op so the dashboard stays usable.
  }
  revalidatePath("/onboarding");
}

/** Instantiate the standard onboarding playbook for a project (ADR-0037). */
export async function applyTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const projectId = String(formData.get("projectId") ?? "");
  const startAt = String(formData.get("startAt") ?? "").trim();
  if (!projectId) return;
  const { crm } = getRepositories();
  try {
    await crm.applyOnboardingTemplate(projectId, startAt);
  } catch {
    // mock mode — no-op
  }
  revalidatePath("/onboarding");
}

/** Check/uncheck a playbook checklist step; the phase R/Y/G re-derives (ADR-0037). */
export async function toggleStepAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!id) return;
  const { crm } = getRepositories();
  try {
    await crm.setOnboardingStepStatus(id, done);
  } catch {
    // mock mode — no-op
  }
  revalidatePath("/onboarding");
}
