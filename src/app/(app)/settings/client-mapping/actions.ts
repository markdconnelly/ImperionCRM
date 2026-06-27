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
    const { security } = getRepositories();
    await security.upsertTenantMapping({
      tenantId: sourceKey.toLowerCase(),
      accountId,
      displayName: null,
    });
  }

  revalidatePath(`/settings/client-mapping/${connector}`);
}

/**
 * Account-first tenant mapping (issue #1371, epic #1366 gap (f), ADR-0126). The standard
 * `linkClientMappingAction` only maps tenants already DISCOVERED as units (posture bronze or an
 * existing link). For an account whose tenant GUID was never collected/linked there is no unit to
 * pick, so this action takes the GUID directly from the operator (account → typed tenant GUID) and
 * performs the SAME dual-write: the `entity_xref` link (ADR-0112 authority, via the backend) plus
 * the legacy `account_tenant` row the posture rollups still join on (#1049). No GUIDs are ever
 * seeded — the operator supplies each one from M365 admin discovery (see the runbook). The GUID is
 * a tenant identifier, not PII and not a secret. Silent no-op on a malformed GUID (the form also
 * enforces the pattern client-side); a real validation surface is out of scope for this chore.
 */
export async function mapAccountTenantAction(formData: FormData) {
  await requireCapability("settings:write");
  const accountId = String(formData.get("accountId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  if (!accountId || !TENANT_GUID.test(tenantId)) return;

  const adapter = getClientMappingAdapter("m365");
  if (!adapter) return;

  try {
    await clientMappingService.link({
      entityType: "account",
      sourceSystem: adapter.sourceSystem,
      sourceKey: tenantId,
      internalEntityId: accountId,
    });
  } catch (err) {
    if (!(err instanceof ServiceNotConfiguredError)) throw err;
  }

  // Legacy account_tenant row — the join key the posture rollups read until the cutover (#1049).
  const { security } = getRepositories();
  await security.upsertTenantMapping({ tenantId, accountId, displayName });

  revalidatePath("/settings/client-mapping/m365");
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
