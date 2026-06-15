"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { checkbox, intOr, str, strOr, strOrNull } from "@/lib/form-data";
import type { CustomFieldDefInput } from "@/lib/data/repositories";
import type { CustomFieldParentType, CustomFieldType } from "@/types";

/**
 * Server actions for admin-defined custom fields (ADR-0065 B4, #338).
 *
 * Defining / editing / deleting a field is CONFIGURATION — gated by `catalog:write`
 * (the admin capability that also owns the question + template catalogs), enforced
 * fail-closed at the top of every mutation. Writing a field's VALUE onto a work
 * object is a separate `delivery:write` concern handled where the task/project is
 * edited (deferred follow-up); this file is the definition surface only.
 */

const SCOPES: readonly CustomFieldParentType[] = ["task", "project"];
const FIELD_TYPES: readonly CustomFieldType[] = [
  "text",
  "number",
  "date",
  "single_select",
  "multi_select",
  "checkbox",
  "user",
  "currency",
];

function scope(formData: FormData): CustomFieldParentType {
  const raw = strOr(formData, "scope", "project");
  return (SCOPES as readonly string[]).includes(raw) ? (raw as CustomFieldParentType) : "project";
}

function fieldType(formData: FormData): CustomFieldType {
  const raw = strOr(formData, "fieldType", "text");
  return (FIELD_TYPES as readonly string[]).includes(raw) ? (raw as CustomFieldType) : "text";
}

/** Parse the admin form into a definition input (the same shape create + update use). */
function parse(formData: FormData): CustomFieldDefInput {
  const sc = scope(formData);
  const options = str(formData, "options")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return {
    scope: sc,
    // A task field is never type-scoped; a project field MAY narrow to one type.
    projectTypeId: sc === "project" ? strOrNull(formData, "projectTypeId") : null,
    key: str(formData, "key"),
    label: str(formData, "label"),
    fieldType: fieldType(formData),
    options,
    required: checkbox(formData, "required"),
    ordinal: intOr(formData, "ordinal", 0),
  };
}

export async function createFieldDefAction(formData: FormData) {
  await requireCapability("catalog:write");
  const input = parse(formData);
  if (!input.key.trim() || !input.label.trim()) return;
  const { customFields } = getRepositories();
  await customFields.createFieldDef(input);
  revalidatePath("/custom-fields");
  redirect("/custom-fields");
}

export async function updateFieldDefAction(formData: FormData) {
  await requireCapability("catalog:write");
  const id = str(formData, "id");
  const input = parse(formData);
  if (!id || !input.key.trim() || !input.label.trim()) return;
  const { customFields } = getRepositories();
  await customFields.updateFieldDef(id, input);
  revalidatePath("/custom-fields");
  redirect("/custom-fields");
}

export async function deleteFieldDefAction(formData: FormData) {
  await requireCapability("catalog:write");
  const id = str(formData, "id");
  if (!id) return;
  const { customFields } = getRepositories();
  await customFields.deleteFieldDef(id);
  revalidatePath("/custom-fields");
}
