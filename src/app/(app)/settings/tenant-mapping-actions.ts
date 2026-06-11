"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";

// Tenant Mapping server actions (ADR-0051, issue #150). Kept out of the main
// settings actions file so the auth/validation seam stays small and testable.

const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveTenantMappingAction(formData: FormData) {
  await requireCapability("settings:write");
  const tenantId = String(formData.get("tenantId") ?? "").trim().toLowerCase();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  // A mapping is tenant GUID → account; anything else is a mis-paste. Reject
  // silently (the form enforces both client-side) rather than land a bad key.
  if (!TENANT_GUID.test(tenantId) || !accountId) return;

  const { security } = getRepositories();
  await security.upsertTenantMapping({ tenantId, accountId, displayName });
  revalidatePath("/settings");
}

export async function deleteTenantMappingAction(formData: FormData) {
  await requireCapability("settings:write");
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) return;

  const { security } = getRepositories();
  await security.deleteTenantMapping(tenantId);
  revalidatePath("/settings");
}
