"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";

/**
 * Admin employee-mapping action (ADR-0082/0083, #468/#490). Gated by the admin-only
 * `time:map` capability. Confirms an employee's Autotask Resource / QuickBooks vendor /
 * MileIQ user mapping onto `employee_profile` (mapping cols + audit only — never comp
 * data). Email is the join key; a blank field clears that mapping. The actual
 * Autotask/QuickBooks/MileIQ list pull + email auto-match is a backend enhancement; the
 * admin confirms the resolved ids here.
 */
export async function confirmMappingAction(formData: FormData) {
  await requireCapability("time:map");
  const appUserId = str(formData, "appUserId");
  if (!appUserId) return;

  // Numeric Autotask Resource id; blank → null (clears). Reject non-numeric.
  const rawResource = str(formData, "autotaskResourceId").trim();
  const autotaskResourceId =
    rawResource === "" ? null : Number.isFinite(Number(rawResource)) ? Number(rawResource) : null;
  const rawVendor = str(formData, "quickbooksVendorId").trim();
  const quickbooksVendorId = rawVendor === "" ? null : rawVendor;
  // Opaque MileIQ user id (ADR-0083, #490); blank → null (clears the mapping).
  const rawMileiq = str(formData, "mileiqUserId").trim();
  const mileiqUserId = rawMileiq === "" ? null : rawMileiq;

  const session = await auth();
  const confirmedBy = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!confirmedBy) return;

  const { crm } = getRepositories();
  await crm.confirmEmployeeMapping(
    { appUserId, autotaskResourceId, quickbooksVendorId, mileiqUserId },
    confirmedBy,
  );
  revalidatePath("/timesheets/mappings");
}
