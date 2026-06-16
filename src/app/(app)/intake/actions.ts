"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { auth } from "@/auth";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import type {
  IntakeFormInput,
  IntakeFormField,
  IntakeFieldType,
  IntakeFieldMap,
} from "@/lib/data/repositories";
import { INTAKE_CUSTOM_MAP_PREFIX } from "@/lib/data/repositories";

/**
 * Intake-form authoring + submission actions (ADR-0070 E3, #354). Authoring is
 * `delivery:write` (the same gate as task/project management). Submission is also
 * `delivery:write` — v1 forms are STAFF-AUTHENTICATED only (the issue's v1 scope);
 * a public/anonymous channel is a deliberate later phase.
 *
 * The field list is too structured for flat FormData, so the builder serializes the
 * whole IntakeFormInput into a single hidden `payload` JSON field; here we parse,
 * defensively coerce, and persist.
 */

const FIELD_TYPES: readonly IntakeFieldType[] = ["text", "textarea", "date", "select"];
/** The base task-field targets (#354). `assignee` + `custom:<key>` (#638) validated separately. */
const BASE_FIELD_MAPS: readonly IntakeFieldMap[] = ["title", "detail", "due_at", "note", "assignee"];
const CATEGORIES = ["sales", "project", "onboarding", "general"] as const;

/** A slugified custom-field key — the same shape `custom_field_def.key` uses. */
const CF_KEY_RE = /^[a-z0-9][a-z0-9_]*$/;

/**
 * Validate a stored mapsTo (#638): a known base target, or a well-formed
 * `custom:<cf_key>` target. Anything else falls back to `note` so a malformed/stale
 * client value never breaks submit. The cf_key's existence isn't checked here — an
 * unmatched key is simply ignored at submit time (the def may have been removed).
 */
function coerceMapsTo(raw: unknown): IntakeFieldMap {
  const v = String(raw ?? "");
  if (BASE_FIELD_MAPS.includes(v as IntakeFieldMap)) return v as IntakeFieldMap;
  if (v.startsWith(INTAKE_CUSTOM_MAP_PREFIX)) {
    const key = v.slice(INTAKE_CUSTOM_MAP_PREFIX.length);
    if (CF_KEY_RE.test(key)) return `${INTAKE_CUSTOM_MAP_PREFIX}${key}` as IntakeFieldMap;
  }
  return "note";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Parse + validate the client payload into an IntakeFormInput. Throws on garbage. */
function parsePayload(raw: string): IntakeFormInput {
  const p = JSON.parse(raw) as Record<string, unknown>;
  const name = String(p.name ?? "").trim();
  if (!name) throw new Error("Form name is required.");

  const fieldsRaw = Array.isArray(p.fields) ? p.fields : [];
  const seen = new Set<string>();
  const fields: IntakeFormField[] = fieldsRaw.map((fr, i) => {
    const f = fr as Record<string, unknown>;
    const label = String(f.label ?? "").trim() || `Field ${i + 1}`;
    let key = slugify(String(f.key ?? "") || label) || `field_${i + 1}`;
    // Keys must be unique within a form (they namespace the posted answers).
    while (seen.has(key)) key = `${key}_${i}`;
    seen.add(key);
    const type = FIELD_TYPES.includes(f.type as IntakeFieldType)
      ? (f.type as IntakeFieldType)
      : "text";
    const mapsTo = coerceMapsTo(f.mapsTo);
    const options =
      type === "select" && Array.isArray(f.options)
        ? f.options.map((o) => String(o).trim()).filter(Boolean)
        : [];
    return { key, label, type, required: Boolean(f.required), options, mapsTo };
  });
  if (fields.length === 0) throw new Error("A form needs at least one field.");
  if (!fields.some((f) => f.mapsTo === "title")) {
    throw new Error("Map at least one field to the task title.");
  }

  const category = CATEGORIES.includes(p.defaultCategory as (typeof CATEGORIES)[number])
    ? String(p.defaultCategory)
    : "general";

  return {
    key: slugify(name),
    name,
    description: String(p.description ?? "").trim() || null,
    fields,
    defaultProjectId: p.defaultProjectId ? String(p.defaultProjectId) : null,
    defaultAccountId: p.defaultAccountId ? String(p.defaultAccountId) : null,
    defaultOwnerUserId: p.defaultOwnerUserId ? String(p.defaultOwnerUserId) : null,
    defaultCategory: category,
    isActive: p.isActive !== false,
  };
}

export async function createIntakeFormAction(formData: FormData) {
  await requireCapability("delivery:write");
  const input = parsePayload(String(formData.get("payload") ?? "{}"));
  const { crm } = getRepositories();
  await crm.createIntakeForm(input);
  revalidatePath("/intake");
  redirect("/intake");
}

/**
 * In-place edit of an intake form (ADR-0070 E3, #639): reuses the same `payload`
 * JSON contract + parser as create; the data layer patches the existing row WITHOUT
 * touching its id or `key`, so the stable key and prior submissions
 * (`intake_submission.form_id`) survive the edit. Gated `delivery:write`, the same
 * gate as authoring.
 */
export async function updateIntakeFormAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Intake form id is required.");
  const input = parsePayload(String(formData.get("payload") ?? "{}"));
  const { crm } = getRepositories();
  await crm.updateIntakeForm(id, input);
  revalidatePath("/intake");
  revalidatePath(`/intake/${id}`);
  redirect(`/intake/${id}`);
}

export async function deleteIntakeFormAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteIntakeForm(id);
  revalidatePath("/intake");
}

/**
 * Submit an intake form (ADR-0070 E3, #354): collect the answers (each field posts
 * under `f_<key>`), enforce the form's required fields, then map them onto a task
 * routed to the form's defaults — landing on the new task's edit page. The actor is
 * resolved server-side (session email → app_user), never trusted from the form.
 */
export async function submitIntakeFormAction(formData: FormData) {
  await requireCapability("delivery:write");
  const formId = String(formData.get("formId") ?? "").trim();
  if (!formId) return;
  const { crm } = getRepositories();
  const form = await crm.getIntakeForm(formId);
  if (!form) redirect("/intake");

  // Collect answers under the form's own field keys and enforce required fields.
  const payload: Record<string, string> = {};
  for (const field of form.fields) {
    const v = String(formData.get(`f_${field.key}`) ?? "").trim();
    if (v) payload[field.key] = v;
    if (field.required && !v) {
      redirect(`/intake/${formId}?error=missing`);
    }
  }

  const session = await auth();
  const submittedBy = await resolveAppUserIdByEmail(session?.user?.email ?? "");

  const { taskId } = await crm.submitIntakeForm(formId, payload, submittedBy);
  revalidatePath("/tasks");
  revalidatePath(`/intake/${formId}`);
  redirect(`/tasks/${taskId}/edit?intake=created`);
}
