import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { ConnectorCatalog } from "@/components/connectors/connector-catalog";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeConnectors } from "@/lib/auth/roles";
import { listConnectorManifests } from "@/lib/integrations/connector-manifest";
import {
  buildConnectorCatalog,
  GLOBAL_SCOPE,
} from "@/lib/integrations/connector-catalog";

export const dynamic = "force-dynamic"; // live instance state, never prerendered

/**
 * Global connections settings (#834 — Wave-8 buildout of the #794 nav scaffold).
 *
 * The admin view of ORG / global-scope connector instances: status, effective poll
 * cadence, enable/disable. It reuses the connector marketplace data layer + grid
 * (ADR-0076 §4, #416) — `buildConnectorCatalog` already joins the in-code manifest
 * registry to the persisted `connector_instance` rows for the global scope only — so
 * this surface is the same catalog scoped to the company's shared connections.
 *
 * Admin-only (`canSeeConnectors`, ADR-0030), matching /connectors. CREDENTIALS ARE
 * NOT COLLECTED HERE — enabling records lifecycle intent; the backend completes the
 * connect + Key Vault custody (#149). Secrets are entered under Settings → Company
 * credentials.
 */
export default async function GlobalConnectionsSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeConnectors(roles)) redirect("/");

  const { connectors } = getRepositories();
  const instances = await connectors.listConnectorInstances();
  // buildConnectorCatalog defaults to GLOBAL_SCOPE — only global-scope instances join.
  const entries = buildConnectorCatalog(
    listConnectorManifests(),
    instances,
    GLOBAL_SCOPE,
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Global connections"
        description="Org-wide data connections and their custody status — enable, tune poll cadence, or disable each company-scope connector. Credentials are collected under Settings → Company credentials and custodied by the backend; this surface never stores a secret."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Plug" size={11} /> {entries.filter((e) => e.connected).length}{" "}
          connected
        </span>
      </PageHeader>

      <ConnectorCatalog entries={entries} />
    </div>
  );
}
