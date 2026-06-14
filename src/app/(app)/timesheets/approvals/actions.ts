"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strOrNull } from "@/lib/form-data";
import type { TimeEntryFields } from "@/lib/data/repositories";
import type { TimeEntryCategory } from "@/types";

/**
 * Admin timesheet-approval actions (ADR-0082, #465 + #477). Gated by the admin-only
 * `time:approve` capability. Approve documents the week (moves it to Approved and
 * requests the backend Time Ticket write); Reopen sends it back to the employee for
 * correction (re-attest required). The three correction actions let an admin edit a
 * Submitted sheet IN PLACE — every edit is audited vs the employee's immutable attested
 * original (the repo writes the `audit_log` row); the sheet stays Submitted. The Autotask
 * write itself is backend BE-1.
 */

const CATEGORIES: readonly TimeEntryCategory[] = ["billable", "internal", "admin"];

function revalidateApprovals() {
  revalidatePath("/timesheets/admin");
  revalidatePath("/timesheets");
}

/** Resolve the signed-in admin's app_user id (the correction's actor). */
async function currentAdminId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

/** Combine a YYYY-MM-DD + HH:MM (wall clock) into a UTC ISO timestamp (ADR-0082 v1). */
function toIso(workDate: string, hhmm: string): string {
  return `${workDate}T${hhmm}:00.000Z`;
}

/** Parse a correction entry's fields from the form, or null when invalid. */
function entryFieldsFrom(formData: FormData): TimeEntryFields | null {
  const workDate = str(formData, "workDate");
  const startedAt = toIso(workDate, str(formData, "startTime"));
  const endedAt = toIso(workDate, str(formData, "endTime"));
  if (!workDate || endedAt <= startedAt) return null; // positive duration (also DB-enforced)
  const category = strOr(formData, "category", "internal") as TimeEntryCategory;
  if (!CATEGORIES.includes(category)) return null;
  return {
    workDate,
    startedAt,
    endedAt,
    category,
    ancillaryTicketRef: strOrNull(formData, "ancillaryTicketRef"),
    notes: strOrNull(formData, "notes"),
  };
}

export async function approveTimesheetAction(formData: FormData) {
  await requireCapability("time:approve");
  const id = str(formData, "id");
  if (!id) return;
  const session = await auth();
  const approvedBy = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!approvedBy) return;
  const { crm } = getRepositories();
  await crm.approveTimesheet(id, approvedBy);
  revalidateApprovals();
}

export async function reopenTimesheetAction(formData: FormData) {
  await requireCapability("time:approve");
  const id = str(formData, "id");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.reopenTimesheet(id);
  revalidateApprovals();
}

export async function addCorrectionAction(formData: FormData) {
  await requireCapability("time:approve");
  const id = str(formData, "id");
  const correctedBy = await currentAdminId();
  const entry = entryFieldsFrom(formData);
  if (!id || !correctedBy || !entry) return;
  const { crm } = getRepositories();
  await crm.correctSubmittedTimesheet(id, { kind: "add", entry }, correctedBy);
  revalidateApprovals();
}

export async function updateCorrectionAction(formData: FormData) {
  await requireCapability("time:approve");
  const id = str(formData, "id");
  const entryId = str(formData, "entryId");
  const correctedBy = await currentAdminId();
  const entry = entryFieldsFrom(formData);
  if (!id || !entryId || !correctedBy || !entry) return;
  const { crm } = getRepositories();
  await crm.correctSubmittedTimesheet(id, { kind: "update", entryId, entry }, correctedBy);
  revalidateApprovals();
}

export async function deleteCorrectionAction(formData: FormData) {
  await requireCapability("time:approve");
  const id = str(formData, "id");
  const entryId = str(formData, "entryId");
  const correctedBy = await currentAdminId();
  if (!id || !entryId || !correctedBy) return;
  const { crm } = getRepositories();
  await crm.correctSubmittedTimesheet(id, { kind: "delete", entryId }, correctedBy);
  revalidateApprovals();
}
