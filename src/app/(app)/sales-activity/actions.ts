"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";

/**
 * Sales Activity writes (ADR-0052 §6/§8): create + complete sales tasks.
 * Gated by `sales:write` (admin | sales) — the GUI twin is `canManageSales`.
 * Sales tasks stay CRM-only: they never push to Autotask.
 */
export async function createSalesTaskAction(formData: FormData) {
  await requireCapability("sales:write");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const detail = String(formData.get("detail") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();

  // The creating rep owns the task (per-owner Sales Queue). Null when the
  // signed-in user has no app_user row yet (mock mode) — lands as Unassigned.
  const session = await auth();
  const email = session?.user?.email ?? null;
  const ownerUserId = email ? await resolveAppUserIdByEmail(email) : null;

  const { crm } = getRepositories();
  await crm.createSalesTask({
    title,
    detail: detail === "" ? null : detail,
    accountId: accountId === "" ? null : accountId,
    opportunityId: opportunityId === "" ? null : opportunityId,
    ownerUserId,
    dueAt: dueAt === "" ? null : dueAt,
  });
  revalidatePath("/sales-activity");
  revalidatePath("/tasks");
}

export async function completeSalesTaskAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { crm } = getRepositories();
  await crm.setTaskStatus(id, "done"); // idempotent — re-completing is a no-op
  revalidatePath("/sales-activity");
  revalidatePath("/tasks");
}
