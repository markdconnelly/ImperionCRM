import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { ConnectorCatalog } from "@/components/connectors/connector-catalog";
import { CompanyCredentialCard } from "@/components/settings/company-credential-card";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { listConnectorManifests } from "@/lib/integrations/connector-manifest";
import {
  buildConnectorCatalog,
  GLOBAL_SCOPE,
} from "@/lib/integrations/connector-catalog";
import {
  connectorChainSteps,
  isClientScopedConnector,
  type ConnectorChainStep,
} from "@/lib/integrations/connector-chain";
import { getClientMappingAdapter } from "@/lib/integrations/client-mapping";
import { isRefreshable } from "@/lib/integrations/connector-registry";
import { QBO_CONNECT_NOTICES, isQboConnectResult } from "@/lib/integrations/qbo-connect";
import {
  connectDocusignAction,
  connectQuickBooksAction,
  disconnectAction,
  refreshNowAction,
  saveCredentialAction,
  setPollIntervalAction,
  testDocusignConnectionAction,
} from "../actions";

export const dynamic = "force-dynamic"; // live credential + instance state, never prerendered

/**
 * Connections — the single admin surface for every system-level connector (#864).
 *
 * Consolidates what used to be three overlapping pages (`/connectors`, this page's
 * old "Global connections" view, and the `/settings` Company-credentials tab) into ONE
 * interactive page, per Mark (2026-06-17):
 *
 *   1. **Company systems** — the interactive credential cards (`COMPANY_PROVIDERS`,
 *      ADR-0036): enter/rotate secrets, grant admin consent (DocuSign/QBO), tune
 *      poll cadence, refresh on demand. Secrets are written to Key Vault by the backend;
 *      only a reference lands on the company `connection` row — never the secret (§5).
 *   2. **Connector catalog** — the marketplace grid (`ConnectorCatalog`, ADR-0076 §4):
 *      status, enable/disable, effective poll cadence for the global-scope connector
 *      instances. No secret is collected here.
 *
 * Admin-only (`canSeeSettings`, ADR-0030).
 */

const NOTICE_TONE: Record<"success" | "warning" | "error", string> = {
  success: "border-green/40 text-green",
  warning: "border-amber/40 text-amber",
  error: "border-red/40 text-red",
};

/**
 * One-shot notice for a QuickBooks company-connect outcome (#530). Both
 * `connectQuickBooksAction` and `/api/qbo/callback` land on
 * `/settings/connections?qbo=<result>` (with optional `&qboStatus=<httpStatus>`).
 */
function QboConnectNotice({ qbo, status }: { qbo?: string; status?: string }) {
  if (!qbo || !isQboConnectResult(qbo)) return null;
  const notice = QBO_CONNECT_NOTICES[qbo];
  return (
    <p
      role="status"
      className={`rounded-md border bg-panel-2 px-3 py-2 text-sm ${NOTICE_TONE[notice.tone]}`}
    >
      {notice.message(status)}
    </p>
  );
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ qbo?: string; qboStatus?: string }>;
}) {
  const { qbo, qboStatus } = await searchParams;
  const roles = await getSessionRoles();
  // Admin-only (ADR-0030) — this surface now collects credentials, so it carries the
  // Settings gate (stricter than the old connectors-only gate).
  if (!canSeeSettings(roles)) redirect("/");

  const { connections, connectors } = getRepositories();
  const [company, instances] = await Promise.all([
    connections.listCompanyConnections(),
    connectors.listConnectorInstances(),
  ]);
  const companyByProvider = new Map(company.map((c) => [c.provider, c]));
  // buildConnectorCatalog defaults to GLOBAL_SCOPE — only global-scope instances join.
  const entries = buildConnectorCatalog(listConnectorManifests(), instances, GLOBAL_SCOPE);

  // Client-mapping pipeline chain per client-scoped connector (E2 #1146). The discovery/mapping
  // counts come from the same whitelisted bronze⋈entity_xref read the mapping page uses, so only
  // connectors with a wired adapter (autotask today; m365/F later) incur a query — the rest report
  // unknown counts and the chain shows them as pending, never a false green.
  const clientScoped = entries.filter((e) => isClientScopedConnector(e.manifest.key));
  const summaries = await Promise.all(
    clientScoped.map(async (e) => {
      const adapter = getClientMappingAdapter(e.manifest.key);
      if (!adapter) return [e.manifest.key, null] as const;
      const units = await connections.listClientMappingUnits(adapter.sourceSystem);
      return [
        e.manifest.key,
        { discovered: units.length, mapped: units.filter((u) => u.mappedAccountId).length },
      ] as const;
    }),
  );
  const summaryByKey = new Map(summaries);
  const chains: Record<string, ConnectorChainStep[]> = {};
  for (const e of clientScoped) {
    const cred = companyByProvider.get(e.manifest.key) ?? null;
    const summary = summaryByKey.get(e.manifest.key) ?? null;
    chains[e.manifest.key] = connectorChainSteps({
      hasCredential: e.connected || !!cred?.keyvaultSecretRef,
      instanceStatus: e.instance?.status ?? null,
      lastSyncAt: e.instance?.lastSyncAt ?? cred?.lastSync ?? null,
      unitsDiscovered: summary ? summary.discovered : null,
      unitsMapped: summary ? summary.mapped : null,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Connections"
        description="Every org-wide integration in one place — enter and rotate credentials, grant admin consent, tune poll cadence. Secrets are custodied in Key Vault by the backend; this surface never stores a secret itself."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Plug" size={11} /> {entries.filter((e) => e.connected).length} connected
        </span>
      </PageHeader>

      {/* ── Company systems — the interactive credential / consent cards ───────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">Company systems</h3>
          <p className="mt-0.5 text-sm text-dim">
            Org-wide credentials for the integration engines. Secrets are written to Key
            Vault by the backend — only a reference is stored here, never the secret itself.
          </p>
        </div>
        <QboConnectNotice qbo={qbo} status={qboStatus} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMPANY_PROVIDERS.map((p) => (
            <CompanyCredentialCard
              key={p.key}
              provider={p}
              connection={companyByProvider.get(p.key) ?? null}
              saveAction={saveCredentialAction}
              connectAction={connectQuickBooksAction}
              consentAction={p.key === "docusign" ? connectDocusignAction : undefined}
              testAction={p.key === "docusign" ? testDocusignConnectionAction : undefined}
              disconnectAction={disconnectAction}
              pollAction={setPollIntervalAction}
              refreshAction={refreshNowAction}
              refreshable={isRefreshable(p.key)}
            />
          ))}
        </div>
      </section>

      {/* ── Connector catalog — status / enable / cadence (no secrets) ─────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">Connector catalog</h3>
          <p className="mt-0.5 text-sm text-dim">
            The marketplace of org-scope data connectors and their custody status — enable,
            tune poll cadence, or disable each. Credentials for a connector are entered in
            Company systems above; this grid never stores a secret.
          </p>
        </div>
        <ConnectorCatalog entries={entries} chains={chains} />
      </section>
    </div>
  );
}
