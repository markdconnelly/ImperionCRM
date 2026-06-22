"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { clientMappingService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";
import { getClientMappingAdapter } from "@/lib/integrations/client-mapping";

// Client Mapping server actions (ADR-0112, epic #1141 unit E). The adapter is resolved
// server-side from the `connector` route key — the client never picks the source_system or the
// table. Writes go through the backend (unit D) because the web role is SELECT-only on
// entity_xref (migration 0160); the action just proxies after the settings:write gate. When the
// backend isn't configured yet the UI degrades (ServiceNotConfiguredError swallowed).

export async function linkClientMappingAction(formData: FormData) {
  await requireCapability("settings:write");
  const connector = String(formData.get("connector") ?? "").trim();
  const sourceKey = String(formData.get("sourceKey") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const adapter = getClientMappingAdapter(connector);
  if (!adapter || !sourceKey || !accountId) return;

  try {
    await clientMappingService.link({
      entityType: "account",
      sourceSystem: adapter.sourceSystem,
      sourceKey,
      internalEntityId: accountId,
    });
  } catch (err) {
    if (!(err instanceof ServiceNotConfiguredError)) throw err;
  }
  revalidatePath(`/settings/client-mapping/${connector}`);
}

export async function unlinkClientMappingAction(formData: FormData) {
  await requireCapability("settings:write");
  const connector = String(formData.get("connector") ?? "").trim();
  const sourceKey = String(formData.get("sourceKey") ?? "").trim();
  const adapter = getClientMappingAdapter(connector);
  if (!adapter || !sourceKey) return;

  try {
    await clientMappingService.unlink({
      entityType: "account",
      sourceSystem: adapter.sourceSystem,
      sourceKey,
    });
  } catch (err) {
    if (!(err instanceof ServiceNotConfiguredError)) throw err;
  }
  revalidatePath(`/settings/client-mapping/${connector}`);
}
