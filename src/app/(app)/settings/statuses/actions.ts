"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { intOr, intOrNull, str, strOr, strOrNull } from "@/lib/form-data";
import type { StatusDefInput } from "@/lib/data/repositories";

/**
 * Server actions for the admin configurable-status surface (ADR-0065 B5, #616).
 *
 * Defining / editing / reordering / deleting a status set is CONFIGURATION — gated
 * by `catalog:write` (the same admin capability that owns the custom-field, question
 * and template catalogs), enforced fail-closed at the top of every mutation. The
 * status_def grants (INSERT/UPDATE/DELETE on the web role) ship in migration 0104.
 *
 * PART 1 of #616 (admin CRUD) shipped in #730. PART 2 (#616, this change) adds the
 * per-status WIP-limit input — `wipLimit` is now parsed from the form (blank = null
 * = no limit) instead of hard-coded null — plus the over-limit board highlight (the
 * board reads `status_def.wip_limit` as its baseline threshold; ADR-0066 C1).
 */

const CONTEXTS = ["task", "project"] as const;
const SCOPES = ["global", "project_type"] as const;
const CATEGORIES = ["todo", "in_progress", "done"] as const;

function context(formData: FormData): string {
  const raw = strOr(formData, "context", "task");
  return (CONTEXTS as readonly string[]).includes(raw) ? raw : "task";
}

function scope(formData: FormData): string {
  const raw = strOr(formData, "scope", "global");
  return (SCOPES as readonly string[]).includes(raw) ? raw : "global";
}

function category(formData: FormData): string {
  const raw = strOr(formData, "category", "todo");
  return (CATEGORIES as readonly string[]).includes(raw) ? raw : "todo";
}

/** Parse the admin form into a status-definition input (shared by create + update). */
function parse(formData: FormData): StatusDefInput {
  const sc = scope(formData);
  return {
    scope: sc,
    // A global set has no project type; a typed set must name one.
    projectTypeId: sc === "project_type" ? strOrNull(formData, "projectTypeId") : null,
    context: context(formData),
    key: str(formData, "key"),
    label: str(formData, "label"),
    color: strOrNull(formData, "color"),
    category: category(formData),
    ordinal: intOr(formData, "ordinal", 0),
    // wip_limit (ADR-0066 C1, #616 part 2): blank = no limit (null), else the cap.
    wipLimit: intOrNull(formData, "wipLimit"),
  };
}

/** Where to redirect back to — preserves the scope the admin was editing. */
function backHref(input: StatusDefInput): string {
  const params = new URLSearchParams({ context: input.context, scope: input.scope });
  if (input.scope === "project_type" && input.projectTypeId) {
    params.set("projectTypeId", input.projectTypeId);
  }
  return `/settings/statuses?${params.toString()}`;
}

export async function createStatusDefAction(formData: FormData) {
  await requireCapability("catalog:write");
  const input = parse(formData);
  if (!input.key.trim() || !input.label.trim()) return;
  if (input.scope === "project_type" && !input.projectTypeId) return;
  const { crm } = getRepositories();
  await crm.createStatusDef(input);
  revalidatePath("/settings/statuses");
  redirect(backHref(input));
}

export async function updateStatusDefAction(formData: FormData) {
  await requireCapability("catalog:write");
  const id = str(formData, "id");
  const input = parse(formData);
  if (!id || !input.key.trim() || !input.label.trim()) return;
  if (input.scope === "project_type" && !input.projectTypeId) return;
  const { crm } = getRepositories();
  await crm.updateStatusDef(id, input);
  revalidatePath("/settings/statuses");
  redirect(backHref(input));
}

export async function deleteStatusDefAction(formData: FormData) {
  await requireCapability("catalog:write");
  const id = str(formData, "id");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteStatusDef(id);
  revalidatePath("/settings/statuses");
}

/**
 * Persist a drag-free reorder: the form posts `id{n}`/`ordinal{n}` pairs, one per
 * row in the displayed set. Used by the small up/down ordering controls.
 */
export async function reorderStatusDefsAction(formData: FormData) {
  await requireCapability("catalog:write");
  const order: { id: string; ordinal: number }[] = [];
  for (let i = 0; ; i++) {
    const id = str(formData, `id${i}`);
    if (!id) break;
    order.push({ id, ordinal: intOr(formData, `ordinal${i}`, i) });
  }
  if (order.length === 0) return;
  const { crm } = getRepositories();
  await crm.reorderStatusDefs(order);
  revalidatePath("/settings/statuses");
}
