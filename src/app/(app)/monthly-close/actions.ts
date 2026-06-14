"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";

/**
 * Monthly Close finance actions (ADR-0083 #491, amends ADR-0082) — the finance-leg
 * actions on the unified `/monthly-close` surface. The expense leg is 1:1 with the
 * close row (one monthly report per employee), so finance acts on it inline here:
 * finance-approve the Approved report, then confirm the QuickBooks reimbursement match
 * to set it Reimbursed. Both are gated on `expense:finance-approve` (the finance cap,
 * `canApprovePayroll`/finance∨admin). The time leg pays per weekly timesheet, so its
 * finance-approve / confirm-paid live on the per-week `/timesheets/admin` surface that
 * this page deep-links into — not duplicated here. The app never pays; finance only
 * authorizes the manual payment and records the read-back match. Comp-free throughout.
 */

function revalidate() {
  revalidatePath("/monthly-close");
  revalidatePath("/expenses/admin");
  revalidatePath("/expenses");
}

/** Resolve the signed-in finance user's app_user id (the action's actor). */
async function currentActorId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

/** Finance-approve the month's expense report (Approved → Finance approved). */
export async function financeApproveExpenseAction(formData: FormData) {
  await requireCapability("expense:finance-approve");
  const actorId = await currentActorId();
  if (!actorId) return;
  const { crm } = getRepositories();
  await crm.financeApproveExpenseReport(str(formData, "id"), actorId);
  revalidate();
}

/** Confirm the QuickBooks reimbursement match (Finance approved → Reimbursed). */
export async function confirmReimbursedAction(formData: FormData) {
  await requireCapability("expense:finance-approve");
  const { crm } = getRepositories();
  const qbPaymentRef = str(formData, "qbPaymentRef");
  if (!qbPaymentRef) return;
  await crm.markExpenseReportReimbursed(str(formData, "id"), qbPaymentRef);
  revalidate();
}
