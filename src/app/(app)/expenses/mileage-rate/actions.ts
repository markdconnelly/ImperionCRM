"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull } from "@/lib/form-data";

/**
 * Mileage-rate override action (ADR-0083, #490). COMP DATA — gated by the
 * `expense:mileage-rate` capability (finance∨admin, exactly like Pay Rate); the
 * server action is the authoritative gate, the GUI twin only hides the surface.
 * Appends an effective-dated system-override row to `mileage_rate` (the repo fixes
 * source='system_override' and upserts on the UNIQUE effective_from). The app never
 * derives a per-employee mileage amount here — the backend reconciliation is the sole
 * reader that multiplies miles × the rate in force on the drive date.
 */
export async function setMileageRateAction(formData: FormData) {
  await requireCapability("expense:mileage-rate");

  // Effective date — required, yyyy-mm-dd (the native date input's wire format).
  const effectiveFrom = str(formData, "effectiveFrom").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) return;

  // Rate — required, strictly positive USD/mile. Reject blank / non-finite / ≤ 0.
  const rate = Number(str(formData, "rate"));
  if (!Number.isFinite(rate) || rate <= 0) return;

  const note = strOrNull(formData, "note");

  const session = await auth();
  const createdBy = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!createdBy) return;

  const { crm } = getRepositories();
  await crm.setMileageRate({ effectiveFrom, rate, note }, createdBy);
  revalidatePath("/expenses/mileage-rate");
}
