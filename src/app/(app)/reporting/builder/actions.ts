"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import {
  validateReportSelection,
  type ReportSelection,
} from "@/lib/reporting/semantic-model";
import { loadReportRows } from "@/lib/reporting/curated-sources";
import { runReport, type ReportResult } from "@/lib/reporting/report-runner";
import type { BuilderPayload } from "@/lib/reporting/builder-types";

/**
 * Report-builder server actions (ADR-0075, #411). Self-serve reporting is broadly
 * available (like saved views, ADR-0046) — there is no `reports:write` capability;
 * authorization is OWNERSHIP: every write carries the signed-in user's email and the
 * data layer enforces owner-only mutation. RBAC on *fields* is enforced here by
 * re-running `validateReportSelection` against the caller's roles at run time
 * (ADR-0075 §2) — a saved selection can never reference a field the author lacks.
 */

async function requireEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  return email;
}

/** Validate + RBAC-strip a payload's selection against the caller's roles. */
async function validate(selection: ReportSelection) {
  const roles = await getSessionRoles();
  const validated = validateReportSelection(selection, roles);
  return validated;
}

/**
 * Run a report selection and return its result for the live preview. Validates + strips
 * against the caller's roles, loads the curated source rows, and executes in memory.
 * Returns `null` when the selection has no usable (allowed, existing) field.
 */
export async function previewReportAction(payload: BuilderPayload): Promise<ReportResult | null> {
  await requireEmail();
  const { selection } = await validate(payload.selection);
  if (!selection || selection.fields.length === 0) return null;
  const repos = getRepositories();
  const rows = await loadReportRows(selection.root_object, repos);
  return runReport(selection, rows, payload.filters ?? []);
}

function toInput(payload: BuilderPayload, selection: ReportSelection) {
  return {
    name: payload.name.trim(),
    rootObject: selection.root_object,
    fields: selection.fields as unknown[],
    filters: { clauses: payload.filters ?? [] } as Record<string, unknown>,
    groupBy: (selection.group_by ?? []) as unknown[],
    viz: payload.viz || "table",
    visibility: payload.visibility,
  };
}

export async function createReportAction(payload: BuilderPayload): Promise<void> {
  const email = await requireEmail();
  if (!payload.name?.trim()) throw new Error("Report name is required.");
  const { selection } = await validate(payload.selection);
  if (!selection || selection.fields.length === 0) {
    throw new Error("Select at least one allowed field before saving.");
  }
  const { reportBuilder } = getRepositories();
  await reportBuilder.createReportDefinition(toInput(payload, selection), email);
  revalidatePath("/reporting/builder");
  redirect("/reporting/builder");
}

export async function updateReportAction(id: string, payload: BuilderPayload): Promise<void> {
  const email = await requireEmail();
  if (!id) throw new Error("Missing report id.");
  if (!payload.name?.trim()) throw new Error("Report name is required.");
  const { selection } = await validate(payload.selection);
  if (!selection || selection.fields.length === 0) {
    throw new Error("Select at least one allowed field before saving.");
  }
  const { reportBuilder } = getRepositories();
  await reportBuilder.updateReportDefinition(id, toInput(payload, selection), email);
  revalidatePath("/reporting/builder");
  revalidatePath(`/reporting/builder/${id}`);
  redirect("/reporting/builder");
}

export async function deleteReportAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const roles = await getSessionRoles();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { reportBuilder } = getRepositories();
  // Owners delete their own; admins may delete any shared report (data layer enforces).
  await reportBuilder.deleteReportDefinition(id, email, roles.includes("admin"));
  revalidatePath("/reporting/builder");
}
