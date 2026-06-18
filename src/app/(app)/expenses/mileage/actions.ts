"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull, checkbox } from "@/lib/form-data";
import { parsePeriod } from "@/lib/expenses/overview";
import { validateMileageEntry } from "@/lib/expenses/mileage-entry";

/**
 * Manual mileage entry (ADR-0083, #853) — the v1 interim while the MileIQ API is
 * paywalled (full MileIQ → v2). Self-scoped exactly like the out-of-pocket actions:
 * `expense:write` capability + the employee id from the session (never the form); the
 * report is (lazily) ensured for the period and `addMileageItem` re-checks Open+owned
 * under a row lock. Miles only — the reimbursement $ is backend-derived (comp reader),
 * so the comp-gated rate is never exposed here. Ticket is required only when billable.
 */

async function currentEmployeeId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

export async function createMileageItemAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;

  const periodStr = str(formData, "period");
  const period = parsePeriod(periodStr);
  if (!period) return;

  const fail = (code: string) =>
    redirect(`/expenses/mileage/new?period=${periodStr}&error=${code}`);

  const itemDate = str(formData, "itemDate");
  const miles = Number(str(formData, "miles"));
  const reimbursable = checkbox(formData, "reimbursable");
  const billable = checkbox(formData, "billable");
  const ticketRef = strOrNull(formData, "ticketRef");
  const companyRaw = strOrNull(formData, "autotaskCompanyId");
  const autotaskCompanyId =
    companyRaw && Number.isFinite(Number(companyRaw)) ? Number(companyRaw) : null;

  // Ticket required ONLY when billable (Mark, 2026-06-17); the billable client leg also
  // needs the Autotask company. Internal/non-billable mileage may omit both. Pure rule,
  // unit-tested in lib/expenses/mileage-entry.test.ts.
  const err = validateMileageEntry({ itemDate, miles, billable, ticketRef, autotaskCompanyId });
  if (err) return fail(err);

  const { crm } = getRepositories();
  const reportId = await crm.ensureExpenseReportForPeriod(employeeId, period.year, period.month);
  const id = await crm.addMileageItem({
    expenseReportId: reportId,
    employeeId,
    itemDate,
    miles,
    origin: strOrNull(formData, "origin"),
    destination: strOrNull(formData, "destination"),
    reimbursable,
    billable,
    autotaskCompanyId,
    ticketRef,
    projectRef: strOrNull(formData, "projectRef"),
    notes: strOrNull(formData, "notes"),
  });
  if (!id) return fail("locked"); // report not Open (e.g. already submitted)

  revalidatePath("/expenses");
  redirect(`/expenses?period=${periodStr}`);
}
