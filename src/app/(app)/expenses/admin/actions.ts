"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr } from "@/lib/form-data";

/**
 * Admin expense-administration actions (ADR-0083, #548) — the row/panel actions on the
 * unified `/expenses/admin` lifecycle surface. Two gates: admin correctness
 * (`expense:approve` — approve / reject / reopen) and finance (`expense:finance-approve`
 * — finance-approve / confirm-reimbursed). Approve fires the idempotent Autotask
 * ExpenseReport tracking row; the Autotask write itself is backend BE #108. Confirm-
 * reimbursed records finance's confirmation of the backend-suggested QuickBooks match
 * (BE #111). Comp-free throughout — the app never pays.
 */

function revalidate() {
  revalidatePath("/expenses/admin");
  revalidatePath("/expenses");
}

/** Resolve the signed-in admin/finance user's app_user id (the action's actor). */
async function currentActorId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

// ── Admin correctness gate (expense:approve) ───────────────────────────────

export async function approveExpenseReportAction(formData: FormData) {
  await requireCapability("expense:approve");
  const actorId = await currentActorId();
  if (!actorId) return;
  const { crm } = getRepositories();
  await crm.approveExpenseReport(str(formData, "id"), actorId);
  revalidate();
}

export async function rejectExpenseReportAction(formData: FormData) {
  await requireCapability("expense:approve");
  const actorId = await currentActorId();
  if (!actorId) return;
  const { crm } = getRepositories();
  await crm.rejectExpenseReport(str(formData, "id"), actorId, strOr(formData, "note", ""));
  revalidate();
}

export async function reopenExpenseReportAction(formData: FormData) {
  await requireCapability("expense:approve");
  const { crm } = getRepositories();
  await crm.reopenExpenseReport(str(formData, "id"));
  revalidate();
}

// ── Finance gate (expense:finance-approve) ─────────────────────────────────

export async function financeApproveExpenseReportAction(formData: FormData) {
  await requireCapability("expense:finance-approve");
  const actorId = await currentActorId();
  if (!actorId) return;
  const { crm } = getRepositories();
  await crm.financeApproveExpenseReport(str(formData, "id"), actorId);
  revalidate();
}

export async function markReimbursedAction(formData: FormData) {
  await requireCapability("expense:finance-approve");
  const { crm } = getRepositories();
  const qbPaymentRef = str(formData, "qbPaymentRef");
  if (!qbPaymentRef) return;
  await crm.markExpenseReportReimbursed(str(formData, "id"), qbPaymentRef);
  revalidate();
}
