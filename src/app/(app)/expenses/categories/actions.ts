"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { checkbox, str, strOrNull } from "@/lib/form-data";

/**
 * Expense category-mapping action (ADR-0083, #489). Gated by the admin-only
 * `expense:category-map` capability. Maps the read-only synced QuickBooks chart of
 * accounts (`qbo_expense_account`) onto a clean website-facing `expense_category` and
 * sets its config (display name, caps, billable default, Autotask category id,
 * visibility, active). The app NEVER writes QuickBooks — the QuickBooks account must
 * already exist in the synced bronze; absent categories are created in QuickBooks
 * manually and re-synced. The repo forces a non-system category inactive when left
 * unmapped (the DB CHECK also enforces it) and never touches the system row's link.
 */
export async function mapExpenseCategoryAction(formData: FormData) {
  await requireCapability("expense:category-map");

  const id = str(formData, "id");
  if (!id) return;

  // QuickBooks account link — blank → null (clears the link → forces inactive on a
  // non-system row). A non-blank value must reference an already-synced account.
  const qboAccountId = strOrNull(formData, "qboAccountId");

  // Caps/threshold — blank → null (no cap). intOr returns the fallback on blank/NaN; a
  // negative number is treated as "no cap" (null) defensively.
  const hardCapRaw = str(formData, "hardCap");
  const hardCap = hardCapRaw === "" ? null : capOrNull(hardCapRaw);
  const softRaw = str(formData, "softThreshold");
  const softThreshold = softRaw === "" ? null : capOrNull(softRaw);

  // Autotask ExpenseCategory id — numeric; blank → null.
  const autotaskRaw = str(formData, "autotaskExpenseCategoryId");
  const autotaskExpenseCategoryId =
    autotaskRaw === "" ? null : Number.isFinite(Number(autotaskRaw)) ? Number(autotaskRaw) : null;

  const session = await auth();
  const mappedBy = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!mappedBy) return;

  const { crm } = getRepositories();
  await crm.updateExpenseCategoryMapping(
    {
      id,
      displayName: str(formData, "displayName"),
      qboAccountId,
      hardCap,
      softThreshold,
      billableDefault: checkbox(formData, "billableDefault"),
      autotaskExpenseCategoryId,
      isUserVisible: checkbox(formData, "isUserVisible"),
      isActive: checkbox(formData, "isActive"),
    },
    mappedBy,
  );
  revalidatePath("/expenses/categories");
  // Mapping changes which categories the entry GUI offers.
  revalidatePath("/expenses");
}

/** Parse a money cap: a finite, non-negative number, else null (no cap). */
function capOrNull(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
