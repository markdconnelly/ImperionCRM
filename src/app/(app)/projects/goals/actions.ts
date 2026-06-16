"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull, intOr } from "@/lib/form-data";
import type { GoalInput } from "@/types";

/**
 * Goal / OKR authoring + link CRUD (ADR-0069 D3, issue #621). Goals are a
 * delivery-planning surface, so every write is gated by `delivery:write` — the same
 * capability the rest of the project board enforces (the `canManageProjects` twin
 * gates the pages). Follow-up to the read-only list shipped in #611.
 */

function revalidateGoalSurfaces() {
  revalidatePath("/projects/goals");
  revalidatePath("/projects/goals/[id]", "page");
}

/** Coerce the goal authoring form into a GoalInput (the form-data grammar, #189). */
function parseGoal(formData: FormData): GoalInput {
  const mode = str(formData, "progressMode");
  return {
    name: str(formData, "name"),
    ownerUserId: strOrNull(formData, "ownerUserId"),
    period: strOrNull(formData, "period"),
    // numeric key-result bounds; defaults mirror the schema (target 100, current 0).
    target: intOr(formData, "target", 100),
    current: intOr(formData, "current", 0),
    progressMode: mode === "manual" ? "manual" : "rollup",
    notes: strOrNull(formData, "notes"),
  };
}

export async function createGoalAction(formData: FormData) {
  await requireCapability("delivery:write");
  const input = parseGoal(formData);
  if (!input.name) return;
  const { crm } = getRepositories();
  await crm.createGoal(input);
  revalidateGoalSurfaces();
  redirect("/projects/goals");
}

export async function updateGoalAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  const input = parseGoal(formData);
  if (!id || !input.name) return;
  const { crm } = getRepositories();
  await crm.updateGoal(id, input);
  revalidateGoalSurfaces();
  redirect("/projects/goals");
}

export async function deleteGoalAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteGoal(id);
  revalidateGoalSurfaces();
  redirect("/projects/goals");
}

// ── goal_link CRUD (the link-management UI, issue #621) ─────────────────────

export async function addGoalLinkAction(formData: FormData) {
  await requireCapability("delivery:write");
  const goalId = str(formData, "goalId");
  const parentTypeRaw = str(formData, "parentType");
  const parentId = str(formData, "parentId");
  const weight = intOr(formData, "weight", 1);
  if (!goalId || !parentId) return;
  if (parentTypeRaw !== "project" && parentTypeRaw !== "task") return;
  if (!(weight > 0)) return;
  const { crm } = getRepositories();
  await crm.addGoalLink({ goalId, parentType: parentTypeRaw, parentId, weight });
  revalidateGoalSurfaces();
}

export async function removeGoalLinkAction(formData: FormData) {
  await requireCapability("delivery:write");
  const goalId = str(formData, "goalId");
  const parentType = str(formData, "parentType");
  const parentId = str(formData, "parentId");
  if (!goalId || !parentId) return;
  if (parentType !== "project" && parentType !== "task") return;
  const { crm } = getRepositories();
  await crm.removeGoalLink(goalId, parentType, parentId);
  revalidateGoalSurfaces();
}
