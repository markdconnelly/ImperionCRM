"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";

/**
 * Payroll-approval actions (ADR-0082, #466) — the CFO gate. Gated by the
 * finance∨admin `time:payroll-approve` capability. Payroll-approve moves an
 * Approved sheet to Payroll-Approved (authorizes payment; the app never pays);
 * Confirm-paid records the QuickBooks-matched payment and moves it to Paid (the
 * match itself is computed by the backend Payroll Reconciliation, BE #105 — this
 * records the CFO's confirmation of it). Unapprove reverts before payment. No
 * compensation data crosses these actions.
 */

function revalidatePayroll() {
  revalidatePath("/timesheets/admin");
  revalidatePath("/timesheets");
}

export async function payrollApproveAction(formData: FormData) {
  await requireCapability("time:payroll-approve");
  const id = str(formData, "id");
  if (!id) return;
  const session = await auth();
  const approvedBy = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!approvedBy) return;
  const { crm } = getRepositories();
  await crm.payrollApproveTimesheet(id, approvedBy);
  revalidatePayroll();
}

export async function unapprovePayrollAction(formData: FormData) {
  await requireCapability("time:payroll-approve");
  const id = str(formData, "id");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.unapprovePayrollTimesheet(id);
  revalidatePayroll();
}

export async function markPaidAction(formData: FormData) {
  await requireCapability("time:payroll-approve");
  const id = str(formData, "id");
  const qbPaymentRef = str(formData, "qbPaymentRef");
  // The QuickBooks payment ref is required — Paid is the matched-payment fact.
  if (!id || !qbPaymentRef) return;
  const { crm } = getRepositories();
  await crm.markTimesheetPaid(id, qbPaymentRef);
  revalidatePayroll();
}
