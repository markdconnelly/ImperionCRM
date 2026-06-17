import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { ConnectorCatalog } from "@/components/connectors/connector-catalog";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeConnectors } from "@/lib/auth/roles";
import { listConnectorManifests } from "@/lib/integrations/connector-manifest";
import { buildConnectorCatalog } from "@/lib/integrations/connector-catalog";

export const dynamic = "force-dynamic"; // live instance state, never prerendered

/**
 * The connector catalog (#416, ADR-0076 §4) — the integration marketplace surface.
 *
 * Browses every connector in the in-code manifest registry (the "available" catalog)
 * joined to its persisted `connector_instance` (the "connected" state): status,
 * capabilities, scopes, effective poll cadence, last sync and health. Admins enable a
 * connector (records the lifecycle intent), tune its poll cadence, or disable it.
 *
 * Admin-only (ADR-0030): nav hiding and the route guard below share `canSeeConnectors`,
 * mirroring the Settings / CMDB gate. CREDENTIALS NEVER FLOW THROUGH HERE — enabling
 * records intent; the backend completes the connect + Key Vault custody (#149), and the
 * credential itself is collected under Settings → Company credentials.
 */
export default async function ConnectorsPage() {
  const roles = await getSessionRoles();
  if (!canSeeConnectors(roles)) redirect("/");

  const { connectors } = getRepositories();
  const instances = await connectors.listConnectorInstances();
  const entries = buildConnectorCatalog(listConnectorManifests(), instances);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Connectors"
        description="Integration marketplace — browse, enable and configure data connectors. Credentials are collected under Settings → Company credentials and custodied by the backend; this surface never stores a secret."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Plug" size={11} /> {entries.filter((e) => e.connected).length} connected
        </span>
      </PageHeader>

      <ConnectorCatalog entries={entries} />
    </div>
  );
}
