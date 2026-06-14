"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";

/**
 * Admin timesheet-approval actions (ADR-0082, #465). Gated by the admin-only
 * `time:approve` capability. Approve documents the week (moves it to Approved and
 * requests the backend Time Ticket write); Reopen sends it back to the employee
 * for correction (re-attest required). The Autotask write itself is backend BE-1.
 */

function revalidateApprovals() {
  revalidatePath("/timesheets/approvals");
  revalidatePath("/timesheets");
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
