"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";

/**
 * Set a user's weekly capacity hours (ADR-0069 D2, #591). Gated by the
 * `delivery:capacity` capability (admin∨project_manager) — the server action is the
 * authoritative gate; the GUI twin (`canManageCapacity`) only hides the surface.
 * Upserts `user_capacity.weekly_hours` (authored by the #346/#580 heavy lane this
 * wave). A blank field clears the capacity (null); otherwise the value must be a
 * finite, non-negative number of hours (≤ 168, a week's worth).
 */
export async function setUserCapacityAction(formData: FormData) {
  await requireCapability("delivery:capacity");

  const userId = str(formData, "userId").trim();
  if (!userId) return;

  const raw = str(formData, "weeklyHours").trim();
  let weeklyHours: number | null;
  if (raw === "") {
    weeklyHours = null; // clear capacity
  } else {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 168) return;
    weeklyHours = n;
  }

  const { crm } = getRepositories();
  await crm.setUserCapacity(userId, weeklyHours);
  revalidatePath("/projects/capacity");
  revalidatePath("/projects/workload");
}
