import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ClientMappingPanel } from "@/components/settings/client-mapping-panel";
import { ClientCredentialForm } from "@/components/settings/client-credential-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import {
  getClientMappingAdapter,
  selectRegisteredClientCredentials,
} from "@/lib/integrations/client-mapping";
import {
  inferConnectionHealth,
  type HealthVerdict,
} from "@/lib/integrations/connection-health";
import { linkClientMappingAction, unlinkClientMappingAction } from "../actions";
import { purgeCredentialAction, registerClientM365Action } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Reusable Client Mapping page (ADR-0112, epic #1141 unit E1 — the tracer). `[connector]` selects
 * the adapter (tracer: `autotask`, the only populated source); an unmappable connector 404s. Lists
 * the connector's external units + their current manual `entity_xref` link and the accounts list
 * for the picker. Admin-only (`canSeeSettings`, ADR-0030); the actions enforce `settings:write`
 * and proxy the write to the backend (the web role is SELECT-only on entity_xref, migration 0160).
 */
export default async function ClientMappingPage({
  params,
}: {
  params: Promise<{ connector: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  const { connector } = await params;
  const adapter = getClientMappingAdapter(connector);
  if (!adapter) notFound();

  const { connections, crm } = getRepositories();
  // Per-client-credential connectors (m365/unifi) carry their credential ON this screen, so we
  // also load the client-scope connection rows (for inferred health) and the account options
  // (for the registration form). Fan-out adapters skip both — their credential is one company key.
  const [units, accounts, accountOpts, allConnections] = await Promise.all([
    connections.listClientMappingUnits(adapter.sourceSystem),
    crm.listAccounts(),
    adapter.bindsConnection ? crm.accountOptions() : Promise.resolve([]),
    adapter.bindsConnection ? connections.listAllConnections() : Promise.resolve([]),
  ]);

  // Inferred health per mapped account (ADR-0122 S3a) — the same verdict the main cards use,
  // keyed by the client connection's owning account so each mapping row shows its own dot.
  const nowMs = Date.now();
  const clientHealthByAccount: Record<string, HealthVerdict> = {};
  if (adapter.bindsConnection) {
    for (const c of allConnections) {
      if (c.scope !== "client" || c.provider !== adapter.connector || !c.accountId) continue;
      clientHealthByAccount[c.accountId] = inferConnectionHealth({
        hasCredential: true,
        status: c.status,
        lastSyncAt: c.lastSync,
        pollIntervalMinutes: c.pollIntervalMinutes,
        nowMs,
      });
    }
  }

  // Registered per-client credentials surfaced INDEPENDENTLY of bronze discovery (#1271): a
  // credential entered for an account whose tenant/console isn't discovered yet would otherwise
  // be invisible (the mapped table lists discovered units only, and client-scope rows never reach
  // the company connections grid). Attach the health verdict computed above to each.
  const registeredCredentials = adapter.bindsConnection
    ? selectRegisteredClientCredentials(allConnections, adapter.connector).map((rc) => ({
        ...rc,
        health: clientHealthByAccount[rc.accountId],
      }))
    : [];

  const backendConfigured = Boolean(process.env.INTEGRATION_SERVICE_URL?.trim());
  const sourceNote = backendConfigured
    ? ""
    : "Credential custody backend isn't configured in this environment yet — registering will save nothing.";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Client mapping"
        description={`Map ${adapter.label} ${adapter.unitNoun}s onto Imperion accounts.${
          adapter.bindsConnection
            ? ` ${adapter.label} uses a per-client credential — register each client's credential below; the dot on each row shows its connection health.`
            : ""
        }`}
      />
      {adapter.bindsConnection && adapter.connector === "m365" && (
        <ClientCredentialForm
          accounts={accountOpts}
          canSubmit={backendConfigured}
          sourceNote={sourceNote}
          registerAction={registerClientM365Action}
        />
      )}
      <ClientMappingPanel
        adapter={adapter}
        units={units}
        accounts={accounts}
        clientHealthByAccount={adapter.bindsConnection ? clientHealthByAccount : undefined}
        registeredCredentials={adapter.bindsConnection ? registeredCredentials : undefined}
        linkAction={linkClientMappingAction}
        unlinkAction={unlinkClientMappingAction}
        purgeAction={purgeCredentialAction}
      />
    </div>
  );
}
