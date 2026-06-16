"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strList } from "@/lib/form-data";
import {
  customFieldInputName,
  hasCustomFieldValue,
  parseCustomFieldFormValue,
} from "@/lib/custom-fields";
import type { CustomFieldParentType } from "@/types";

/**
 * Server action for writing custom-field VALUES onto a work object (ADR-0065 B4,
 * #614). This is the read/consume follow-up to #338, which shipped the schema +
 * admin authoring; defining a field stays `catalog:write` (custom-fields/actions.ts),
 * while writing a value here is `delivery:write` — the capability that owns tasks /
 * projects (mirrors the attachment-actions split).
 *
 * One submit saves the whole applicable field set: the form posts every field's id
 * under `fieldIds`, plus its definition (`type_<id>`, `required_<id>`) so the action
 * can parse + enforce without a re-read. Required-field enforcement (B4-F3) is
 * fail-closed: if any required field is blank the action no-ops (the client also
 * marks them `required`). A null/empty value clears the field via setValue.
 */

const PARENT_TYPES: readonly CustomFieldParentType[] = ["task", "project"];

function parentType(formData: FormData): CustomFieldParentType {
  const raw = strOr(formData, "parentType", "task");
  return (PARENT_TYPES as readonly string[]).includes(raw)
    ? (raw as CustomFieldParentType)
    : "task";
}

/** Revalidate the edit page that mounts the custom-field panel. */
function revalidateParent(pType: CustomFieldParentType, parentId: string) {
  if (pType === "project") revalidatePath(`/projects/${parentId}/edit`);
  if (pType === "task") revalidatePath(`/tasks/${parentId}/edit`);
}

export async function saveCustomFieldValuesAction(formData: FormData) {
  await requireCapability("delivery:write");
  const pType = parentType(formData);
  const parentId = str(formData, "parentId");
  if (!parentId) return;

  const fieldIds = strList(formData, "fieldIds");
  if (fieldIds.length === 0) return;

  // Parse every field up front, then enforce required (B4-F3) before any write so a
  // missing required value rejects the WHOLE save (no partial application).
  const parsed = fieldIds.map((fieldId) => {
    const name = customFieldInputName(fieldId);
    const fieldType = strOr(formData, `type_${fieldId}`, "text") as Parameters<
      typeof parseCustomFieldFormValue
    >[0];
    const required = strOr(formData, `required_${fieldId}`, "") === "1";
    const value = parseCustomFieldFormValue(
      fieldType,
      (n) => str(formData, n),
      (n) => strList(formData, n),
      name,
    );
    return { fieldId, required, value };
  });

  // Fail-closed: a blank required field rejects the whole submit.
  if (parsed.some((p) => p.required && !hasCustomFieldValue(p.value))) return;

  const { customFields } = getRepositories();
  for (const p of parsed) {
    await customFields.setValue({
      fieldId: p.fieldId,
      parentType: pType,
      parentId,
      value: p.value,
    });
  }
  revalidateParent(pType, parentId);
}
