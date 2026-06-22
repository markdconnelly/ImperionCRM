import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ClientMappingPanel } from "@/components/settings/client-mapping-panel";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import { getClientMappingAdapter } from "@/lib/integrations/client-mapping";
import {
  linkClientMappingAction,
  unlinkClientMappingAction,
} from "../actions";

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
  const [units, accounts] = await Promise.all([
    connections.listClientMappingUnits(adapter.sourceSystem),
    crm.listAccounts(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Client mapping"
        description={`Map ${adapter.label} ${adapter.unitNoun}s onto Imperion accounts.`}
      />
      <ClientMappingPanel
        adapter={adapter}
        units={units}
        accounts={accounts}
        linkAction={linkClientMappingAction}
        unlinkAction={unlinkClientMappingAction}
      />
    </div>
  );
}
