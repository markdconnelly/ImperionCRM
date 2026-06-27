"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { getRepositories } from "@/lib/data";
import { clientMappingService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";
import { getClientMappingAdapter } from "@/lib/integrations/client-mapping";

// Client Mapping server actions (ADR-0112, epic #1141 unit E). The adapter is resolved
// server-side from the `connector` route key — the client never picks the source_system or the
// table. Writes go through the backend (unit D) because the web role is SELECT-only on
// entity_xref (migration 0160); the action just proxies after the settings:write gate. When the
// backend isn't configured yet the UI degrades (ServiceNotConfiguredError swallowed).
//
// M365 (E3 #1147) is a transitional dual-write: the entity_xref link (the ADR-0112 authority)
// goes through the backend, while the legacy `account_tenant` row — still the join key the
// posture rollups read — is kept in sync directly until the cutover (#1049). `account_tenant`
// is web-writable; entity_xref is not, hence the split.

const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function linkClientMappingAction(formData: FormData) {
  await requireCapability("settings:write");
  const connector = String(formData.get("connector") ?? "").trim();
  const sourceKey = String(formData.get("sourceKey") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  // Per-client-credential connectors (bindsConnection) may carry the bound connection so the
  // backend keeps `connection.account_id` consistent in the same transaction (unit D).
  const connectionId = String(formData.get("connectionId") ?? "").trim() || undefined;
  const adapter = getClientMappingAdapter(connector);
  if (!adapter || !sourceKey || !accountId) return;

  try {
    await clientMappingService.link({
      entityType: "account",
      sourceSystem: adapter.sourceSystem,
      sourceKey,
      internalEntityId: accountId,
      connectionId: adapter.bindsConnection ? connectionId : undefined,
    });
  } catch (err) {
    if (!(err instanceof ServiceNotConfiguredError)) throw err;
  }

  // Transitional: keep the legacy account_tenant row in sync for m365 tenants (#1049).
  if (adapter.sourceSystem === "m365" && TENANT_GUID.test(sourceKey)) {
    const { connections, security } = getRepositories();
    await security.upsertTenantMapping({
      tenantId: sourceKey.toLowerCase(),
      accountId,
      displayName: null,
    });
    // ADR-0126 gap (b): mapping a client tenant is the onboarding→contact-filter loop's trigger —
    // the tenant's verified M365 domains become the account's tracked client domains so the
    // client-communications filter (#1369) can scope comms to this DB client. Idempotent; never
    // clobbers an operator-curated row. Best-effort — a derivation hiccup must not fail the link.
    try {
      await connections.hydrateAccountDomainsFromTenants(accountId, "derived:entra");
    } catch {
      // entra_domains not yet hydrated for this tenant (or schema lag) — domains fill on next link.
    }
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

  // Transitional: drop the legacy account_tenant row too for m365 tenants (#1049).
  if (adapter.sourceSystem === "m365" && TENANT_GUID.test(sourceKey)) {
    const { security } = getRepositories();
    await security.deleteTenantMapping(sourceKey.toLowerCase());
  }

  revalidatePath(`/settings/client-mapping/${connector}`);
}
