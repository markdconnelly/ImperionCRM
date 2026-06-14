"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";
import { parsePeriod } from "@/lib/expenses/overview";

/**
 * Employee expense actions (ADR-0083, #547). Every write is gated by the
 * `expense:write` capability AND scoped to the signed-in employee's OWN report:
 * the employee id comes from the session (never the form), and the report id is
 * re-resolved via `getExpenseReportForPeriod(employeeId, …)` — inherently
 * employee-scoped — before any mutation. An attested (Submitted+) report is locked;
 * only an admin acts on it thereafter (the admin surface is #548).
 */

/** Resolve the signed-in employee's app_user id (null in mock mode / unmapped). */
async function currentEmployeeId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

/**
 * Create (ensure) the employee's report for a month, then open it. Lazy-creation from
 * the landing's "Start expense report" button — self-scoped (`expense:write`, employee
 * id from session), idempotent (`ensureExpenseReportForPeriod` is UNIQUE on
 * employee+year+month), so a double-click can't make two.
 */
export async function createExpenseReportAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const period = parsePeriod(str(formData, "period"));
  if (!period) return;

  const { crm } = getRepositories();
  await crm.ensureExpenseReportForPeriod(employeeId, period.year, period.month);
  revalidatePath("/expenses");
  redirect(`/expenses?period=${str(formData, "period")}`);
}

/**
 * Attest (submit) the employee's report for a month: Open → Submitted. Self-scoped —
 * the report id is resolved from the session employee + period, never the form, so an
 * employee can only attest their own report.
 */
export async function attestExpenseReportAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const period = parsePeriod(str(formData, "period"));
  if (!period) return;

  const { crm } = getRepositories();
  const report = await crm.getExpenseReportForPeriod(employeeId, period.year, period.month);
  if (!report || report.state !== "open") return;
  await crm.submitExpenseReport(report.id, employeeId);
  revalidatePath("/expenses");
  redirect(`/expenses?period=${str(formData, "period")}`);
}

/**
 * Reopen the employee's rejected report for correction: Rejected → Open. Self-scoped
 * like the others; only the owning employee's own rejected report moves.
 */
export async function reopenExpenseReportAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;
  const period = parsePeriod(str(formData, "period"));
  if (!period) return;

  const { crm } = getRepositories();
  const report = await crm.getExpenseReportForPeriod(employeeId, period.year, period.month);
  if (!report || report.state !== "rejected") return;
  await crm.reopenExpenseReport(report.id);
  revalidatePath("/expenses");
  redirect(`/expenses?period=${str(formData, "period")}`);
}
