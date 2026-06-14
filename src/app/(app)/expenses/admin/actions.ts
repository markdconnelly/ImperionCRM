"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strOrNull, checkbox, intOr } from "@/lib/form-data";
import type { ExpenseItemFields } from "@/lib/data/repositories";

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

// ── Admin inline corrections of a SUBMITTED report's out-of-pocket items (#488) ──
// Add / edit-in-place / delete a website_expense_item. Each op is audited vs the
// employee's immutable attested original (the repo writes the audit_log row); the
// report stays Submitted. Gated by the same admin `expense:approve` capability.
// Mileage is NOT correctable here (its $ is backend-derived from MileIQ).

/** Parse a correction item's fields from the form, or null when invalid (amount must be > 0). */
function itemFieldsFrom(formData: FormData): ExpenseItemFields | null {
  const itemDate = str(formData, "itemDate");
  const amount = Number(str(formData, "amount"));
  if (!itemDate || !Number.isFinite(amount) || amount <= 0) return null;
  const billable = checkbox(formData, "billable");
  const rawCompanyId = intOr(formData, "autotaskCompanyId", 0);
  return {
    itemDate,
    categoryId: strOrNull(formData, "categoryId"),
    amount: Math.round(amount * 100) / 100,
    merchant: strOrNull(formData, "merchant"),
    description: strOrNull(formData, "description"),
    reimbursable: checkbox(formData, "reimbursable"),
    billable,
    // The client leg only carries when billable; ignore a stray 0/blank otherwise.
    autotaskCompanyId: billable && rawCompanyId > 0 ? rawCompanyId : null,
  };
}

export async function addExpenseCorrectionAction(formData: FormData) {
  await requireCapability("expense:approve");
  const id = str(formData, "id");
  const correctedBy = await currentActorId();
  const item = itemFieldsFrom(formData);
  if (!id || !correctedBy || !item) return;
  const { crm } = getRepositories();
  await crm.correctSubmittedExpenseReport(id, { kind: "add", item }, correctedBy);
  revalidate();
}

export async function updateExpenseCorrectionAction(formData: FormData) {
  await requireCapability("expense:approve");
  const id = str(formData, "id");
  const itemId = str(formData, "itemId");
  const correctedBy = await currentActorId();
  const item = itemFieldsFrom(formData);
  if (!id || !itemId || !correctedBy || !item) return;
  const { crm } = getRepositories();
  await crm.correctSubmittedExpenseReport(id, { kind: "update", itemId, item }, correctedBy);
  revalidate();
}

export async function deleteExpenseCorrectionAction(formData: FormData) {
  await requireCapability("expense:approve");
  const id = str(formData, "id");
  const itemId = str(formData, "itemId");
  const correctedBy = await currentActorId();
  if (!id || !itemId || !correctedBy) return;
  const { crm } = getRepositories();
  await crm.correctSubmittedExpenseReport(id, { kind: "delete", itemId }, correctedBy);
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
