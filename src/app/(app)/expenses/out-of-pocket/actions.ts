"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull, checkbox } from "@/lib/form-data";
import { parsePeriod } from "@/lib/expenses/overview";
import { validateOutOfPocketEntry } from "@/lib/expenses/out-of-pocket-entry";

/**
 * Out-of-pocket expense entry actions (ADR-0083, #487) — the employee hand-enters the
 * one item kind they own (mileage comes from MileIQ). Self-scoped EXACTLY like the
 * mileage actions: `expense:write` capability + the employee id from the SESSION (never
 * the form); the report is (lazily) ensured for the period and `addExpenseItem` /
 * `deleteExpenseItem` re-check Open + owned server-side under a row lock. An attested
 * (Submitted+) report is locked — corrections then go through the admin surface (#488).
 */

async function currentEmployeeId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

export async function createExpenseItemAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;

  const periodStr = str(formData, "period");
  const period = parsePeriod(periodStr);
  if (!period) return;

  const fail = (code: string) =>
    redirect(`/expenses/out-of-pocket/new?period=${periodStr}&error=${code}`);

  const itemDate = str(formData, "itemDate");
  const amount = Number(str(formData, "amount"));
  const categoryId = strOrNull(formData, "categoryId");
  const billable = checkbox(formData, "billable");
  const companyRaw = strOrNull(formData, "autotaskCompanyId");
  const autotaskCompanyId =
    companyRaw && Number.isFinite(Number(companyRaw)) ? Number(companyRaw) : null;

  // Pure rule, unit-tested in lib/expenses/out-of-pocket-entry.test.ts: date + positive
  // amount + a category are required; the Autotask company is required only when billable.
  const err = validateOutOfPocketEntry({ itemDate, amount, categoryId, billable, autotaskCompanyId });
  if (err) return fail(err);

  const { crm } = getRepositories();
  const reportId = await crm.ensureExpenseReportForPeriod(employeeId, period.year, period.month);
  const id = await crm.addExpenseItem({
    expenseReportId: reportId,
    employeeId,
    itemDate,
    categoryId,
    amount,
    merchant: strOrNull(formData, "merchant"),
    description: strOrNull(formData, "description"),
    reimbursable: checkbox(formData, "reimbursable"),
    billable,
    autotaskCompanyId,
    receiptId: null, // receipts are attached separately (#487 receipt-upload follow-up)
  });
  if (!id) return fail("locked"); // report not Open (e.g. already submitted)

  revalidatePath("/expenses");
  redirect(`/expenses?period=${periodStr}`);
}

/**
 * Remove one out-of-pocket item from the employee's OWN Open report. Self-scoped: the
 * employee id is the session owner (passed to `deleteExpenseItem`, which re-checks the
 * item belongs to that employee's Open report), so an employee can only delete their own
 * pre-submit lines. Mileage items are removed the same way. No-op (silent) when the
 * report is locked or the item isn't theirs.
 */
export async function deleteExpenseItemAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;

  const periodStr = str(formData, "period");
  const itemId = str(formData, "itemId");
  if (!itemId) return;

  const { crm } = getRepositories();
  await crm.deleteExpenseItem(itemId, employeeId);
  revalidatePath("/expenses");
  redirect(`/expenses?period=${periodStr}`);
}
