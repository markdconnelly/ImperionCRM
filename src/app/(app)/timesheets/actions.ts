"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strOrNull } from "@/lib/form-data";
import { mondayOf } from "@/lib/week";
import type { TimeEntryCategory } from "@/types";

/**
 * Employee timesheet actions (ADR-0082, #464). Every write is gated by the
 * `time:write` capability AND scoped to the signed-in employee's OWN timesheet:
 * the employee id comes from the session (never the form), and ownership/lock
 * state is re-read via `getTimesheetForWeek(employeeId, …)` — which is inherently
 * employee-scoped — before any mutation. An attested (Submitted+) sheet is
 * locked: only an admin edits it thereafter (the admin surface is #465).
 */

const CATEGORIES: readonly TimeEntryCategory[] = ["billable", "internal", "admin"];

/** Resolve the signed-in employee's app_user id (null in mock mode / unmapped). */
async function currentEmployeeId(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email ?? "";
  return resolveAppUserIdByEmail(email);
}

/** Combine a YYYY-MM-DD + HH:MM (wall clock) into a UTC ISO timestamp. */
function toIso(workDate: string, hhmm: string): string {
  return `${workDate}T${hhmm}:00.000Z`;
}

/**
 * Create (ensure) a timesheet for a week, then open it. Lazy-creation from the
 * landing's "Start timesheet" button — self-scoped (`time:write`, employee id from
 * session), idempotent (`ensureTimesheetForWeek` is UNIQUE on employee+week), so a
 * double-click can't make two. Redirects into the week so the employee starts
 * entering time immediately.
 */
export async function createTimesheetAction(formData: FormData) {
  await requireCapability("time:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const weekStart = mondayOf(str(formData, "weekStart"));

  const { crm } = getRepositories();
  await crm.ensureTimesheetForWeek(employeeId, weekStart);
  revalidatePath("/timesheets");
  redirect(`/timesheets?week=${weekStart}`);
}

export async function addTimeEntryAction(formData: FormData) {
  await requireCapability("time:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const weekStart = mondayOf(str(formData, "weekStart"));
  const workDate = str(formData, "workDate");
  const startedAt = toIso(workDate, str(formData, "startTime"));
  const endedAt = toIso(workDate, str(formData, "endTime"));
  // Duration must be positive (also DB-enforced) and the category known.
  if (endedAt <= startedAt) return;
  const category = strOr(formData, "category", "internal") as TimeEntryCategory;
  if (!CATEGORIES.includes(category)) return;

  const { crm } = getRepositories();
  // Self-scoped: only the employee's own week; a locked (attested) sheet refuses.
  const sheet = await crm.getTimesheetForWeek(employeeId, weekStart);
  if (sheet && sheet.state !== "open") return;
  const timesheetId = sheet?.id ?? (await crm.ensureTimesheetForWeek(employeeId, weekStart));
  await crm.addTimeEntry({
    timesheetId,
    employeeId,
    workDate,
    startedAt,
    endedAt,
    category,
    ancillaryTicketRef: strOrNull(formData, "ancillaryTicketRef"),
    notes: strOrNull(formData, "notes"),
  });
  revalidatePath("/timesheets");
}

export async function deleteTimeEntryAction(formData: FormData) {
  await requireCapability("time:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const weekStart = mondayOf(str(formData, "weekStart"));
  const entryId = str(formData, "entryId");

  const { crm } = getRepositories();
  const sheet = await crm.getTimesheetForWeek(employeeId, weekStart);
  // Ownership + lock check: the entry must belong to the employee's own Open week.
  if (!sheet || sheet.state !== "open") return;
  if (!sheet.entries.some((e) => e.id === entryId)) return;
  await crm.deleteTimeEntry(entryId);
  revalidatePath("/timesheets");
}

export async function attestTimesheetAction(formData: FormData) {
  await requireCapability("time:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const weekStart = mondayOf(str(formData, "weekStart"));

  const { crm } = getRepositories();
  const sheet = await crm.getTimesheetForWeek(employeeId, weekStart);
  // Attest only an Open sheet with entries and NO Hard deviation (ADR-0082).
  if (!sheet || sheet.state !== "open") return;
  if (sheet.entries.length === 0 || sheet.hasHardDeviation) return;
  await crm.submitTimesheet(sheet.id, employeeId);
  revalidatePath("/timesheets");
}
