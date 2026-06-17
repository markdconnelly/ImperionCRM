"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, intOrNull } from "@/lib/form-data";
import { isKnownConnector } from "@/lib/integrations/connector-manifest";
import { GLOBAL_SCOPE } from "@/lib/integrations/connector-catalog";

/**
 * Server actions for the connector catalog (ADR-0076 §4, #416).
 *
 * Enabling / configuring / disabling a connector is integration administration —
 * gated by `settings:write` (the admin capability that owns connections, company
 * credentials and poll cadence), enforced fail-closed at the top of every mutation.
 * The `connector_instance` web grants (INSERT/UPDATE/DELETE) ship in migration 0125.
 *
 * SECURITY: these actions NEVER touch credentials. Enabling records the lifecycle
 * intent (a `connector_instance` row in 'connecting'); the backend completes the
 * actual connect + token custody to Key Vault (#149, ADR-0034/0036/0042). The
 * credential itself is collected under Settings → Company credentials. No secret ever
 * passes through this surface.
 */

/** Enable a connector at the global scope: upsert its instance → 'connecting'. */
export async function enableConnectorAction(formData: FormData) {
  await requireCapability("settings:write");
  const connectorKey = str(formData, "connectorKey");
  // App-layer validation against the in-code registry (no DB FK — ADR-0076 §2).
  if (!isKnownConnector(connectorKey)) return;
  const { connectors } = getRepositories();
  await connectors.enableConnector({
    connectorKey,
    accountScope: GLOBAL_SCOPE,
    grantedScopes: [],
    cadenceOverrideMinutes: null,
  });
  revalidatePath("/connectors");
}

/** Set/clear the per-instance poll-cadence override (ADR-0038; blank = manifest default). */
export async function setConnectorCadenceAction(formData: FormData) {
  await requireCapability("settings:write");
  const id = str(formData, "id");
  if (!id) return;
  const minutes = intOrNull(formData, "cadenceOverrideMinutes");
  // Reject negatives (the CHECK constraint would too); blank → null → manifest default.
  if (minutes !== null && minutes < 0) return;
  const { connectors } = getRepositories();
  await connectors.setConnectorCadence(id, minutes);
  revalidatePath("/connectors");
}

/** Disable (remove) a connector instance. The backend revokes custody separately. */
export async function disableConnectorAction(formData: FormData) {
  await requireCapability("settings:write");
  const id = str(formData, "id");
  if (!id) return;
  const { connectors } = getRepositories();
  await connectors.disableConnector(id);
  revalidatePath("/connectors");
}
